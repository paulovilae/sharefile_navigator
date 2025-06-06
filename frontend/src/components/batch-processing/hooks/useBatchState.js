/**
 * Custom hook for batch state management
 */
import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_OCR_SETTINGS, DEFAULT_PAGINATION_SETTINGS } from '../constants/batchConstants';

export const useBatchState = (externalSettings = {}) => {
    // Batch processing state
    const [batchId, setBatchId] = useState(null);
    const [batchStatus, setBatchStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    // UI state
    // Apply any custom initial expanded states from external settings
    const [expandedSections, setExpandedSections] = useState({
        ...(externalSettings?.initialExpandedSections || {}),
        progress: true,
        statistics: true,  // Changed from 'stats' to 'statistics' to match BatchStatusDisplay
        logs: true,        // Changed to true so logs are visible by default
        results: false,
        chunks: false,     // Added for PaginatedBatchProcessor
        debug: false,      // Added for Debug Information accordion
        processedFiles: true // Added for Processed Files accordion
    });

    // Settings state
    const [settings, setSettings] = useState({
        ...DEFAULT_OCR_SETTINGS,
        ...DEFAULT_PAGINATION_SETTINGS,
        ...externalSettings?.ocrSettings,
        ...externalSettings?.paginationSettings
    });

    // Update settings when external settings change
    useEffect(() => {
        if (externalSettings) {
            setSettings(prev => ({
                ...prev,
                ...externalSettings?.ocrSettings,
                ...externalSettings?.paginationSettings
            }));
        }
    }, [externalSettings]);

    // Reset batch state
    const resetBatchState = useCallback(() => {
        setBatchId(null);
        setBatchStatus(null);
        setIsProcessing(false);
        setError(null);
    }, []);

    // Update batch status
    const updateBatchStatus = useCallback((status) => {
        setBatchStatus(status);
        
        // Update processing state based on status
        const activeStatuses = ['processing', 'queued', 'paused'];
        setIsProcessing(activeStatuses.includes(status?.status));
    }, []);

    // Set error with optional auto-clear
    const setErrorWithTimeout = useCallback((errorMessage, timeout = null) => {
        setError(errorMessage);
        
        if (timeout) {
            setTimeout(() => {
                setError(null);
            }, timeout);
        }
    }, []);

    // Toggle section expansion
    const toggleSection = useCallback((section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    }, []);

    // Update specific setting
    const updateSetting = useCallback((key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    // Update multiple settings
    const updateSettings = useCallback((newSettings) => {
        setSettings(prev => ({
            ...prev,
            ...newSettings
        }));
    }, []);

    return {
        // Batch state
        batchId,
        setBatchId,
        batchStatus,
        setBatchStatus,
        isProcessing,
        setIsProcessing,
        error,
        setError,
        
        // UI state
        expandedSections,
        setExpandedSections,
        
        // Settings
        settings,
        setSettings,
        
        // Actions
        resetBatchState,
        updateBatchStatus,
        setErrorWithTimeout,
        toggleSection,
        updateSetting,
        updateSettings
    };
};