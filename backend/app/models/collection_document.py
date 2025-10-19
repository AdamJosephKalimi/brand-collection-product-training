from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class CollectionDocumentType(str, Enum):
    """Collection document types"""
    LINE_SHEET = "line_sheet"
    LOOKBOOK = "lookbook"
    PRODUCT_CATALOG = "product_catalog"
    TECH_PACK = "tech_pack"
    PRICE_LIST = "price_list"
    ORDER_FORM = "order_form"
    PURCHASE_ORDER = "purchase_order"
    BRAND_GUIDELINES = "brand_guidelines"
    MARKETING_MATERIALS = "marketing_materials"
    OTHER = "other"


class CollectionDocument(BaseModel):
    """Complete collection document data model"""
    document_id: str = Field(..., description="Unique document identifier")
    collection_id: str = Field(..., description="Parent collection ID")
    brand_id: str = Field(..., description="Parent brand ID (for reference)")
    
    # Document Identity
    name: str = Field(..., min_length=1, max_length=200, description="Document name")
    type: CollectionDocumentType = Field(..., description="Document type/category")
    file_type: str = Field(..., description="File extension (pdf, xlsx, docx, etc.)")
    
    # Storage
    storage_path: str = Field(..., description="Firebase Storage path")
    url: str = Field(..., description="Firebase Storage signed URL")
    file_size_bytes: int = Field(..., ge=0, description="File size in bytes")
    
    # Parsed Content
    parsed_text: Optional[str] = Field(None, description="Extracted text from document")
    normalized_text: Optional[str] = Field(None, description="Normalized/cleaned text for LLM processing")
    parsed_at: Optional[datetime] = Field(None, description="When document was parsed")
    
    # Metadata
    uploaded_by: str = Field(..., description="User ID who uploaded the document")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)


class CollectionDocumentCreate(BaseModel):
    """Model for uploading a new collection document"""
    collection_id: str = Field(..., description="Parent collection ID")
    name: str = Field(..., min_length=1, max_length=200)
    type: CollectionDocumentType
    # Note: file will be uploaded via multipart/form-data, not in JSON


class CollectionDocumentUpdate(BaseModel):
    """Model for updating collection document metadata"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[CollectionDocumentType] = None


class CollectionDocumentResponse(BaseModel):
    """Collection document response model for API responses"""
    document_id: str
    collection_id: str
    brand_id: str
    name: str
    type: CollectionDocumentType
    file_type: str
    storage_path: str
    url: str
    file_size_bytes: int
    parsed_text: Optional[str]
    normalized_text: Optional[str]
    parsed_at: Optional[datetime]
    uploaded_by: str
    uploaded_at: datetime
    updated_at: datetime
