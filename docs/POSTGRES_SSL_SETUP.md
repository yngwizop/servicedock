# PostgreSQL SSL Setup Guide

This guide explains how to generate and use self-signed SSL certificates for encrypted PostgreSQL connections in your Docker-based Servicedock setup.

---

## 🛡️ Why SSL?
Even in a local Docker network, encrypting the connection between your backend and PostgreSQL database is essential for security and compliance.

---

## 1. Generate SSL Certificates (on the host, not in a container)

Open a terminal in your project root and run:

```bash
mkdir -p ./db/ssl
openssl req -new -x509 -days 365 -nodes -text -out ./db/ssl/server.crt -keyout ./db/ssl/server.key -subj "/CN=postgres"
chmod 600 ./db/ssl/server.key
sudo chown 999:999 ./db/ssl/server.key
sudo chown 999:999 ./db/ssl/server.crt
```

- `server.crt`: The public certificate for PostgreSQL
- `server.key`: The private key (must be protected!)
- `999:999`: Default UID/GID for the `postgres` user in the official Docker image

---

## 2. Docker Compose: Mount Certificates and Enable SSL

Ensure your `docker-compose.yml` for the `db` service includes these lines:

```yaml
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
      - ./db/ssl/server.crt:/var/lib/postgresql/server.crt:ro
      - ./db/ssl/server.key:/var/lib/postgresql/server.key:ro
    command: [
      "postgres",
      "-c", "ssl=on",
      "-c", "ssl_cert_file=/var/lib/postgresql/server.crt",
      "-c", "ssl_key_file=/var/lib/postgresql/server.key"
    ]
```

---

## 3. Enforce SSL in Your Environment

In your `.env` make sure your `DATABASE_URL` ends with `?sslmode=require`:

```
DATABASE_URL=postgresql://user:password@db:5432/dashboard?sslmode=require
```

---

## 4. Restart Docker Compose

```bash
docker compose down
docker compose up --build -d
```

---

## 5. Verify SSL is Active

**In the DB container:**
```bash
docker compose exec db psql -U user -d dashboard -c "SHOW ssl;"
```
Expected output: `on`

**In the backend container:**
```bash
docker compose exec backend python -c "import psycopg2; conn = psycopg2.connect('dbname=dashboard user=user host=db password=YOURPASS sslmode=require'); cur = conn.cursor(); cur.execute('SHOW ssl;'); print('SSL:', cur.fetchone()[0]); cur.close(); conn.close()"
```
Expected output: `SSL: on`

---

## 6. Troubleshooting

- **Permission denied for server.key:**
  - Run: `chmod 600 ./db/ssl/server.key && sudo chown 999:999 ./db/ssl/server.key ./db/ssl/server.crt`
- **SSL not active:**
  - Check that `sslmode=require` is in your `DATABASE_URL` and certificates are mounted correctly.
- **DB container won't start:**
  - Check logs: `docker compose logs db --tail=100`

---

## 7. What to Do When the Certificate Has Expired

If your PostgreSQL SSL certificate (`server.crt`) has expired, follow these steps to renew it:

1. **Generate a new certificate and key:**
  ```bash
  openssl req -new -x509 -days 365 -nodes -text -out ./db/ssl/server.crt -keyout ./db/ssl/server.key -subj "/CN=postgres"
  chmod 600 ./db/ssl/server.key
  sudo chown 999:999 ./db/ssl/server.key ./db/ssl/server.crt
  ```

2. **Replace the old certificate and key:**
  Overwrite the existing `server.crt` and `server.key` files in `./db/ssl/` with the new ones.

3. **Restart the PostgreSQL container:**
  ```bash
  docker compose restart db
  ```

4. **Test the connection:**
  ```bash
  docker compose exec db psql -U user -d dashboard -c "SHOW ssl;"
  ```
  The output should be `on`.

5. **(Optional) Restart the backend container:**
  If you encounter issues, restart the backend as well:
  ```bash
  docker compose restart backend
  ```

Your database connection is now secured with a new, valid certificate.

---

**For more details, see [QUICKSTART.md](QUICKSTART.md) and [HTTPS_SETUP.md](HTTPS_SETUP.md).**
