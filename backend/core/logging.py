"""Logging setup with sensitive data filtering"""
import logging
import sys

def setup_logging():
    """Konfiguriert strukturiertes Logging mit Sensitive-Data-Filter"""
    
    # Erstelle Logger
    logger = logging.getLogger("dashboard")
    logger.setLevel(logging.INFO)
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_format)
    
    logger.addHandler(console_handler)
    
    return logger

class SensitiveDataFilter(logging.Filter):
    """Filtert sensible Daten aus Logs"""
    SENSITIVE_PATTERNS = [
        'password', 'token', 'secret', 'key', 'authorization',
        'api_key', 'access_token', 'refresh_token'
    ]
    
    def filter(self, record):
        # Filtere nur wenn Message sensible Patterns enthält
        message_lower = str(record.msg).lower()
        for pattern in self.SENSITIVE_PATTERNS:
            if pattern in message_lower:
                # Ersetze Args mit REDACTED
                if record.args:
                    record.args = tuple(['***REDACTED***'] * len(record.args))
                # Bei Token/Secret im Message: redact
                if 'token' in message_lower or 'secret' in message_lower:
                    record.msg = record.msg[:50] + ' ***REDACTED***'
        return True

# Initialize logger
logger = setup_logging()
logger.addFilter(SensitiveDataFilter())
