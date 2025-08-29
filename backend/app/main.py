from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import linesheets, decks

app = FastAPI(
    title="Product Training AI API",
    description="AI-powered product training slide builder",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(linesheets.router)
app.include_router(decks.router)

@app.get("/")
async def root():
    return {"message": "Product Training AI API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
