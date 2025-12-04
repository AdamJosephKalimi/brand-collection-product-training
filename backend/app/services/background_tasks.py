"""
Background Tasks Service - Handles async document processing and item generation.

This module provides:
1. Background task functions for long-running operations
2. Progress tracking helpers that update Firestore
3. Cancellation check helpers
4. Stale job detection and restart logic
"""

import logging
import asyncio
from typing import List, Dict, Any, Optional, Callable, Coroutine
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from google.cloud import firestore

logger = logging.getLogger(__name__)

# Thread pool for running background tasks without blocking the event loop
background_executor = ThreadPoolExecutor(max_workers=2)


def run_async_task_in_thread(async_func: Callable[..., Coroutine], *args, **kwargs) -> None:
    """
    Wrapper to run an async function in a thread pool executor.
    
    Creates a new event loop in the thread and runs the async function to completion.
    This allows async background tasks to run without blocking the main FastAPI event loop.
    
    Args:
        async_func: The async function to run
        *args: Positional arguments to pass to the function
        **kwargs: Keyword arguments to pass to the function
    """
    try:
        # Create a new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Run the async function to completion
            loop.run_until_complete(async_func(*args, **kwargs))
        finally:
            loop.close()
    except Exception as e:
        logger.error(f"Error running async task in thread: {e}")


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def update_progress(
    db: firestore.Client,
    collection_id: str,
    process_type: str,  # "document_processing" or "item_generation"
    **kwargs
) -> None:
    """
    Update processing status in Firestore.
    
    Args:
        db: Firestore client
        collection_id: Collection ID
        process_type: Type of process ("document_processing" or "item_generation")
        **kwargs: Status fields to update (status, phase, step, percentage, error, etc.)
    """
    try:
        collection_ref = db.collection('collections').document(collection_id)
        
        # Add timestamp
        update_data = {
            'last_updated': datetime.utcnow().isoformat() + 'Z',
            **kwargs
        }
        
        # Update the specific process status
        collection_ref.update({
            f'processing_status.{process_type}': update_data
        })
        
        logger.info(f"Updated {process_type} progress for collection {collection_id}: {kwargs}")
        
    except Exception as e:
        logger.error(f"Error updating progress for collection {collection_id}: {e}")
        # Don't raise - progress update failure shouldn't stop processing


def check_cancelled(
    db: firestore.Client,
    collection_id: str,
    process_type: str
) -> bool:
    """
    Check if cancellation was requested for a process.
    
    Args:
        db: Firestore client
        collection_id: Collection ID
        process_type: Type of process ("document_processing" or "item_generation")
        
    Returns:
        True if cancellation was requested, False otherwise
    """
    try:
        doc = db.collection('collections').document(collection_id).get()
        
        if not doc.exists:
            logger.warning(f"Collection {collection_id} not found during cancellation check")
            return False
        
        data = doc.to_dict()
        status = data.get('processing_status', {}).get(process_type, {})
        is_cancelled = status.get('status') == 'cancelled'
        
        if is_cancelled:
            logger.info(f"Cancellation detected for {process_type} in collection {collection_id}")
        
        return is_cancelled
        
    except Exception as e:
        logger.error(f"Error checking cancellation for collection {collection_id}: {e}")
        return False  # On error, assume not cancelled


def initialize_processing_status(
    db: firestore.Client,
    collection_id: str,
    process_type: str,
    task_id: Optional[str] = None,
    document_ids: Optional[List[str]] = None
) -> None:
    """
    Initialize processing status when starting a new process.
    
    Args:
        db: Firestore client
        collection_id: Collection ID
        process_type: Type of process ("document_processing" or "item_generation")
        task_id: Optional task identifier
        document_ids: Optional list of document IDs being processed (for document_processing)
    """
    try:
        collection_ref = db.collection('collections').document(collection_id)
        
        initial_status = {
            'status': 'processing',
            'task_id': task_id,
            'started_at': datetime.utcnow().isoformat() + 'Z',
            'last_updated': datetime.utcnow().isoformat() + 'Z',
            'completed_at': None,
            'current_phase': None,
            'current_step': None,
            'progress': {
                'phase': 0,
                'total_phases': 6 if process_type == 'document_processing' else 0,
                'step': 0,
                'total_steps': 7 if process_type == 'item_generation' else 0,
                'percentage': 0
            },
            'error': None,
            'is_stale': False,  # Results are fresh when processing starts
            'processed_document_ids': document_ids if process_type == 'document_processing' else None
        }
        
        collection_ref.update({
            f'processing_status.{process_type}': initial_status
        })
        
        logger.info(f"Initialized {process_type} status for collection {collection_id}")
        
    except Exception as e:
        logger.error(f"Error initializing processing status: {e}")
        raise


def mark_completed(
    db: firestore.Client,
    collection_id: str,
    process_type: str
) -> None:
    """
    Mark a process as completed.
    
    Args:
        db: Firestore client
        collection_id: Collection ID
        process_type: Type of process
    """
    update_progress(
        db,
        collection_id,
        process_type,
        status='completed',
        completed_at=datetime.utcnow().isoformat() + 'Z',
        is_stale=False,  # Results are fresh on completion
        progress={
            'percentage': 100
        }
    )


def mark_stale(
    db: firestore.Client,
    collection_id: str,
    process_type: str
) -> None:
    """
    Mark processing results as stale (outdated).
    Called when staged documents change after processing.
    
    Args:
        db: Firestore client
        collection_id: Collection ID
        process_type: Type of process ("document_processing" or "item_generation")
    """
    try:
        collection_ref = db.collection('collections').document(collection_id)
        collection_ref.update({
            f'processing_status.{process_type}.is_stale': True,
            f'processing_status.{process_type}.last_updated': datetime.utcnow().isoformat() + 'Z'
        })
        logger.info(f"Marked {process_type} as stale for collection {collection_id}")
    except Exception as e:
        logger.error(f"Error marking {process_type} as stale: {e}")


def mark_failed(
    db: firestore.Client,
    collection_id: str,
    process_type: str,
    error_message: str,
    phase_or_step: Optional[str] = None
) -> None:
    """
    Mark a process as failed.
    
    Args:
        db: Firestore client
        collection_id: Collection ID
        process_type: Type of process
        error_message: Error message
        phase_or_step: Current phase or step where error occurred
    """
    update_progress(
        db,
        collection_id,
        process_type,
        status='failed',
        completed_at=datetime.utcnow().isoformat() + 'Z',
        error={
            'message': error_message,
            'phase': phase_or_step if process_type == 'document_processing' else None,
            'step': phase_or_step if process_type == 'item_generation' else None,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    )


def mark_cancelled(
    db: firestore.Client,
    collection_id: str,
    process_type: str
) -> None:
    """
    Mark a process as cancelled (called by background task when it detects cancellation).
    
    Args:
        db: Firestore client
        collection_id: Collection ID
        process_type: Type of process
    """
    update_progress(
        db,
        collection_id,
        process_type,
        status='cancelled',
        completed_at=datetime.utcnow().isoformat() + 'Z'
    )
    logger.info(f"Marked {process_type} as cancelled for collection {collection_id}")


# ============================================================================
# STALE JOB DETECTION
# ============================================================================

async def detect_and_restart_stale_jobs(db: firestore.Client) -> None:
    """
    Detect stale processing jobs and restart them.
    Called on server startup.
    
    A job is considered stale if:
    - Status is "processing"
    - Started more than 15 minutes ago
    
    Args:
        db: Firestore client
    """
    try:
        logger.info("Checking for stale processing jobs...")
        
        # Query collections with processing status
        collections_ref = db.collection('collections')
        collections = collections_ref.stream()
        
        stale_threshold = datetime.utcnow() - timedelta(minutes=15)
        stale_jobs_found = 0
        
        for collection_doc in collections:
            collection_id = collection_doc.id
            data = collection_doc.to_dict()
            
            if not data or 'processing_status' not in data:
                continue
            
            processing_status = data.get('processing_status', {})
            
            # Check document processing
            doc_processing = processing_status.get('document_processing', {})
            if doc_processing.get('status') == 'processing':
                started_at_str = doc_processing.get('started_at')
                if started_at_str:
                    started_at = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
                    if started_at.replace(tzinfo=None) < stale_threshold:
                        logger.warning(f"Found stale document processing job for collection {collection_id}")
                        stale_jobs_found += 1
                        # Mark as failed with restart message
                        mark_failed(
                            db,
                            collection_id,
                            'document_processing',
                            'Processing was interrupted by server restart. Please try again.',
                            'Server Restart'
                        )
            
            # Check item generation
            item_generation = processing_status.get('item_generation', {})
            if item_generation.get('status') == 'processing':
                started_at_str = item_generation.get('started_at')
                if started_at_str:
                    started_at = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
                    if started_at.replace(tzinfo=None) < stale_threshold:
                        logger.warning(f"Found stale item generation job for collection {collection_id}")
                        stale_jobs_found += 1
                        # Mark as failed with restart message
                        mark_failed(
                            db,
                            collection_id,
                            'item_generation',
                            'Processing was interrupted by server restart. Please try again.',
                            'Server Restart'
                        )
        
        if stale_jobs_found > 0:
            logger.info(f"Found and marked {stale_jobs_found} stale jobs as failed")
        else:
            logger.info("No stale jobs found")
            
    except Exception as e:
        logger.error(f"Error detecting stale jobs: {e}")
        # Don't raise - stale job detection failure shouldn't prevent startup


# ============================================================================
# CLEANUP FUNCTIONS
# ============================================================================

async def cleanup_partial_document_data(
    db: firestore.Client,
    collection_id: str,
    document_ids: List[str]
) -> None:
    """
    Clean up partial document processing data.
    Deletes parsed_text, normalized_text, and structured_products from documents.
    
    Args:
        db: Firestore client
        collection_id: Collection ID
        document_ids: List of document IDs to clean up
    """
    try:
        logger.info(f"Cleaning up partial document data for collection {collection_id}")
        
        for document_id in document_ids:
            doc_ref = db.collection('collections').document(collection_id).collection('documents').document(document_id)
            
            # Delete processing fields
            doc_ref.update({
                'parsed_text': firestore.DELETE_FIELD,
                'normalized_text': firestore.DELETE_FIELD,
                'structured_products': firestore.DELETE_FIELD,
                'text_blocks': firestore.DELETE_FIELD,
                'image_metadata': firestore.DELETE_FIELD,
                'parsed_at': firestore.DELETE_FIELD
            })
        
        logger.info(f"Cleaned up {len(document_ids)} documents")
        
    except Exception as e:
        logger.error(f"Error cleaning up partial document data: {e}")
        # Don't raise - cleanup failure shouldn't block status update


async def cleanup_for_reprocessing(
    db: firestore.Client,
    collection_id: str,
    current_document_ids: List[str]
) -> None:
    """
    Clean up all data from previous processing to allow fresh reprocessing.
    - Deletes categories from collection
    - Cleans up processing fields from current documents
    - Deletes orphaned documents (documents no longer in staging)
    
    Args:
        db: Firestore client
        collection_id: Collection ID
        current_document_ids: List of currently staged document IDs
    """
    try:
        logger.info(f"Cleaning up previous processing data for reprocessing collection {collection_id}")
        
        # 1. Delete categories from collection
        collection_ref = db.collection('collections').document(collection_id)
        collection_ref.update({
            'categories': firestore.DELETE_FIELD
        })
        logger.info("Deleted categories from collection")
        
        # 2. Get all existing documents and find orphans
        docs_ref = db.collection('collections').document(collection_id).collection('documents')
        all_docs = docs_ref.stream()
        
        orphaned_doc_ids = []
        for doc in all_docs:
            if doc.id not in current_document_ids:
                orphaned_doc_ids.append(doc.id)
        
        # 3. Delete orphaned documents entirely (no longer staged)
        for orphan_id in orphaned_doc_ids:
            doc_ref = docs_ref.document(orphan_id)
            doc_ref.delete()
            logger.info(f"Deleted orphaned document: {orphan_id}")
        
        if orphaned_doc_ids:
            logger.info(f"Deleted {len(orphaned_doc_ids)} orphaned documents")
        
        # 4. Clean up processing fields from current documents
        await cleanup_partial_document_data(db, collection_id, current_document_ids)
        
        logger.info(f"Cleanup for reprocessing complete for collection {collection_id}")
        
    except Exception as e:
        logger.error(f"Error cleaning up for reprocessing: {e}")
        # Don't raise - cleanup failure shouldn't block reprocessing


async def cleanup_partial_items(
    db: firestore.Client,
    collection_id: str
) -> None:
    """
    Clean up partial item generation data.
    Deletes all items in the items subcollection.
    
    Args:
        db: Firestore client
        collection_id: Collection ID
    """
    try:
        logger.info(f"Cleaning up partial items for collection {collection_id}")
        
        # Get all items
        items_ref = db.collection('collections').document(collection_id).collection('items')
        items = items_ref.stream()
        
        # Delete each item
        deleted_count = 0
        for item in items:
            item.reference.delete()
            deleted_count += 1
        
        # Reset collection statistics
        collection_ref = db.collection('collections').document(collection_id)
        collection_ref.update({
            'total_items': 0,
            'items_generated_at': firestore.DELETE_FIELD
        })
        
        logger.info(f"Cleaned up {deleted_count} items")
        
    except Exception as e:
        logger.error(f"Error cleaning up partial items: {e}")
        # Don't raise - cleanup failure shouldn't block status update


# ============================================================================
# BACKGROUND TASK FUNCTIONS
# ============================================================================

async def process_collection_documents_task(
    collection_id: str,
    document_ids: List[str],
    db: firestore.Client
) -> None:
    """
    FastAPI background task for processing collection documents.
    
    This task:
    1. Extracts images from documents
    2. Extracts text with positions
    3. Filters product images
    4. Generates categories
    5. Extracts structured products
    6. Matches images to products
    
    Updates progress in Firestore and checks for cancellation between phases.
    
    Args:
        collection_id: Collection ID
        document_ids: List of document IDs to process
        db: Firestore client
    """
    from .collection_document_service import collection_document_service
    from .storage_service import storage_service
    
    try:
        logger.info(f"Starting document processing for collection {collection_id} with {len(document_ids)} documents")
        
        # NOTE: Cleanup and status initialization are now done in the API endpoint
        # before this background task starts. This ensures the frontend sees
        # 'processing' status immediately without race conditions.
        
        # Process each document
        for idx, document_id in enumerate(document_ids):
            logger.info(f"Processing document {idx + 1} of {len(document_ids)}: {document_id}")
            
            # Check for cancellation before processing each document
            if check_cancelled(db, collection_id, 'document_processing'):
                logger.info("Cancellation detected, cleaning up...")
                await cleanup_partial_document_data(db, collection_id, document_ids)
                mark_cancelled(db, collection_id, 'document_processing')
                return
            
            # Get document metadata
            doc_ref = db.collection('collections').document(collection_id).collection('documents').document(document_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                logger.warning(f"Document {document_id} not found, skipping")
                continue
            
            doc_data = doc.to_dict()
            storage_path = doc_data.get('storage_path')
            filename = doc_data.get('name')
            document_type = doc_data.get('type')
            
            if not storage_path:
                logger.warning(f"No storage path for document {document_id}, skipping")
                continue
            
            # Download file
            logger.info(f"Downloading file: {filename}")
            file_bytes = await storage_service.download_file(storage_path)
            
            # Define progress callback
            async def progress_callback(phase: int, message: str):
                """Update progress in Firestore"""
                percentage = int((phase / 6) * 100)
                update_progress(
                    db, collection_id, 'document_processing',
                    status='processing',
                    current_phase=message,
                    progress={'phase': phase, 'total_phases': 6, 'percentage': percentage}
                )
                
                # Check for cancellation after each phase
                if check_cancelled(db, collection_id, 'document_processing'):
                    raise Exception("Processing cancelled by user")
            
            # Process document with progress callback
            await collection_document_service._parse_and_store_text(
                collection_id=collection_id,
                document_id=document_id,
                file_bytes=file_bytes,
                filename=filename,
                document_type=document_type,
                progress_callback=progress_callback
            )
            
            logger.info(f"Completed processing document {idx + 1} of {len(document_ids)}")
        
        # Mark as completed
        mark_completed(db, collection_id, 'document_processing')
        logger.info(f"Document processing completed for collection {collection_id}")
        
    except Exception as e:
        logger.error(f"Error processing documents for collection {collection_id}: {e}")
        
        # Clean up partial data
        await cleanup_partial_document_data(db, collection_id, document_ids)
        
        # Mark as failed
        mark_failed(
            db,
            collection_id,
            'document_processing',
            str(e),
            'Processing Error'
        )


async def generate_collection_items_task(
    collection_id: str,
    db: firestore.Client
) -> None:
    """
    FastAPI background task for generating collection items.
    
    This task:
    1. Fetches purchase order
    2. Parses purchase order
    3. Identifies columns with AI
    4. Extracts SKU data
    5. Enriches from linesheet
    6. Generates item objects
    7. Saves to Firestore
    
    Updates progress in Firestore and checks for cancellation between steps.
    
    Args:
        collection_id: Collection ID
        db: Firestore client
    """
    from .item_generation_service import item_generation_service
    from .storage_service import storage_service
    
    try:
        logger.info(f"Starting item generation for collection {collection_id}")
        
        # NOTE: Cleanup and status initialization are now done in the API endpoint
        # before this background task starts. This ensures the frontend sees
        # 'processing' status immediately without race conditions.
        
        # Step 1: Fetch PO
        update_progress(
            db, collection_id, 'item_generation',
            status='processing',
            current_step='Fetching purchase order',
            progress={'step': 1, 'total_steps': 7, 'percentage': 14}
        )
        if check_cancelled(db, collection_id, 'item_generation'):
            await cleanup_partial_items(db, collection_id)
            mark_cancelled(db, collection_id, 'item_generation')
            return
        
        po_doc = await item_generation_service.fetch_purchase_order(collection_id)
        if not po_doc:
            raise ValueError(f"No purchase order found for collection {collection_id}")
        
        # Step 2: Parse PO
        update_progress(
            db, collection_id, 'item_generation',
            status='processing',
            current_step='Parsing purchase order',
            progress={'step': 2, 'total_steps': 7, 'percentage': 29}
        )
        if check_cancelled(db, collection_id, 'item_generation'):
            await cleanup_partial_items(db, collection_id)
            mark_cancelled(db, collection_id, 'item_generation')
            return
        
        file_bytes = await storage_service.download_file(po_doc['storage_path'])
        parsed_data = await item_generation_service.parse_purchase_order(file_bytes, po_doc['name'])
        
        # Step 3: Identify columns
        update_progress(
            db, collection_id, 'item_generation',
            status='processing',
            current_step='Identifying columns with AI',
            progress={'step': 3, 'total_steps': 7, 'percentage': 43}
        )
        if check_cancelled(db, collection_id, 'item_generation'):
            await cleanup_partial_items(db, collection_id)
            mark_cancelled(db, collection_id, 'item_generation')
            return
        
        column_mapping = await item_generation_service.identify_columns_with_llm(
            parsed_data['headers'],
            parsed_data['rows'][:5]
        )
        
        # Step 4: Extract SKU data
        update_progress(
            db, collection_id, 'item_generation',
            status='processing',
            current_step='Extracting SKU data',
            progress={'step': 4, 'total_steps': 7, 'percentage': 57}
        )
        if check_cancelled(db, collection_id, 'item_generation'):
            await cleanup_partial_items(db, collection_id)
            mark_cancelled(db, collection_id, 'item_generation')
            return
        
        po_items = await item_generation_service.extract_sku_data(parsed_data, column_mapping)
        
        # Step 5: Enrich from linesheet (TODO: Support multiple linesheets)
        update_progress(
            db, collection_id, 'item_generation',
            status='processing',
            current_step='Enriching from linesheet',
            progress={'step': 5, 'total_steps': 7, 'percentage': 71}
        )
        if check_cancelled(db, collection_id, 'item_generation'):
            await cleanup_partial_items(db, collection_id)
            mark_cancelled(db, collection_id, 'item_generation')
            return
        
        # TODO: Fetch ALL linesheets and merge structured_products
        enriched_items = await item_generation_service.enrich_from_linesheet(collection_id, po_items)
        
        # Step 6: Generate items
        update_progress(
            db, collection_id, 'item_generation',
            status='processing',
            current_step='Generating item objects',
            progress={'step': 6, 'total_steps': 7, 'percentage': 86}
        )
        if check_cancelled(db, collection_id, 'item_generation'):
            await cleanup_partial_items(db, collection_id)
            mark_cancelled(db, collection_id, 'item_generation')
            return
        
        linesheet_doc = await item_generation_service.fetch_linesheet(collection_id)
        final_items = item_generation_service.generate_item_objects(
            enriched_items=enriched_items,
            collection_id=collection_id,
            po_document_id=po_doc['document_id'],
            linesheet_document_id=linesheet_doc['document_id']
        )
        
        # Step 7: Save
        update_progress(
            db, collection_id, 'item_generation',
            status='processing',
            current_step='Saving',
            progress={'step': 7, 'total_steps': 7, 'percentage': 100}
        )
        if check_cancelled(db, collection_id, 'item_generation'):
            await cleanup_partial_items(db, collection_id)
            mark_cancelled(db, collection_id, 'item_generation')
            return
        
        save_stats = await item_generation_service.save_items_to_firestore(collection_id, final_items)
        
        # Mark as completed
        mark_completed(db, collection_id, 'item_generation')
        logger.info(f"Item generation completed: {save_stats['items_created']} created, {save_stats['items_skipped']} skipped")
        
    except Exception as e:
        logger.error(f"Error generating items for collection {collection_id}: {e}")
        
        # Clean up partial items
        await cleanup_partial_items(db, collection_id)
        
        # Mark as failed
        mark_failed(
            db,
            collection_id,
            'item_generation',
            str(e),
            'Generation Error'
        )
