/**
 * Refactored Paginated Batch Processor Component
 * Handles large file sets by processing them in chunks
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    LinearProgress,
    Chip,
    Grid,
    Paper,
    Alert,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    PlayArrow as PlayIcon,
    Stop as StopIcon,
    ExpandMore as ExpandMoreIcon,
    Assessment as AssessmentIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Schedule as ScheduleIcon,
    Speed as SpeedIcon,
    Info as InfoIcon,
    PictureAsPdf
} from '@mui/icons-material';

// Localization
import { useTranslate } from 'react-admin';

// Shared components
import BatchStatusDisplay from './shared/BatchStatusDisplay';

// Local components
import BatchControls from './BatchControls';
import BatchStatusChip from './BatchStatusChip';
import PdfResultsDisplay from '../../blocks/OCRBlock/components/PdfResultsDisplay';

// Hooks
import { useBatchState } from '../hooks/useBatchState';
import { useBatchPolling } from '../hooks/useBatchPolling';
import { useBatchControls } from '../hooks/useBatchControls';
import { usePaginatedBatch } from '../hooks/usePaginatedBatch';

// Utils
import { formatDuration } from '../utils/timeUtils';
import { getStatusColor } from '../utils/batchUtils';

// Constants
import { COMPLETED_STATUSES } from '../constants/batchConstants';

const PaginatedBatchProcessor = ({
    selectedFiles = [],
    onProcessingUpdate,
    settings: externalSettings
}) => {
    const translate = useTranslate();
    
    // State management
    const {
        error,
        setError,
        expandedSections,
        toggleSection,
        settings
    } = useBatchState({
        ...externalSettings,
        initialExpandedSections: {
            ...externalSettings?.initialExpandedSections,
            debug: false,
            processedFiles: true
        }
    });

    // Paginated batch logic
    const {
        paginationState,
        setPaginationState,
        currentBatch,
        setCurrentBatch,
        chunkHistory,
        startPaginatedProcessing,
        stopPaginatedProcessing,
        handleChunkCompletion
    } = usePaginatedBatch(selectedFiles, settings, onProcessingUpdate);

    // Confirmation dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        message: '',
        onConfirm: null
    });

    // Reference for cleanup timeout
    const cleanupTimeoutRef = useRef(null);

    // Cleanup function to clear batch data after completion
    const cleanupBatchData = useCallback(() => {
        // Clear any existing timeout
        if (cleanupTimeoutRef.current) {
            clearTimeout(cleanupTimeoutRef.current);
            cleanupTimeoutRef.current = null;
        }
        
        // Set a new timeout to clear the data after a delay
        cleanupTimeoutRef.current = setTimeout(() => {
            console.log('[PaginatedBatchProcessor] Cleaning up batch data after completion');
            
            // Batch state updates together to prevent cascading renders
            const batchUpdate = () => {
                // Clear current batch status but keep results for viewing
                setCurrentBatch(prev => ({
                    ...prev,
                    isProcessing: false,
                    // Keep the status object but mark it as cleaned up
                    status: prev.status ? {
                        ...prev.status,
                        _cleanedUp: true,
                        // Keep only essential data, remove large objects
                        logs: []
                    } : null
                }));
                
                // Reset pagination state
                setPaginationState(prev => ({
                    ...prev,
                    isActive: false
                }));
            };
            
            // Execute the batch update
            batchUpdate();
            
            cleanupTimeoutRef.current = null;
        }, 2000); // 2 second delay
        
        return () => {
            if (cleanupTimeoutRef.current) {
                clearTimeout(cleanupTimeoutRef.current);
                cleanupTimeoutRef.current = null;
            }
        };
    }, []); // Remove dependencies to prevent re-creation on every render
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (cleanupTimeoutRef.current) {
                clearTimeout(cleanupTimeoutRef.current);
            }
        };
    }, []);

    // Polling hook for current chunk
    const { startPolling, stopPolling } = useBatchPolling(
        currentBatch.batchId,
        (status) => {
            // Prevent state updates if the component is unmounting or the batch has been cleaned up
            if (status._cleanedUp) {
                return;
            }
            
            // Update batch status first
            setCurrentBatch(prev => ({
                ...prev,
                status: status
            }));
            
            // Update pagination state with real progress from backend
            // Make sure totalFiles is set first, then calculate processed files
            // to avoid showing more processed files than total files
            setPaginationState(prev => {
                // Get counts from status
                const processedCount = status.processed_count || 0;
                const failedCount = status.failed_count || 0;
                const skippedCount = status.skipped_count || 0;
                
                // Calculate total processed files
                const totalProcessed = processedCount + failedCount + skippedCount;
                
                // Ensure totalFiles is at least as large as the total processed count
                // This fixes the "3 of 2 files" inconsistency when reprocessing files
                let totalFiles = status.total_files || prev.totalFiles;
                if (totalProcessed > totalFiles) {
                    console.log(`[PaginatedBatchProcessor] Adjusting totalFiles from ${totalFiles} to ${totalProcessed} to match processed counts`);
                    totalFiles = totalProcessed;
                }
                
                return {
                    ...prev,
                    totalFiles,
                    processedFiles: processedCount,
                    failedFiles: failedCount,
                    skippedFiles: skippedCount
                };
            });
            
            if (onProcessingUpdate) {
                onProcessingUpdate(status);
            }
            
            // Handle chunk completion - but only once
            if (['completed', 'error', 'cancelled'].includes(status.status) && !status._processed) {
                // Mark the status as processed to prevent duplicate handling
                status._processed = true;
                
                // Update processing state in a single batch
                setCurrentBatch(prev => ({
                    ...prev,
                    isProcessing: false
                }));
                
                // Handle chunk completion
                handleChunkCompletion(currentBatch.batchId, status);
                
                // Schedule cleanup after completion - but only if not already scheduled
                if (!cleanupTimeoutRef.current) {
                    cleanupBatchData();
                }
            }
        },
        setError
    );

    // Control hooks
    const { pauseBatch, resumeBatch, stopBatch } = useBatchControls(
        (action, response) => {
            setCurrentBatch(prev => ({
                ...prev,
                status: response
            }));
        },
        setError
    );

    // Check for existing active batches on component mount
    useEffect(() => {
        const checkExistingBatches = async () => {
            try {
                console.log('[PaginatedBatchProcessor] Checking for existing active batches...');
                const response = await axios.get('/api/ocr/batch/list');
                const activeBatches = response.data?.jobs || {};
                
                // Filter out completed/cancelled batches
                const activeBatchEntries = Object.entries(activeBatches).filter(([_, batchStatus]) => {
                    return !COMPLETED_STATUSES.includes(batchStatus.status);
                });
                
                if (activeBatchEntries.length > 0) {
                    const [batchId, batchStatus] = activeBatchEntries[0];
                    
                    console.log(`[PaginatedBatchProcessor] Found existing active batch: ${batchId} with status: ${batchStatus.status}`);
                    
                    setCurrentBatch({
                        batchId: batchId,
                        isProcessing: batchStatus.status === 'processing',
                        status: batchStatus
                    });
                    
                    setPaginationState(prev => {
                        // Get counts from status
                        const processedCount = batchStatus.processed_count || 0;
                        const failedCount = batchStatus.failed_count || 0;
                        const skippedCount = batchStatus.skipped_count || 0;
                        
                        // Calculate total processed files
                        const totalProcessed = processedCount + failedCount + skippedCount;
                        
                        // Ensure totalFiles is at least as large as the total processed count
                        let totalFiles = batchStatus.total_files || 0;
                        if (totalProcessed > totalFiles) {
                            console.log(`[checkExistingBatches] Adjusting totalFiles from ${totalFiles} to ${totalProcessed} to match processed counts`);
                            totalFiles = totalProcessed;
                        }
                        
                        return {
                            ...prev,
                            isActive: ['processing', 'queued'].includes(batchStatus.status),
                            totalFiles: totalFiles,
                            processedFiles: processedCount,
                            failedFiles: failedCount,
                            skippedFiles: skippedCount,
                            currentChunkIndex: 0,
                            totalChunks: 1,
                            processedChunks: 1,
                            isExistingBatch: true
                        };
                    });
                    
                    // Start polling for this existing batch
                    if (['processing', 'queued'].includes(batchStatus.status)) {
                        startPolling(batchId);
                    }
                } else {
                    console.log('[PaginatedBatchProcessor] No active batches found');
                    // Clear current batch if no active batches exist
                    setCurrentBatch({
                        batchId: null,
                        isProcessing: false,
                        status: null
                    });
                }
            } catch (error) {
                console.error('[PaginatedBatchProcessor] Error checking existing batches:', error);
            }
        };
        
        checkExistingBatches();
        
        // Return cleanup function
        return () => {
            stopPolling();
            if (cleanupTimeoutRef.current) {
                clearTimeout(cleanupTimeoutRef.current);
            }
        };
    }, [stopPolling]); // Only run once on component mount

    // Start processing handler
    const handleStartProcessing = useCallback(async () => {
        try {
            setError(null);
            const result = await startPaginatedProcessing(false);
            
            if (result) {
                // Start polling for the first chunk
                startPolling(result.batchId);
            }
        } catch (error) {
            setError(error.message);
        }
    }, [startPaginatedProcessing, startPolling, setError]);

    // Stop processing with confirmation
    const handleStopProcessing = useCallback(() => {
        setConfirmDialog({
            open: true,
            title: translate('batch.stop_title'),
            message: translate('batch.stop_message'),
            onConfirm: async () => {
                try {
                    // Stop current batch if it exists
                    if (currentBatch.batchId) {
                        await stopBatch(currentBatch.batchId);
                    }
                    
                    stopPolling();
                    stopPaginatedProcessing();
                    
                } catch (error) {
                    // Don't show error for 404 (batch already stopped/completed)
                    if (!error.message.includes('404') && !error.message.includes('not found')) {
                        setError(`Error stopping processing: ${error.message}`);
                    }
                }
                
                setConfirmDialog({ open: false, title: '', message: '', onConfirm: null });
            }
        });
    }, [currentBatch, stopBatch, stopPolling, stopPaginatedProcessing, setError]);

    // Control handlers
    const handlePause = () => pauseBatch(currentBatch.batchId);
    const handleResume = () => resumeBatch(currentBatch.batchId);

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircleIcon />;
            case 'processing': return <PlayIcon />;
            case 'queued': return <ScheduleIcon />;
            case 'error':
            case 'cancelled': return <ErrorIcon />;
            default: return <ScheduleIcon />;
        }
    };

    return (
        <Box>
            {/* Main Controls */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        {translate('batch.paginated_processing')}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {translate('batch.paginated_description')}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleStartProcessing}
                            disabled={paginationState.isActive || selectedFiles.length === 0}
                            startIcon={<PlayIcon />}
                            color="primary"
                        >
                            {translate('batch.start_paginated')}
                        </Button>
                        
                        {paginationState.isActive && (
                            <Button
                                variant="outlined"
                                onClick={handleStopProcessing}
                                startIcon={<StopIcon />}
                                color="error"
                            >
                                {translate('batch.stop_processing')}
                            </Button>
                        )}
                        
                        <BatchControls
                            isProcessing={currentBatch.isProcessing}
                            batchStatus={currentBatch.status}
                            batchId={currentBatch.batchId}
                            onPause={handlePause}
                            onResume={handleResume}
                            showLabels={false}
                            size="small"
                        />
                    </Box>

                    {/* Status Display */}
                    {paginationState.isActive && (
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                {translate('batch.processing_status')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Chunk {paginationState.currentChunk + 1} of {paginationState.totalChunks}
                                ({paginationState.processedChunks} completed, {paginationState.failedChunks} failed)
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Files: {paginationState.processedFiles} processed, {paginationState.failedFiles} failed, {paginationState.skippedFiles} skipped
                            </Typography>
                            {currentBatch.status && (
                                <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                                    Status: {currentBatch.status.status} - {currentBatch.status.current_file?.name || 'Initializing...'}
                                </Typography>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Chunk History */}
            {chunkHistory.length > 0 && (
                <Accordion 
                    expanded={expandedSections.chunks} 
                    onChange={() => toggleSection('chunks')}
                    sx={{ mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <AssessmentIcon sx={{ mr: 1 }} />
                            Chunk History ({chunkHistory.length})
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <List dense>
                            {chunkHistory.map((chunk, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon>
                                        {getStatusIcon(chunk.status)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={`Chunk ${chunk.chunkIndex + 1} - ${chunk.fileCount} files`}
                                        secondary={
                                            <React.Fragment>
                                                <Typography variant="caption" color="text.secondary" component="span">
                                                    Status: {chunk.status}
                                                </Typography>
                                                {chunk.endTime && (
                                                    <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block' }}>
                                                        Duration: {formatDuration((chunk.endTime - chunk.startTime) / 1000)}
                                                    </Typography>
                                                )}
                                                {chunk.error && (
                                                    <Typography variant="caption" color="error" component="span" sx={{ display: 'block' }}>
                                                        Error: {chunk.error}
                                                    </Typography>
                                                )}
                                            </React.Fragment>
                                        }
                                    />
                                    <Chip
                                        label={chunk.status}
                                        color={getStatusColor(chunk.status)}
                                        size="small"
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </AccordionDetails>
                </Accordion>
            )}

            {/* Progress Section */}
            {paginationState.isActive && (
                <Accordion
                    expanded={expandedSections.progress}
                    onChange={() => toggleSection('progress')}
                    sx={{ mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <SpeedIcon sx={{ mr: 1 }} />
                            {paginationState.isExistingBatch ? 'Batch Progress' : 'Overall Progress'}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            {/* Only show chunk progress for true paginated batches */}
                            {!paginationState.isExistingBatch && (
                                <Grid item xs={12} md={6}>
                                    <Paper sx={{ p: 2 }}>
                                        <Typography variant="subtitle1" gutterBottom>
                                            Chunk Progress
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={(paginationState.processedChunks / paginationState.totalChunks) * 100}
                                                    sx={{ height: 10, borderRadius: 5 }}
                                                />
                                            </Box>
                                            <Box sx={{ minWidth: 35 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    {Math.round((paginationState.processedChunks / paginationState.totalChunks) * 100)}%
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {paginationState.processedChunks} of {paginationState.totalChunks} chunks
                                        </Typography>
                                    </Paper>
                                </Grid>
                            )}

                            <Grid item xs={12} md={paginationState.isExistingBatch ? 12 : 6}>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        File Progress
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={(paginationState.processedFiles / paginationState.totalFiles) * 100}
                                                sx={{ height: 10, borderRadius: 5 }}
                                            />
                                        </Box>
                                        <Box sx={{ minWidth: 35 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {Math.round((paginationState.processedFiles / paginationState.totalFiles) * 100)}%
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {paginationState.processedFiles} of {paginationState.totalFiles} files
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            )}

            {/* Current Chunk Status */}
            {currentBatch.status && (
                <BatchStatusDisplay
                    batchStatus={currentBatch.status}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    formatDuration={formatDuration}
                    title="Current Chunk"
                />
            )}

            {/* Debug Information */}
            {process.env.NODE_ENV === 'development' && currentBatch.status && (
                <Accordion
                    expanded={expandedSections.debug}
                    onChange={() => toggleSection('debug')}
                    sx={{ mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <InfoIcon sx={{ mr: 1 }} />
                            Debug Information
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
                            {JSON.stringify({
                                status: currentBatch.status.status,
                                processing_stats: currentBatch.status.processing_stats,
                                logs_count: Array.isArray(currentBatch.status.logs) ? currentBatch.status.logs.length : 'not array',
                                estimated_time_remaining: currentBatch.status.estimated_time_remaining,
                                start_time: currentBatch.status.start_time,
                                current_file: currentBatch.status.current_file?.name || 'None'
                            }, null, 2)}
                        </Typography>
                    </AccordionDetails>
                </Accordion>
            )}

            {/* Processed Files */}
            {currentBatch.status && currentBatch.status.results && currentBatch.status.results.length > 0 && (
                <Accordion
                    expanded={expandedSections.processedFiles}
                    onChange={() => toggleSection('processedFiles')}
                    sx={{ mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <PictureAsPdf sx={{ mr: 1 }} />
                            Processed Files (Image, thumbnail, text and statistics)
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ maxHeight: '500px', overflow: 'auto' }}>
                            {/* Transform the results data to match what PdfResultsDisplay expects */}
                            <PdfResultsDisplay
                                results={currentBatch.status.results
                                    .filter(item => item.result && typeof item.result === 'object')
                                    .map(item => item.result)
                                }
                            />
                        </Box>
                    </AccordionDetails>
                </Accordion>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null })}>
                <DialogTitle>{confirmDialog.title}</DialogTitle>
                <DialogContent>
                    <Typography>{confirmDialog.message}</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDialog({ open: false, title: '', message: '', onConfirm: null })}>
                        {translate('common.cancel')}
                    </Button>
                    <Button onClick={confirmDialog.onConfirm} color="primary" variant="contained">
                        {translate('common.confirm')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PaginatedBatchProcessor;