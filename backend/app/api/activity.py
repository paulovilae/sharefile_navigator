from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import AuditLog
from app.schemas import AuditLogCreate, AuditLogRead
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

# AuditLog endpoints
@router.get('/auditlogs', response_model=List[AuditLogRead])
def list_auditlogs(db: Session = Depends(get_db)):
    return db.query(AuditLog).all()

@router.post('/auditlog', response_model=AuditLogRead)
def create_auditlog(auditlog: AuditLogCreate, db: Session = Depends(get_db)):
    db_log = AuditLog(**auditlog.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log 