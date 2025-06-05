"""
OCR Process Health Monitoring and Cleanup
"""
import time
from typing import Dict, List, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from .db_utils import get_db_session
from app.models import OcrResult
from app.api.ocr.batch_processing import batch_processing_status
import logging

logger = logging.getLogger(__name__)

def get_process_health_status() -> Dict[str, Any]:
    """
    Analyze the health of OCR processes and identify issues
    """
    db = get_db_session()
    
    try:
        # Get all OCR results from the last 24 hours
        current_time = time.time()
        twenty_four_hours_ago = current_time - (24 * 60 * 60)
        
        # Query recent OCR results
        recent_results = db.query(OcrResult).filter(
            OcrResult.created_at >= twenty_four_hours_ago
        ).all()
        
        # Analyze batch processing status
        active_batches = len(batch_processing_status)
        batch_details = []
        
        for batch_id, processor in batch_processing_status.items():
            status_dict = processor.get_status_dict()
            batch_details.append({
                'batch_id': batch_id,
                'status': status_dict['status'],
                'total_files': status_dict['total_files'],
                'processed_count': status_dict['processed_count'],
                'failed_count': status_dict['failed_count'],
                'start_time': status_dict.get('start_time'),
                'is_paused': status_dict.get('is_paused', False),
                'current_file': status_dict.get('current_file', {}).get('name', 'None')
            })
        
        # Analyze individual OCR results
        status_counts = {}
        recent_activity = []
        potentially_stuck = []
        
        for result in recent_results:
            status = result.status or 'unknown'
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Check for potentially stuck processes
            if result.updated_at:
                time_since_update = current_time - result.updated_at.timestamp()
                
                # If a result hasn't been updated in over 30 minutes and isn't completed
                if (time_since_update > 1800 and 
                    status not in ['ocr_processed', 'text_extracted', 'error', 'cancelled']):
                    potentially_stuck.append({
                        'file_id': result.file_id,
                        'status': status,
                        'last_updated': result.updated_at.isoformat(),
                        'minutes_since_update': int(time_since_update / 60)
                    })
            
            # Track recent activity (last 2 hours)
            if result.updated_at and (current_time - result.updated_at.timestamp()) < 7200:
                recent_activity.append({
                    'file_id': result.file_id,
                    'status': status,
                    'updated_at': result.updated_at.isoformat()
                })
        
        # Sort recent activity by update time
        recent_activity.sort(key=lambda x: x['updated_at'], reverse=True)
        
        # Health assessment
        health_issues = []
        
        if potentially_stuck:
            health_issues.append(f"{len(potentially_stuck)} potentially stuck processes detected")
        
        if active_batches > 5:
            health_issues.append(f"High number of active batches: {active_batches}")
        
        # Check for excessive processing time
        long_running_batches = [
            batch for batch in batch_details 
            if batch['start_time'] and (current_time - batch['start_time']) > 3600  # 1 hour
        ]
        
        if long_running_batches:
            health_issues.append(f"{len(long_running_batches)} batches running for over 1 hour")
        
        overall_health = "healthy" if not health_issues else "issues_detected"
        
        return {
            'overall_health': overall_health,
            'health_issues': health_issues,
            'timestamp': current_time,
            'statistics': {
                'total_recent_results': len(recent_results),
                'status_counts': status_counts,
                'active_batches': active_batches,
                'potentially_stuck_processes': len(potentially_stuck),
                'recent_activity_count': len(recent_activity)
            },
            'active_batches': batch_details,
            'potentially_stuck_processes': potentially_stuck[:10],  # Limit to 10 for display
            'recent_activity': recent_activity[:20],  # Limit to 20 for display
            'recommendations': generate_health_recommendations(
                potentially_stuck, active_batches, long_running_batches, status_counts
            )
        }
        
    except Exception as e:
        logger.error(f"Error getting process health status: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing process health: {str(e)}")
    finally:
        db.close()

def generate_health_recommendations(
    potentially_stuck: List[Dict], 
    active_batches: int, 
    long_running_batches: List[Dict],
    status_counts: Dict[str, int]
) -> List[str]:
    """Generate recommendations based on health analysis"""
    recommendations = []
    
    if potentially_stuck:
        recommendations.append(
            f"Consider investigating {len(potentially_stuck)} potentially stuck processes. "
            "They may need to be cancelled or restarted."
        )
    
    if active_batches > 3:
        recommendations.append(
            f"High number of active batches ({active_batches}). "
            "Consider limiting concurrent batch processing to improve performance."
        )
    
    if long_running_batches:
        recommendations.append(
            f"{len(long_running_batches)} batches have been running for over 1 hour. "
            "Check if they are making progress or need intervention."
        )
    
    # Check for high error rates
    total_processed = sum(status_counts.values())
    error_count = status_counts.get('error', 0)
    if total_processed > 0 and (error_count / total_processed) > 0.1:  # More than 10% errors
        recommendations.append(
            f"High error rate detected: {error_count}/{total_processed} ({error_count/total_processed*100:.1f}%). "
            "Check system resources and OCR configuration."
        )
    
    if not recommendations:
        recommendations.append("System appears to be running normally.")
    
    return recommendations

def cleanup_stuck_processes(file_ids: List[str] = None) -> Dict[str, Any]:
    """
    Clean up stuck or problematic processes
    """
    db = get_db_session()
    
    try:
        cleanup_results = {
            'cleaned_individual_processes': 0,
            'cleaned_batch_processes': 0,
            'errors': []
        }
        
        # Clean up individual OCR results if specified
        if file_ids:
            for file_id in file_ids:
                try:
                    result = db.query(OcrResult).filter(OcrResult.file_id == file_id).first()
                    if result and result.status not in ['ocr_processed', 'text_extracted']:
                        result.status = 'cancelled'
                        result.updated_at = time.time()
                        cleanup_results['cleaned_individual_processes'] += 1
                except Exception as e:
                    cleanup_results['errors'].append(f"Error cleaning {file_id}: {str(e)}")
        
        # Clean up stuck batch processes
        current_time = time.time()
        stuck_batches = []
        
        for batch_id, processor in list(batch_processing_status.items()):
            try:
                status_dict = processor.get_status_dict()
                start_time = status_dict.get('start_time')
                
                # Consider a batch stuck if it's been running for over 2 hours without progress
                if (start_time and 
                    (current_time - start_time) > 7200 and  # 2 hours
                    status_dict['status'] in ['processing', 'queued']):
                    
                    processor.stop()
                    del batch_processing_status[batch_id]
                    stuck_batches.append(batch_id)
                    cleanup_results['cleaned_batch_processes'] += 1
                    
            except Exception as e:
                cleanup_results['errors'].append(f"Error cleaning batch {batch_id}: {str(e)}")
        
        db.commit()
        
        logger.info(f"Cleanup completed: {cleanup_results}")
        
        return {
            'success': True,
            'message': f"Cleaned up {cleanup_results['cleaned_individual_processes']} individual processes and {cleanup_results['cleaned_batch_processes']} batch processes",
            'details': cleanup_results,
            'cleaned_batches': stuck_batches
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(status_code=500, detail=f"Error during cleanup: {str(e)}")
    finally:
        db.close()