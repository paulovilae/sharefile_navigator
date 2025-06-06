/**
 * Batch processing utility functions
 */
import axios from 'axios';

/**
 * Generate unique batch ID
 * @param {string} prefix - Prefix for the batch ID
 * @param {number} chunkIndex - Optional chunk index for paginated batches
 * @returns {string} Unique batch ID
 */
export const generateBatchId = (prefix = 'batch', chunkIndex = null) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    if (chunkIndex !== null) {
        return `paginated_${prefix}_${timestamp}_chunk_${chunkIndex}_${random}`;
    }
    
    return `${prefix}_${timestamp}_${random}`;
};

/**
 * Get status color for Material-UI components
 * @param {string} status - Batch status
 * @returns {string} Material-UI color name
 */
export const getStatusColor = (status) => {
    switch (status) {
        case 'completed': return 'success';
        case 'processing': return 'primary';
        case 'queued': return 'info';
        case 'paused': return 'warning';
        case 'error':
        case 'cancelled': return 'error';
        default: return 'default';
    }
};

/**
 * Get enhanced status message with additional context
 * @param {string} status - Batch status
 * @param {Object} batchStatus - Full batch status object
 * @returns {string} Human-readable status message
 */
export const getStatusMessage = (status, batchStatus = {}) => {
    switch (status) {
        case 'queued':
            if (batchStatus.queue_position) {
                return `Queued (Position: ${batchStatus.queue_position})`;
            }
            if (batchStatus.estimated_start_time) {
                const startTime = new Date(batchStatus.estimated_start_time * 1000);
                const now = new Date();
                const waitTime = Math.max(0, (startTime - now) / 1000);
                return `Queued (Est. start in ${formatDuration(waitTime)})`;
            }
            return 'Queued - Waiting to start processing';
        case 'processing':
            return 'Processing files';
        case 'completed':
            return 'All files processed successfully';
        case 'paused':
            return 'Processing paused';
        case 'error':
            return 'Processing stopped due to error';
        case 'cancelled':
            return 'Processing was cancelled';
        default:
            return status?.toUpperCase() || 'Unknown status';
    }
};

/**
 * Check if a batch is in an active state
 * @param {string} status - Batch status
 * @returns {boolean} True if batch is active
 */
export const isBatchActive = (status) => {
    return ['processing', 'queued', 'paused'].includes(status);
};

/**
 * Check if a batch can be paused
 * @param {string} status - Batch status
 * @param {boolean} isPaused - Whether batch is currently paused
 * @returns {boolean} True if batch can be paused
 */
export const canPauseBatch = (status, isPaused = false) => {
    return status === 'processing' && !isPaused;
};

/**
 * Check if a batch can be resumed
 * @param {string} status - Batch status
 * @param {boolean} isPaused - Whether batch is currently paused
 * @returns {boolean} True if batch can be resumed
 */
export const canResumeBatch = (status, isPaused = false) => {
    return status === 'paused' || isPaused;
};

/**
 * Check if a batch can be stopped
 * @param {string} status - Batch status
 * @returns {boolean} True if batch can be stopped
 */
export const canStopBatch = (status) => {
    return ['processing', 'queued', 'paused'].includes(status);
};

/**
 * Calculate progress percentage
 * @param {number} processed - Number of processed items
 * @param {number} total - Total number of items
 * @returns {number} Progress percentage (0-100)
 */
export const calculateProgress = (processed, total) => {
    if (!total || total === 0) return 0;
    return Math.round((processed / total) * 100);
};

/**
 * Get polling interval based on batch status
 * @param {string} status - Batch status
 * @returns {number} Polling interval in milliseconds
 */
export const getPollingInterval = (status) => {
    switch (status) {
        case 'queued':
            return 5000; // 5 seconds for queued
        case 'processing':
            return 1500; // 1.5 seconds for active processing
        case 'paused':
        case 'error':
            return 10000; // 10 seconds for paused/error states
        default:
            return 2000; // Default 2 seconds
    }
};

/**
 * Start a batch processing job
 * @param {string} batchId - Unique batch ID
 * @param {Array} files - Array of files to process
 * @param {Object} settings - Processing settings
 * @returns {Promise<Object>} Batch start response
 */
export const startBatchProcessing = async (batchId, files, settings) => {
    try {
        const response = await axios.post('/api/ocr/batch/start', {
            batch_id: batchId,
            files,
            settings: {
                dpi: settings.dpi || 300,
                imageFormat: settings.imageFormat || 'PNG',
                colorMode: settings.colorMode || 'RGB',
                pageRange: settings.pageRange || 'all',
                ocrEngine: settings.ocrEngine || 'easyocr',
                language: settings.language || 'spa',
                confidenceThreshold: settings.confidenceThreshold || 0.7,
                enableGpuAcceleration: settings.enableGpuAcceleration !== undefined ? settings.enableGpuAcceleration : true,
                batchSize: settings.batchSize || 5,
                autoSave: settings.autoSave !== undefined ? settings.autoSave : true
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error starting batch processing:', error);
        throw error;
    }
};

/**
 * Get batch status from API
 * @param {string} batchId - Batch ID to check
 * @returns {Promise<Object>} Batch status
 */
export const getBatchStatus = async (batchId) => {
    try {
        const response = await axios.get(`/api/ocr/batch/status/${batchId}`);
        
        // Debug logging for batch status response
        if (process.env.NODE_ENV === 'development') {
            console.log(`[getBatchStatus] Response for ${batchId}:`, {
                status: response.status,
                data_keys: Object.keys(response.data),
                logs_included: 'logs' in response.data,
                logs_type: typeof response.data.logs,
                logs_length: Array.isArray(response.data.logs) ? response.data.logs.length : 'not array',
                estimated_time_remaining: response.data.estimated_time_remaining,
                processing_stats: response.data.processing_stats
            });
        }
        
        return response.data;
    } catch (error) {
        console.error(`Error getting batch status for ${batchId}:`, error);
        throw error;
    }
};

/**
 * Control batch processing (pause/resume/stop)
 * @param {string} batchId - Batch ID
 * @param {string} action - Action to perform ('pause', 'resume', 'stop')
 * @returns {Promise<Object>} Action response
 */
export const controlBatch = async (batchId, action) => {
    try {
        const response = await axios.post(`/api/ocr/batch/${action}/${batchId}`);
        return response.data;
    } catch (error) {
        console.error(`Error ${action}ing batch ${batchId}:`, error);
        throw error;
    }
};

// Import formatDuration from timeUtils to avoid circular dependency
const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return 'Calculating...';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
};