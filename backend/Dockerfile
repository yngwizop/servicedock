# Build with repository root as context (see docker-compose / CI), e.g.:
#   docker build -f backend/Dockerfile .
#
# Multi-stage: install wheels in builder, copy only site-packages into slim runtime.
# No gcc/libffi-dev — all prod deps ship pre-built wheels for linux/amd64 and arm64.

FROM python:3.11-slim AS builder

WORKDIR /build
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

COPY --from=builder /install /usr/local

COPY backend/ .

RUN mkdir -p /app/help_docs /app/uploads/wallpapers
COPY README.md /app/help_docs/
COPY docs/*.md /app/help_docs/
ENV SERVICEDOCK_HELP_DOCS_DIR=/app/help_docs

RUN chown -R appuser:appuser /app

USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
