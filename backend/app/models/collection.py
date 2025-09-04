from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class DocumentType(str, Enum):
    """Supported document types"""
    PDF = "pdf"
    EXCEL = "excel"
    IMAGE = "image"
    JSON = "json"

class DocumentStatus(str, Enum):
    """Document processing status"""
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"

class Document(BaseModel):
    """Document metadata model"""
    document_id: str = Field(..., description="Unique document identifier")
    filename: str = Field(..., description="Original filename")
    file_url: str = Field(..., description="Storage URL")
    document_type: DocumentType = Field(..., description="Document type")
    file_size: int = Field(..., description="File size in bytes")
    status: DocumentStatus = Field(default=DocumentStatus.UPLOADED)
    uploaded_at: datetime = Field(default_factory=datetime.now)
    processed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Collection(BaseModel):
    """Collection data model"""
    collection_id: str = Field(..., description="Unique collection identifier")
    brand_id: str = Field(..., description="Parent brand ID")
    user_id: str = Field(..., description="Owner user ID")
    name: str = Field(..., min_length=1, max_length=100, description="Collection name")
    description: Optional[str] = Field(None, max_length=500, description="Collection description")
    season: Optional[str] = Field(None, description="Season/period")
    documents: List[Document] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    is_active: bool = Field(default=True)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class CollectionCreate(BaseModel):
    """Model for creating a new collection"""
    brand_id: str = Field(..., description="Parent brand ID")
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    season: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CollectionUpdate(BaseModel):
    """Model for updating a collection"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    season: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CollectionResponse(BaseModel):
    """Collection response model for API responses"""
    collection_id: str
    brand_id: str
    name: str
    description: Optional[str]
    season: Optional[str]
    document_count: int
    created_at: datetime
    updated_at: datetime
    is_active: bool

class DocumentUploadResponse(BaseModel):
    """Response model for document upload"""
    document_id: str
    filename: str
    file_url: str
    document_type: DocumentType
    file_size: int
    status: DocumentStatus
