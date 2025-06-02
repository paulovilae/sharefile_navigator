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


@router.post("/sidebar_menus")
def create_sidebar_menu(menu_data: dict, db: Session = Depends(get_db)):
    """Create a new sidebar menu."""
    from app.models import SidebarMenu
    
    db_menu = SidebarMenu(
        label=menu_data.get("label"),
        icon=menu_data.get("icon"),
        page_ref=menu_data.get("page_ref"),
        category_id=menu_data.get("category_id"),
        order=menu_data.get("order", 0),
        enabled=menu_data.get("enabled", True)
    )
    
    db.add(db_menu)
    db.commit()
    db.refresh(db_menu)
    
    return {
        "id": db_menu.id,
        "label": db_menu.label,
        "icon": db_menu.icon,
        "page_ref": db_menu.page_ref,
        "category_id": db_menu.category_id,
        "order": db_menu.order,
        "enabled": db_menu.enabled,
        "created_at": db_menu.created_at.isoformat() if db_menu.created_at else None,
        "updated_at": db_menu.updated_at.isoformat() if db_menu.updated_at else None
    }


@router.put("/sidebar_menus/{menu_id}")
def update_sidebar_menu(menu_id: int, menu_data: dict, db: Session = Depends(get_db)):
    """Update a sidebar menu."""
    from app.models import SidebarMenu
    
    db_menu = db.query(SidebarMenu).filter(SidebarMenu.id == menu_id).first()
    if not db_menu:
        raise HTTPException(status_code=404, detail="SidebarMenu not found")
    
    # Update fields
    if "label" in menu_data:
        db_menu.label = menu_data["label"]
    if "icon" in menu_data:
        db_menu.icon = menu_data["icon"]
    if "page_ref" in menu_data:
        db_menu.page_ref = menu_data["page_ref"]
    if "category_id" in menu_data:
        db_menu.category_id = menu_data["category_id"]
    if "order" in menu_data:
        db_menu.order = menu_data["order"]
    if "enabled" in menu_data:
        db_menu.enabled = menu_data["enabled"]
    
    db.commit()
    db.refresh(db_menu)
    
    return {
        "id": db_menu.id,
        "label": db_menu.label,
        "icon": db_menu.icon,
        "page_ref": db_menu.page_ref,
        "category_id": db_menu.category_id,
        "order": db_menu.order,
        "enabled": db_menu.enabled,
        "created_at": db_menu.created_at.isoformat() if db_menu.created_at else None,
        "updated_at": db_menu.updated_at.isoformat() if db_menu.updated_at else None
    }


@router.delete("/sidebar_menus/{menu_id}")
def delete_sidebar_menu(menu_id: int, db: Session = Depends(get_db)):
    """Delete a sidebar menu."""
    from app.models import SidebarMenu
    
    db_menu = db.query(SidebarMenu).filter(SidebarMenu.id == menu_id).first()
    if not db_menu:
        raise HTTPException(status_code=404, detail="SidebarMenu not found")
    
    db.delete(db_menu)
    db.commit()
    
    return {"ok": True}


@router.post("/sidebar_menu_categories")
def create_sidebar_menu_category(category_data: dict, db: Session = Depends(get_db)):
    """Create a new sidebar menu category."""
    from app.models import SidebarMenuCategory
    
    db_category = SidebarMenuCategory(
        name=category_data.get("name"),
        description=category_data.get("description")
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return {
        "id": db_category.id,
        "name": db_category.name,
        "description": db_category.description
    }


@router.put("/sidebar_menu_categories/{category_id}")
def update_sidebar_menu_category(category_id: int, category_data: dict, db: Session = Depends(get_db)):
    """Update a sidebar menu category."""
    from app.models import SidebarMenuCategory
    
    db_category = db.query(SidebarMenuCategory).filter(SidebarMenuCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="SidebarMenuCategory not found")
    
    if "name" in category_data:
        db_category.name = category_data["name"]
    if "description" in category_data:
        db_category.description = category_data["description"]
    
    db.commit()
    db.refresh(db_category)
    
    return {
        "id": db_category.id,
        "name": db_category.name,
        "description": db_category.description
    }


@router.delete("/sidebar_menu_categories/{category_id}")
def delete_sidebar_menu_category(category_id: int, db: Session = Depends(get_db)):
    """Delete a sidebar menu category."""
    from app.models import SidebarMenuCategory
    
    db_category = db.query(SidebarMenuCategory).filter(SidebarMenuCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="SidebarMenuCategory not found")
    
    db.delete(db_category)
    db.commit()
    
    return {"ok": True}