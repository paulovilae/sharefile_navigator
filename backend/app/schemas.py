from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
import datetime

# Role
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None
class RoleCreate(RoleBase):
    pass
class RoleRead(RoleBase):
    id: int
    class Config:
        from_attributes = True

# Team
class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
class TeamCreate(TeamBase):
    pass
class TeamRead(TeamBase):
    id: int
    class Config:
        from_attributes = True

# User
class UserBase(BaseModel):
    username: str
    email: EmailStr
    role_id: Optional[int]
    team_id: Optional[int]
class UserCreate(UserBase):
    password: str
class UserRead(UserBase):
    id: int
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    class Config:
        from_attributes = True

# Document
class DocumentBase(BaseModel):
    title: str
    file_path: str
    uploaded_by: Optional[int]
class DocumentCreate(DocumentBase):
    pass
class DocumentRead(DocumentBase):
    id: int
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    class Config:
        from_attributes = True

# --- Block Workflow Schemas ---
class BlockCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None  # e.g., 'Folder', 'PictureAsPdf'

class BlockCategoryCreate(BlockCategoryBase):
    pass

class BlockCategoryRead(BlockCategoryBase):
    id: int
    class Config:
        from_attributes = True

class BlockTemplateBase(BaseModel):
    category_id: int
    type: str
    display_name: str
    description: Optional[str] = None
    config_schema: Any
    ui_schema: Optional[Any] = None
    component: str
    enabled: Optional[bool] = True
    jsx_code: Optional[str] = None

class BlockTemplateCreate(BlockTemplateBase):
    pass

class BlockTemplateRead(BlockTemplateBase):
    id: int
    category: Optional[BlockCategoryRead]
    class Config:
        from_attributes = True

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    created_by: Optional[int] = None

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowRead(WorkflowBase):
    id: int
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    user: Optional['UserRead']
    class Config:
        from_attributes = True

class WorkflowBlockBase(BaseModel):
    workflow_id: int
    block_template_id: int
    order: int
    config: Any
    name_override: Optional[str] = None
    enabled: Optional[bool] = True

class WorkflowBlockCreate(WorkflowBlockBase):
    pass

class WorkflowBlockRead(WorkflowBlockBase):
    id: int
    workflow: Optional[WorkflowRead]
    block_template: Optional[BlockTemplateRead]
    class Config:
        from_attributes = True

class BlockExecutionBase(BaseModel):
    workflow_block_id: int
    user_id: Optional[int]
    status: str
    started_at: Optional[datetime.datetime] = None
    finished_at: Optional[datetime.datetime] = None
    logs: Optional[str] = None
    error: Optional[str] = None
    result: Optional[Any] = None

class BlockExecutionCreate(BlockExecutionBase):
    pass

class BlockExecutionRead(BlockExecutionBase):
    id: int
    workflow_block: Optional[WorkflowBlockRead]
    user: Optional[UserRead]
    class Config:
        from_attributes = True

# AuditLog
class AuditLogBase(BaseModel):
    user_id: Optional[int]
    action: str
    target_type: Optional[str]
    target_id: Optional[str]
class AuditLogCreate(AuditLogBase):
    pass
class AuditLogRead(AuditLogBase):
    id: int
    timestamp: Optional[datetime.datetime]
    class Config:
        from_attributes = True

# ApiToken
class ApiTokenBase(BaseModel):
    user_id: Optional[int]
    token: str
class ApiTokenCreate(ApiTokenBase):
    pass
class ApiTokenRead(ApiTokenBase):
    id: int
    created_at: Optional[datetime.datetime]
    class Config:
        from_attributes = True

# Setting
class SettingBase(BaseModel):
    key: str
    value: Optional[str]
    category: Optional[str] = None
    description: Optional[str] = None
class SettingCreate(SettingBase):
    pass
class SettingRead(SettingBase):
    id: int
    class Config:
        from_attributes = True

# Localization
class LocalizationBase(BaseModel):
    language: str
    key: str
    value: str
class LocalizationCreate(LocalizationBase):
    pass
class LocalizationRead(LocalizationBase):
    id: int
    class Config:
        from_attributes = True

# Permission
class PermissionBase(BaseModel):
    name: str
    description: Optional[str]
class PermissionCreate(PermissionBase):
    pass
class PermissionRead(PermissionBase):
    id: int
    class Config:
        from_attributes = True

# OcrResult
class OcrResultBase(BaseModel):
    file_id: str
    directory_id: Optional[str]
    pdf_text: Optional[str]
    pdf_image_path: Optional[str]
    ocr_text: Optional[str]
    ocr_image_path: Optional[str]
    ocr_json: Optional[Any]
    metrics: Optional[Any]
    status: Optional[str] = "pending"

class OcrResultCreate(OcrResultBase):
    pass

class OcrResultRead(OcrResultBase):
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    # status is inherited from OcrResultBase and will be included
    class Config:
        from_attributes = True

# SharePoint (basic example)
class SharePointFileBase(BaseModel):
    id: str
    name: str
    size: Optional[int]
    created: Optional[str]
    modified: Optional[str]
    createdBy: Optional[Any]
    lastModifiedBy: Optional[Any]
class SharePointFileRead(SharePointFileBase):
    pass

class SidebarMenuCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class SidebarMenuCategoryCreate(SidebarMenuCategoryBase):
    pass

class SidebarMenuCategoryRead(SidebarMenuCategoryBase):
    id: int
    class Config:
        from_attributes = True

class SidebarMenuBase(BaseModel):
    label: str
    icon: str
    page_ref: str
    category_id: Optional[int] = None
    order: int = 0
    enabled: bool = True
    translation_key: Optional[str] = None

class SidebarMenuCreate(SidebarMenuBase):
    pass

class SidebarMenuRead(SidebarMenuBase):
    id: int
    created_at: Optional[datetime.datetime]
    updated_at: Optional[datetime.datetime]
    category: Optional[SidebarMenuCategoryRead]
    
    class Config:
        from_attributes = True
        # Ensure all fields are included, even if None
        exclude_none = False
# OcrImagesRequest
class OcrImagesRequest(BaseModel):
    image_paths: List[str]

# Block Execution Update Schema
class BlockExecutionUpdate(BaseModel):
    status: Optional[str] = None
    logs: Optional[str] = None
    error: Optional[str] = None
    result: Optional[Any] = None

# Block Execution Response Schema
class BlockExecutionResponse(BaseModel):
    id: int
    workflow_block_id: int
    user_id: Optional[int]
    status: str
    started_at: Optional[datetime.datetime]
    finished_at: Optional[datetime.datetime]
    logs: Optional[str]
    error: Optional[str]
    result: Optional[Any]
    
    class Config:
        from_attributes = True

# Block Metrics Response Schema
class BlockMetricsResponse(BaseModel):
    period_days: int
    total_executions: int
    successful_executions: int
    failed_executions: int
    success_rate: float
    average_execution_time_seconds: float
    block_type_distribution: dict
    daily_execution_counts: dict
    interaction_metrics: dict