"""Database connection pool and dependency injection"""
import psycopg2
import psycopg2.pool
from urllib.parse import urlparse, parse_qs
from fastapi import HTTPException
import logging

from .settings import DATABASE_URL

logger = logging.getLogger("dashboard")

# Global connection pool
db_pool = None

def initialize_connection_pool():
    """Initialisiert den PostgreSQL Connection Pool beim Startup."""
    global db_pool
    try:
        result = urlparse(DATABASE_URL)
        # Extrahiere optionale SSL-Parameter aus der URL (z.B. sslmode)
        query = parse_qs(result.query)
        conn_kwargs = dict(
            dbname=result.path[1:],
            user=result.username,
            password=result.password,
            host=result.hostname,
            port=result.port
        )
        # Übernehme alle Query-Parameter (z.B. sslmode, sslrootcert, sslcert, sslkey)
        for k, v in query.items():
            if len(v) == 1:
                conn_kwargs[k] = v[0]
            else:
                conn_kwargs[k] = v
        db_pool = psycopg2.pool.SimpleConnectionPool(
            minconn=2,
            maxconn=10,
            **conn_kwargs
        )
        logger.info("Database connection pool initialized (min=2, max=10)")
    except Exception as e:
        logger.error("Failed to initialize connection pool", exc_info=True)
        raise

def get_db():
    """
    FastAPI Dependency: Holt Connection aus Pool, gibt sie nach Request zurück.
    Usage: db = Depends(get_db)
    
    HINWEIS: Verwendet 'global db_pool' zur Laufzeit (nicht beim Import),
    um sicherzustellen, dass der Pool bereits initialisiert ist.
    """
    global db_pool
    if db_pool is None:
        logger.error("Connection pool not initialized")
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    conn = None
    try:
        conn = db_pool.getconn()
        if conn is None:
            logger.error("No connection available from pool")
            raise HTTPException(status_code=503, detail="Service temporarily unavailable")
        yield conn
    except psycopg2.pool.PoolError as e:
        logger.error("Connection pool error", exc_info=True)
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")
    finally:
        if conn is not None:
            db_pool.putconn(conn)
