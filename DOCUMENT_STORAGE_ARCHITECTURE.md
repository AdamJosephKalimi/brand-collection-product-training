# Document Storage Architecture

## Overview
This document outlines the comprehensive architecture for handling user-uploaded documents in the Brand Collection Product Training platform. The system supports parsing various file types (PDFs, DOCX, Excel, images), chunking text, generating embeddings, storing metadata and images in Firebase, and linking embeddings in Pinecone for retrieval-augmented generation (RAG).

## System Components

### 1. Core Services
- **Firebase Firestore**: Document metadata, chunks, and relationships
- **Firebase Storage**: Binary file storage (PDFs, images, documents)
- **OpenAI API**: Text embeddings generation (text-embedding-3-small)
- **Pinecone Vector Store**: Vector embeddings storage and similarity search
- **FastAPI Backend**: Orchestration and processing pipeline

## Document Ingestion Pipeline

### Step 1: Document Upload
**Input**: User uploads file through React frontend
**Process**:
```
Frontend → FastAPI /collections/{collection_id}/documents/upload
         → Validate file type (PDF, DOCX, XLSX, PNG, JPG)
         → Generate unique document_id
         → Store original file in Firebase Storage
```
**Output**: Document record created in Firestore with status: "processing"

### Step 2: File Parsing
**Input**: Document from Firebase Storage
**Process**:
```python
# Parser selection based on file type
if file_type == "pdf":
    use PyPDF2 or pdfplumber
elif file_type == "docx":
    use python-docx
elif file_type in ["xlsx", "xls"]:
    use pandas or openpyxl
elif file_type in ["png", "jpg", "jpeg"]:
    use pytesseract for OCR
```
**Output**: Extracted text content and metadata

### Step 3: Image Extraction & Parallel Processing
**Input**: Document content (PDFs, DOCX)
**Process**:
```python
# Parallel image processing
import asyncio

async def process_images(document_content):
    extracted_images = extract_images_from_document(document_content)
    
    # Process all images in parallel
    tasks = []
    for image in extracted_images:
        tasks.append(process_single_image(image))
    
    # Execute all image processing tasks concurrently
    image_results = await asyncio.gather(*tasks)
    return image_results

async def process_single_image(image):
    image_id = generate_unique_id()
    storage_path = f"/collections/{collection_id}/images/{image_id}"
    await upload_to_firebase_storage(image, storage_path)
    metadata = create_image_metadata(image_id, storage_path)
    return metadata
```
**Output**: List of image references with storage URLs (processed in parallel)

### Step 4: Text Chunking
**Input**: Extracted text content
**Process**:
```python
# Chunking strategy
chunk_size = 500  # characters
overlap = 100      # character overlap between chunks

chunks = []
for i in range(0, len(text), chunk_size - overlap):
    chunk = {
        "text": text[i:i + chunk_size],
        "start_index": i,
        "end_index": min(i + chunk_size, len(text)),
        "chunk_index": len(chunks),
        "document_id": document_id
    }
    chunks.append(chunk)
```
**Output**: Array of text chunks with positional metadata

### Step 5: Batch Chunk Storage in Firebase
**Input**: Text chunks array
**Process**:
```python
# Use single Firestore transaction for all chunks
from google.cloud import firestore

async def store_chunks_batch(document_id, chunks):
    db = firestore.Client()
    batch = db.batch()
    
    for chunk in chunks:
        chunk_ref = db.collection('collections').document(collection_id)\
                      .collection('documents').document(document_id)\
                      .collection('chunks').document()
        
        chunk_data = {
            "chunk_id": chunk_ref.id,
            "document_id": document_id,
            "collection_id": collection_id,
            "text": chunk["text"],
            "chunk_index": chunk["chunk_index"],
            "start_index": chunk["start_index"],
            "end_index": chunk["end_index"],
            "images": chunk.get("images", []),
            "metadata": {
                "page_number": chunk.get("page_number", 1),
                "section": chunk.get("section"),
                "created_at": firestore.SERVER_TIMESTAMP
            }
        }
        batch.set(chunk_ref, chunk_data)
    
    # Commit all chunks in single transaction
    await batch.commit()
```
**Output**: All chunks stored atomically in single Firestore transaction

### Step 6: Batch Embedding Generation
**Input**: Text chunks
**Process**:
```python
from openai import OpenAI

client = OpenAI()
BATCH_SIZE = 2048  # OpenAI max batch size

async def generate_embeddings_batch(chunks):
    all_embeddings = []
    
    # Process chunks in batches of 2048
    for i in range(0, len(chunks), BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        texts = [chunk["text"] for chunk in batch]
        
        # Single API call for up to 2048 texts
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=texts  # Batch input
        )
        
        # Map embeddings back to chunks
        for j, embedding_data in enumerate(response.data):
            all_embeddings.append({
                "chunk_id": batch[j]["chunk_id"],
                "vector": embedding_data.embedding
            })
    
    return all_embeddings

# Example: 5000 chunks = 3 API calls instead of 5000
```
**Output**: Vector embeddings for all chunks (generated in batches)

### Step 7: Batch Pinecone Vector Storage
**Input**: Embeddings with metadata
**Process**:
```python
import pinecone

BATCH_SIZE = 1000  # Pinecone recommended batch size

async def upsert_vectors_batch(embeddings, chunks):
    index = pinecone.Index("your-index-name")
    
    # Prepare vectors with metadata
    vectors = []
    for embedding, chunk in zip(embeddings, chunks):
        vectors.append({
            "id": f"{collection_id}_{document_id}_{chunk['chunk_id']}",
            "values": embedding["vector"],
            "metadata": {
                "collection_id": collection_id,
                "document_id": document_id,
                "chunk_id": chunk["chunk_id"],
                "chunk_index": chunk["chunk_index"],
                "text_preview": chunk["text"][:100]
            }
        })
    
    # Batch upsert in groups of 1000
    for i in range(0, len(vectors), BATCH_SIZE):
        batch = vectors[i:i + BATCH_SIZE]
        await index.upsert(
            vectors=batch,
            namespace=f"collection_{collection_id}",
            async_req=True
        )
    
    # Example: 5000 vectors = 5 upsert calls instead of 5000
```
**Output**: Vectors efficiently stored in Pinecone with batch upserts

### Step 8: Batch Metadata Linking
**Input**: Stored chunks and vectors
**Process**:
```python
# Update all chunks in single Firestore transaction
async def update_chunks_with_vectors(document_id, chunks, vector_ids):
    db = firestore.Client()
    batch = db.batch()
    
    for chunk, vector_id in zip(chunks, vector_ids):
        chunk_ref = db.collection('collections').document(collection_id)\
                      .collection('documents').document(document_id)\
                      .collection('chunks').document(chunk['chunk_id'])
        
        update_data = {
            "vector_id": vector_id,
            "embedding_model": "text-embedding-3-small",
            "embedding_dimension": 1536,
            "indexed_at": firestore.SERVER_TIMESTAMP
        }
        batch.update(chunk_ref, update_data)
    
    # Single transaction for all chunk updates
    await batch.commit()
```
**Output**: Bidirectional linking established in single transaction

### Step 9: Document Status Update
**Input**: Processing completion
**Process**:
```javascript
// Update document status in Firestore
/collections/{collection_id}/documents/{document_id}
{
    status: "completed",
    processed_at: timestamp,
    chunk_count: total_chunks,
    image_count: total_images,
    vector_count: total_vectors,
    processing_time_ms: elapsed_time
}
```
**Output**: Document marked as ready for RAG queries

### Step 10: RAG Query Processing
**Input**: User query
**Process**:
```python
# 1. Generate query embedding
query_embedding = openai.embeddings.create(
    model="text-embedding-3-small",
    input=user_query
)

# 2. Search Pinecone for similar vectors
results = index.query(
    vector=query_embedding,
    top_k=10,
    namespace=collection_id,
    include_metadata=True
)

# 3. Retrieve full chunks from Firebase
chunks = []
for match in results.matches:
    chunk = firestore.get_chunk(
        collection_id=match.metadata.collection_id,
        document_id=match.metadata.document_id,
        chunk_id=match.metadata.chunk_id
    )
    chunks.append(chunk)

# 4. Build context for LLM
context = "\n\n".join([chunk.text for chunk in chunks])

# 5. Generate response with OpenAI
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant..."},
        {"role": "user", "content": f"Context:\n{context}\n\nQuery: {user_query}"}
    ]
)
```
**Output**: AI-generated response with relevant context

## Data Models

### Firestore Collections

#### 1. Collections
```javascript
/brands/{brand_id}/collections/{collection_id}
{
    collection_id: "auto-generated",
    brand_id: "parent-brand-id",
    name: "Spring 2024 Collection",
    description: "...",
    created_by: "user_id",
    created_at: timestamp,
    updated_at: timestamp,
    document_count: 0,
    total_chunks: 0,
    total_vectors: 0
}
```

#### 2. Documents
```javascript
/collections/{collection_id}/documents/{document_id}
{
    document_id: "auto-generated",
    collection_id: "parent-collection-id",
    original_filename: "product_catalog.pdf",
    file_type: "pdf",
    storage_path: "collections/{collection_id}/documents/{document_id}/original.pdf",
    file_size_bytes: 1024000,
    status: "processing|completed|failed",
    error_message: null,
    chunk_count: 0,
    image_count: 0,
    vector_count: 0,
    created_at: timestamp,
    processed_at: timestamp,
    processing_time_ms: 0
}
```

#### 3. Chunks
```javascript
/collections/{collection_id}/documents/{document_id}/chunks/{chunk_id}
{
    chunk_id: "auto-generated",
    document_id: "parent-document-id",
    collection_id: "parent-collection-id",
    text: "Full chunk text content...",
    chunk_index: 0,
    start_index: 0,
    end_index: 500,
    images: ["image_id_1", "image_id_2"],
    vector_id: "{collection_id}_{document_id}_{chunk_id}",
    embedding_model: "text-embedding-3-small",
    embedding_dimension: 1536,
    metadata: {
        page_number: 1,
        section: "Introduction",
        language: "en"
    },
    created_at: timestamp,
    indexed_at: timestamp
}
```

#### 4. Images
```javascript
/collections/{collection_id}/images/{image_id}
{
    image_id: "auto-generated",
    collection_id: "parent-collection-id",
    source_document_id: "document-id",
    storage_path: "collections/{collection_id}/images/{image_id}.jpg",
    original_filename: "product_image_1.jpg",
    file_type: "jpg",
    file_size_bytes: 204800,
    width: 1920,
    height: 1080,
    alt_text: "Product description",
    ocr_text: "Extracted text if applicable",
    metadata: {
        page_number: 3,
        extraction_method: "pdf_extraction"
    },
    created_at: timestamp
}
```

### Pinecone Vector Structure

```python
{
    "id": "{collection_id}_{document_id}_{chunk_id}",
    "values": [0.1, 0.2, ...],  # 1536-dimensional vector
    "metadata": {
        "collection_id": "collection-123",
        "document_id": "document-456",
        "chunk_id": "chunk-789",
        "chunk_index": 0,
        "text_preview": "First 100 characters of chunk...",
        "page_number": 1,
        "file_type": "pdf",
        "created_at": "2024-01-01T00:00:00Z"
    }
}
```

## API Endpoints

### Document Management

```python
# Upload document
POST /api/collections/{collection_id}/documents/upload
Body: multipart/form-data with file

# Get document status
GET /api/collections/{collection_id}/documents/{document_id}

# List collection documents
GET /api/collections/{collection_id}/documents

# Delete document (cascades to chunks and vectors)
DELETE /api/collections/{collection_id}/documents/{document_id}
```

### RAG Queries

```python
# Semantic search within collection
POST /api/collections/{collection_id}/search
Body: {
    "query": "Find information about summer dresses",
    "top_k": 10,
    "filters": {
        "document_ids": ["doc1", "doc2"],  # Optional
        "file_types": ["pdf", "docx"]       # Optional
    }
}

# Generate AI response with context
POST /api/collections/{collection_id}/generate
Body: {
    "prompt": "Summarize the key features of the summer collection",
    "max_tokens": 500,
    "temperature": 0.7,
    "use_rag": true
}
```

## Error Handling

### Processing Failures
```python
try:
    # Document processing pipeline
    parse_document()
    extract_images()
    chunk_text()
    generate_embeddings()
    store_vectors()
except Exception as e:
    # Update document status
    firestore.update_document(
        document_id=document_id,
        data={
            "status": "failed",
            "error_message": str(e),
            "failed_at": timestamp
        }
    )
    # Log error for monitoring
    logger.error(f"Processing failed for {document_id}: {e}")
    # Cleanup partial data if necessary
    cleanup_partial_processing(document_id)
```

### Retry Logic
```python
@retry(max_attempts=3, backoff_factor=2)
def generate_embedding_with_retry(text):
    try:
        return openai.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
    except RateLimitError:
        time.sleep(1)
        raise
    except APIError as e:
        logger.error(f"OpenAI API error: {e}")
        raise
```

## Performance Optimizations

### 1. Batch Processing (Implemented in Pipeline)
```python
# Process embeddings in optimized batches
EMBEDDING_BATCH_SIZE = 2048  # OpenAI max batch size
VECTOR_BATCH_SIZE = 1000     # Pinecone recommended batch size

# Batch embedding generation
for i in range(0, len(chunks), EMBEDDING_BATCH_SIZE):
    batch = chunks[i:i + EMBEDDING_BATCH_SIZE]
    texts = [chunk["text"] for chunk in batch]
    
    # Single API call for up to 2048 texts
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    
    # Prepare vectors
    vectors = prepare_vectors(batch, response.data)
    
    # Batch upsert to Pinecone in groups of 1000
    for j in range(0, len(vectors), VECTOR_BATCH_SIZE):
        vector_batch = vectors[j:j + VECTOR_BATCH_SIZE]
        index.upsert(vectors=vector_batch, namespace=namespace)
```

### 2. Async Processing with Parallel Operations
```python
# Use background tasks with parallel processing
@app.post("/api/collections/{collection_id}/documents/upload")
async def upload_document(
    collection_id: str,
    file: UploadFile,
    background_tasks: BackgroundTasks
):
    # Quick validation and storage
    document_id = store_file(file)
    
    # Queue optimized processing pipeline
    background_tasks.add_task(
        process_document_optimized,
        collection_id=collection_id,
        document_id=document_id
    )
    
    return {"document_id": document_id, "status": "processing"}

async def process_document_optimized(collection_id: str, document_id: str):
    """Optimized document processing with parallel operations"""
    
    # Parse document
    document_content = await parse_document(document_id)
    
    # Parallel image processing
    image_task = asyncio.create_task(process_images(document_content))
    
    # Text processing while images are being handled
    chunks = create_chunks(document_content.text)
    
    # Batch store chunks in single transaction
    await store_chunks_batch(document_id, chunks)
    
    # Batch generate embeddings (2048 at a time)
    embeddings = await generate_embeddings_batch(chunks)
    
    # Batch upsert vectors (1000 at a time)
    await upsert_vectors_batch(embeddings, chunks)
    
    # Wait for image processing to complete
    image_results = await image_task
    
    # Update metadata in single transaction
    await update_document_complete(document_id, chunks, embeddings, image_results)
```

### 3. Caching Strategy
```python
# Cache frequently accessed chunks
from functools import lru_cache

@lru_cache(maxsize=500)
def get_chunk_with_cache(collection_id, document_id, chunk_id):
    return firestore.get_chunk(collection_id, document_id, chunk_id)

# Cache embedding results for common queries
@lru_cache(maxsize=100)
def get_query_embedding_cached(query_text):
    return openai.embeddings.create(
        model="text-embedding-3-small",
        input=query_text
    )
```

## Security Considerations

### 1. File Validation
```python
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.xlsx', '.xls', '.png', '.jpg', '.jpeg'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def validate_file(file):
    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type {ext} not allowed")
    
    # Check file size
    if file.size > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds {MAX_FILE_SIZE} bytes")
    
    # Verify MIME type matches extension
    mime_type = magic.from_buffer(file.file.read(2048), mime=True)
    file.file.seek(0)  # Reset file pointer
    
    if not is_mime_type_valid(mime_type, ext):
        raise ValueError("File content doesn't match extension")
```

### 2. Access Control
```python
# Verify user has access to collection
def verify_collection_access(user_id: str, collection_id: str):
    collection = firestore.get_collection(collection_id)
    brand = firestore.get_brand(collection.brand_id)
    
    if brand.owner_id != user_id and user_id not in brand.collaborators:
        raise PermissionError("User doesn't have access to this collection")
```

### 3. Data Sanitization
```python
# Sanitize text before storage
def sanitize_text(text):
    # Remove potential script injections
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
    # Remove other HTML tags if needed
    text = re.sub(r'<[^>]+>', '', text)
    # Limit chunk size to prevent abuse
    return text[:MAX_CHUNK_SIZE]
```

## Monitoring and Logging

### Key Metrics
```python
# Track processing metrics
metrics = {
    "documents_processed": Counter(),
    "processing_time": Histogram(),
    "embedding_generation_time": Histogram(),
    "vector_upsert_time": Histogram(),
    "failed_documents": Counter(),
    "total_chunks_created": Counter(),
    "total_vectors_stored": Counter()
}

# Log important events
logger.info(f"Document {document_id} processed successfully",
    extra={
        "collection_id": collection_id,
        "chunks": chunk_count,
        "vectors": vector_count,
        "processing_time_ms": elapsed_time
    }
)
```

## Cost Optimization

### 1. Embedding Model Selection
- **text-embedding-3-small**: 1536 dimensions, $0.02 per 1M tokens
- **text-embedding-3-large**: 3072 dimensions, $0.13 per 1M tokens
- Use small model for most use cases, large for critical accuracy needs

### 2. Pinecone Optimization
- Use namespaces to separate collections (included in base pricing)
- Implement TTL for temporary vectors
- Monitor index utilization and scale appropriately

### 3. Storage Optimization
- Compress images before storage
- Use Firebase Storage lifecycle rules to archive old documents
- Store only essential metadata in Firestore

## Future Enhancements

### 1. Advanced Chunking
- Semantic chunking based on content structure
- Dynamic chunk sizing based on content type
- Preserve formatting and structure information

### 2. Multi-modal Embeddings
- Generate embeddings for images using CLIP or similar models
- Combine text and image embeddings for richer search

### 3. Incremental Updates
- Support for updating individual chunks without reprocessing entire document
- Version control for document changes
- Differential embedding updates

### 4. Advanced RAG Features
- Hybrid search combining vector and keyword search
- Re-ranking results using cross-encoders
- Citation tracking and source attribution
- Multi-turn conversation context management

## Conclusion

This architecture provides a robust, scalable foundation for document storage and retrieval-augmented generation. The separation of concerns between Firebase (storage and metadata), OpenAI (embeddings), and Pinecone (vector search) ensures flexibility and maintainability while supporting the complex requirements of the Brand Collection Product Training platform.

---

# Brand and Collection Data Architecture

## Overview
This section outlines the data architecture for managing Brands and Collections, which form the organizational hierarchy for all documents, products, and presentations in the platform. Each user can create multiple brands, and each brand can have multiple collections.

## Data Hierarchy

```
User (authenticated via Google)
  └── Brands (multiple per user)
       └── Collections (multiple per brand)
            └── Documents (multiple per collection)
                 └── Chunks & Vectors (for RAG)
            └── Products (multiple per collection)
            └── Presentations (generated from collections)
```

## Brand Data Model

### Firestore Structure
```javascript
/brands/{brand_id}
{
    brand_id: "auto-generated-uuid",
    owner_id: "google-user-id",
    collaborators: ["user-id-1", "user-id-2"],  // Array of user IDs with access
    
    // Brand Identity
    name: "Fashion Brand Name",
    tagline: "Elevating everyday style",
    description: "Full brand description...",
    
    // Brand Assets
    logo_url: "https://storage.googleapis.com/brands/{brand_id}/logo.png",
    logo_storage_path: "brands/{brand_id}/assets/logo.png",
    brand_colors: {
        primary: "#FF6B6B",
        secondary: "#4ECDC4",
        accent: "#45B7D1",
        text: "#2C3E50",
        background: "#FFFFFF"
    },
    typography: {
        heading_font: "Playfair Display",
        body_font: "Open Sans",
        font_sizes: {
            h1: "48px",
            h2: "36px",
            h3: "24px",
            body: "16px"
        }
    },
    
    // Brand Guidelines
    style_guidelines: {
        tone_of_voice: "Professional yet approachable",
        target_audience: "25-45 year old professionals",
        key_values: ["sustainability", "quality", "innovation"],
        presentation_style: "minimal",  // minimal, bold, classic, modern
        language_preferences: ["en", "es", "fr"]
    },
    
    // Social & Contact
    website_url: "https://fashionbrand.com",
    social_media: {
        instagram: "@fashionbrand",
        facebook: "fashionbrandofficial",
        twitter: "@fashion_brand",
        linkedin: "fashion-brand-inc"
    },
    contact_info: {
        email: "info@fashionbrand.com",
        phone: "+1-555-0123",
        address: "123 Fashion Ave, New York, NY 10001"
    },
    
    // Metadata
    created_at: timestamp,
    updated_at: timestamp,
    last_accessed: timestamp,
    is_active: true,
    subscription_tier: "premium",  // free, pro, premium, enterprise
    
    // Statistics
    stats: {
        total_collections: 5,
        total_products: 150,
        total_presentations: 23,
        total_documents: 45,
        storage_used_bytes: 524288000  // 500MB
    }
}
```

### Brand API Endpoints

```python
# Create new brand
POST /api/brands
Body: {
    "name": "Fashion Brand Name",
    "tagline": "Elevating everyday style",
    "description": "...",
    "style_guidelines": {...}
}

# Get user's brands
GET /api/brands
Query params: ?include_stats=true&sort_by=last_accessed

# Get specific brand
GET /api/brands/{brand_id}

# Update brand
PUT /api/brands/{brand_id}
Body: {
    "name": "Updated Brand Name",
    "brand_colors": {...}
}

# Delete brand (soft delete)
DELETE /api/brands/{brand_id}

# Upload brand logo
POST /api/brands/{brand_id}/logo
Body: multipart/form-data with image file

# Add collaborator
POST /api/brands/{brand_id}/collaborators
Body: {
    "email": "collaborator@example.com",
    "role": "editor"  // viewer, editor, admin
}

# Remove collaborator
DELETE /api/brands/{brand_id}/collaborators/{user_id}
```

## Collection Data Model

### Firestore Structure
```javascript
/brands/{brand_id}/collections/{collection_id}
{
    collection_id: "auto-generated-uuid",
    brand_id: "parent-brand-id",
    
    // Collection Identity
    name: "Spring/Summer 2024",
    season: "spring_summer",  // spring_summer, fall_winter, resort, pre_fall
    year: 2024,
    description: "Inspired by Mediterranean coastlines...",
    
    // Collection Theme
    theme: {
        name: "Coastal Elegance",
        mood_board_urls: [
            "https://storage.googleapis.com/collections/{collection_id}/mood_1.jpg"
        ],
        color_palette: ["#E8F4F8", "#FFF5E1", "#D4A574", "#8B7355"],
        keywords: ["sustainable", "lightweight", "breathable", "elegant"],
        inspiration: "Mediterranean summer, coastal living"
    },
    
    // Collection Settings
    settings: {
        default_language: "en",
        available_languages: ["en", "es", "fr", "it"],
        products_per_slide: 2,  // 1, 2, or 4
        show_prices: true,
        show_sku: true,
        show_descriptions: true,
        citation_style: "footnotes",  // inline, footnotes, endnotes, none
        
        // Presentation defaults
        presentation_template: "minimal_modern",
        include_cover_slide: true,
        include_thank_you_slide: true,
        auto_generate_index: true
    },
    
    // Product Categories
    categories: [
        {
            name: "Dresses",
            product_count: 25,
            display_order: 1
        },
        {
            name: "Tops",
            product_count: 30,
            display_order: 2
        },
        {
            name: "Bottoms",
            product_count: 20,
            display_order: 3
        }
    ],
    
    // RAG Configuration
    rag_settings: {
        enabled: true,
        pinecone_namespace: "collection_{collection_id}",
        embedding_model: "text-embedding-3-small",
        chunk_size: 500,
        chunk_overlap: 100,
        max_context_chunks: 10,
        temperature: 0.7,
        
        // Custom prompts
        system_prompt: "You are a fashion expert for {brand_name}...",
        description_template: "Generate a compelling product description...",
        
        // Document priorities
        document_weights: {
            "product_catalog": 1.0,
            "brand_guidelines": 0.8,
            "technical_specs": 0.6
        }
    },
    
    // Metadata
    created_by: "user-id",
    created_at: timestamp,
    updated_at: timestamp,
    published_at: timestamp,  // null if draft
    status: "draft",  // draft, published, archived
    visibility: "private",  // private, team, public
    
    // Statistics
    stats: {
        total_products: 75,
        total_documents: 12,
        total_chunks: 450,
        total_vectors: 450,
        total_presentations: 5,
        last_presentation_generated: timestamp
    },
    
    // Workflow
    workflow: {
        approval_required: true,
        approved_by: "user-id",
        approved_at: timestamp,
        review_notes: "Ready for client presentation"
    }
}
```

### Collection API Endpoints

```python
# Create new collection
POST /api/brands/{brand_id}/collections
Body: {
    "name": "Spring/Summer 2024",
    "season": "spring_summer",
    "year": 2024,
    "theme": {...},
    "settings": {...}
}

# List brand collections
GET /api/brands/{brand_id}/collections
Query params: ?status=published&season=spring_summer&year=2024

# Get specific collection
GET /api/collections/{collection_id}

# Update collection
PUT /api/collections/{collection_id}
Body: {
    "name": "Updated Collection Name",
    "settings": {...}
}

# Delete collection (soft delete)
DELETE /api/collections/{collection_id}

# Duplicate collection
POST /api/collections/{collection_id}/duplicate
Body: {
    "name": "Fall/Winter 2024",
    "include_products": true,
    "include_documents": false
}

# Publish collection
POST /api/collections/{collection_id}/publish

# Archive collection
POST /api/collections/{collection_id}/archive

# Export collection data
GET /api/collections/{collection_id}/export
Query params: ?format=json&include_products=true&include_documents=true
```

## CRUD Operations Implementation

### Create Operations

```python
# Brand Creation Service
async def create_brand(user_id: str, brand_data: dict) -> str:
    """Create a new brand with validation and defaults"""
    
    # Validate required fields
    validate_brand_data(brand_data)
    
    # Generate brand ID
    brand_id = str(uuid.uuid4())
    
    # Set defaults
    brand = {
        "brand_id": brand_id,
        "owner_id": user_id,
        "collaborators": [],
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
        "is_active": True,
        "subscription_tier": "free",
        "stats": {
            "total_collections": 0,
            "total_products": 0,
            "total_presentations": 0,
            "total_documents": 0,
            "storage_used_bytes": 0
        },
        **brand_data
    }
    
    # Store in Firestore
    db.collection("brands").document(brand_id).set(brand)
    
    # Create default storage folders
    create_storage_folders(brand_id)
    
    # Initialize Pinecone namespace (if needed)
    if brand.get("subscription_tier") in ["premium", "enterprise"]:
        initialize_pinecone_namespace(f"brand_{brand_id}")
    
    return brand_id

# Collection Creation Service
async def create_collection(brand_id: str, user_id: str, collection_data: dict) -> str:
    """Create a new collection within a brand"""
    
    # Verify brand access
    verify_brand_access(brand_id, user_id)
    
    # Validate collection data
    validate_collection_data(collection_data)
    
    # Generate collection ID
    collection_id = str(uuid.uuid4())
    
    # Set defaults
    collection = {
        "collection_id": collection_id,
        "brand_id": brand_id,
        "created_by": user_id,
        "created_at": firestore.SERVER_TIMESTAMP,
        "updated_at": firestore.SERVER_TIMESTAMP,
        "status": "draft",
        "visibility": "private",
        "stats": {
            "total_products": 0,
            "total_documents": 0,
            "total_chunks": 0,
            "total_vectors": 0,
            "total_presentations": 0
        },
        **collection_data
    }
    
    # Store in Firestore
    db.collection("brands").document(brand_id)\
      .collection("collections").document(collection_id).set(collection)
    
    # Update brand stats
    increment_brand_stat(brand_id, "total_collections", 1)
    
    # Initialize Pinecone namespace for collection
    if collection.get("rag_settings", {}).get("enabled"):
        initialize_pinecone_namespace(f"collection_{collection_id}")
    
    return collection_id
```

### Read Operations

```python
# Get Brand with Permissions Check
async def get_brand(brand_id: str, user_id: str) -> dict:
    """Retrieve brand data with access control"""
    
    # Get brand document
    brand_ref = db.collection("brands").document(brand_id)
    brand = brand_ref.get()
    
    if not brand.exists:
        raise NotFoundError(f"Brand {brand_id} not found")
    
    brand_data = brand.to_dict()
    
    # Check access permissions
    if not has_brand_access(brand_data, user_id):
        raise PermissionError("Access denied to this brand")
    
    # Update last accessed timestamp
    brand_ref.update({"last_accessed": firestore.SERVER_TIMESTAMP})
    
    # Optionally include collections
    if include_collections:
        collections = await get_brand_collections(brand_id, user_id)
        brand_data["collections"] = collections
    
    return brand_data

# List User's Brands
async def list_user_brands(user_id: str, filters: dict = None) -> list:
    """List all brands accessible to a user"""
    
    # Query owned brands
    owned_query = db.collection("brands")\
        .where("owner_id", "==", user_id)\
        .where("is_active", "==", True)
    
    # Query collaborated brands
    collab_query = db.collection("brands")\
        .where("collaborators", "array_contains", user_id)\
        .where("is_active", "==", True)
    
    # Apply filters
    if filters:
        if filters.get("subscription_tier"):
            owned_query = owned_query.where("subscription_tier", "==", filters["subscription_tier"])
            collab_query = collab_query.where("subscription_tier", "==", filters["subscription_tier"])
    
    # Execute queries
    owned_brands = [doc.to_dict() for doc in owned_query.stream()]
    collab_brands = [doc.to_dict() for doc in collab_query.stream()]
    
    # Combine and sort
    all_brands = owned_brands + collab_brands
    
    # Sort by last accessed or created
    sort_key = filters.get("sort_by", "last_accessed") if filters else "last_accessed"
    all_brands.sort(key=lambda x: x.get(sort_key), reverse=True)
    
    return all_brands
```

### Update Operations

```python
# Update Brand
async def update_brand(brand_id: str, user_id: str, updates: dict) -> dict:
    """Update brand with validation and history tracking"""
    
    # Verify write access
    verify_brand_write_access(brand_id, user_id)
    
    # Validate updates
    validate_brand_updates(updates)
    
    # Add metadata
    updates["updated_at"] = firestore.SERVER_TIMESTAMP
    
    # Track changes for audit
    original = get_brand(brand_id, user_id)
    changes = track_changes(original, updates)
    
    # Update in Firestore
    db.collection("brands").document(brand_id).update(updates)
    
    # Log changes
    log_brand_changes(brand_id, user_id, changes)
    
    # Handle special updates
    if "logo_url" in updates:
        process_logo_update(brand_id, updates["logo_url"])
    
    if "subscription_tier" in updates:
        handle_subscription_change(brand_id, original["subscription_tier"], updates["subscription_tier"])
    
    return {"success": True, "brand_id": brand_id}

# Update Collection
async def update_collection(collection_id: str, user_id: str, updates: dict) -> dict:
    """Update collection with cascade effects"""
    
    # Get collection and verify access
    collection = get_collection(collection_id, user_id)
    verify_collection_write_access(collection, user_id)
    
    # Validate updates
    validate_collection_updates(updates)
    
    # Add metadata
    updates["updated_at"] = firestore.SERVER_TIMESTAMP
    
    # Update in Firestore
    db.collection("brands").document(collection["brand_id"])\
      .collection("collections").document(collection_id).update(updates)
    
    # Handle RAG settings changes
    if "rag_settings" in updates:
        await update_rag_configuration(collection_id, updates["rag_settings"])
    
    # Handle status changes
    if "status" in updates:
        await handle_status_change(collection_id, collection["status"], updates["status"])
    
    return {"success": True, "collection_id": collection_id}
```

### Delete Operations

```python
# Soft Delete Brand
async def delete_brand(brand_id: str, user_id: str, hard_delete: bool = False) -> dict:
    """Delete brand with cascade handling"""
    
    # Verify owner access
    brand = get_brand(brand_id, user_id)
    if brand["owner_id"] != user_id:
        raise PermissionError("Only brand owner can delete")
    
    if hard_delete:
        # Hard delete with full cascade
        await cascade_delete_brand(brand_id)
    else:
        # Soft delete
        updates = {
            "is_active": False,
            "deleted_at": firestore.SERVER_TIMESTAMP,
            "deleted_by": user_id
        }
        db.collection("brands").document(brand_id).update(updates)
        
        # Archive associated data
        await archive_brand_data(brand_id)
    
    return {"success": True, "brand_id": brand_id, "deleted": True}

# Cascade Delete for Hard Delete
async def cascade_delete_brand(brand_id: str):
    """Cascade delete all brand-related data"""
    
    # Delete all collections
    collections = db.collection("brands").document(brand_id)\
        .collection("collections").stream()
    
    for collection in collections:
        collection_id = collection.id
        
        # Delete collection documents and chunks
        await delete_collection_documents(collection_id)
        
        # Delete collection products
        await delete_collection_products(collection_id)
        
        # Delete Pinecone vectors
        await delete_pinecone_namespace(f"collection_{collection_id}")
        
        # Delete collection
        collection.reference.delete()
    
    # Delete brand storage
    await delete_storage_folder(f"brands/{brand_id}")
    
    # Delete brand Pinecone namespace
    await delete_pinecone_namespace(f"brand_{brand_id}")
    
    # Delete brand document
    db.collection("brands").document(brand_id).delete()
```

## Access Control & Permissions

### Permission Levels

```python
class BrandPermission(Enum):
    OWNER = "owner"        # Full control
    ADMIN = "admin"        # Everything except delete brand
    EDITOR = "editor"      # Create/edit collections and content
    VIEWER = "viewer"      # Read-only access

class CollectionPermission(Enum):
    MANAGER = "manager"    # Full collection control
    CONTRIBUTOR = "contributor"  # Add/edit products and documents
    REVIEWER = "reviewer"  # Read and comment only

# Permission Check Service
def check_brand_permission(brand_id: str, user_id: str, required_permission: BrandPermission) -> bool:
    """Check if user has required permission level"""
    
    brand = db.collection("brands").document(brand_id).get()
    if not brand.exists:
        return False
    
    brand_data = brand.to_dict()
    
    # Owner has all permissions
    if brand_data["owner_id"] == user_id:
        return True
    
    # Check collaborator permissions
    user_role = get_user_brand_role(brand_data, user_id)
    
    permission_hierarchy = {
        BrandPermission.VIEWER: [BrandPermission.VIEWER],
        BrandPermission.EDITOR: [BrandPermission.VIEWER, BrandPermission.EDITOR],
        BrandPermission.ADMIN: [BrandPermission.VIEWER, BrandPermission.EDITOR, BrandPermission.ADMIN],
        BrandPermission.OWNER: [BrandPermission.VIEWER, BrandPermission.EDITOR, BrandPermission.ADMIN, BrandPermission.OWNER]
    }
    
    return required_permission in permission_hierarchy.get(user_role, [])
```

## Data Validation

```python
# Brand Validation Schema
BRAND_SCHEMA = {
    "name": {"type": str, "required": True, "max_length": 100},
    "tagline": {"type": str, "required": False, "max_length": 200},
    "description": {"type": str, "required": False, "max_length": 1000},
    "brand_colors": {
        "type": dict,
        "required": False,
        "schema": {
            "primary": {"type": str, "pattern": r"^#[0-9A-Fa-f]{6}$"},
            "secondary": {"type": str, "pattern": r"^#[0-9A-Fa-f]{6}$"}
        }
    },
    "style_guidelines": {
        "type": dict,
        "required": False,
        "schema": {
            "presentation_style": {
                "type": str,
                "enum": ["minimal", "bold", "classic", "modern"]
            }
        }
    }
}

# Collection Validation Schema
COLLECTION_SCHEMA = {
    "name": {"type": str, "required": True, "max_length": 100},
    "season": {
        "type": str,
        "required": True,
        "enum": ["spring_summer", "fall_winter", "resort", "pre_fall"]
    },
    "year": {"type": int, "required": True, "min": 2020, "max": 2030},
    "settings": {
        "type": dict,
        "required": False,
        "schema": {
            "products_per_slide": {"type": int, "enum": [1, 2, 4]},
            "default_language": {"type": str, "pattern": r"^[a-z]{2}$"}
        }
    }
}

def validate_brand_data(data: dict) -> bool:
    """Validate brand data against schema"""
    return validate_against_schema(data, BRAND_SCHEMA)

def validate_collection_data(data: dict) -> bool:
    """Validate collection data against schema"""
    return validate_against_schema(data, COLLECTION_SCHEMA)
```

## Caching Strategy

```python
# Redis caching for frequently accessed data
from redis import Redis
import json

redis_client = Redis(host='localhost', port=6379, decode_responses=True)

def cache_brand(brand_id: str, brand_data: dict, ttl: int = 3600):
    """Cache brand data with TTL"""
    key = f"brand:{brand_id}"
    redis_client.setex(key, ttl, json.dumps(brand_data))

def get_cached_brand(brand_id: str) -> dict:
    """Get brand from cache"""
    key = f"brand:{brand_id}"
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)
    return None

def invalidate_brand_cache(brand_id: str):
    """Invalidate brand cache on update"""
    redis_client.delete(f"brand:{brand_id}")
    # Also invalidate related collections
    pattern = f"collection:*:{brand_id}"
    for key in redis_client.scan_iter(match=pattern):
        redis_client.delete(key)

# Cache warming for active brands
async def warm_cache_for_user(user_id: str):
    """Pre-load frequently accessed brands into cache"""
    brands = await list_user_brands(user_id)
    for brand in brands[:5]:  # Cache top 5 most recent
        cache_brand(brand["brand_id"], brand)
```

## Integration with Document Storage

The Brand and Collection architecture integrates seamlessly with the document storage system:

1. **Namespace Isolation**: Each collection gets its own Pinecone namespace for vector storage
2. **Access Control Inheritance**: Document access is determined by collection and brand permissions
3. **Cascading Operations**: Deleting a collection removes all associated documents, chunks, and vectors
4. **Statistics Aggregation**: Document counts bubble up to collection and brand level statistics
5. **RAG Context**: Collection settings determine how RAG queries are processed and which documents are prioritized

This architecture ensures a robust, scalable system for managing the organizational hierarchy while maintaining tight integration with the document storage and RAG capabilities described earlier in this document.
