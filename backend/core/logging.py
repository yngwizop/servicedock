"""Logging setup with sensitive data filtering"""
import logging
import sys
import re

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
    """
    Enhanced filter for sensitive data in logs
    Masks passwords, tokens, secrets, API keys, and other sensitive information
    """
    # Patterns to detect sensitive field names
    SENSITIVE_FIELD_PATTERNS = [
        'password', 'passwd', 'pwd',
        'token', 'access_token', 'refresh_token', 'jwt',
        'secret', 'api_key', 'apikey',
        'authorization', 'auth',
        'key', 'private', 'credential',
        'encryption_key', 'signing_key'
    ]
    
    # Regex patterns to mask sensitive values
    SENSITIVE_VALUE_PATTERNS = [
        (re.compile(r'(password["\']?\s*[:=]\s*["\']?)([^"\'}\s,]+)', re.IGNORECASE), r'\1***REDACTED***'),
        (re.compile(r'(token["\']?\s*[:=]\s*["\']?)([^"\'}\s,]+)', re.IGNORECASE), r'\1***REDACTED***'),
        (re.compile(r'(Bearer\s+)([A-Za-z0-9\-._~+/]+=*)', re.IGNORECASE), r'\1***REDACTED***'),
        (re.compile(r'([A-Za-z0-9]{32,})', re.IGNORECASE), r'***HASH_REDACTED***'),  # Long hashes
    ]
    
    def filter(self, record):
        """Filter and mask sensitive data in log records"""
        # Mask message string
        if isinstance(record.msg, str):
            record.msg = self._mask_sensitive_data(record.msg)
        
        # Mask args
        if record.args:
            if isinstance(record.args, dict):
                record.args = self._mask_dict(record.args)
            elif isinstance(record.args, (list, tuple)):
                record.args = tuple(self._mask_value(arg) for arg in record.args)
        
        return True
    
    def _mask_sensitive_data(self, text):
        """Apply regex patterns to mask sensitive data"""
        for pattern, replacement in self.SENSITIVE_VALUE_PATTERNS:
            text = pattern.sub(replacement, text)
        return text
    
    def _mask_dict(self, data):
        """Recursively mask sensitive fields in dictionaries"""
        if not isinstance(data, dict):
            return data
        
        masked = {}
        for key, value in data.items():
            key_lower = str(key).lower()
            
            # Check if key is sensitive
            if any(pattern in key_lower for pattern in self.SENSITIVE_FIELD_PATTERNS):
                masked[key] = '***REDACTED***'
            elif isinstance(value, dict):
                masked[key] = self._mask_dict(value)
            elif isinstance(value, (list, tuple)):
                masked[key] = [self._mask_dict(v) if isinstance(v, dict) else v for v in value]
            else:
                masked[key] = self._mask_value(value)
        
        return masked
    
    def _mask_value(self, value):
        """Mask individual values if they look sensitive"""
        if isinstance(value, str):
            return self._mask_sensitive_data(value)
        return value

# Initialize logger
logger = setup_logging()
logger.addFilter(SensitiveDataFilter())
