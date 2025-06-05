from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base
import json
from typing import Dict, Any, List, Optional
from datetime import datetime


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

    def set_current_file(self, file_info: Optional[Dict[str, Any]]):
        """Set current file as JSON string"""
        self.current_file = json.dumps(file_info) if file_info else None

    def get_current_file(self) -> Optional[Dict[str, Any]]:
        """Get current file from JSON string"""
        if self.current_file:
            try:
                return json.loads(self.current_file)
            except json.JSONDecodeError:
                return None
        return None

    def set_settings(self, settings: Dict[str, Any]):
        """Set settings as JSON string"""
        self.settings = json.dumps(settings)

    def get_settings(self) -> Dict[str, Any]:
        """Get settings from JSON string"""
        try:
            return json.loads(self.settings)
        except json.JSONDecodeError:
            return {}

    def set_files(self, files: List[Dict[str, Any]]):
        """Set files as JSON string"""
        self.files = json.dumps(files)

    def get_files(self) -> List[Dict[str, Any]]:
        """Get files from JSON string"""
        try:
            return json.loads(self.files)
        except json.JSONDecodeError:
            return []

    def set_processing_stats(self, stats: Dict[str, Any]):
        """Set processing stats as JSON string"""
        self.processing_stats = json.dumps(stats)

    def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing stats from JSON string"""
        if self.processing_stats:
            try:
                return json.loads(self.processing_stats)
            except json.JSONDecodeError:
                return {}
        return {}

    def set_results(self, results: List[Dict[str, Any]]):
        """Set results as JSON string"""
        self.results = json.dumps(results)

    def get_results(self) -> List[Dict[str, Any]]:
        """Get results from JSON string"""
        if self.results:
            try:
                return json.loads(self.results)
            except json.JSONDecodeError:
                return []
        return []

    def set_errors(self, errors: List[Dict[str, Any]]):
        """Set errors as JSON string"""
        self.errors = json.dumps(errors)

    def get_errors(self) -> List[Dict[str, Any]]:
        """Get errors from JSON string"""
        if self.errors:
            try:
                return json.loads(self.errors)
            except json.JSONDecodeError:
                return []
        return []

    def set_logs(self, logs: List[Dict[str, Any]]):
        """Set logs as JSON string"""
        self.logs = json.dumps(logs)

    def get_logs(self) -> List[Dict[str, Any]]:
        """Get logs from JSON string"""
        if self.logs:
            try:
                return json.loads(self.logs)
            except json.JSONDecodeError:
                return []
        return []

    def to_dict(self) -> Dict[str, Any]:
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