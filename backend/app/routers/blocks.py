from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, create_engine
from sqlalchemy.orm import sessionmaker
from typing import List, Optional
import datetime
import json
import os

from app.models import BlockExecution, WorkflowBlock, BlockTemplate, User
from app.schemas import BlockExecutionCreate, BlockExecutionUpdate, BlockExecutionResponse, BlockMetricsResponse

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter(tags=["blocks"])

from app.models import SidebarMenu, SidebarMenuCategory
from app.schemas import SidebarMenuRead, SidebarMenuCategoryRead


@router.post("/executions", response_model=BlockExecutionResponse)
def create_block_execution(
    execution: BlockExecutionCreate,
    db: Session = Depends(get_db)
):
    """Create a new block execution record."""
    db_execution = BlockExecution(
        workflow_block_id=execution.workflow_block_id,
        user_id=execution.user_id,
        status=execution.status,
        started_at=datetime.datetime.utcnow(),
        logs=execution.logs,
        result=execution.result
    )
    
    db.add(db_execution)
    db.commit()
    db.refresh(db_execution)
    
    return db_execution


@router.put("/executions/{execution_id}", response_model=BlockExecutionResponse)
def update_block_execution(
    execution_id: int,
    execution_update: BlockExecutionUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing block execution."""
    db_execution = db.query(BlockExecution).filter(BlockExecution.id == execution_id).first()
    
    if not db_execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block execution not found"
        )
    
    # Update fields
    if execution_update.status is not None:
        db_execution.status = execution_update.status
    
    if execution_update.logs is not None:
        # Append new logs to existing logs
        existing_logs = db_execution.logs or ""
        db_execution.logs = existing_logs + "\n" + execution_update.logs
    
    if execution_update.error is not None:
        db_execution.error = execution_update.error
    
    if execution_update.result is not None:
        db_execution.result = execution_update.result
    
    # Set finished_at if status is completed or error
    if execution_update.status in ["success", "error", "completed"]:
        db_execution.finished_at = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(db_execution)
    
    return db_execution


@router.get("/executions", response_model=List[BlockExecutionResponse])
def get_block_executions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    block_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get block executions with optional filtering."""
    query = db.query(BlockExecution).join(WorkflowBlock).join(BlockTemplate)
    
    if status:
        query = query.filter(BlockExecution.status == status)
    
    if block_type:
        query = query.filter(BlockTemplate.type == block_type)
    
    executions = query.order_by(desc(BlockExecution.started_at)).offset(skip).limit(limit).all()
    
    return executions


@router.get("/executions/{execution_id}", response_model=BlockExecutionResponse)
def get_block_execution(execution_id: int, db: Session = Depends(get_db)):
    """Get a specific block execution."""
    execution = db.query(BlockExecution).filter(BlockExecution.id == execution_id).first()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block execution not found"
        )
    
    return execution


@router.get("/metrics/summary", response_model=BlockMetricsResponse)
def get_block_metrics_summary(
    days: int = 7,
    block_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get aggregated metrics for block executions."""
    # Calculate date range
    end_date = datetime.datetime.utcnow()
    start_date = end_date - datetime.timedelta(days=days)
    
    # Base query
    query = db.query(BlockExecution).join(WorkflowBlock).join(BlockTemplate)
    query = query.filter(BlockExecution.started_at >= start_date)
    
    if block_type:
        query = query.filter(BlockTemplate.type == block_type)
    
    # Get all executions in the time range
    executions = query.all()
    
    # Calculate metrics
    total_executions = len(executions)
    successful_executions = len([e for e in executions if e.status == "success"])
    failed_executions = len([e for e in executions if e.status == "error"])
    
    # Calculate average execution time for completed executions
    completed_executions = [e for e in executions if e.finished_at and e.started_at]
    avg_execution_time = 0
    if completed_executions:
        total_time = sum([
            (e.finished_at - e.started_at).total_seconds() 
            for e in completed_executions
        ])
        avg_execution_time = total_time / len(completed_executions)
    
    # Get most used block types
    block_type_counts = {}
    for execution in executions:
        if execution.workflow_block and execution.workflow_block.block_template:
            block_type = execution.workflow_block.block_template.type
            block_type_counts[block_type] = block_type_counts.get(block_type, 0) + 1
    
    # Get daily execution counts
    daily_counts = {}
    for execution in executions:
        date_key = execution.started_at.date().isoformat()
        daily_counts[date_key] = daily_counts.get(date_key, 0) + 1
    
    # Extract metrics from execution results
    interaction_metrics = {
        "total_interactions": 0,
        "folders_accessed": 0,
        "files_viewed": 0,
        "libraries_explored": 0,
        "average_response_time": 0
    }
    
    response_times = []
    for execution in executions:
        if execution.result and isinstance(execution.result, dict):
            metrics = execution.result.get("metrics", {})
            if isinstance(metrics, dict):
                interaction_metrics["total_interactions"] += metrics.get("totalInteractions", 0)
                interaction_metrics["folders_accessed"] += metrics.get("foldersAccessed", 0)
                interaction_metrics["files_viewed"] += metrics.get("filesViewed", 0)
                
                if "averageResponseTime" in metrics and metrics["averageResponseTime"] > 0:
                    response_times.append(metrics["averageResponseTime"])
    
    if response_times:
        interaction_metrics["average_response_time"] = sum(response_times) / len(response_times)
    
    return {
        "period_days": days,
        "total_executions": total_executions,
        "successful_executions": successful_executions,
        "failed_executions": failed_executions,
        "success_rate": successful_executions / total_executions if total_executions > 0 else 0,
        "average_execution_time_seconds": avg_execution_time,
        "block_type_distribution": block_type_counts,
        "daily_execution_counts": daily_counts,
        "interaction_metrics": interaction_metrics
    }


@router.delete("/executions/{execution_id}")
def delete_block_execution(execution_id: int, db: Session = Depends(get_db)):
    """Delete a block execution record."""
    execution = db.query(BlockExecution).filter(BlockExecution.id == execution_id).first()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block execution not found"
        )
    
    db.delete(execution)
    db.commit()
    
    return {"message": "Block execution deleted successfully"}

# All manual sidebar menu endpoints removed - using Pydantic-based ones in api/blocks.py instead
# This eliminates duplicate endpoints and ensures consistent schema handling


@router.get("/localization_settings")
def get_localization_settings():
    """Get localization settings."""
    return {"message": "Localization settings go here"}