/**
 * Constants for batch processing
 */

// Batch status constants
export const BATCH_STATUS = {
    QUEUED: 'queued',
    PROCESSING: 'processing',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ERROR: 'error',
    CANCELLED: 'cancelled'
};

// Active batch statuses (can be controlled)
export const ACTIVE_STATUSES = [
    BATCH_STATUS.PROCESSING,
    BATCH_STATUS.QUEUED,
    BATCH_STATUS.PAUSED
];

// Completed batch statuses (no longer active)
export const COMPLETED_STATUSES = [
    BATCH_STATUS.COMPLETED,
    BATCH_STATUS.ERROR,
    BATCH_STATUS.CANCELLED
];

// Default polling intervals (in milliseconds)
export const POLLING_INTERVALS = {
    [BATCH_STATUS.QUEUED]: 5000,      // 5 seconds for queued
    [BATCH_STATUS.PROCESSING]: 1500,   // 1.5 seconds for processing
    [BATCH_STATUS.PAUSED]: 10000,     // 10 seconds for paused
    [BATCH_STATUS.ERROR]: 10000,      // 10 seconds for error
    DEFAULT: 2000                     // 2 seconds default
};

// Default OCR settings
export const DEFAULT_OCR_SETTINGS = {
    dpi: 300,
    imageFormat: 'PNG',
    colorMode: 'RGB',
    pageRange: 'all',
    ocrEngine: 'easyocr',
    language: 'spa',
    confidenceThreshold: 0.7,
    enableGpuAcceleration: true,
    batchSize: 5,
    autoSave: true
};

// Default pagination settings
export const DEFAULT_PAGINATION_SETTINGS = {
    chunkSize: 200,
    skipProcessed: true,
    pauseBetweenChunks: false,
    pauseDuration: 5000
};

// File type constants
export const SUPPORTED_FILE_TYPES = {
    PDF: '.pdf'
};

// UI constants
export const UI_CONSTANTS = {
    MAX_DISPLAYED_FILES: 5,
    PROGRESS_BAR_HEIGHT: 10,
    CHIP_SIZE: 'small'
};

// Error messages
export const ERROR_MESSAGES = {
    NO_FILES_SELECTED: 'No PDF files found in selection for processing',
    ALL_FILES_PROCESSED: 'All files have already been processed',
    BATCH_START_FAILED: 'Error starting batch processing',
    BATCH_CONTROL_FAILED: 'Error controlling batch processing',
    FILE_EXPANSION_FAILED: 'Error expanding folder contents',
    STATUS_FETCH_FAILED: 'Error fetching batch status'
};

// Success messages
export const SUCCESS_MESSAGES = {
    BATCH_STARTED: 'Batch processing started successfully',
    BATCH_PAUSED: 'Batch processing paused',
    BATCH_RESUMED: 'Batch processing resumed',
    BATCH_STOPPED: 'Batch processing stopped',
    BATCH_COMPLETED: 'Batch processing completed successfully'
};