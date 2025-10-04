from pydantic import BaseModel, Field, HttpUrl, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Gender(str, Enum):
    """Gender categories for items"""
    MEN = "men"
    WOMEN = "women"
    UNISEX = "unisex"
    KIDS = "kids"
    BOYS = "boys"
    GIRLS = "girls"


class Currency(str, Enum):
    """Currency types"""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CNY = "CNY"
    CAD = "CAD"
    AUD = "AUD"
    CHF = "CHF"
    HKD = "HKD"
    SGD = "SGD"


class ItemImage(BaseModel):
    """Image associated with an item"""
    url: str = Field(..., description="Firebase Storage signed URL")
    alt: str = Field(..., description="Alternative text for image")
    storage_path: str = Field(..., description="Path in Firebase Storage")


class ItemVariant(BaseModel):
    """Product variant (color/size combination)"""
    color: str = Field(..., description="Color name")
    sizes: List[str] = Field(default_factory=list, description="Available sizes")
    sku_suffix: Optional[str] = Field(None, description="SKU suffix for this variant")


class Item(BaseModel):
    """Complete item/product data model"""
    item_id: str = Field(..., description="Unique item identifier")
    collection_id: str = Field(..., description="Parent collection ID")
    
    # Product Identity
    product_name: str = Field(..., min_length=1, max_length=200, description="Product name")
    sku: str = Field(..., description="Stock keeping unit")
    category: str = Field(..., description="Product category")
    subcategory: Optional[str] = Field(None, description="Product subcategory")
    gender: Optional[Gender] = Field(None, description="Target gender")
    description: Optional[str] = Field(None, max_length=2000, description="Product description")
    
    # Product Details
    materials: List[str] = Field(default_factory=list, description="Materials used")
    care_instructions: List[str] = Field(default_factory=list, description="Care instructions")
    process: List[str] = Field(default_factory=list, description="Manufacturing processes")
    
    # Pricing
    origin: Optional[str] = Field(None, description="Country of origin")
    wholesale_price: Optional[float] = Field(None, ge=0, description="Wholesale price")
    rrp: Optional[float] = Field(None, ge=0, description="Recommended retail price")
    currency: Currency = Field(..., description="Currency for prices")
    
    # Highlighting
    highlighted_item: bool = Field(default=False, description="Whether this is a featured/hero item")
    
    # Media
    images: List[ItemImage] = Field(default_factory=list, description="Product images")
    
    # Variants
    variants: List[ItemVariant] = Field(default_factory=list, description="Product variants")
    
    # Tags
    tags: List[str] = Field(default_factory=list, description="Product tags")
    
    # Source Tracking
    source_document_id: Optional[str] = Field(None, description="Document this item was extracted from")
    extraction_confidence: Optional[float] = Field(None, ge=0, le=1, description="AI extraction confidence score")
    manual_review: bool = Field(default=False, description="Whether item has been manually reviewed")
    reviewed_by: Optional[str] = Field(None, description="User ID who reviewed this item")
    reviewed_at: Optional[datetime] = Field(None, description="When item was reviewed")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)


class ItemCreate(BaseModel):
    """Model for creating a new item"""
    collection_id: str = Field(..., description="Parent collection ID")
    product_name: str = Field(..., min_length=1, max_length=200)
    sku: str
    category: str
    subcategory: Optional[str] = None
    gender: Optional[Gender] = None
    description: Optional[str] = Field(None, max_length=2000)
    materials: Optional[List[str]] = None
    care_instructions: Optional[List[str]] = None
    process: Optional[List[str]] = None
    origin: Optional[str] = None
    wholesale_price: Optional[float] = Field(None, ge=0)
    rrp: Optional[float] = Field(None, ge=0)
    currency: Currency
    highlighted_item: Optional[bool] = False
    images: Optional[List[ItemImage]] = None
    variants: Optional[List[ItemVariant]] = None
    tags: Optional[List[str]] = None
    source_document_id: Optional[str] = None
    extraction_confidence: Optional[float] = Field(None, ge=0, le=1)


class ItemUpdate(BaseModel):
    """Model for updating an item"""
    product_name: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    gender: Optional[Gender] = None
    description: Optional[str] = Field(None, max_length=2000)
    materials: Optional[List[str]] = None
    care_instructions: Optional[List[str]] = None
    process: Optional[List[str]] = None
    origin: Optional[str] = None
    wholesale_price: Optional[float] = Field(None, ge=0)
    rrp: Optional[float] = Field(None, ge=0)
    currency: Optional[Currency] = None
    highlighted_item: Optional[bool] = None
    images: Optional[List[ItemImage]] = None
    variants: Optional[List[ItemVariant]] = None
    tags: Optional[List[str]] = None
    manual_review: Optional[bool] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class ItemResponse(BaseModel):
    """Item response model for API responses"""
    item_id: str
    collection_id: str
    product_name: str
    sku: str
    category: str
    subcategory: Optional[str]
    gender: Optional[Gender]
    description: Optional[str]
    materials: List[str]
    care_instructions: List[str]
    process: List[str]
    origin: Optional[str]
    wholesale_price: Optional[float]
    rrp: Optional[float]
    currency: Currency
    highlighted_item: bool
    images: List[ItemImage]
    variants: List[ItemVariant]
    tags: List[str]
    source_document_id: Optional[str]
    extraction_confidence: Optional[float]
    manual_review: bool
    reviewed_by: Optional[str]
    reviewed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
