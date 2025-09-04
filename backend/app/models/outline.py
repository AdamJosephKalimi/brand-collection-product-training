from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class OutlineStatus(str, Enum):
    """Outline generation status"""
    DRAFT = "draft"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"

class PaginationType(str, Enum):
    """Pagination options for slides"""
    ONE_PER_SLIDE = "1_per_slide"
    TWO_PER_SLIDE = "2_per_slide"
    FOUR_PER_SLIDE = "4_per_slide"

class SlideSection(BaseModel):
    """Individual slide section configuration"""
    section_id: str = Field(..., description="Section identifier")
    title: str = Field(..., description="Section title")
    description: Optional[str] = Field(None, description="Section description")
    is_enabled: bool = Field(default=True, description="Whether section is included")
    order: int = Field(..., description="Section order in presentation")
    content_prompt: Optional[str] = Field(None, description="Custom content generation prompt")

class Outline(BaseModel):
    """Presentation outline data model"""
    outline_id: str = Field(..., description="Unique outline identifier")
    collection_id: str = Field(..., description="Parent collection ID")
    brand_id: str = Field(..., description="Parent brand ID")
    user_id: str = Field(..., description="Owner user ID")
    name: str = Field(..., min_length=1, max_length=100, description="Outline name")
    description: Optional[str] = Field(None, max_length=500, description="Outline description")
    sections: List[SlideSection] = Field(..., description="Slide sections configuration")
    pagination: PaginationType = Field(default=PaginationType.FOUR_PER_SLIDE)
    language: str = Field(default="en", description="Content language")
    status: OutlineStatus = Field(default=OutlineStatus.DRAFT)
    generated_content: Optional[Dict[str, Any]] = Field(None, description="Generated slide content")
    presentation_url: Optional[str] = Field(None, description="Generated presentation URL")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    generated_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class OutlineCreate(BaseModel):
    """Model for creating a new outline"""
    collection_id: str = Field(..., description="Parent collection ID")
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    sections: List[SlideSection] = Field(..., description="Slide sections configuration")
    pagination: PaginationType = Field(default=PaginationType.FOUR_PER_SLIDE)
    language: str = Field(default="en")
    metadata: Optional[Dict[str, Any]] = None

class OutlineUpdate(BaseModel):
    """Model for updating an outline"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    sections: Optional[List[SlideSection]] = None
    pagination: Optional[PaginationType] = None
    language: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class OutlineResponse(BaseModel):
    """Outline response model for API responses"""
    outline_id: str
    collection_id: str
    brand_id: str
    name: str
    description: Optional[str]
    section_count: int
    pagination: PaginationType
    language: str
    status: OutlineStatus
    presentation_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    generated_at: Optional[datetime]

class GenerateRequest(BaseModel):
    """Request model for generating presentation content"""
    outline_id: str = Field(..., description="Outline to generate content for")
    force_regenerate: bool = Field(default=False, description="Force regeneration of existing content")

class GenerateResponse(BaseModel):
    """Response model for content generation"""
    outline_id: str
    status: OutlineStatus
    message: str
