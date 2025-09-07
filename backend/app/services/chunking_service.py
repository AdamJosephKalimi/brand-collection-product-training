"""
Chunking Service for splitting text into optimized chunks for embedding generation.
"""
import re
import uuid
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import unicodedata

@dataclass
class ChunkMetadata:
    """Metadata for a text chunk"""
    chunk_id: str
    chunk_index: int
    start_index: int
    end_index: int
    document_id: Optional[str] = None
    page_number: Optional[int] = None
    section: Optional[str] = None
    sentence_count: int = 0
    word_count: int = 0
    char_count: int = 0

class ChunkingService:
    """Service for text chunking with sentence boundary preservation"""
    
    # Default chunking parameters from architecture
    DEFAULT_CHUNK_SIZE = 500  # characters
    DEFAULT_OVERLAP = 100     # character overlap
    MAX_CHUNK_SIZE = 1000     # Maximum allowed chunk size
    
    # Sentence ending patterns for multiple languages
    SENTENCE_ENDINGS = {
        'default': r'[.!?]+[\s\n]+',
        'chinese': r'[。！？；]+[\s\n]*',
        'japanese': r'[。！？]+[\s\n]*',
        'arabic': r'[.؟!]+[\s\n]+',
        'thai': r'[.!?]+[\s\n]+',
    }
    
    def __init__(
        self,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        overlap: int = DEFAULT_OVERLAP,
        preserve_sentences: bool = True,
        clean_text: bool = True
    ):
        """
        Initialize chunking service.
        
        Args:
            chunk_size: Target size for each chunk in characters
            overlap: Number of overlapping characters between chunks
            preserve_sentences: Whether to preserve sentence boundaries
            clean_text: Whether to clean and sanitize text
        """
        self.chunk_size = min(chunk_size, self.MAX_CHUNK_SIZE)
        self.overlap = min(overlap, chunk_size // 2)  # Overlap can't be more than half chunk size
        self.preserve_sentences = preserve_sentences
        self.clean_text = clean_text
    
    def sanitize_text(self, text: str) -> str:
        """
        Clean and sanitize text by removing potentially harmful content and formatting.
        
        Args:
            text: Raw text to sanitize
            
        Returns:
            Sanitized text
        """
        if not text:
            return ""
        
        # Remove script tags and content
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove style tags and content
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)
        
        # Remove HTML entities
        text = re.sub(r'&[a-zA-Z]+;', ' ', text)
        text = re.sub(r'&#\d+;', ' ', text)
        
        # Normalize Unicode characters
        text = unicodedata.normalize('NFKC', text)
        
        # Remove control characters except newlines and tabs
        text = ''.join(char for char in text if char == '\n' or char == '\t' or not unicodedata.category(char).startswith('C'))
        
        # Replace multiple whitespaces with single space
        text = re.sub(r'[ \t]+', ' ', text)
        
        # Replace multiple newlines with double newline
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def detect_sentence_boundaries(self, text: str, language: str = 'default') -> List[int]:
        """
        Detect sentence boundaries in text.
        
        Args:
            text: Text to analyze
            language: Language hint for sentence detection
            
        Returns:
            List of character positions where sentences end
        """
        # Select appropriate sentence ending pattern
        pattern = self.SENTENCE_ENDINGS.get(language, self.SENTENCE_ENDINGS['default'])
        
        boundaries = []
        
        # Find all sentence endings
        for match in re.finditer(pattern, text):
            boundaries.append(match.end())
        
        # Add text end as final boundary if not already there
        if boundaries and boundaries[-1] != len(text):
            boundaries.append(len(text))
        elif not boundaries:
            boundaries.append(len(text))
        
        return boundaries
    
    def find_optimal_break_point(
        self,
        text: str,
        start: int,
        target_end: int,
        sentence_boundaries: List[int]
    ) -> int:
        """
        Find the best position to break text, preferring sentence boundaries.
        
        Args:
            text: Full text
            start: Start position of current chunk
            target_end: Ideal end position based on chunk size
            sentence_boundaries: List of sentence ending positions
            
        Returns:
            Optimal break position
        """
        # If we're at or past the end of text, return text length
        if target_end >= len(text):
            return len(text)
        
        # Find sentence boundaries near target_end
        tolerance = self.chunk_size // 10  # 10% tolerance for sentence preservation
        
        # Look for sentence boundary within tolerance range
        best_boundary = target_end
        min_distance = float('inf')
        
        for boundary in sentence_boundaries:
            if boundary <= start:
                continue
            
            # Check if boundary is within acceptable range
            if start + (self.chunk_size - tolerance) <= boundary <= start + (self.chunk_size + tolerance):
                distance = abs(boundary - target_end)
                if distance < min_distance:
                    min_distance = distance
                    best_boundary = boundary
        
        # If no sentence boundary found within tolerance, look for word boundary
        if best_boundary == target_end:
            # Try to break at word boundary
            space_pos = text.rfind(' ', start, target_end)
            if space_pos > start:
                best_boundary = space_pos
            else:
                # If no space found, just use target_end
                best_boundary = target_end
        
        return best_boundary
    
    def create_chunks(
        self,
        text: str,
        document_id: Optional[str] = None,
        page_number: Optional[int] = None,
        section: Optional[str] = None,
        language: str = 'default'
    ) -> List[Dict[str, Any]]:
        """
        Create text chunks with overlap and metadata.
        
        Args:
            text: Text to chunk
            document_id: Optional document identifier
            page_number: Optional page number for PDFs
            section: Optional section identifier
            language: Language hint for sentence detection
            
        Returns:
            List of chunk dictionaries with text and metadata
        """
        # Sanitize text if requested
        if self.clean_text:
            text = self.sanitize_text(text)
        
        if not text:
            return []
        
        # Detect sentence boundaries if preserving sentences
        sentence_boundaries = []
        if self.preserve_sentences:
            sentence_boundaries = self.detect_sentence_boundaries(text, language)
        
        chunks = []
        current_pos = 0
        chunk_index = 0
        
        while current_pos < len(text):
            # Calculate target end position
            target_end = current_pos + self.chunk_size
            
            # Find optimal break point
            if self.preserve_sentences and sentence_boundaries:
                actual_end = self.find_optimal_break_point(
                    text, current_pos, target_end, sentence_boundaries
                )
            else:
                actual_end = min(target_end, len(text))
            
            # Extract chunk text
            chunk_text = text[current_pos:actual_end].strip()
            
            # Skip empty chunks
            if not chunk_text:
                current_pos = actual_end
                continue
            
            # Create chunk metadata
            metadata = ChunkMetadata(
                chunk_id=str(uuid.uuid4()),
                chunk_index=chunk_index,
                start_index=current_pos,
                end_index=actual_end,
                document_id=document_id,
                page_number=page_number,
                section=section,
                sentence_count=len(re.findall(r'[.!?]+', chunk_text)),
                word_count=len(chunk_text.split()),
                char_count=len(chunk_text)
            )
            
            # Create chunk dictionary
            chunk = {
                "chunk_id": metadata.chunk_id,
                "text": chunk_text,
                "metadata": {
                    "chunk_index": metadata.chunk_index,
                    "start_index": metadata.start_index,
                    "end_index": metadata.end_index,
                    "document_id": metadata.document_id,
                    "page_number": metadata.page_number,
                    "section": metadata.section,
                    "sentence_count": metadata.sentence_count,
                    "word_count": metadata.word_count,
                    "char_count": metadata.char_count,
                    "language": language
                }
            }
            
            chunks.append(chunk)
            chunk_index += 1
            
            # Move to next position with overlap
            if actual_end >= len(text):
                break
            else:
                # Apply overlap
                current_pos = actual_end - self.overlap
                # Ensure we're making progress
                if current_pos <= chunks[-1]["metadata"]["start_index"]:
                    current_pos = actual_end
        
        return chunks
    
    def create_chunks_from_documents(
        self,
        documents: List[Dict[str, Any]],
        language: str = 'default'
    ) -> List[Dict[str, Any]]:
        """
        Create chunks from multiple documents with proper metadata.
        
        Args:
            documents: List of document dictionaries with text and metadata
            language: Language hint for sentence detection
            
        Returns:
            List of all chunks from all documents
        """
        all_chunks = []
        
        for doc in documents:
            doc_text = doc.get('text', '')
            doc_id = doc.get('document_id')
            page_number = doc.get('page_number')
            section = doc.get('section')
            
            # Create chunks for this document
            chunks = self.create_chunks(
                text=doc_text,
                document_id=doc_id,
                page_number=page_number,
                section=section,
                language=language
            )
            
            all_chunks.extend(chunks)
        
        return all_chunks
    
    def merge_small_chunks(
        self,
        chunks: List[Dict[str, Any]],
        min_size: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Merge chunks that are too small with adjacent chunks.
        
        Args:
            chunks: List of chunks to process
            min_size: Minimum acceptable chunk size
            
        Returns:
            List of chunks with small ones merged
        """
        if not chunks:
            return []
        
        merged_chunks = []
        current_chunk = None
        
        for chunk in chunks:
            chunk_size = chunk["metadata"]["char_count"]
            
            if chunk_size < min_size and current_chunk:
                # Merge with previous chunk
                current_chunk["text"] += " " + chunk["text"]
                current_chunk["metadata"]["end_index"] = chunk["metadata"]["end_index"]
                current_chunk["metadata"]["char_count"] = len(current_chunk["text"])
                current_chunk["metadata"]["word_count"] = len(current_chunk["text"].split())
                current_chunk["metadata"]["sentence_count"] += chunk["metadata"]["sentence_count"]
            else:
                if current_chunk:
                    merged_chunks.append(current_chunk)
                current_chunk = chunk.copy()
        
        if current_chunk:
            merged_chunks.append(current_chunk)
        
        # Re-index chunks
        for i, chunk in enumerate(merged_chunks):
            chunk["metadata"]["chunk_index"] = i
        
        return merged_chunks
    
    def get_chunk_statistics(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate statistics for a list of chunks.
        
        Args:
            chunks: List of chunks to analyze
            
        Returns:
            Dictionary with statistics
        """
        if not chunks:
            return {
                "total_chunks": 0,
                "total_characters": 0,
                "total_words": 0,
                "avg_chunk_size": 0,
                "min_chunk_size": 0,
                "max_chunk_size": 0
            }
        
        sizes = [chunk["metadata"]["char_count"] for chunk in chunks]
        words = [chunk["metadata"]["word_count"] for chunk in chunks]
        
        return {
            "total_chunks": len(chunks),
            "total_characters": sum(sizes),
            "total_words": sum(words),
            "avg_chunk_size": sum(sizes) / len(sizes),
            "min_chunk_size": min(sizes),
            "max_chunk_size": max(sizes),
            "avg_words_per_chunk": sum(words) / len(words),
            "total_sentences": sum(chunk["metadata"]["sentence_count"] for chunk in chunks)
        }

# Global chunking service instance
chunking_service = ChunkingService()
