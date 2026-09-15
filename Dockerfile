# ==============================================================================
# DocIntel Multimodal Backend - Production Dockerfile
# Zero-Cost, Security Hardened, Non-Root Execution with Poppler & FAISS Support
# ==============================================================================

FROM python:3.11-slim

# Prevent Python from writing .pyc and enable unbuffered streaming logs
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PORT=8000

# Install required system packages:
# - poppler-utils: PDF rendering / rasterization for multimodal vision extraction
# - libgomp1: OpenMP runtime for FAISS vector similarity operations
# - curl: Container healthcheck probing
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    libgomp1 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user for defense-in-depth security
RUN groupadd -g 1000 docintel && \
    useradd -u 1000 -g docintel -s /bin/bash -m docintel

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create runtime directories for storage & volume mounts
RUN mkdir -p /app/data/uploads /app/data/sample_docs /app/db /app/vector_store /app/eval \
    && chown -R docintel:docintel /app

# Copy application source modules
COPY --chown=docintel:docintel src/ /app/src/
COPY --chown=docintel:docintel api/ /app/api/
COPY --chown=docintel:docintel eval/ /app/eval/
COPY --chown=docintel:docintel data/sample_docs/ /app/data/sample_docs/

# Switch to non-root user
USER docintel

# Expose internal API port
EXPOSE 8000

# Container health probe checking database, FAISS, and pipeline workers
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Launch production ASGI server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
