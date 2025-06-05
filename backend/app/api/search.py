from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import sqlite3
from datetime import datetime, timedelta
import re
import json
import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Database setup
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db_connection():
    """Get a raw SQLite connection for direct SQL queries."""
    db_path = DATABASE_URL.replace('sqlite:///', '')
    return sqlite3.connect(db_path)

logger = logging.getLogger(__name__)

router = APIRouter()

class ImageSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    limit: int = Field(default=20, ge=1, le=100, description="Number of results per page")
    offset: int = Field(default=0, ge=0, description="Offset for pagination")
    text_type: str = Field(default="all", description="Type of text to search: all, pdf, ocr")
    date_range: str = Field(default="all", description="Date range filter: all, week, month, year")
    sort_by: str = Field(default="relevance", description="Sort order: relevance, date, filename")
    include_images: bool = Field(default=True, description="Include image paths in results")
    include_snippets: bool = Field(default=True, description="Include text snippets in results")

class ImageSearchResult(BaseModel):
    file_id: str
    status: str
    pdf_text: Optional[str] = None
    ocr_text: Optional[str] = None
    pdf_image_path: Optional[str] = None
    ocr_image_path: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    directory_id: Optional[str] = None
    text_content: Optional[str] = None
    relevance_score: Optional[float] = None

class ImageSearchResponse(BaseModel):
    query: str
    total: int
    offset: int
    limit: int
    results: List[ImageSearchResult]
    execution_time_ms: float

def create_search_query(search_request: ImageSearchRequest) -> tuple[str, list]:
    """
    Create optimized SQL query for image search with full-text search capabilities.
    """
    base_query = """
    SELECT
        file_id,
        status,
        pdf_text,
        ocr_text,
        pdf_image_path,
        ocr_image_path,
        created_at,
        updated_at,
        directory_id,
        CASE
            WHEN pdf_text IS NOT NULL AND pdf_text != '' THEN pdf_text
            WHEN ocr_text IS NOT NULL AND ocr_text != '' THEN ocr_text
            ELSE ''
        END as text_content
    FROM ocr_results
    WHERE status IN ('completed', 'ocr_processed', 'text_extracted', 'OCR Done')
    """
    
    params = []
    conditions = []
    
    # Search query conditions - require ALL terms to be present
    search_terms = search_request.query.strip().split()
    if search_terms:
        search_conditions = []
        
        # For each search term, create conditions that check both PDF and OCR text
        for term in search_terms:
            term_conditions = []
            
            if search_request.text_type in ['all', 'pdf']:
                term_conditions.append("(pdf_text LIKE ? COLLATE NOCASE)")
                params.append(f"%{term}%")
            
            if search_request.text_type in ['all', 'ocr']:
                term_conditions.append("(ocr_text LIKE ? COLLATE NOCASE)")
                params.append(f"%{term}%")
            
            if term_conditions:
                # Each term must be found in at least one text field
                search_conditions.append(f"({' OR '.join(term_conditions)})")
        
        if search_conditions:
            # ALL terms must be present (AND logic between terms)
            conditions.append(f"({' AND '.join(search_conditions)})")
    
    # Date range filter
    if search_request.date_range != 'all':
        date_condition = get_date_condition(search_request.date_range)
        if date_condition:
            conditions.append(date_condition)
    
    # Only include records with images if specifically requested and no text search
    # For text searches, we want to show results even if images are missing
    if search_request.include_images and not search_terms:
        conditions.append("(pdf_image_path IS NOT NULL OR ocr_image_path IS NOT NULL)")
    
    # Add conditions to query
    if conditions:
        base_query += " AND " + " AND ".join(conditions)
    
    # Add ordering
    if search_request.sort_by == 'date':
        base_query += " ORDER BY created_at DESC"
    elif search_request.sort_by == 'filename':
        base_query += " ORDER BY file_id ASC"
    else:  # relevance
        # Simple relevance scoring based on term frequency
        relevance_score = create_relevance_score(search_terms, search_request.text_type)
        base_query = base_query.replace("text_content", f"text_content, {relevance_score} as relevance_score")
        base_query += " ORDER BY relevance_score DESC, created_at DESC"
    
    # Add pagination
    base_query += " LIMIT ? OFFSET ?"
    params.extend([search_request.limit, search_request.offset])
    
    return base_query, params

def create_relevance_score(search_terms: List[str], text_type: str) -> str:
    """
    Create a relevance scoring expression for SQL query.
    """
    if not search_terms:
        return "0"
    
    score_parts = []
    
    for term in search_terms:
        if text_type in ['all', 'pdf']:
            # Count occurrences in PDF text
            score_parts.append(f"(LENGTH(pdf_text) - LENGTH(REPLACE(UPPER(pdf_text), UPPER('{term}'), ''))) / LENGTH('{term}')")
        
        if text_type in ['all', 'ocr']:
            # Count occurrences in OCR text
            score_parts.append(f"(LENGTH(ocr_text) - LENGTH(REPLACE(UPPER(ocr_text), UPPER('{term}'), ''))) / LENGTH('{term}')")
    
    return f"({' + '.join(score_parts)})" if score_parts else "0"

def get_date_condition(date_range: str) -> Optional[str]:
    """
    Get SQL condition for date range filtering.
    """
    if date_range == 'week':
        return "created_at >= datetime('now', '-7 days')"
    elif date_range == 'month':
        return "created_at >= datetime('now', '-30 days')"
    elif date_range == 'year':
        return "created_at >= datetime('now', '-365 days')"
    return None

def get_total_count(search_request: ImageSearchRequest) -> int:
    """
    Get total count of search results for pagination.
    """
    count_query = """
    SELECT COUNT(*) as total
    FROM ocr_results
    WHERE status IN ('completed', 'ocr_processed', 'text_extracted', 'OCR Done')
    """
    
    params = []
    conditions = []
    
    # Search query conditions - require ALL terms to be present
    search_terms = search_request.query.strip().split()
    if search_terms:
        search_conditions = []
        
        # For each search term, create conditions that check both PDF and OCR text
        for term in search_terms:
            term_conditions = []
            
            if search_request.text_type in ['all', 'pdf']:
                term_conditions.append("(pdf_text LIKE ? COLLATE NOCASE)")
                params.append(f"%{term}%")
            
            if search_request.text_type in ['all', 'ocr']:
                term_conditions.append("(ocr_text LIKE ? COLLATE NOCASE)")
                params.append(f"%{term}%")
            
            if term_conditions:
                # Each term must be found in at least one text field
                search_conditions.append(f"({' OR '.join(term_conditions)})")
        
        if search_conditions:
            # ALL terms must be present (AND logic between terms)
            conditions.append(f"({' AND '.join(search_conditions)})")
    
    # Date range filter
    if search_request.date_range != 'all':
        date_condition = get_date_condition(search_request.date_range)
        if date_condition:
            conditions.append(date_condition)
    
    # Only include records with images if specifically requested and no text search
    # For text searches, we want to show results even if images are missing
    if search_request.include_images and not search_terms:
        conditions.append("(pdf_image_path IS NOT NULL OR ocr_image_path IS NOT NULL)")
    
    # Add conditions to query
    if conditions:
        count_query += " AND " + " AND ".join(conditions)
    
    try:
        with get_db_connection() as conn:
            cursor = conn.execute(count_query, params)
            result = cursor.fetchone()
            return result[0] if result else 0
    except Exception as e:
        logger.error(f"Error getting total count: {e}")
        return 0

@router.post("/images", response_model=ImageSearchResponse)
async def search_images(search_request: ImageSearchRequest):
    """
    Search for images based on text content with advanced filtering and pagination.
    Optimized for large databases with efficient indexing and query optimization.
    """
    start_time = datetime.now()
    
    try:
        # Get total count for pagination
        total_count = get_total_count(search_request)
        
        # Build and execute search query
        query, params = create_search_query(search_request)
        
        results = []
        with get_db_connection() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            
            for row in rows:
                # Convert row to dictionary
                row_dict = dict(zip([col[0] for col in cursor.description], row))
                
                # Create result object
                result = ImageSearchResult(
                    file_id=row_dict['file_id'],
                    status=row_dict['status'],
                    pdf_text=row_dict['pdf_text'] if search_request.include_snippets else None,
                    ocr_text=row_dict['ocr_text'] if search_request.include_snippets else None,
                    pdf_image_path=row_dict['pdf_image_path'],
                    ocr_image_path=row_dict['ocr_image_path'],
                    created_at=row_dict['created_at'],
                    updated_at=row_dict['updated_at'],
                    directory_id=row_dict['directory_id'],
                    text_content=row_dict['text_content'] if search_request.include_snippets else None,
                    relevance_score=row_dict.get('relevance_score', 0.0)
                )
                results.append(result)
        
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return ImageSearchResponse(
            query=search_request.query,
            total=total_count,
            offset=search_request.offset,
            limit=search_request.limit,
            results=results,
            execution_time_ms=execution_time
        )
        
    except Exception as e:
        logger.error(f"Error in image search: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get("/suggestions")
async def get_search_suggestions(q: str = Query(..., min_length=2, max_length=100)):
    """
    Get search suggestions based on existing text content.
    Returns common words and phrases from the database.
    """
    try:
        # Extract words from the query
        query_words = re.findall(r'\b\w{3,}\b', q.lower())
        if not query_words:
            return {"suggestions": []}
        
        suggestions = []
        
        # Search for common terms in the database
        with get_db_connection() as conn:
            # Get suggestions from PDF text
            pdf_query = """
            SELECT DISTINCT 
                SUBSTR(pdf_text, INSTR(UPPER(pdf_text), UPPER(?)) - 10, 50) as context
            FROM ocr_results 
            WHERE pdf_text LIKE ? COLLATE NOCASE 
            AND pdf_text IS NOT NULL 
            AND pdf_text != ''
            LIMIT 10
            """
            
            # Get suggestions from OCR text
            ocr_query = """
            SELECT DISTINCT 
                SUBSTR(ocr_text, INSTR(UPPER(ocr_text), UPPER(?)) - 10, 50) as context
            FROM ocr_results 
            WHERE ocr_text LIKE ? COLLATE NOCASE 
            AND ocr_text IS NOT NULL 
            AND ocr_text != ''
            LIMIT 10
            """
            
            for word in query_words[:3]:  # Limit to first 3 words
                # PDF suggestions
                cursor = conn.execute(pdf_query, [word, f"%{word}%"])
                for row in cursor.fetchall():
                    context = row[0]
                    if context:
                        # Extract meaningful phrases
                        words = re.findall(r'\b\w+\b', context)
                        if len(words) >= 2:
                            suggestions.append(' '.join(words[:3]))
                
                # OCR suggestions
                cursor = conn.execute(ocr_query, [word, f"%{word}%"])
                for row in cursor.fetchall():
                    context = row[0]
                    if context:
                        # Extract meaningful phrases
                        words = re.findall(r'\b\w+\b', context)
                        if len(words) >= 2:
                            suggestions.append(' '.join(words[:3]))
        
        # Remove duplicates and filter
        unique_suggestions = list(set(suggestions))
        filtered_suggestions = [s for s in unique_suggestions if len(s) > 3 and q.lower() in s.lower()]
        
        return {"suggestions": filtered_suggestions[:10]}
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        return {"suggestions": []}

@router.post("/images/advanced", response_model=ImageSearchResponse)
async def advanced_image_search(search_params: Dict[str, Any]):
    """
    Advanced search with complex filtering options.
    """
    try:
        # Convert to ImageSearchRequest
        search_request = ImageSearchRequest(**search_params)
        return await search_images(search_request)
    except Exception as e:
        logger.error(f"Error in advanced search: {e}")
        raise HTTPException(status_code=500, detail=f"Advanced search failed: {str(e)}")