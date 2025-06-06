/**
 * Refactored Batch OCR Processor Component
 * Handles standard batch processing for smaller file sets
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Alert
} from '@mui/material';
import { PlayArrow as PlayIcon } from '@mui/icons-material';

// Shared components
import BatchStatusDisplay from './shared/BatchStatusDisplay';
import RunningProcessesMonitor from './RunningProcessesMonitor';

// Local components
import BatchControls from './BatchControls';
import BatchFileList from './BatchFileList';
import BatchStatusChip from './BatchStatusChip';

// Hooks
import { useBatchState } from '../hooks/useBatchState';
import { useBatchPolling } from '../hooks/useBatchPolling';
import { useBatchControls } from '../hooks/useBatchControls';

// Utils
import { expandFoldersToFiles, prepareFilesForProcessing } from '../utils/fileUtils';
import { generateBatchId, startBatchProcessing } from '../utils/batchUtils';
import { formatDuration } from '../utils/timeUtils';

// Constants
import { ERROR_MESSAGES } from '../constants/batchConstants';

const BatchOcrProcessor = ({ 
    selectedFiles = [], 
    onProcessingUpdate, 
    settings: externalSettings 
}) => {
    // State management
    const {
        batchId,
        setBatchId,
        batchStatus,
        isProcessing,
        setIsProcessing,
        error,
        setError,
        expandedSections,
        toggleSection,
        settings,
        updateBatchStatus
    } = useBatchState(externalSettings);

    // Local state for processable files
    const [processableFiles, setProcessableFiles] = useState([]);

    // Polling hook
    const { startPolling, stopPolling, refreshStatus } = useBatchPolling(
        batchId,
        (status) => {
            updateBatchStatus(status);
            if (onProcessingUpdate) {
                onProcessingUpdate(status);
            }
        },
        setError
    );

    // Control hooks
    const { pauseBatch, resumeBatch, stopBatch } = useBatchControls(
        (action, response) => {
            updateBatchStatus(response);
            console.log(`Batch ${action} successful`);
        },
        setError
    );

    // Update processable files when selectedFiles changes
    useEffect(() => {
        const updateProcessableFiles = async () => {
            if (selectedFiles.length === 0) {
                setProcessableFiles([]);
                return;
            }

            try {
                const expandedFiles = await expandFoldersToFiles(selectedFiles);
                setProcessableFiles(expandedFiles);
            } catch (error) {
                console.error('Error expanding selected items:', error);
                setError(`Error processing selection: ${error.message}`);
                setProcessableFiles([]);
            }
        };

        updateProcessableFiles();
    }, [selectedFiles, setError]);

    // Start batch processing
    const handleStartProcessing = useCallback(async () => {
        if (processableFiles.length === 0) {
            setError(ERROR_MESSAGES.NO_FILES_SELECTED);
            return;
        }

        const newBatchId = generateBatchId();
        setBatchId(newBatchId);
        setIsProcessing(true);
        setError(null);

        try {
            const filesForProcessing = prepareFilesForProcessing(processableFiles);
            
            console.log(`[BatchOcrProcessor] Starting batch processing for ${filesForProcessing.length} files`);
            
            const response = await startBatchProcessing(newBatchId, filesForProcessing, settings);
            updateBatchStatus(response);

            // Start polling with initial interval based on status
            const initialInterval = response.status === 'queued' ? 3000 : 2000;
            startPolling(newBatchId, initialInterval);
            
        } catch (error) {
            console.error('Error starting batch processing:', error);
            
            let errorMessage = ERROR_MESSAGES.BATCH_START_FAILED;
            if (error.response?.data?.detail) {
                errorMessage += `: ${error.response.data.detail}`;
            } else if (error.message) {
                errorMessage += `: ${error.message}`;
            }
            
            setError(errorMessage);
            setIsProcessing(false);
        }
    }, [processableFiles, settings, setBatchId, setIsProcessing, setError, updateBatchStatus, startPolling]);

    // Handle process selection from monitor
    const handleProcessSelect = useCallback((selectedBatchId, process) => {
        setBatchId(selectedBatchId);
        updateBatchStatus(process);
        setIsProcessing(['processing', 'queued', 'paused'].includes(process.status));
        
        // Start polling for this batch if it's active
        if (['processing', 'queued', 'paused'].includes(process.status)) {
            startPolling(selectedBatchId);
        }
    }, [setBatchId, updateBatchStatus, setIsProcessing, startPolling]);

    // Control handlers
    const handlePause = () => pauseBatch(batchId);
    const handleResume = () => resumeBatch(batchId);
    const handleStop = async () => {
        await stopBatch(batchId);
        stopPolling();
        setIsProcessing(false);
    };

    return (
        <Box>
            {/* Running Processes Monitor */}
            <RunningProcessesMonitor onProcessSelect={handleProcessSelect} />
            
            {/* Processing Controls */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Batch OCR Processing
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                        <BatchControls
                            isProcessing={isProcessing}
                            batchStatus={batchStatus}
                            batchId={batchId}
                            onStart={handleStartProcessing}
                            onPause={handlePause}
                            onResume={handleResume}
                            onStop={handleStop}
                            onRefresh={refreshStatus}
                        />
                        
                        {batchStatus && (
                            <BatchStatusChip
                                status={batchStatus.status}
                                batchStatus={batchStatus}
                            />
                        )}
                    </Box>

                    {/* File Selection Summary */}
                    <BatchFileList
                        selectedFiles={selectedFiles}
                        processableFiles={processableFiles}
                    />
                </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Queued Status Alert */}
            {batchStatus && batchStatus.status === 'queued' && (
                <Alert
                    severity="info"
                    sx={{ mb: 3 }}
                    icon={<PlayIcon />}
                >
                    <Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Batch Processing Queued
                        </Typography>
                        <Typography variant="body2">
                            Your batch of {batchStatus.total_files} files is waiting to be processed.
                            {batchStatus.queue_position && ` You are position ${batchStatus.queue_position} in the queue.`}
                            {batchStatus.estimated_start_time && ` Estimated start time: ${new Date(batchStatus.estimated_start_time * 1000).toLocaleTimeString()}.`}
                            {!batchStatus.queue_position && !batchStatus.estimated_start_time && ' Processing will begin automatically when resources become available.'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            You can safely close this page - your batch will continue processing in the background.
                        </Typography>
                    </Box>
                </Alert>
            )}

            {/* Batch Status Display */}
            <BatchStatusDisplay
                batchStatus={batchStatus}
                expandedSections={expandedSections}
                toggleSection={toggleSection}
                formatDuration={formatDuration}
                title="Batch Processing"
            />
        </Box>
    );
};

export default BatchOcrProcessor;