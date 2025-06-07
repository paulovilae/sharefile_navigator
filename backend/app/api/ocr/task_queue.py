import asyncio
import logging
import threading
import time
import gc
from typing import Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor
import json

logger = logging.getLogger(__name__)

# Configure logging for task queue
logging.basicConfig(level=logging.INFO)

class PersistentTaskQueue:
    """
    A persistent task queue that survives server restarts and handles long-running batch processing.
    Uses a separate thread pool to avoid being cancelled by FastAPI server restarts.
    """
    
    def __init__(self):
        # Reduce max_workers to 1 to prevent overwhelming the system
        # This ensures only one batch processes at a time, reducing system load
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="batch_processor")
        self.running_tasks = {}
        self.task_results = {}
        self.memory_monitor_active = False
        self.memory_threshold_mb = 2048  # 2GB memory threshold
        
        # Start memory monitoring
        self._start_memory_monitor()
        
    def submit_batch_task(self, batch_id: str, processor_func, *args, **kwargs):
        """Submit a batch processing task to the persistent queue"""
        print(f"TASK_QUEUE: Submitting batch task {batch_id} to persistent queue")
        logger.info(f"Submitting batch task {batch_id} to persistent queue")
        
        # Wrap the async function to run in the thread pool
        def run_async_in_thread():
            try:
                print(f"TASK_QUEUE: Starting thread execution for batch {batch_id}")
                
                # Set lower thread priority to prevent blocking other operations
                import threading
                import os
                current_thread = threading.current_thread()
                
                # On Windows, try to set lower priority
                try:
                    if os.name == 'nt':  # Windows
                        import ctypes
                        # Set thread priority to below normal (-1) or lowest (-2)
                        # THREAD_PRIORITY_BELOW_NORMAL = -1
                        # THREAD_PRIORITY_LOWEST = -2
                        ctypes.windll.kernel32.SetThreadPriority(
                            ctypes.windll.kernel32.GetCurrentThread(), -2
                        )
                        print(f"TASK_QUEUE: Set lowest thread priority for batch {batch_id}")
                except Exception as e:
                    print(f"TASK_QUEUE: Could not set thread priority: {e}")
                
                # Log initial memory usage
                try:
                    import psutil
                    process = psutil.Process()
                    memory_info = process.memory_info()
                    print(f"TASK_QUEUE: Initial memory usage for batch {batch_id}: {memory_info.rss / 1024 / 1024:.2f} MB")
                except ImportError:
                    print(f"TASK_QUEUE: psutil not available for memory tracking")
                
                # Create a new event loop for this thread
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                print(f"TASK_QUEUE: About to call processor function for batch {batch_id}")
                # Run the async function
                result = loop.run_until_complete(processor_func(*args, **kwargs))
                
                # Store result
                self.task_results[batch_id] = {
                    "status": "completed",
                    "result": result,
                    "completed_at": time.time()
                }
                
                logger.info(f"Batch task {batch_id} completed successfully")
                return result
                
            except Exception as e:
                logger.error(f"Batch task {batch_id} failed: {e}", exc_info=True)
                self.task_results[batch_id] = {
                    "status": "error", 
                    "error": str(e),
                    "completed_at": time.time()
                }
                raise
            finally:
                # Clean up
                if batch_id in self.running_tasks:
                    del self.running_tasks[batch_id]
                
                # Force garbage collection to release memory
                gc.collect()
                
                # Log final memory usage
                try:
                    import psutil
                    process = psutil.Process()
                    memory_info = process.memory_info()
                    print(f"TASK_QUEUE: Final memory usage after batch {batch_id}: {memory_info.rss / 1024 / 1024:.2f} MB")
                except ImportError:
                    pass
                    
                loop.close()
        
        # Submit to thread pool
        future = self.executor.submit(run_async_in_thread)
        self.running_tasks[batch_id] = {
            "future": future,
            "started_at": time.time()
        }
        
        return future
    
    def is_task_running(self, batch_id: str) -> bool:
        """Check if a task is currently running"""
        return batch_id in self.running_tasks
    
    def get_task_result(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """Get the result of a completed task"""
        return self.task_results.get(batch_id)
    
    def cancel_task(self, batch_id: str) -> bool:
        """Cancel a running task"""
        if batch_id in self.running_tasks:
            future = self.running_tasks[batch_id]["future"]
            cancelled = future.cancel()
            if cancelled:
                del self.running_tasks[batch_id]
            return cancelled
        return False
    
    def cleanup_old_results(self, max_age_hours: int = 24):
        """Clean up old task results"""
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        to_remove = []
        for batch_id, result in self.task_results.items():
            if current_time - result.get("completed_at", 0) > max_age_seconds:
                to_remove.append(batch_id)
        
        for batch_id in to_remove:
            del self.task_results[batch_id]
            logger.info(f"Cleaned up old task result: {batch_id}")
    
    def _start_memory_monitor(self):
        """Start a background thread to monitor memory usage"""
        if self.memory_monitor_active:
            return
            
        try:
            import psutil
            
            def monitor_memory():
                self.memory_monitor_active = True
                logger.info("Memory monitor started")
                
                while self.memory_monitor_active:
                    try:
                        process = psutil.Process()
                        memory_info = process.memory_info()
                        memory_mb = memory_info.rss / 1024 / 1024
                        
                        if memory_mb > self.memory_threshold_mb:
                            logger.warning(f"High memory usage detected: {memory_mb:.2f} MB (threshold: {self.memory_threshold_mb} MB)")
                            # Force garbage collection
                            gc.collect()
                        
                        # Check every 30 seconds
                        time.sleep(30)
                    except Exception as e:
                        logger.error(f"Error in memory monitor: {e}")
                        time.sleep(60)  # Wait longer on error
                        
                logger.info("Memory monitor stopped")
            
            # Start monitor in background thread
            monitor_thread = threading.Thread(target=monitor_memory, daemon=True)
            monitor_thread.start()
            
        except ImportError:
            logger.warning("psutil not available, memory monitoring disabled")
    
    def stop_memory_monitor(self):
        """Stop the memory monitoring thread"""
        self.memory_monitor_active = False

# Global instance
task_queue = PersistentTaskQueue()