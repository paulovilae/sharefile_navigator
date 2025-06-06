/**
 * Custom hook for batch control actions
 */
import { useCallback } from 'react';
import { controlBatch } from '../utils/batchUtils';

export const useBatchControls = (onSuccess, onError) => {
    // Pause batch processing
    const pauseBatch = useCallback(async (batchId) => {
        if (!batchId) return;
        
        try {
            const response = await controlBatch(batchId, 'pause');
            if (onSuccess) {
                onSuccess('pause', response);
            }
            return response;
        } catch (error) {
            const errorMessage = `Error pausing batch: ${error.message}`;
            if (onError) {
                onError(errorMessage);
            }
            throw error;
        }
    }, [onSuccess, onError]);

    // Resume batch processing
    const resumeBatch = useCallback(async (batchId) => {
        if (!batchId) return;
        
        try {
            const response = await controlBatch(batchId, 'resume');
            if (onSuccess) {
                onSuccess('resume', response);
            }
            return response;
        } catch (error) {
            const errorMessage = `Error resuming batch: ${error.message}`;
            if (onError) {
                onError(errorMessage);
            }
            throw error;
        }
    }, [onSuccess, onError]);

    // Stop batch processing
    const stopBatch = useCallback(async (batchId) => {
        if (!batchId) return;
        
        try {
            const response = await controlBatch(batchId, 'stop');
            if (onSuccess) {
                onSuccess('stop', response);
            }
            return response;
        } catch (error) {
            const errorMessage = `Error stopping batch: ${error.message}`;
            if (onError) {
                onError(errorMessage);
            }
            throw error;
        }
    }, [onSuccess, onError]);

    return {
        pauseBatch,
        resumeBatch,
        stopBatch
    };
};