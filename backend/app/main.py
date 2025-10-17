from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from .routers import auth, pinecone_test, storage_test, parser_test, ocr_test, chunking_test, embedding_test, brand_management, collection_management, brand_collection_test, item_management, brand_document_management, collection_document_management, llm_test, category_generation

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Product Training AI API",
    description="V1.0 Multi-user platform for AI-powered product training decks",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
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

@app.get("/")
async def root():
    return {"message": "Product Training AI API v1.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
