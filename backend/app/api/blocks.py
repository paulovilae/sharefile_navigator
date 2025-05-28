from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import BlockCategory, BlockTemplate, Workflow, WorkflowBlock, User, BlockExecution, SidebarMenu, SidebarMenuCategory
from app.schemas import (
    BlockCategoryCreate, BlockCategoryRead,
    BlockTemplateCreate, BlockTemplateRead,
    WorkflowCreate, WorkflowRead,
    WorkflowBlockCreate, WorkflowBlockRead,
    BlockExecutionCreate, BlockExecutionRead,
    SidebarMenuRead, SidebarMenuCreate,
    SidebarMenuCategoryRead, SidebarMenuCategoryCreate
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from typing import List
import re

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ocr.db')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

router = APIRouter()

# BlockCategory endpoints
@router.get('/block_categories', response_model=List[BlockCategoryRead], tags=["Block Categories"], summary="List all block categories", description="Returns a list of all block categories.")
def list_block_categories(db: Session = Depends(get_db)):
    """List all block categories."""
    return db.query(BlockCategory).all()

@router.post('/block_category', response_model=BlockCategoryRead, tags=["Block Categories"], summary="Create a new block category", description="Create a new block category with name, description, and icon.")
def create_block_category(cat: BlockCategoryCreate, db: Session = Depends(get_db)):
    """Create a new block category."""
    db_cat = BlockCategory(**cat.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.get('/block_category/{cat_id}', response_model=BlockCategoryRead, tags=["Block Categories"], summary="Get a block category by ID", description="Retrieve a block category by its ID.")
def get_block_category(cat_id: int, db: Session = Depends(get_db)):
    """Get a block category by ID."""
    cat = db.query(BlockCategory).get(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail='BlockCategory not found')
    return cat

@router.put('/block_category/{cat_id}', response_model=BlockCategoryRead, tags=["Block Categories"], summary="Update a block category", description="Update a block category by its ID.")
def update_block_category(cat_id: int, cat: BlockCategoryCreate, db: Session = Depends(get_db)):
    """Update a block category by ID."""
    db_cat = db.query(BlockCategory).get(cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail='BlockCategory not found')
    for k, v in cat.dict().items():
        setattr(db_cat, k, v)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete('/block_category/{cat_id}', tags=["Block Categories"], summary="Delete a block category", description="Delete a block category by its ID.")
def delete_block_category(cat_id: int, db: Session = Depends(get_db)):
    """Delete a block category by ID."""
    db_cat = db.query(BlockCategory).get(cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail='BlockCategory not found')
    db.delete(db_cat)
    db.commit()
    return {"ok": True}

# BlockTemplate endpoints
@router.get('/block_templates', response_model=List[BlockTemplateRead], tags=["Block Templates"], summary="List all block templates", description="Returns a list of all block templates.")
def list_block_templates(db: Session = Depends(get_db)):
    """List all block templates."""
    return db.query(BlockTemplate).all()

@router.post('/block_template', response_model=BlockTemplateRead, tags=["Block Templates"], summary="Create a new block template", description="Create a new block template with metadata and code.")
def create_block_template(tpl: BlockTemplateCreate, db: Session = Depends(get_db)):
    """Create a new block template."""
    db_tpl = BlockTemplate(**tpl.dict())
    db.add(db_tpl)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl

@router.get('/block_template/{tpl_id}', response_model=BlockTemplateRead, tags=["Block Templates"], summary="Get a block template by ID", description="Retrieve a block template by its ID.")
def get_block_template(tpl_id: int, db: Session = Depends(get_db)):
    """Get a block template by ID."""
    tpl = db.query(BlockTemplate).get(tpl_id)
    if not tpl:
        raise HTTPException(status_code=404, detail='BlockTemplate not found')
    return tpl

@router.put('/block_template/{tpl_id}', response_model=BlockTemplateRead, tags=["Block Templates"], summary="Update a block template", description="Update a block template by its ID.")
def update_block_template(tpl_id: int, tpl: BlockTemplateCreate, db: Session = Depends(get_db)):
    """Update a block template by ID."""
    db_tpl = db.query(BlockTemplate).get(tpl_id)
    if not db_tpl:
        raise HTTPException(status_code=404, detail='BlockTemplate not found')
    for k, v in tpl.dict().items():
        setattr(db_tpl, k, v)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl

@router.delete('/block_template/{tpl_id}', tags=["Block Templates"], summary="Delete a block template", description="Delete a block template by its ID.")
def delete_block_template(tpl_id: int, db: Session = Depends(get_db)):
    """Delete a block template by ID and remove its deployed frontend code file."""
    db_tpl = db.query(BlockTemplate).get(tpl_id)
    if not db_tpl:
        raise HTTPException(status_code=404, detail='BlockTemplate not found')
    # Remove deployed frontend code file if it exists
    display_name = db_tpl.display_name or f'block_{tpl_id}'
    sanitized = re.sub(r'[^A-Za-z0-9_]', '', display_name.replace(' ', '_'))
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    blocks_dir = os.path.join(project_root, 'frontend', 'src', 'blocks')
    jsx_path = os.path.join(blocks_dir, f'{sanitized}.jsx')
    try:
        if os.path.exists(jsx_path):
            os.remove(jsx_path)
    except Exception as e:
        print(f"Warning: Could not delete block file {jsx_path}: {e}")
    db.delete(db_tpl)
    db.commit()
    return {"ok": True}

@router.post('/deploy_block_code', tags=["Block Templates"], summary="Deploy backend block code", description="Save backend block code to a .py file on disk.")
def deploy_block_code(payload: dict, db: Session = Depends(get_db)):
    """Deploy backend block code: save to backend/blocks/{sanitized_display_name}.py"""
    block_id = payload.get('block_id')
    code = payload.get('code')
    if not block_id or not code:
        raise HTTPException(status_code=400, detail='block_id and code are required')
    tpl = db.query(BlockTemplate).get(block_id)
    if not tpl:
        raise HTTPException(status_code=404, detail='BlockTemplate not found')
    display_name = tpl.display_name or f'block_{block_id}'
    sanitized = re.sub(r'[^A-Za-z0-9_]', '', display_name.replace(' ', '_'))
    blocks_dir = os.path.join(os.path.dirname(__file__), '..', 'blocks')
    os.makedirs(blocks_dir, exist_ok=True)
    file_path = os.path.abspath(os.path.join(blocks_dir, f'{sanitized}.py'))
    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(code)
    return {"success": True, "message": f"Block {block_id} code deployed.", "file_path": file_path}

@router.post('/deploy_frontend_block_code', tags=["Block Templates"], summary="Deploy frontend block code", description="Save frontend block code to a .jsx file on disk.")
def deploy_frontend_block_code(payload: dict, db: Session = Depends(get_db)):
    """Deploy frontend block code: save to frontend/src/blocks/{sanitized_display_name}.jsx"""
    block_id = payload.get('block_id')
    code = payload.get('code')
    if not block_id or not code:
        raise HTTPException(status_code=400, detail='block_id and code are required')
    tpl = db.query(BlockTemplate).get(block_id)
    if not tpl:
        raise HTTPException(status_code=404, detail='BlockTemplate not found')
    display_name = tpl.display_name or f'block_{block_id}'
    sanitized = re.sub(r'[^A-Za-z0-9_]', '', display_name.replace(' ', '_'))
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    blocks_dir = os.path.join(project_root, 'frontend', 'src', 'blocks')
    os.makedirs(blocks_dir, exist_ok=True)
    file_path = os.path.join(blocks_dir, f'{sanitized}.jsx')
    with open(file_path, 'w', encoding='utf-8', newline='') as f:
        f.write(code)
    return {"success": True, "message": f"Frontend block {block_id} code deployed.", "file_path": file_path}

# --- The following endpoints are not currently used and are commented out for simplicity ---
'''
# Workflow endpoints
@router.get('/workflows', response_model=List[WorkflowRead], tags=["Workflows"], summary="List all workflows", description="Returns a list of all workflows.")
def list_workflows(db: Session = Depends(get_db)):
    """List all workflows."""
    return db.query(Workflow).all()

@router.post('/workflow', response_model=WorkflowRead, tags=["Workflows"], summary="Create a new workflow", description="Create a new workflow.")
def create_workflow(wf: WorkflowCreate, db: Session = Depends(get_db)):
    """Create a new workflow."""
    db_wf = Workflow(**wf.dict())
    db.add(db_wf)
    db.commit()
    db.refresh(db_wf)
    return db_wf

@router.get('/workflow/{wf_id}', response_model=WorkflowRead, tags=["Workflows"], summary="Get a workflow by ID", description="Retrieve a workflow by its ID.")
def get_workflow(wf_id: int, db: Session = Depends(get_db)):
    """Get a workflow by ID."""
    wf = db.query(Workflow).get(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail='Workflow not found')
    return wf

@router.put('/workflow/{wf_id}', response_model=WorkflowRead, tags=["Workflows"], summary="Update a workflow", description="Update a workflow by its ID.")
def update_workflow(wf_id: int, wf: WorkflowCreate, db: Session = Depends(get_db)):
    """Update a workflow by ID."""
    db_wf = db.query(Workflow).get(wf_id)
    if not db_wf:
        raise HTTPException(status_code=404, detail='Workflow not found')
    for k, v in wf.dict().items():
        setattr(db_wf, k, v)
    db.commit()
    db.refresh(db_wf)
    return db_wf

@router.delete('/workflow/{wf_id}', tags=["Workflows"], summary="Delete a workflow", description="Delete a workflow by its ID.")
def delete_workflow(wf_id: int, db: Session = Depends(get_db)):
    """Delete a workflow by ID."""
    db_wf = db.query(Workflow).get(wf_id)
    if not db_wf:
        raise HTTPException(status_code=404, detail='Workflow not found')
    db.delete(db_wf)
    db.commit()
    return {"ok": True}

# WorkflowBlock endpoints
@router.get('/workflow_blocks', response_model=List[WorkflowBlockRead], tags=["Workflow Blocks"], summary="List all workflow blocks", description="Returns a list of all workflow blocks.")
def list_workflow_blocks(db: Session = Depends(get_db)):
    """List all workflow blocks."""
    return db.query(WorkflowBlock).all()

@router.post('/workflow_block', response_model=WorkflowBlockRead, tags=["Workflow Blocks"], summary="Create a new workflow block", description="Create a new workflow block.")
def create_workflow_block(wb: WorkflowBlockCreate, db: Session = Depends(get_db)):
    """Create a new workflow block."""
    db_wb = WorkflowBlock(**wb.dict())
    db.add(db_wb)
    db.commit()
    db.refresh(db_wb)
    return db_wb

@router.get('/workflow_block/{wb_id}', response_model=WorkflowBlockRead, tags=["Workflow Blocks"], summary="Get a workflow block by ID", description="Retrieve a workflow block by its ID.")
def get_workflow_block(wb_id: int, db: Session = Depends(get_db)):
    """Get a workflow block by ID."""
    wb = db.query(WorkflowBlock).get(wb_id)
    if not wb:
        raise HTTPException(status_code=404, detail='WorkflowBlock not found')
    return wb

@router.put('/workflow_block/{wb_id}', response_model=WorkflowBlockRead, tags=["Workflow Blocks"], summary="Update a workflow block", description="Update a workflow block by its ID.")
def update_workflow_block(wb_id: int, wb: WorkflowBlockCreate, db: Session = Depends(get_db)):
    """Update a workflow block by ID."""
    db_wb = db.query(WorkflowBlock).get(wb_id)
    if not db_wb:
        raise HTTPException(status_code=404, detail='WorkflowBlock not found')
    for k, v in wb.dict().items():
        setattr(db_wb, k, v)
    db.commit()
    db.refresh(db_wb)
    return db_wb

@router.delete('/workflow_block/{wb_id}', tags=["Workflow Blocks"], summary="Delete a workflow block", description="Delete a workflow block by its ID.")
def delete_workflow_block(wb_id: int, db: Session = Depends(get_db)):
    """Delete a workflow block by ID."""
    db_wb = db.query(WorkflowBlock).get(wb_id)
    if not db_wb:
        raise HTTPException(status_code=404, detail='WorkflowBlock not found')
    db.delete(db_wb)
    db.commit()
    return {"ok": True}

# BlockExecution endpoints
@router.get('/block_executions', response_model=List[BlockExecutionRead], tags=["Block Executions"], summary="List all block executions", description="Returns a list of all block executions.")
def list_block_executions(db: Session = Depends(get_db)):
    """List all block executions."""
    return db.query(BlockExecution).all()

@router.post('/block_execution', response_model=BlockExecutionRead, tags=["Block Executions"], summary="Create a new block execution", description="Create a new block execution.")
def create_block_execution(exec: BlockExecutionCreate, db: Session = Depends(get_db)):
    """Create a new block execution."""
    db_exec = BlockExecution(**exec.dict())
    db.add(db_exec)
    db.commit()
    db.refresh(db_exec)
    return db_exec

@router.get('/block_execution/{exec_id}', response_model=BlockExecutionRead, tags=["Block Executions"], summary="Get a block execution by ID", description="Retrieve a block execution by its ID.")
def get_block_execution(exec_id: int, db: Session = Depends(get_db)):
    """Get a block execution by ID."""
    exec = db.query(BlockExecution).get(exec_id)
    if not exec:
        raise HTTPException(status_code=404, detail='BlockExecution not found')
    return exec

@router.put('/block_execution/{exec_id}', response_model=BlockExecutionRead, tags=["Block Executions"], summary="Update a block execution", description="Update a block execution by its ID.")
def update_block_execution(exec_id: int, exec: BlockExecutionCreate, db: Session = Depends(get_db)):
    """Update a block execution by ID."""
    db_exec = db.query(BlockExecution).get(exec_id)
    if not db_exec:
        raise HTTPException(status_code=404, detail='BlockExecution not found')
    for k, v in exec.dict().items():
        setattr(db_exec, k, v)
    db.commit()
    db.refresh(db_exec)
    return db_exec

@router.delete('/block_execution/{exec_id}', tags=["Block Executions"], summary="Delete a block execution", description="Delete a block execution by its ID.")
def delete_block_execution(exec_id: int, db: Session = Depends(get_db)):
    """Delete a block execution by ID."""
    db_exec = db.query(BlockExecution).get(exec_id)
    if not db_exec:
        raise HTTPException(status_code=404, detail='BlockExecution not found')
    db.delete(db_exec)
    db.commit()
    return {"ok": True}
''' 

@router.post('/workflows', response_model=WorkflowRead, tags=["Workflows"], summary="Create a new workflow with blocks")
def create_workflow_with_blocks(payload: dict, db: Session = Depends(get_db)):
    """
    Create a new workflow and its blocks in one request.
    Payload example:
    {
        "name": "My Workflow",
        "description": "Description",
        "blocks": [
            {
                "block_template_id": 1,
                "order": 0,
                "config": { "param1": "value" },
                "name_override": "SharePoint Explorer",
                "enabled": true
            }
        ]
    }
    """
    name = payload.get('name')
    description = payload.get('description')
    blocks = payload.get('blocks', [])
    if not name or not blocks:
        raise HTTPException(status_code=400, detail='Workflow name and at least one block are required')
    wf = Workflow(name=name, description=description)
    db.add(wf)
    db.commit()
    db.refresh(wf)
    for idx, block in enumerate(blocks):
        wb = WorkflowBlock(
            workflow_id=wf.id,
            block_template_id=block['block_template_id'],
            order=block.get('order', idx),
            config=block.get('config', {}),
            name_override=block.get('name_override'),
            enabled=block.get('enabled', True)
        )
        db.add(wb)
    db.commit()
    db.refresh(wf)
    return wf

# Sidebar Menu Category Endpoints
@router.get('/sidebar_menu_categories', response_model=List[SidebarMenuCategoryRead], tags=["SidebarMenu"], summary="List all sidebar menu categories")
def list_sidebar_menu_categories(db: Session = Depends(get_db)):
    return db.query(SidebarMenuCategory).all()

@router.post('/sidebar_menu_categories', response_model=SidebarMenuCategoryRead, tags=["SidebarMenu"], summary="Create sidebar menu category")
def create_sidebar_menu_category(cat: SidebarMenuCategoryCreate, db: Session = Depends(get_db)):
    db_cat = SidebarMenuCategory(**cat.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.put('/sidebar_menu_categories/{cat_id}', response_model=SidebarMenuCategoryRead, tags=["SidebarMenu"], summary="Update sidebar menu category")
def update_sidebar_menu_category(cat_id: int, cat: SidebarMenuCategoryCreate, db: Session = Depends(get_db)):
    db_cat = db.query(SidebarMenuCategory).get(cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail='SidebarMenuCategory not found')
    for k, v in cat.dict().items():
        setattr(db_cat, k, v)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete('/sidebar_menu_categories/{cat_id}', tags=["SidebarMenu"], summary="Delete sidebar menu category")
def delete_sidebar_menu_category(cat_id: int, db: Session = Depends(get_db)):
    db_cat = db.query(SidebarMenuCategory).get(cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail='SidebarMenuCategory not found')
    db.delete(db_cat)
    db.commit()
    return {"ok": True}

# Sidebar Menu Endpoints
@router.get('/sidebar_menus', response_model=List[SidebarMenuRead], tags=["SidebarMenu"], summary="List all sidebar menus")
def list_sidebar_menus(db: Session = Depends(get_db)):
    return db.query(SidebarMenu).order_by(SidebarMenu.order).all()

@router.post('/sidebar_menus', response_model=SidebarMenuRead, tags=["SidebarMenu"], summary="Create sidebar menu")
def create_sidebar_menu(menu: SidebarMenuCreate, db: Session = Depends(get_db)):
    db_menu = SidebarMenu(**menu.dict())
    db.add(db_menu)
    db.commit()
    db.refresh(db_menu)
    return db_menu

@router.put('/sidebar_menus/{menu_id}', response_model=SidebarMenuRead, tags=["SidebarMenu"], summary="Update sidebar menu")
def update_sidebar_menu(menu_id: int, menu: SidebarMenuCreate, db: Session = Depends(get_db)):
    db_menu = db.query(SidebarMenu).get(menu_id)
    if not db_menu:
        raise HTTPException(status_code=404, detail='SidebarMenu not found')
    for k, v in menu.dict().items():
        setattr(db_menu, k, v)
    db.commit()
    db.refresh(db_menu)
    return db_menu

@router.delete('/sidebar_menus/{menu_id}', tags=["SidebarMenu"], summary="Delete sidebar menu")
def delete_sidebar_menu(menu_id: int, db: Session = Depends(get_db)):
    db_menu = db.query(SidebarMenu).get(menu_id)
    if not db_menu:
        raise HTTPException(status_code=404, detail='SidebarMenu not found')
    db.delete(db_menu)
    db.commit()
    return {"ok": True}

# Sidebar Menu Import/Export
@router.get('/sidebar_menus/export', tags=["SidebarMenu"], summary="Export sidebar menus as JSON")
def export_sidebar_menus(db: Session = Depends(get_db)):
    menus = db.query(SidebarMenu).order_by(SidebarMenu.order).all()
    return [SidebarMenuRead.from_orm(m) for m in menus]

@router.post('/sidebar_menus/import', tags=["SidebarMenu"], summary="Import sidebar menus from JSON")
def import_sidebar_menus(payload: List[SidebarMenuCreate], db: Session = Depends(get_db)):
    db.query(SidebarMenu).delete()
    for menu in payload:
        db_menu = SidebarMenu(**menu.dict())
        db.add(db_menu)
    db.commit()
    return {"ok": True} 