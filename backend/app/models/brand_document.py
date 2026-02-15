from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class BrandDocumentType(str, Enum):
    """Brand document types"""
    BRAND_GUIDE = "brand_guide"
    LOGO_PACK = "logo_pack"
    LOOKBOOK = "lookbook"
    PRESS_KIT = "press_kit"
    STYLE_GUIDE = "style_guide"
    PRODUCT_CATALOG = "product_catalog"
    MARKETING_MATERIALS = "marketing_materials"
    OTHER = "other"


class BrandDocument(BaseModel):
    """Complete brand document data model"""
    document_id: str = Field(..., description="Unique document identifier")
    brand_id: str = Field(..., description="Parent brand ID")
    
    # Document Identity
    name: str = Field(..., min_length=1, max_length=200, description="Document name")
    type: BrandDocumentType = Field(..., description="Document type/category")
    file_type: str = Field(..., description="File extension (pdf, zip, docx, etc.)")
    
    # Storage
    storage_path: str = Field(..., description="Firebase Storage path")
    url: str = Field(..., description="Firebase Storage signed URL")
    file_size_bytes: int = Field(..., ge=0, description="File size in bytes")
    
    # Metadata
    uploaded_by: str = Field(..., description="User ID who uploaded the document")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)


class BrandDocumentCreate(BaseModel):
    """Model for uploading a new brand document"""
    brand_id: str = Field(..., description="Parent brand ID")
    name: str = Field(..., min_length=1, max_length=200)
    type: BrandDocumentType
    # Note: file will be uploaded via multipart/form-data, not in JSON


class BrandDocumentUpdate(BaseModel):
    """Model for updating brand document metadata"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[BrandDocumentType] = None


class BrandDocumentResponse(BaseModel):
    """Brand document response model for API responses"""
    document_id: str
    brand_id: str
    name: str
    type: BrandDocumentType
    file_type: str
    storage_path: str
    url: str
    file_size_bytes: int
    uploaded_by: str
    uploaded_at: datetime
    updated_at: datetime
    # RAG processing fields
    status: Optional[str] = "uploaded"  # uploaded, processing, processed, failed
    chunk_count: Optional[int] = None
    parsed_text_preview: Optional[str] = None  # First 200 chars of parsed text
