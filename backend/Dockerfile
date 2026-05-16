# Build with repository root as context (see docker-compose / CI), e.g.:
#   docker build -f backend/Dockerfile .
FROM python:3.11-slim

# Installiere Build-Dependencies für bcrypt
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Non-root User erstellen für Security
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Dependencies als root installieren
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application Code (nur backend/)
COPY backend/ .

# Markdown-Hilfe (README + docs/) für GET /api/docs/help/{id}
RUN mkdir -p /app/help_docs
COPY README.md /app/help_docs/
COPY docs/*.md /app/help_docs/
ENV SERVICEDOCK_HELP_DOCS_DIR=/app/help_docs

# Upload-Verzeichnis erstellen (für Docker Volume Init)
RUN mkdir -p /app/uploads/wallpapers

# Ownership an appuser übergeben
RUN chown -R appuser:appuser /app

# Zu Non-root User wechseln
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
