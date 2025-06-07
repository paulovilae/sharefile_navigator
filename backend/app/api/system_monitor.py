"""
System resource monitoring API.
Provides endpoints for monitoring CPU, memory, and GPU usage.
"""
import os
import time
import logging
import asyncio
import psutil
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List, Any, Optional
import json
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter(tags=["system_monitor"])

# Store connected WebSocket clients
connected_clients: List[WebSocket] = []

# Store historical data for charts
resource_history = {
    "timestamps": [],
    "cpu": [],
    "memory": [],
    "gpu": []
}

# Maximum history points to keep
MAX_HISTORY_POINTS = 100

def get_system_resources() -> Dict[str, Any]:
    """
    Get current system resource usage.
    
    Returns:
        Dict with CPU, memory, and GPU usage information
    """
    try:
        # Get CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Get memory usage
        memory = psutil.virtual_memory()
        
        # Get disk usage
        disk = psutil.disk_usage('/')
        
        # Get GPU usage if available
        gpu_info = {"available": False, "usage": []}
        try:
            # Try to import GPU utilities
            from app.utils.gpu_utils import get_gpu_info, get_gpu_usage_stats
            gpu_info = get_gpu_info()
            gpu_usage = get_gpu_usage_stats()
            gpu_info["usage"] = gpu_usage
            gpu_info["available"] = gpu_info.get("is_available", False)
        except (ImportError, AttributeError):
            pass
        
        # Get process information
        current_process = psutil.Process()
        process_info = {
            "pid": current_process.pid,
            "cpu_percent": current_process.cpu_percent(interval=0.1),
            "memory_percent": current_process.memory_percent(),
            "memory_info": {
                "rss": current_process.memory_info().rss / (1024 * 1024),  # MB
                "vms": current_process.memory_info().vms / (1024 * 1024)   # MB
            },
            "threads": len(current_process.threads()),
            "create_time": datetime.fromtimestamp(current_process.create_time()).isoformat()
        }
        
        # Get batch processing information
        batch_info = {"active_batches": 0, "status": "Unknown"}
        try:
            from app.api.ocr.batch_processing import list_batch_jobs
            batch_data = list_batch_jobs()
            if isinstance(batch_data, dict) and "jobs" in batch_data:
                batch_info = {
                    "active_batches": len(batch_data["jobs"]),
                    "jobs": batch_data["jobs"]
                }
        except (ImportError, AttributeError) as e:
            logger.warning(f"Could not get batch information: {e}")
        
        # Compile all information
        result = {
            "timestamp": datetime.now().isoformat(),
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
                "frequency": cpu_freq._asdict() if cpu_freq else None
            },
            "memory": {
                "total": memory.total / (1024 * 1024 * 1024),  # GB
                "available": memory.available / (1024 * 1024 * 1024),  # GB
                "used": memory.used / (1024 * 1024 * 1024),  # GB
                "percent": memory.percent
            },
            "disk": {
                "total": disk.total / (1024 * 1024 * 1024),  # GB
                "used": disk.used / (1024 * 1024 * 1024),  # GB
                "free": disk.free / (1024 * 1024 * 1024),  # GB
                "percent": disk.percent
            },
            "gpu": gpu_info,
            "process": process_info,
            "batch_processing": batch_info
        }
        
        # Update history
        update_resource_history(result)
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting system resources: {e}")
        return {
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

def update_resource_history(data: Dict[str, Any]):
    """Update resource history for charts"""
    global resource_history
    
    # Add new data point
    resource_history["timestamps"].append(data["timestamp"])
    resource_history["cpu"].append(data["cpu"]["percent"])
    resource_history["memory"].append(data["memory"]["percent"])
    
    # Add GPU data if available
    if data["gpu"].get("available", False):
        # Use first GPU if multiple are available
        if "usage" in data["gpu"] and data["gpu"]["usage"].get("gpu_count", 0) > 0:
            gpu_usage = 0
            for gpu_id, stats in data["gpu"]["usage"].get("usage", {}).items():
                if stats.get("in_use", False):
                    gpu_usage = 100  # If in use, set to 100%
                    break
            resource_history["gpu"].append(gpu_usage)
        else:
            resource_history["gpu"].append(0)
    else:
        resource_history["gpu"].append(0)
    
    # Limit history size
    if len(resource_history["timestamps"]) > MAX_HISTORY_POINTS:
        resource_history["timestamps"] = resource_history["timestamps"][-MAX_HISTORY_POINTS:]
        resource_history["cpu"] = resource_history["cpu"][-MAX_HISTORY_POINTS:]
        resource_history["memory"] = resource_history["memory"][-MAX_HISTORY_POINTS:]
        resource_history["gpu"] = resource_history["gpu"][-MAX_HISTORY_POINTS:]

@router.get("/resources")
async def get_resources():
    """
    Get current system resource usage.
    """
    return get_system_resources()

@router.get("/history")
async def get_history():
    """
    Get historical resource usage data.
    """
    return resource_history

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time resource monitoring.
    """
    await websocket.accept()
    connected_clients.append(websocket)
    
    try:
        while True:
            # Send resource data every second
            resources = get_system_resources()
            await websocket.send_json(resources)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        connected_clients.remove(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        if websocket in connected_clients:
            connected_clients.remove(websocket)