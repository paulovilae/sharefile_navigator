from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.orm import Session
from app.models import Setting, Localization
from app.schemas import SettingCreate, SettingRead, LocalizationCreate, LocalizationRead
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

# Setting endpoints
@router.get('/settings', response_model=List[SettingRead])
def list_settings(response: Response, db: Session = Depends(get_db)):
    items = db.query(Setting).all()
    total = db.query(Setting).count()
    response.headers["Content-Range"] = f"settings 0-{max(len(items)-1,0)}/{total}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return items

@router.post('/setting', response_model=SettingRead)
def create_setting(setting: SettingCreate, db: Session = Depends(get_db)):
    db_setting = Setting(**setting.dict())
    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting

@router.put('/settings/{setting_id}', response_model=SettingRead)
def update_setting(setting_id: int, setting: SettingCreate, db: Session = Depends(get_db)):
    db_setting = db.query(Setting).filter(Setting.id == setting_id).first()
    if not db_setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    # Update the setting fields
    for key, value in setting.dict().items():
        setattr(db_setting, key, value)
    
    db.commit()
    db.refresh(db_setting)
    return db_setting

@router.delete('/settings/{setting_id}')
def delete_setting(setting_id: int, db: Session = Depends(get_db)):
    db_setting = db.query(Setting).filter(Setting.id == setting_id).first()
    if not db_setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    db.delete(db_setting)
    db.commit()
    return {"message": "Setting deleted successfully"}

# Localization endpoints
@router.get('/localizations', response_model=List[LocalizationRead])
def list_localizations(response: Response, db: Session = Depends(get_db)):
    items = db.query(Localization).all()
    total = db.query(Localization).count()
    response.headers["Content-Range"] = f"localizations 0-{max(len(items)-1,0)}/{total}"
    response.headers["Access-Control-Expose-Headers"] = "Content-Range"
    return items

@router.post('/localization', response_model=LocalizationRead)
def create_localization(loc: LocalizationCreate, db: Session = Depends(get_db)):
    db_loc = Localization(**loc.dict())
    db.add(db_loc)
    db.commit()
    db.refresh(db_loc)
    return db_loc

@router.put('/localizations/{localization_id}', response_model=LocalizationRead)
def update_localization(localization_id: int, loc: LocalizationCreate, db: Session = Depends(get_db)):
    db_loc = db.query(Localization).filter(Localization.id == localization_id).first()
    if not db_loc:
        raise HTTPException(status_code=404, detail="Localization not found")
    
    # Update the localization fields
    for key, value in loc.dict().items():
        setattr(db_loc, key, value)
    
    db.commit()
    db.refresh(db_loc)
    return db_loc

@router.delete('/localizations/{localization_id}')
def delete_localization(localization_id: int, db: Session = Depends(get_db)):
    db_loc = db.query(Localization).filter(Localization.id == localization_id).first()
    if not db_loc:
        raise HTTPException(status_code=404, detail="Localization not found")
    
    db.delete(db_loc)
    db.commit()
    return {"message": "Localization deleted successfully"}