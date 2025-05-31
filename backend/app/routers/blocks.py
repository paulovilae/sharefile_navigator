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


@router.get("/metrics/sharepoint", response_model=dict)
def get_sharepoint_metrics(
    days: int = 7,
    db: Session = Depends(get_db)
):
    """Get specific metrics for SharePoint Explorer blocks."""
    end_date = datetime.datetime.utcnow()
    start_date = end_date - datetime.timedelta(days=days)
    
    # Get SharePoint block executions
    executions = db.query(BlockExecution).join(WorkflowBlock).join(BlockTemplate).filter(
        BlockExecution.started_at >= start_date,
        BlockTemplate.type == "frontend",
        BlockTemplate.component == "SharePointExplorerBlock"
    ).all()
    
    # Aggregate SharePoint-specific metrics
    metrics = {
        "total_sessions": len(executions),
        "total_interactions": 0,
        "total_folders_accessed": 0,
        "total_files_viewed": 0,
        "unique_libraries_explored": set(),
        "response_times": [],
        "error_count": 0,
        "session_durations": [],
        "most_accessed_libraries": {},
        "file_type_distribution": {},
        "peak_usage_hours": {}
    }
    
    for execution in executions:
        if execution.result and isinstance(execution.result, dict):
            exec_metrics = execution.result.get("metrics", {})
            if isinstance(exec_metrics, dict):
                metrics["total_interactions"] += exec_metrics.get("totalInteractions", 0)
                metrics["total_folders_accessed"] += exec_metrics.get("foldersAccessed", 0)
                metrics["total_files_viewed"] += exec_metrics.get("filesViewed", 0)
                metrics["error_count"] += exec_metrics.get("errorCount", 0)
                
                # Response times
                if "responseTimes" in exec_metrics and isinstance(exec_metrics["responseTimes"], list):
                    metrics["response_times"].extend(exec_metrics["responseTimes"])
                
                # Session duration
                if "sessionStartTime" in exec_metrics and "lastActivity" in exec_metrics:
                    duration = (exec_metrics["lastActivity"] - exec_metrics["sessionStartTime"]) / 1000
                    metrics["session_durations"].append(duration)
                
                # Libraries explored
                if "librariesExplored" in exec_metrics:
                    if isinstance(exec_metrics["librariesExplored"], list):
                        metrics["unique_libraries_explored"].update(exec_metrics["librariesExplored"])
        
        # Track usage by hour
        hour = execution.started_at.hour
        metrics["peak_usage_hours"][hour] = metrics["peak_usage_hours"].get(hour, 0) + 1
    
    # Calculate averages and convert sets to counts
    result = {
        "period_days": days,
        "total_sessions": metrics["total_sessions"],
        "total_interactions": metrics["total_interactions"],
        "total_folders_accessed": metrics["total_folders_accessed"],
        "total_files_viewed": metrics["total_files_viewed"],
        "unique_libraries_count": len(metrics["unique_libraries_explored"]),
        "error_count": metrics["error_count"],
        "average_response_time": sum(metrics["response_times"]) / len(metrics["response_times"]) if metrics["response_times"] else 0,
        "average_session_duration": sum(metrics["session_durations"]) / len(metrics["session_durations"]) if metrics["session_durations"] else 0,
        "peak_usage_hours": dict(sorted(metrics["peak_usage_hours"].items(), key=lambda x: x[1], reverse=True)[:5])
    }
    
    return result


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


@router.get("/sidebar_menus")
def get_sidebar_menus(db: Session = Depends(get_db)):
    """Get all sidebar menus."""
    menus = db.query(SidebarMenu).filter(SidebarMenu.enabled == True).order_by(SidebarMenu.order).all()
    
    # Convert to dict for JSON serialization
    result = []
    for menu in menus:
        result.append({
            "id": menu.id,
            "label": menu.label,
            "icon": menu.icon,
            "page_ref": menu.page_ref,
            "category_id": menu.category_id,
            "order": menu.order,
            "enabled": menu.enabled,
            "created_at": menu.created_at.isoformat() if menu.created_at else None,
            "updated_at": menu.updated_at.isoformat() if menu.updated_at else None
        })
    
    return result


@router.get("/sidebar_menu_categories")
def get_sidebar_menu_categories(db: Session = Depends(get_db)):
    """Get all sidebar menu categories."""
    categories = db.query(SidebarMenuCategory).all()
    
    # Convert to dict for JSON serialization
    result = []
    for category in categories:
        result.append({
            "id": category.id,
            "name": category.name,
            "description": category.description
        })
    
    return result