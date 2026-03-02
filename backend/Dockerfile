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
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application Code kopieren
COPY . .

# Upload-Verzeichnis erstellen (für Docker Volume Init)
RUN mkdir -p /app/uploads/wallpapers

# Ownership an appuser übergeben
RUN chown -R appuser:appuser /app

# Zu Non-root User wechseln
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]