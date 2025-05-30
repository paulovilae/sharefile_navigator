from sqlalchemy import Column, String, Text, JSON, DateTime, Integer, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import datetime

Base = declarative_base()

class OcrResult(Base):
    __tablename__ = 'ocr_results'
    file_id = Column(String, primary_key=True)
    directory_id = Column(String, nullable=True)
    pdf_text = Column(Text, nullable=True)
    pdf_image_path = Column(Text, nullable=True)  # JSON string or comma-separated paths
    ocr_text = Column(Text, nullable=True)
    ocr_image_path = Column(Text, nullable=True)  # JSON string or comma-separated paths
    ocr_json = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True)
    status = Column(String, nullable=True, default="pending") # e.g., pending, queued, processing_ocr, llm_reviewing, retry_dpi, retry_image_ocr, completed, error, needs_manual_review
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Role(Base):
    __tablename__ = 'roles'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    users = relationship('User', back_populates='role')

class Team(Base):
    __tablename__ = 'teams'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    users = relationship('User', back_populates='team')

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id'))
    team_id = Column(Integer, ForeignKey('teams.id'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    role = relationship('Role', back_populates='users')
    team = relationship('Team', back_populates='users')

class Document(Base):
    __tablename__ = 'documents'
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    user = relationship('User')

class BlockCategory(Base):
    __tablename__ = 'block_categories'
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    icon = Column(String, nullable=True)  # e.g., 'Folder', 'PictureAsPdf'

class BlockTemplate(Base):
    __tablename__ = 'block_templates'
    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey('block_categories.id'))
    type = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    description = Column(Text)
    config_schema = Column(JSON)
    ui_schema = Column(JSON, nullable=True)
    component = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
    jsx_code = Column(Text, nullable=True)
    category = relationship('BlockCategory')

class Workflow(Base):
    __tablename__ = 'workflows'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_by = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    user = relationship('User')

class WorkflowBlock(Base):
    __tablename__ = 'workflow_blocks'
    id = Column(Integer, primary_key=True)
    workflow_id = Column(Integer, ForeignKey('workflows.id'))
    block_template_id = Column(Integer, ForeignKey('block_templates.id'))
    order = Column(Integer)
    config = Column(JSON)
    name_override = Column(String)
    enabled = Column(Boolean, default=True)
    workflow = relationship('Workflow')
    block_template = relationship('BlockTemplate')

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    action = Column(String, nullable=False)
    target_type = Column(String)
    target_id = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship('User')

class ApiToken(Base):
    __tablename__ = 'api_tokens'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    token = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user = relationship('User')

class Setting(Base):
    __tablename__ = 'settings'
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(String)
    category = Column(String, nullable=True)  # e.g., 'ocr', 'pages', 'ui', etc.
    description = Column(String, nullable=True)

class Localization(Base):
    __tablename__ = 'localizations'
    id = Column(Integer, primary_key=True)
    language = Column(String, nullable=False)
    key = Column(String, nullable=False)
    value = Column(String)

class BlockExecution(Base):
    __tablename__ = 'block_executions'
    id = Column(Integer, primary_key=True)
    workflow_block_id = Column(Integer, ForeignKey('workflow_blocks.id'))
    user_id = Column(Integer, ForeignKey('users.id'))
    status = Column(String, nullable=False)  # e.g., 'pending', 'running', 'success', 'error'
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    logs = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    result = Column(JSON, nullable=True)
    workflow_block = relationship('WorkflowBlock')
    user = relationship('User')

class SidebarMenuCategory(Base):
    __tablename__ = 'sidebar_menu_categories'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text)
    menus = relationship('SidebarMenu', back_populates='category')

class SidebarMenu(Base):
    __tablename__ = 'sidebar_menus'
    id = Column(Integer, primary_key=True)
    label = Column(String, nullable=False)
    icon = Column(String, nullable=False)
    page_ref = Column(String, nullable=False)
    category_id = Column(Integer, ForeignKey('sidebar_menu_categories.id'), nullable=True)
    order = Column(Integer, default=0)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    category = relationship('SidebarMenuCategory', back_populates='menus') 