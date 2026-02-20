"""Pydantic models for LDAP/Active Directory configuration"""
from pydantic import BaseModel, Field, validator
from typing import Optional


class LdapConfigRequest(BaseModel):
    """Request model für LDAP-Config speichern"""
    enabled: bool = True
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(389, ge=1, le=65535)
    use_ssl: bool = False
    use_starttls: bool = False
    base_dn: str = Field(..., min_length=1, max_length=500)
    user_search_base: Optional[str] = Field(None, max_length=500)
    bind_dn: Optional[str] = Field(None, max_length=500)
    bind_password: Optional[str] = Field(None, max_length=1000)
    user_attribute: str = Field("sAMAccountName", max_length=100)
    domain: Optional[str] = Field(None, max_length=255)
    admin_group_dn: Optional[str] = Field(None, max_length=500)
    viewer_group_dn: Optional[str] = Field(None, max_length=500)
    
    @validator('host')
    def host_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Host cannot be empty')
        return v.strip()
    
    @validator('base_dn')
    def base_dn_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Base DN cannot be empty')
        return v.strip()


class LdapConfigResponse(BaseModel):
    """Response model für LDAP-Config (ohne Passwort)"""
    enabled: bool = False
    host: Optional[str] = None
    port: int = 389
    use_ssl: bool = False
    use_starttls: bool = False
    base_dn: Optional[str] = None
    user_search_base: Optional[str] = None
    bind_dn: Optional[str] = None
    has_bind_password: bool = False  # Zeigt nur ob ein Passwort gesetzt ist
    user_attribute: str = "sAMAccountName"
    domain: Optional[str] = None
    admin_group_dn: Optional[str] = None
    viewer_group_dn: Optional[str] = None


class LdapTestRequest(BaseModel):
    """Request model für Verbindungstest"""
    host: str = Field(..., min_length=1, max_length=255)
    port: int = Field(389, ge=1, le=65535)
    use_ssl: bool = False
    use_starttls: bool = False
    base_dn: str = Field(..., min_length=1, max_length=500)
    user_search_base: Optional[str] = Field(None, max_length=500)
    bind_dn: Optional[str] = Field(None, max_length=500)
    bind_password: Optional[str] = Field(None, max_length=1000)
    admin_group_dn: Optional[str] = Field(None, max_length=500)
    viewer_group_dn: Optional[str] = Field(None, max_length=500)


class LdapTestResponse(BaseModel):
    """Response model für Verbindungstest"""
    success: bool
    message: str
    server: Optional[str] = None
    users_found: Optional[int] = None
    groups: Optional[list] = None
