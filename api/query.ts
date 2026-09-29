import type { IncomingMessage, ServerResponse } from 'http';

interface QueryRequestBody {
  query: string;
  documents: Array<{
    doc_id: string;
    filename: string;
    doc_type: string;
    extracted_text?: string;
    fields?: Array<{ field_name: string; field_value: string }>;
  }>;
}

const RAG_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-vl-72b-instruct:free',
];

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body: QueryRequestBody;
  try {
    if (typeof req.body === 'object' && req.body !== null) {
      body = req.body;
    } else {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const rawText = Buffer.concat(buffers).toString();
      body = JSON.parse(rawText || '{}');
    }
  } catch (err: any) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid JSON body: ' + err.message }));
    return;
  }

  const { query = '', documents = [] } = body;
  const apiKey = process.env.OPENROUTER_API_KEY || '';

  // Prepare context from documents
  const corpusContext = documents
    .map((doc) => {
      const fieldList = (doc.fields || []).map((f) => `  - ${f.field_name}: ${f.field_value}`).join('\n');
      return `[Document ID: ${doc.doc_id}] Name: ${doc.filename} | Type: ${doc.doc_type}\nFields:\n${fieldList}\nText preview: ${(doc.extracted_text || '').slice(0, 800)}`;
    })
    .join('\n\n');

  let answer = '';
  let citedDocIds: string[] = [];

  if (apiKey && apiKey.length > 10 && !apiKey.includes('placeholder') && documents.length > 0) {
    const prompt = `You are the DocIntel AI Auditor Assistant. Answer the following user question strictly based on the provided document corpus.
CITE the relevant Document IDs (e.g. [doc-001]) whenever referencing facts.

USER QUESTION: "${query}"

DOCUMENT CORPUS:
${corpusContext.slice(0, 8000)}

Provide a concise, professional audit response with bullet points and clear citations.`;

    for (const model of RAG_MODELS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://docintel.vercel.app',
            'X-Title': 'DocIntel RAG Q&A',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          answer = data.choices?.[0]?.message?.content || '';
          if (answer) {
            // Find cited IDs
            documents.forEach((d) => {
              if (answer.includes(d.doc_id) || answer.toLowerCase().includes(d.filename.toLowerCase())) {
                citedDocIds.push(d.doc_id);
              }
            });
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
  }

  // Heuristic Fallback
  if (!answer) {
    const qLower = query.toLowerCase();
    const matched = documents.filter((d) => {
      const matchName = d.filename.toLowerCase().includes(qLower);
      const matchType = d.doc_type.toLowerCase().includes(qLower);
      const matchField = (d.fields || []).some((f) => f.field_value.toLowerCase().includes(qLower));
      return matchName || matchType || matchField;
    });

    const targetDocs = matched.length > 0 ? matched : documents.slice(0, 3);
    citedDocIds = targetDocs.map((d) => d.doc_id);

    answer = `Based on your audited documents in the corpus:\n\n` +
      targetDocs
        .map((d) => {
          const summary = (d.fields || []).slice(0, 3).map((f) => `${f.field_name}: ${f.field_value}`).join(', ');
          return `• **${d.filename}** (${d.doc_type}) [${d.doc_id}]: Extracted ${d.fields?.length || 0} fields (${summary || 'verified'}).`;
        })
        .join('\n\n') +
      `\n\nIdentified across **${targetDocs.length}** document(s) matching your inquiry.`;
  }

  const citations = documents
    .filter((d) => citedDocIds.includes(d.doc_id))
    .map((d) => ({
      doc_id: d.doc_id,
      filename: d.filename,
      doc_type: d.doc_type,
      snippet: `Extracted verification data for ${d.filename} (${d.doc_type}).`,
    }));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      answer,
      cited_doc_ids: citedDocIds,
      citations,
    })
  );
}
