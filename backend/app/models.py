from sqlalchemy import Column, String, Text, JSON, DateTime, Integer, ForeignKey, Boolean, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func # Added for func.now()
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
    translation_key = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    category = relationship('SidebarMenuCategory', back_populates='menus')

class SharePointOcrJob(Base):
    __tablename__ = 'sharepoint_ocr_jobs'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    drive_id = Column(String, nullable=False)
    root_sharepoint_folder_id = Column(String, nullable=False)
    status = Column(String, default='pending', nullable=False)
    # e.g., pending, discovering_files, processing_discovery_batch,
    # processing_ocr_batch, completed, failed, partially_completed
    
    total_folders_discovered = Column(Integer, default=0)
    total_files_discovered = Column(Integer, default=0)
    files_processed_count = Column(Integer, default=0)
    files_skipped_count = Column(Integer, default=0)
    files_failed_count = Column(Integer, default=0)
    
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    discovered_items = relationship("SharePointDiscoveredItem", back_populates="job")

class SharePointDiscoveredItem(Base):
    __tablename__ = 'sharepoint_discovered_items'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey('sharepoint_ocr_jobs.id'), nullable=False)
    sharepoint_item_id = Column(String, nullable=False)
    item_name = Column(String, nullable=True)
    item_path = Column(Text, nullable=True) # Full path for easier debugging
    item_type = Column(String, nullable=False)  # 'file' or 'folder'
    is_pdf = Column(Boolean, default=False)
    status = Column(String, default='pending', nullable=False)
    # e.g., pending, listed_children (for folders),
    # ocr_queued, ocr_processing, ocr_completed, ocr_failed, ocr_skipped
    
    parent_sharepoint_id = Column(String, nullable=True)
    discovered_at = Column(DateTime, default=func.now())
    processed_at = Column(DateTime, nullable=True)

    job = relationship("SharePointOcrJob", back_populates="discovered_items")

    # Considering that SQLite might not support complex __table_args__ like UniqueConstraint directly in the model
    # for some Alembic auto-generation scenarios, I'll omit it for now.
    # If using PostgreSQL or MySQL, this would be:
    # from sqlalchemy import UniqueConstraint
    # __table_args__ = (UniqueConstraint('job_id', 'sharepoint_item_id', name='_job_item_uc'),)
class BatchProcessingJob(Base):
    __tablename__ = "batch_processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)
    is_paused = Column(Boolean, nullable=False, default=False)
    total_files = Column(Integer, nullable=False)
    processed_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)
    current_file_index = Column(Integer, nullable=False, default=0)
    current_file = Column(Text, nullable=True)  # JSON string
    start_time = Column(Float, nullable=True)
    settings = Column(Text, nullable=False)  # JSON string
    files = Column(Text, nullable=False)  # JSON string
    processing_stats = Column(Text, nullable=True)  # JSON string
    results = Column(Text, nullable=True)  # JSON string
    errors = Column(Text, nullable=True)  # JSON string
    logs = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    def set_current_file(self, file_info):
        """Set current file as JSON string"""
        import json
        self.current_file = json.dumps(file_info) if file_info else None

    def get_current_file(self):
        """Get current file from JSON string"""
        import json
        if self.current_file:
            try:
                return json.loads(self.current_file)
            except json.JSONDecodeError:
                return None
        return None

    def set_settings(self, settings):
        """Set settings as JSON string"""
        import json
        self.settings = json.dumps(settings)

    def get_settings(self):
        """Get settings from JSON string"""
        import json
        try:
            return json.loads(self.settings)
        except json.JSONDecodeError:
            return {}

    def set_files(self, files):
        """Set files as JSON string"""
        import json
        self.files = json.dumps(files)

    def get_files(self):
        """Get files from JSON string"""
        import json
        try:
            return json.loads(self.files)
        except json.JSONDecodeError:
            return []

    def set_processing_stats(self, stats):
        """Set processing stats as JSON string"""
        import json
        self.processing_stats = json.dumps(stats)

    def get_processing_stats(self):
        """Get processing stats from JSON string"""
        import json
        if self.processing_stats:
            try:
                return json.loads(self.processing_stats)
            except json.JSONDecodeError:
                return {}
        return {}

    def set_results(self, results):
        """Set results as JSON string"""
        import json
        self.results = json.dumps(results)

    def get_results(self):
        """Get results from JSON string"""
        import json
        if self.results:
            try:
                return json.loads(self.results)
            except json.JSONDecodeError:
                return []
        return []

    def set_errors(self, errors):
        """Set errors as JSON string"""
        import json
        self.errors = json.dumps(errors)

    def get_errors(self):
        """Get errors from JSON string"""
        import json
        if self.errors:
            try:
                return json.loads(self.errors)
            except json.JSONDecodeError:
                return []
        return []

    def set_logs(self, logs):
        """Set logs as JSON string"""
        import json
        self.logs = json.dumps(logs)

    def get_logs(self):
        """Get logs from JSON string"""
        import json
        if self.logs:
            try:
                return json.loads(self.logs)
            except json.JSONDecodeError:
                return []
        return []

    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            "batch_id": self.batch_id,
            "status": self.status,
            "is_paused": self.is_paused,
            "total_files": self.total_files,
            "processed_count": self.processed_count,
            "failed_count": self.failed_count,
            "current_file_index": self.current_file_index,
            "current_file": self.get_current_file(),
            "progress_percentage": (self.processed_count + self.failed_count) / self.total_files * 100 if self.total_files > 0 else 0,
            "start_time": self.start_time,
            "processing_stats": self.get_processing_stats(),
            "results": self.get_results(),
            "errors": self.get_errors(),
            "logs": self.get_logs()[-50] if len(self.get_logs()) > 50 else self.get_logs(),  # Last 50 logs
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }