/**
 * Custom hook for batch status polling
 */
import { useRef, useCallback, useEffect } from 'react';
import { getBatchStatus, getPollingInterval } from '../utils/batchUtils';
import { COMPLETED_STATUSES } from '../constants/batchConstants';

export const useBatchPolling = (batchId, onStatusUpdate, onError) => {
    const pollingIntervalRef = useRef(null);
    const mountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    // Poll batch status
    const pollBatchStatus = useCallback(async (currentBatchId) => {
        if (!currentBatchId || !mountedRef.current) {
            return;
        }

        try {
            console.log(`[useBatchPolling] Polling batch status for: ${currentBatchId}`);
            const status = await getBatchStatus(currentBatchId);
            
            console.log(`[useBatchPolling] Received status for ${currentBatchId}:`, {
                status: status.status,
                processed: status.processed_count,
                total: status.total_files,
                current_file: status.current_file?.name || 'None',
                estimated_time_remaining: status.estimated_time_remaining,
                avg_time: status.processing_stats?.average_processing_time,
                logs_count: Array.isArray(status.logs) ? status.logs.length : 'not array',
                logs_sample: Array.isArray(status.logs) ? status.logs.slice(0, 2) : status.logs,
                logs_type: typeof status.logs,
                logs_raw: status.logs
            });
            
            // Additional logs debugging
            console.log(`[useBatchPolling] Logs detailed debug:`, {
                'status.logs': status.logs,
                'typeof status.logs': typeof status.logs,
                'Array.isArray(status.logs)': Array.isArray(status.logs),
                'status.logs?.length': status.logs?.length
            });
            
            // Always update status for progress tracking
            if (onStatusUpdate) {
                onStatusUpdate(status);
            }
            
            if (mountedRef.current) {
                // Adjust polling frequency based on status
                const currentInterval = pollingIntervalRef.current;
                const newInterval = getPollingInterval(status.status);
                
                // Update polling interval if it changed significantly
                if (currentInterval && Math.abs(newInterval - 2000) > 500) {
                    clearInterval(currentInterval);
                    pollingIntervalRef.current = setInterval(() => {
                        pollBatchStatus(currentBatchId);
                    }, newInterval);
                }
                
                // Stop polling if batch is completed
                if (COMPLETED_STATUSES.includes(status.status)) {
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                }
            }
        } catch (error) {
            console.error(`[useBatchPolling] Error polling batch ${currentBatchId}:`, error);
            if (mountedRef.current && onError) {
                onError(`Error getting batch status: ${error.message}`);
            }
        }
    }, [onStatusUpdate, onError]);

    // Start polling
    const startPolling = useCallback((targetBatchId, initialInterval = 2000) => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
        
        console.log(`[useBatchPolling] Starting polling for batch: ${targetBatchId} with interval: ${initialInterval}ms`);
        
        pollingIntervalRef.current = setInterval(() => {
            pollBatchStatus(targetBatchId);
        }, initialInterval);
    }, [pollBatchStatus]);

    // Stop polling
    const stopPolling = useCallback(() => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    }, []);

    // Manual refresh
    const refreshStatus = useCallback(() => {
        if (batchId) {
            pollBatchStatus(batchId);
        }
    }, [batchId, pollBatchStatus]);

    return {
        startPolling,
        stopPolling,
        refreshStatus,
        isPolling: !!pollingIntervalRef.current
    };
};