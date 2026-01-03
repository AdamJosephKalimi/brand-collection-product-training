from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
from .routers import auth, pinecone_test, storage_test, parser_test, ocr_test, chunking_test, embedding_test, brand_management, collection_management, brand_collection_test, item_management, brand_document_management, collection_document_management, llm_test, category_generation, item_generation, intro_slides, presentation
from .services.firebase_service import FirebaseService
from .services.background_tasks import detect_and_restart_stale_jobs

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Product Training AI API",
    description="V1.0 Multi-user platform for AI-powered product training decks",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:3000",  # Local development
    "https://prokoapp.netlify.app",  # Production frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(brand_management.router)
app.include_router(brand_document_management.router)
app.include_router(collection_management.router)
app.include_router(collection_document_management.router)
app.include_router(item_management.router)
app.include_router(brand_collection_test.router)
app.include_router(pinecone_test.router)
app.include_router(storage_test.router)
app.include_router(parser_test.router)
app.include_router(ocr_test.router)
app.include_router(chunking_test.router)
app.include_router(embedding_test.router)
app.include_router(llm_test.router)
app.include_router(category_generation.router)
app.include_router(item_generation.router)
app.include_router(intro_slides.router)
app.include_router(presentation.router)

@app.on_event("startup")
async def startup_event():
    """
    Startup event handler.
    Detects and handles stale processing jobs from previous server sessions.
    """
    try:
        logger.info("Server starting up...")
        
        # Initialize Firebase service and get Firestore client
        firebase_service = FirebaseService()
        db = firebase_service.db
        
        # Detect and restart stale jobs
        await detect_and_restart_stale_jobs(db)
        
        logger.info("Startup complete")
        
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        # Don't raise - allow server to start even if stale job detection fails


@app.get("/")
async def root():
    return {"message": "Product Training AI API v1.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
