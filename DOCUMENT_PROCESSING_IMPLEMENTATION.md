# Document Processing Implementation Plan

## Overview
Step-by-step implementation plan for the document processing pipeline as designed in DOCUMENT_STORAGE_ARCHITECTURE.md. This plan follows a bottom-up approach, building foundational services first, then the orchestrator.

## File Structure

```
backend/
├── app/
│   ├── models/
│   │   ├── __init__.py
│   │   ├── document.py         # Document, Chunk, Image Pydantic models
│   │   ├── collection.py       # Collection model
│   │   └── brand.py           # Brand model
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── firebase_service.py     # ✅ Already exists
│   │   ├── pinecone_service.py     # ✅ Already exists
│   │   ├── storage_service.py      # NEW: Firebase Storage operations
│   │   ├── parser_service.py       # NEW: Document parsing (PDF, DOCX, etc.)
│   │   ├── chunking_service.py     # NEW: Text chunking logic
│   │   ├── embedding_service.py    # NEW: OpenAI embeddings
│   │   ├── ocr_service.py         # NEW: Image OCR processing
│   │   └── orchestrator.py        # NEW: Main processing orchestrator
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py            # ✅ Already exists
│   │   ├── documents.py       # NEW: Document upload/status endpoints
│   │   ├── collections.py     # NEW: Collection management
│   │   └── brands.py          # NEW: Brand management
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── validators.py      # NEW: File validation utilities
│   │   └── helpers.py         # NEW: Common helper functions
│   │
│   └── main.py               # ✅ Already exists
│
├── requirements.txt           # Update with new dependencies
└── .env                      # ✅ Already exists
```

## Implementation Phases

### Phase 1: Data Models & Schemas (Day 1)
**Goal**: Define all Pydantic models and database schemas

#### Step 1.1: Create Document Models
```python
# backend/app/models/document.py
```
- [x] Document model with status enum
- [x] Chunk model with text and metadata
- [x] Image model with storage paths
- [x] Processing status tracking

#### Step 1.2: Update Collection & Brand Models
```python
# backend/app/models/collection.py
# backend/app/models/brand.py
```
- [x] Collection model with document references
- [x] Brand model with collection references
- [x] Permission models

### Phase 2: Storage Service (Day 1-2)
**Goal**: Handle Firebase Storage operations

#### Step 2.1: Implement Storage Service ✅ COMPLETED
```python
# backend/app/services/storage_service.py
```
- [x] Upload file to Firebase Storage
- [x] Download file from Firebase Storage
- [x] Delete file from Firebase Storage
- [x] Generate signed URLs
- [x] Handle file paths and organization

#### Step 2.2: Create Storage Test Endpoints ✅ COMPLETED
```python
# backend/app/routers/storage_test.py
```
- [x] Test endpoints for all storage operations
- [x] SwaggerUI integration with detailed documentation
- [x] Firebase Storage connection testing
- [x] Dummy data support for testing

### Phase 3: Parser Service (Day 2-3)
**Goal**: Extract text and images from documents

#### Step 3.1: Install Dependencies ✅ COMPLETED
```bash
pip install pdfplumber python-docx openpyxl pandas pillow pytesseract PyMuPDF
```

#### Step 3.2: Implement Parser Service ✅ COMPLETED
```python
# backend/app/services/parser_service.py
```
- [x] PDF parser using pdfplumber (text/tables)
- [x] DOCX parser using python-docx
- [x] Excel parser using pandas/openpyxl
- [x] Image extraction from PDFs using PyMuPDF
- [x] Image extraction from DOCX files
- [x] Error handling for corrupted files

#### Step 3.2.1: Create Parser Test Endpoints ✅ COMPLETED
```python
# backend/app/routers/parser_test.py
```
- [x] PDF parsing test endpoint
- [x] DOCX parsing test endpoint  
- [x] Excel parsing test endpoint
- [x] Document info endpoint
- [x] Connection test endpoint
- [x] Supported formats endpoint

#### Step 3.3: Upgrade Image Handling to Raw Bytes + Firebase Storage ✅ COMPLETED
```python
# backend/app/services/parser_service.py (PyMuPDF enhancement)
# backend/app/services/storage_service.py (image storage methods)
```
- [x] Modify PyMuPDF to return raw bytes instead of base64
- [x] Implement SHA256 hashing for image deduplication
- [x] Add Firebase Storage upload for images with content-hashed keys
- [x] Update API to return metadata + signed URLs instead of base64
- [x] Add image cleanup and deduplication logic
- [x] Update test endpoints for new image handling

#### Step 3.4: Implement OCR Service ✅ COMPLETED
```python
# backend/app/services/ocr_service.py
# backend/app/routers/ocr_test.py
```
- [x] OCR for images using pytesseract
- [x] Image preprocessing for better OCR
- [x] Language detection with multi-language support (30+ languages including Chinese, Japanese, Korean, Arabic, etc.)

### Phase 4: Chunking Service (Day 3)
**Goal**: Split text into optimized chunks

#### Step 4.1: Implement Chunking Logic ✅ COMPLETED
```python
# backend/app/services/chunking_service.py
# backend/app/routers/chunking_test.py
```
- [x] Text splitter (500 char chunks, 100 char overlap)
- [x] Preserve sentence boundaries
- [x] Maintain positional metadata
- [x] Handle special characters and formatting

### Phase 5: Embedding Service (Day 4)
**Goal**: Generate embeddings using OpenAI

#### Step 5.1: Implement Embedding Service
```python
# backend/app/services/embedding_service.py
```
- [ ] Batch embedding generation (2048 texts per call)
- [ ] Rate limiting and retry logic
- [ ] Error handling for API failures
- [ ] Cost tracking

### Phase 6: Update Existing Services (Day 4)
**Goal**: Enhance Firebase and Pinecone services

#### Step 6.1: Enhance Firebase Service
```python
# backend/app/services/firebase_service.py
```
- [ ] Batch Firestore operations
- [ ] Transaction support
- [ ] Document status updates
- [ ] Collection statistics

#### Step 6.2: Enhance Pinecone Service
```python
# backend/app/services/pinecone_service.py
```
- [ ] Batch vector upserts (1000 vectors per call)
- [ ] Namespace management
- [ ] Metadata filtering
- [ ] Delete operations

### Phase 7: Orchestrator (Day 5-6)
**Goal**: Build the main processing pipeline

#### Step 7.1: Implement Orchestrator
```python
# backend/app/services/orchestrator.py
```
- [ ] Main orchestration function
- [ ] Status checkpointing
- [ ] Parallel image processing
- [ ] Error recovery
- [ ] Progress tracking

#### Step 7.2: Orchestrator Flow
```python
async def process_document_orchestrated(document_id: str, collection_id: str):
    # 1. Download from Firebase Storage
    # 2. Parse document (extract text and images)
    # 3. Process images in parallel
    # 4. Chunk text
    # 5. Store chunks in Firestore (batch)
    # 6. Generate embeddings (batch)
    # 7. Upsert to Pinecone (batch)
    # 8. Update metadata links
    # 9. Update document status
```

### Phase 8: API Endpoints (Day 6-7)
**Goal**: Create REST API for document operations

#### Step 8.1: Document Upload Endpoint
```python
# backend/app/routers/documents.py
```
- [ ] POST /api/collections/{collection_id}/documents/upload
- [ ] File validation
- [ ] Background task queuing
- [ ] Immediate response with document IDs

#### Step 8.2: Document Status Endpoint
- [ ] GET /api/collections/{collection_id}/documents/{document_id}/status
- [ ] GET /api/collections/{collection_id}/documents (list all)
- [ ] DELETE /api/collections/{collection_id}/documents/{document_id}

#### Step 8.3: Collection Management Endpoints
```python
# backend/app/routers/collections.py
```
- [ ] CRUD operations for collections
- [ ] Access control checks

### Phase 9: Testing & Integration (Day 7-8)
**Goal**: Test the complete pipeline

#### Step 9.1: Unit Tests
- [ ] Test each service independently
- [ ] Mock external services (OpenAI, Pinecone)
- [ ] Test error scenarios

#### Step 9.2: Integration Tests
- [ ] Test full document processing pipeline
- [ ] Test with various file types
- [ ] Test batch processing
- [ ] Performance benchmarks

#### Step 9.3: Manual Testing
- [ ] Upload test documents
- [ ] Verify Firestore data
- [ ] Verify Pinecone vectors
- [ ] Check status updates

## Development Order

### Week 1 Sprint:
1. **Monday**: Data models + Storage service
2. **Tuesday**: Parser service (PDF, DOCX)
3. **Wednesday**: Parser service (Excel, Images) + OCR
4. **Thursday**: Chunking + Embedding services
5. **Friday**: Update existing services + Start orchestrator

### Week 2 Sprint:
1. **Monday**: Complete orchestrator
2. **Tuesday**: API endpoints
3. **Wednesday**: Testing + Bug fixes
4. **Thursday**: Integration testing
5. **Friday**: Documentation + Deployment prep

## Key Dependencies to Install

```bash
# Add to requirements.txt
PyPDF2==3.0.1
pdfplumber==0.10.3
python-docx==1.1.0
openpyxl==3.1.2
pandas==2.1.4
pillow==10.1.0
pytesseract==0.3.10
python-magic==0.4.27
aiofiles==23.2.1
```

## Testing Strategy

### Test Documents Needed:
- Sample PDF with text and images
- Sample DOCX with formatting
- Sample Excel with product data
- Sample images (PNG, JPG)
- Large documents (>10MB)
- Corrupted files for error testing

### Performance Targets:
- Single document (5MB PDF): < 20 seconds
- Batch of 10 documents: < 3 minutes
- 1000 chunks: < 5 seconds for embeddings
- 1000 vectors: < 2 seconds for Pinecone upsert

## Monitoring & Logging

### Key Metrics:
- Documents processed per hour
- Average processing time per document
- Chunk generation rate
- Embedding API costs
- Error rates by document type
- Storage usage

### Status Tracking:
```python
STATUS_ENUM = [
    "queued",
    "downloading",
    "parsing",
    "chunking",
    "storing",
    "embedding",
    "indexing",
    "completed",
    "failed"
]
```

## Risk Mitigation

### Potential Issues:
1. **Large files blocking memory**: Use streaming where possible
2. **API rate limits**: Implement exponential backoff
3. **Corrupted files**: Graceful error handling
4. **Storage costs**: Monitor usage, implement quotas
5. **Processing failures**: Store checkpoint data for resume

## Success Criteria

- [ ] Successfully process PDF, DOCX, Excel, and image files
- [ ] Achieve < 20 second processing for typical documents
- [ ] Handle batch uploads of 10+ files
- [ ] Proper error handling and status reporting
- [ ] All data correctly stored in Firestore and Pinecone
- [ ] Clean, maintainable, documented code

## Next Steps After Implementation

1. Add RAG query endpoints
2. Implement document search
3. Add document versioning
4. Build admin dashboard
5. Add usage analytics
