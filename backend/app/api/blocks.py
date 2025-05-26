from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import BlockCategory, BlockTemplate, Workflow, WorkflowBlock, User, BlockExecution
from app.schemas import (
    BlockCategoryCreate, BlockCategoryRead,
    BlockTemplateCreate, BlockTemplateRead,
    WorkflowCreate, WorkflowRead,
    WorkflowBlockCreate, WorkflowBlockRead,
    BlockExecutionCreate, BlockExecutionRead
)
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from typing import List

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
@router.get('/block_categories', response_model=List[BlockCategoryRead], tags=["Block Categories"])
def list_block_categories(db: Session = Depends(get_db)):
    return db.query(BlockCategory).all()

@router.post('/block_category', response_model=BlockCategoryRead, tags=["Block Categories"])
def create_block_category(cat: BlockCategoryCreate, db: Session = Depends(get_db)):
    db_cat = BlockCategory(**cat.dict())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.get('/block_category/{cat_id}', response_model=BlockCategoryRead, tags=["Block Categories"])
def get_block_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(BlockCategory).get(cat_id)
    if not cat:
        raise HTTPException(status_code=404, detail='BlockCategory not found')
    return cat

@router.put('/block_category/{cat_id}', response_model=BlockCategoryRead, tags=["Block Categories"])
def update_block_category(cat_id: int, cat: BlockCategoryCreate, db: Session = Depends(get_db)):
    db_cat = db.query(BlockCategory).get(cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail='BlockCategory not found')
    for k, v in cat.dict().items():
        setattr(db_cat, k, v)
    db.commit()
    db.refresh(db_cat)
    return db_cat

@router.delete('/block_category/{cat_id}', tags=["Block Categories"])
def delete_block_category(cat_id: int, db: Session = Depends(get_db)):
    db_cat = db.query(BlockCategory).get(cat_id)
    if not db_cat:
        raise HTTPException(status_code=404, detail='BlockCategory not found')
    db.delete(db_cat)
    db.commit()
    return {"ok": True}

# BlockTemplate endpoints
@router.get('/block_templates', response_model=List[BlockTemplateRead], tags=["Block Templates"])
def list_block_templates(db: Session = Depends(get_db)):
    return db.query(BlockTemplate).all()

@router.post('/block_template', response_model=BlockTemplateRead, tags=["Block Templates"])
def create_block_template(tpl: BlockTemplateCreate, db: Session = Depends(get_db)):
    db_tpl = BlockTemplate(**tpl.dict())
    db.add(db_tpl)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl

@router.get('/block_template/{tpl_id}', response_model=BlockTemplateRead, tags=["Block Templates"])
def get_block_template(tpl_id: int, db: Session = Depends(get_db)):
    tpl = db.query(BlockTemplate).get(tpl_id)
    if not tpl:
        raise HTTPException(status_code=404, detail='BlockTemplate not found')
    return tpl

@router.put('/block_template/{tpl_id}', response_model=BlockTemplateRead, tags=["Block Templates"])
def update_block_template(tpl_id: int, tpl: BlockTemplateCreate, db: Session = Depends(get_db)):
    db_tpl = db.query(BlockTemplate).get(tpl_id)
    if not db_tpl:
        raise HTTPException(status_code=404, detail='BlockTemplate not found')
    for k, v in tpl.dict().items():
        setattr(db_tpl, k, v)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl

@router.delete('/block_template/{tpl_id}', tags=["Block Templates"])
def delete_block_template(tpl_id: int, db: Session = Depends(get_db)):
    db_tpl = db.query(BlockTemplate).get(tpl_id)
    if not db_tpl:
        raise HTTPException(status_code=404, detail='BlockTemplate not found')
    db.delete(db_tpl)
    db.commit()
    return {"ok": True}

# Workflow endpoints
@router.get('/workflows', response_model=List[WorkflowRead], tags=["Workflows"])
def list_workflows(db: Session = Depends(get_db)):
    return db.query(Workflow).all()

@router.post('/workflow', response_model=WorkflowRead, tags=["Workflows"])
def create_workflow(wf: WorkflowCreate, db: Session = Depends(get_db)):
    db_wf = Workflow(**wf.dict())
    db.add(db_wf)
    db.commit()
    db.refresh(db_wf)
    return db_wf

@router.get('/workflow/{wf_id}', response_model=WorkflowRead, tags=["Workflows"])
def get_workflow(wf_id: int, db: Session = Depends(get_db)):
    wf = db.query(Workflow).get(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail='Workflow not found')
    return wf

@router.put('/workflow/{wf_id}', response_model=WorkflowRead, tags=["Workflows"])
def update_workflow(wf_id: int, wf: WorkflowCreate, db: Session = Depends(get_db)):
    db_wf = db.query(Workflow).get(wf_id)
    if not db_wf:
        raise HTTPException(status_code=404, detail='Workflow not found')
    for k, v in wf.dict().items():
        setattr(db_wf, k, v)
    db.commit()
    db.refresh(db_wf)
    return db_wf

@router.delete('/workflow/{wf_id}', tags=["Workflows"])
def delete_workflow(wf_id: int, db: Session = Depends(get_db)):
    db_wf = db.query(Workflow).get(wf_id)
    if not db_wf:
        raise HTTPException(status_code=404, detail='Workflow not found')
    db.delete(db_wf)
    db.commit()
    return {"ok": True}

# WorkflowBlock endpoints
@router.get('/workflow_blocks', response_model=List[WorkflowBlockRead], tags=["Workflow Blocks"])
def list_workflow_blocks(db: Session = Depends(get_db)):
    return db.query(WorkflowBlock).all()

@router.post('/workflow_block', response_model=WorkflowBlockRead, tags=["Workflow Blocks"])
def create_workflow_block(wb: WorkflowBlockCreate, db: Session = Depends(get_db)):
    db_wb = WorkflowBlock(**wb.dict())
    db.add(db_wb)
    db.commit()
    db.refresh(db_wb)
    return db_wb

@router.get('/workflow_block/{wb_id}', response_model=WorkflowBlockRead, tags=["Workflow Blocks"])
def get_workflow_block(wb_id: int, db: Session = Depends(get_db)):
    wb = db.query(WorkflowBlock).get(wb_id)
    if not wb:
        raise HTTPException(status_code=404, detail='WorkflowBlock not found')
    return wb

@router.put('/workflow_block/{wb_id}', response_model=WorkflowBlockRead, tags=["Workflow Blocks"])
def update_workflow_block(wb_id: int, wb: WorkflowBlockCreate, db: Session = Depends(get_db)):
    db_wb = db.query(WorkflowBlock).get(wb_id)
    if not db_wb:
        raise HTTPException(status_code=404, detail='WorkflowBlock not found')
    for k, v in wb.dict().items():
        setattr(db_wb, k, v)
    db.commit()
    db.refresh(db_wb)
    return db_wb

@router.delete('/workflow_block/{wb_id}', tags=["Workflow Blocks"])
def delete_workflow_block(wb_id: int, db: Session = Depends(get_db)):
    db_wb = db.query(WorkflowBlock).get(wb_id)
    if not db_wb:
        raise HTTPException(status_code=404, detail='WorkflowBlock not found')
    db.delete(db_wb)
    db.commit()
    return {"ok": True}

# BlockExecution endpoints
@router.get('/block_executions', response_model=List[BlockExecutionRead], tags=["Block Executions"])
def list_block_executions(db: Session = Depends(get_db)):
    return db.query(BlockExecution).all()

@router.post('/block_execution', response_model=BlockExecutionRead, tags=["Block Executions"])
def create_block_execution(exec: BlockExecutionCreate, db: Session = Depends(get_db)):
    db_exec = BlockExecution(**exec.dict())
    db.add(db_exec)
    db.commit()
    db.refresh(db_exec)
    return db_exec

@router.get('/block_execution/{exec_id}', response_model=BlockExecutionRead, tags=["Block Executions"])
def get_block_execution(exec_id: int, db: Session = Depends(get_db)):
    exec = db.query(BlockExecution).get(exec_id)
    if not exec:
        raise HTTPException(status_code=404, detail='BlockExecution not found')
    return exec

@router.put('/block_execution/{exec_id}', response_model=BlockExecutionRead, tags=["Block Executions"])
def update_block_execution(exec_id: int, exec: BlockExecutionCreate, db: Session = Depends(get_db)):
    db_exec = db.query(BlockExecution).get(exec_id)
    if not db_exec:
        raise HTTPException(status_code=404, detail='BlockExecution not found')
    for k, v in exec.dict().items():
        setattr(db_exec, k, v)
    db.commit()
    db.refresh(db_exec)
    return db_exec

@router.delete('/block_execution/{exec_id}', tags=["Block Executions"])
def delete_block_execution(exec_id: int, db: Session = Depends(get_db)):
    db_exec = db.query(BlockExecution).get(exec_id)
    if not db_exec:
        raise HTTPException(status_code=404, detail='BlockExecution not found')
    db.delete(db_exec)
    db.commit()
    return {"ok": True} 