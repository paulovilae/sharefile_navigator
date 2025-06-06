/**
 * Time-related utility functions for batch processing
 */

/**
 * Format time duration from seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
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

/**
 * Calculate elapsed time from start timestamp
 * @param {number} startTime - Start timestamp in seconds
 * @returns {string} Formatted elapsed time
 */
export const getElapsedTime = (startTime) => {
    if (!startTime) return 'Unknown';
    const now = Date.now() / 1000;
    const elapsed = now - startTime;
    return formatDuration(elapsed);
};

/**
 * Get estimated completion time
 * @param {number} processed - Number of processed items
 * @param {number} total - Total number of items
 * @param {number} startTime - Start timestamp in seconds
 * @returns {string} Estimated completion time
 */
export const getEstimatedCompletion = (processed, total, startTime) => {
    if (!processed || !total || !startTime || processed === 0) {
        return 'Calculating...';
    }
    
    const elapsed = (Date.now() / 1000) - startTime;
    const avgTimePerItem = elapsed / processed;
    const remaining = total - processed;
    const estimatedSeconds = remaining * avgTimePerItem;
    
    return formatDuration(estimatedSeconds);
};