"""
Document models for the document processing pipeline.
Includes Document, Chunk, and Image models with all necessary metadata.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


class DocumentStatus(str, Enum):
    """Document processing status enum"""
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PARSING = "parsing"
    CHUNKING = "chunking"
    STORING = "storing"
    EMBEDDING = "embedding"
    INDEXING = "indexing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentType(str, Enum):
    """Document type enum"""
    PDF = "pdf"
    DOCX = "docx"
    XLSX = "xlsx"
    XLS = "xls"
    PNG = "png"
    JPG = "jpg"
    JPEG = "jpeg"


class DocumentBase(BaseModel):
    """Base document model"""
    collection_id: str
    filename: str
    file_type: DocumentType
    file_size: int  # in bytes
    storage_path: str  # Firebase Storage path
    
    # Processing metadata
    status: DocumentStatus = DocumentStatus.QUEUED
    processing_step: Optional[str] = None
    error_message: Optional[str] = None
    
    # Statistics
    total_chunks: int = 0
    total_images: int = 0
    total_vectors: int = 0
    processing_time_ms: Optional[int] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None


class Document(DocumentBase):
    """Document model with ID"""
    document_id: str
    
    model_config = ConfigDict(from_attributes=True)


class DocumentCreate(BaseModel):
    """Model for creating a document"""
    collection_id: str
    filename: str
    file_type: DocumentType
    file_size: int
    storage_path: str


class DocumentUpdate(BaseModel):
    """Model for updating document status"""
    status: Optional[DocumentStatus] = None
    processing_step: Optional[str] = None
    error_message: Optional[str] = None
    total_chunks: Optional[int] = None
    total_images: Optional[int] = None
    total_vectors: Optional[int] = None
    processing_time_ms: Optional[int] = None
    processed_at: Optional[datetime] = None


class ChunkBase(BaseModel):
    """Base chunk model"""
    document_id: str
    collection_id: str
    
    # Text content
    text: str
    chunk_index: int
    start_index: int
    end_index: int
    
    # Related images
    image_ids: List[str] = Field(default_factory=list)
    
    # Metadata
    page_number: Optional[int] = None
    section: Optional[str] = None
    
    # Vector information
    vector_id: Optional[str] = None
    embedding_model: Optional[str] = None
    embedding_dimension: Optional[int] = None
    indexed_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Chunk(ChunkBase):
    """Chunk model with ID"""
    chunk_id: str
    
    model_config = ConfigDict(from_attributes=True)


class ChunkCreate(BaseModel):
    """Model for creating a chunk"""
    document_id: str
    collection_id: str
    text: str
    chunk_index: int
    start_index: int
    end_index: int
    image_ids: List[str] = Field(default_factory=list)
    page_number: Optional[int] = None
    section: Optional[str] = None


class ChunkUpdate(BaseModel):
    """Model for updating chunk with vector information"""
    vector_id: str
    embedding_model: str
    embedding_dimension: int
    indexed_at: datetime = Field(default_factory=datetime.utcnow)


class ImageBase(BaseModel):
    """Base image model"""
    document_id: str
    collection_id: str
    
    # Storage information
    storage_path: str  # Firebase Storage path
    thumbnail_path: Optional[str] = None
    
    # Image metadata
    filename: str
    mime_type: str
    file_size: int  # in bytes
    width: Optional[int] = None
    height: Optional[int] = None
    
    # Extracted text (from OCR)
    ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    
    # Context
    page_number: Optional[int] = None
    position_in_document: Optional[int] = None
    caption: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None


class Image(ImageBase):
    """Image model with ID"""
    image_id: str
    
    model_config = ConfigDict(from_attributes=True)


class ImageCreate(BaseModel):
    """Model for creating an image record"""
    document_id: str
    collection_id: str
    storage_path: str
    filename: str
    mime_type: str
    file_size: int
    width: Optional[int] = None
    height: Optional[int] = None
    page_number: Optional[int] = None
    position_in_document: Optional[int] = None


class ImageUpdate(BaseModel):
    """Model for updating image with OCR results"""
    ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    thumbnail_path: Optional[str] = None
    caption: Optional[str] = None
    processed_at: datetime = Field(default_factory=datetime.utcnow)


class ProcessingStatus(BaseModel):
    """Model for tracking document processing status"""
    document_id: str
    status: DocumentStatus
    processing_step: Optional[str] = None
    progress_percentage: Optional[float] = None
    
    # Statistics
    chunks_processed: int = 0
    images_processed: int = 0
    vectors_created: int = 0
    
    # Error tracking
    error_message: Optional[str] = None
    error_details: Optional[Dict[str, Any]] = None
    retry_count: int = 0
    
    # Timestamps
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)


class DocumentWithChunks(Document):
    """Document model with associated chunks"""
    chunks: List[Chunk] = Field(default_factory=list)


class DocumentWithImages(Document):
    """Document model with associated images"""
    images: List[Image] = Field(default_factory=list)


class DocumentComplete(Document):
    """Complete document model with all associations"""
    chunks: List[Chunk] = Field(default_factory=list)
    images: List[Image] = Field(default_factory=list)
    processing_status: Optional[ProcessingStatus] = None


# Batch processing models
class BatchProcessingRequest(BaseModel):
    """Model for batch document processing request"""
    collection_id: str
    document_ids: List[str]
    priority: str = "normal"  # normal, high, low


class BatchProcessingStatus(BaseModel):
    """Model for batch processing status"""
    batch_id: str
    collection_id: str
    total_documents: int
    processed_documents: int
    failed_documents: int
    status: str  # processing, completed, failed
    started_at: datetime
    estimated_completion: Optional[datetime] = None
    completed_at: Optional[datetime] = None
