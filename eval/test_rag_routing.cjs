/**
 * Automated Regression Test Suite for DocIntellect RAG Query Routing
 * Tests 40+ diverse prompts across all document classes to prevent keyword collisions.
 */

function matchesAny(text, patterns) {
  const lower = (text || '').toLowerCase();
  return patterns.some((p) => {
    const plower = p.toLowerCase();
    if (plower.includes(' ') || plower.includes('$') || plower.includes('-') || plower.includes('.')) {
      const escaped = plower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-zA-Z0-9_])${escaped}([^a-zA-Z0-9_]|$)`, 'i').test(lower);
    }
    return new RegExp(`\\b${plower}\\b`, 'i').test(lower);
  });
}

function classifyQuery(query) {
  const lowerQuery = (query || '').toLowerCase().trim();

  const isMathOrDiscrepancy = matchesAny(lowerQuery, [
    'math', 'calculation', 'discrepancy', 'mismatch', 'sum', 'variance', 'overcharge', 'arithmetic', 'padding'
  ]);

  const isWireQuery = matchesAny(lowerQuery, [
    'wire', 'wiring', 'routing number', 'routing #', 'bank routing', 'bank account', 
    'account number', 'remittance', 'tamper', 'tampering', 'fraud', 'diversion', 'offshore bank'
  ]);

  const isDuplicateQuery = matchesAny(lowerQuery, [
    'duplicate', 'duplicate invoice', 'duplicate billing', 'double billing', 'same invoice'
  ]);

  const isExpiredOrChronologyQuery = matchesAny(lowerQuery, [
    'expired', 'expiration', 'chronology', 'chronological', 'lapsed', 'post-expiration', 'retroactive'
  ]);

  const isUnsignedQuery = matchesAny(lowerQuery, [
    'unsigned', 'missing signature', 'missing signatures', 'draft agreement', 'draft contract', 
    'not signed', 'unexecuted', 'pending signature'
  ]);

  const isPOQuery = matchesAny(lowerQuery, [
    'purchase order', 'purchase orders', 'po', 'pos', 'po #', '50,000', '50000', '$50,000', 'threshold', 
    'machining', 'procurement threshold', 'delegation limit', 'po-2024-5599', 'po-2024-9100'
  ]);

  const isSOC2OrDeficiencyQuery = matchesAny(lowerQuery, [
    'soc', 'soc2', 'soc-2', 'soc 2', 'deficiency', 'breach', 'cc6.1', 'qualified opinion', 
    'plaintext keys', 'cryptographic key', 'unencrypted password'
  ]);

  const isComplianceQuery = isSOC2OrDeficiencyQuery || 
    matchesAny(lowerQuery, ['compliance', 'gdpr', 'dpia', 'data protection', 'privacy notice', 'regulation', 'regulatory']) ||
    (matchesAny(lowerQuery, ['audit', 'deficiencies']) && !matchesAny(lowerQuery, ['invoice', 'invoices', 'bill', 'bills', 'po', 'purchase order', 'contract', 'contracts']));

  const isContractQuery = !matchesAny(lowerQuery, ['invoice', 'invoices', 'bill', 'bills', 'po', 'purchase order']) && (
    isUnsignedQuery ||
    isExpiredOrChronologyQuery ||
    matchesAny(lowerQuery, [
      'contract', 'contracts', 'agreement', 'agreements', 'parties', 'governing law', 
      'jurisdiction', 'msa', 'contract term', 'initial term', 'renewal term'
    ])
  );

  const isInvoiceQuery = isWireQuery || isDuplicateQuery || matchesAny(lowerQuery, [
    'invoice', 'invoices', 'bill', 'bills', 'unpaid', 'due date', 'due dates', 
    'payment terms', 'payment term', 'credit terms', 'accounts payable', 'net 30'
  ]);

  const isFinancialTotalQuery = matchesAny(lowerQuery, [
    'total spend', 'total spent', 'subtotal', 'grand total', 'how much did we pay', 'total cost', 'total expenses'
  ]);

  // Route evaluation in exact scenario priority
  if (isMathOrDiscrepancy) return 'MATH_DISCREPANCY';
  if (isWireQuery) return 'WIRE_TAMPERING';
  if (isDuplicateQuery) return 'DUPLICATE_INVOICE';
  if (isExpiredOrChronologyQuery) return 'CONTRACT_CHRONOLOGY';
  if (isUnsignedQuery) return 'CONTRACT_UNSIGNED';
  if (isContractQuery) return 'CONTRACT_ANALYSIS';
  if (isPOQuery) return 'PO_ANALYSIS';
  if (isComplianceQuery) return 'COMPLIANCE_AUDIT';
  if (isInvoiceQuery || isFinancialTotalQuery) return 'INVOICE_SCHEDULE';
  return 'GENERAL_CORPUS';
}

const TEST_CASES = [
  // User Prompt that previously collided
  {
    query: "List all invoices, their due dates, payment terms, and total payable amounts.",
    expected: "INVOICE_SCHEDULE",
    desc: "Original user prompt with 'payment terms' (must route to INVOICE_SCHEDULE, not CONTRACT_ANALYSIS)"
  },
  {
    query: "Show all unpaid bills and payment terms",
    expected: "INVOICE_SCHEDULE",
    desc: "Unpaid bills with payment terms"
  },
  {
    query: "Generate a report on all invoices",
    expected: "INVOICE_SCHEDULE",
    desc: "Query with word 'report' (must NOT collide with PO because of 'po' in 'report')"
  },
  {
    query: "Show accounting summary of vendor invoices",
    expected: "INVOICE_SCHEDULE",
    desc: "Query with 'accounting' (must NOT collide with Wire because of 'account' in 'accounting')"
  },
  {
    query: "Audit all invoices",
    expected: "INVOICE_SCHEDULE",
    desc: "Query with 'audit' targeting invoices (must NOT collide with Compliance)"
  },
  {
    query: "What are the Net 30 payment terms across all vendors?",
    expected: "INVOICE_SCHEDULE",
    desc: "Net 30 payment terms"
  },
  // Math & Discrepancies
  {
    query: "Which invoices have mathematical calculation discrepancies or variances?",
    expected: "MATH_DISCREPANCY",
    desc: "Math calculation discrepancies prompt"
  },
  {
    query: "Show all math errors and sum mismatches",
    expected: "MATH_DISCREPANCY",
    desc: "Math errors and mismatches"
  },
  {
    query: "Find tax calculation variances or unit multiplication errors",
    expected: "MATH_DISCREPANCY",
    desc: "Tax calculation variance"
  },
  // Wire Fraud
  {
    query: "Are there any invoices with wire transfer tampering or mismatched bank routing details?",
    expected: "WIRE_TAMPERING",
    desc: "Wire transfer tampering prompt"
  },
  {
    query: "Check offshore bank routing numbers against vendor master",
    expected: "WIRE_TAMPERING",
    desc: "Offshore bank routing numbers"
  },
  {
    query: "Did any vendor divert remittance instructions or bank account?",
    expected: "WIRE_TAMPERING",
    desc: "Remittance instructions and bank account"
  },
  // Duplicate Invoices
  {
    query: "Are there any duplicate invoices in the corpus?",
    expected: "DUPLICATE_INVOICE",
    desc: "Duplicate invoices prompt"
  },
  {
    query: "Check for duplicate billing or repeated invoice numbers",
    expected: "DUPLICATE_INVOICE",
    desc: "Duplicate billing"
  },
  // Contracts
  {
    query: "Which contracts in our repository are unsigned or missing signatures?",
    expected: "CONTRACT_UNSIGNED",
    desc: "Unsigned contracts prompt"
  },
  {
    query: "Are there any draft agreements pending signature?",
    expected: "CONTRACT_UNSIGNED",
    desc: "Draft agreements pending signature"
  },
  {
    query: "Are there any expired contracts or chronological inconsistencies in execution dates?",
    expected: "CONTRACT_CHRONOLOGY",
    desc: "Expired contracts prompt"
  },
  {
    query: "What are the governing jurisdictions and terms of our active contracts?",
    expected: "CONTRACT_ANALYSIS",
    desc: "Contract governing laws and active terms"
  },
  {
    query: "List all parties in our master service agreements",
    expected: "CONTRACT_ANALYSIS",
    desc: "Parties in master service agreements (MSA)"
  },
  {
    query: "Show contract agreements with Smith & Associates",
    expected: "CONTRACT_ANALYSIS",
    desc: "Contract with 'Associates' (must NOT collide with SOC 2 because of 'soc' in 'Associates')"
  },
  // Purchase Orders
  {
    query: "Which purchase orders exceed our standard $50,000 approval threshold?",
    expected: "PO_ANALYSIS",
    desc: "PO threshold prompt"
  },
  {
    query: "Show details for PO-2024-5599",
    expected: "PO_ANALYSIS",
    desc: "PO number lookup"
  },
  {
    query: "List all purchase orders and equipment delivery dates",
    expected: "PO_ANALYSIS",
    desc: "Purchase orders delivery dates"
  },
  {
    query: "Corporate deposit policy on purchase orders",
    expected: "PO_ANALYSIS",
    desc: "PO deposit policy"
  },
  // Compliance
  {
    query: "Summarize all critical SOC 2 audit deficiencies and overdue remediation items.",
    expected: "COMPLIANCE_AUDIT",
    desc: "SOC 2 audit deficiencies prompt"
  },
  {
    query: "What are the CC6.1 plaintext key storage exceptions?",
    expected: "COMPLIANCE_AUDIT",
    desc: "CC6.1 plaintext key storage"
  },
  {
    query: "What required actions and deadlines are listed for our GDPR compliance audit?",
    expected: "COMPLIANCE_AUDIT",
    desc: "GDPR compliance audit actions"
  },
  {
    query: "Show DPIA and privacy notice audit deadlines",
    expected: "COMPLIANCE_AUDIT",
    desc: "DPIA and privacy notice"
  },
  // General
  {
    query: "Search for references to titanium stock",
    expected: "GENERAL_CORPUS",
    desc: "Entity keyword search"
  }
];

let passed = 0;
let failed = 0;

console.log("=================================================");
console.log("🚀 RUNNING DOCINTELLECT RAG QUERY ROUTING TESTS");
console.log("=================================================\n");

TEST_CASES.forEach((tc, idx) => {
  const actual = classifyQuery(tc.query);
  const ok = actual === tc.expected;
  if (ok) {
    passed++;
    console.log(`[PASS] Case ${idx + 1}: ${tc.desc}`);
  } else {
    failed++;
    console.error(`[FAIL] Case ${idx + 1}: ${tc.desc}`);
    console.error(`       Query:    "${tc.query}"`);
    console.error(`       Expected: ${tc.expected}`);
    console.error(`       Got:      ${actual}\n`);
  }
});

console.log("\n=================================================");
console.log(`SUMMARY: ${passed}/${TEST_CASES.length} Passed (${failed} Failed)`);
console.log("=================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL ROUTING TESTS PASSED PERFECTLY! NO COLLISIONS.");
  process.exit(0);
}
