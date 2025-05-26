from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.models import User, Role, Team, AuditLog, ApiToken
from app.schemas import UserCreate, UserRead, RoleCreate, RoleRead, TeamCreate, TeamRead, AuditLogCreate, AuditLogRead, ApiTokenCreate, ApiTokenRead
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

# User endpoints
@router.get('/users', response_model=List[UserRead])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.get('/user/{user_id}', response_model=UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user

@router.post('/user', response_model=UserRead)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = User(**user.dict(exclude={'password'}), password_hash=user.password)  # Hash in real app
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put('/user/{user_id}', response_model=UserRead)
def update_user(user_id: int, user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).get(user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail='User not found')
    for k, v in user.dict(exclude={'password'}).items():
        setattr(db_user, k, v)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete('/user/{user_id}')
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).get(user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail='User not found')
    db.delete(db_user)
    db.commit()
    return {"ok": True}

# Role endpoints
@router.get('/roles', response_model=List[RoleRead])
def list_roles(db: Session = Depends(get_db)):
    return db.query(Role).all()

@router.post('/role', response_model=RoleRead)
def create_role(role: RoleCreate, db: Session = Depends(get_db)):
    db_role = Role(**role.dict())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

# Team endpoints
@router.get('/teams', response_model=List[TeamRead])
def list_teams(db: Session = Depends(get_db)):
    return db.query(Team).all()

@router.post('/team', response_model=TeamRead)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    db_team = Team(**team.dict())
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    return db_team

# ApiToken endpoints
@router.get('/apitokens', response_model=List[ApiTokenRead])
def list_apitokens(db: Session = Depends(get_db)):
    return db.query(ApiToken).all()

@router.post('/apitoken', response_model=ApiTokenRead)
def create_apitoken(token: ApiTokenCreate, db: Session = Depends(get_db)):
    db_token = ApiToken(**token.dict())
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token 