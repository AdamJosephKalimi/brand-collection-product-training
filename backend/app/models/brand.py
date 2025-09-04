from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime

class Brand(BaseModel):
    """Brand data model"""
    brand_id: str = Field(..., description="Unique brand identifier")
    user_id: str = Field(..., description="Owner user ID")
    name: str = Field(..., min_length=1, max_length=100, description="Brand name")
    description: Optional[str] = Field(None, max_length=500, description="Brand description")
    logo_url: Optional[HttpUrl] = Field(None, description="Brand logo URL")
    website: Optional[HttpUrl] = Field(None, description="Brand website")
    industry: Optional[str] = Field(None, description="Industry category")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class BrandCreate(BaseModel):
    """Model for creating a new brand"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    logo_url: Optional[HttpUrl] = None
    website: Optional[HttpUrl] = None
    industry: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class BrandUpdate(BaseModel):
    """Model for updating a brand"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    logo_url: Optional[HttpUrl] = None
    website: Optional[HttpUrl] = None
    industry: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class BrandResponse(BaseModel):
    """Brand response model for API responses"""
    brand_id: str
    name: str
    description: Optional[str]
    logo_url: Optional[str]
    website: Optional[str]
    industry: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_active: bool
