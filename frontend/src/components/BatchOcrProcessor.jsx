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
    IconButton,
    Tooltip
} from '@mui/material';
import {
    FolderOpen as FolderOpenIcon,
    PictureAsPdf as PdfIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Schedule as ScheduleIcon,
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    Stop as StopIcon,
    ExpandMore as ExpandMoreIcon,
    Assessment as AssessmentIcon,
    Speed as SpeedIcon,
    Timer as TimerIcon,
    Description as DescriptionIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import RunningProcessesMonitor from './RunningProcessesMonitor';

const BatchOcrProcessor = ({ selectedFiles = [], onProcessingUpdate }) => {
    // State management
    const [batchId, setBatchId] = useState(null);
    const [batchStatus, setBatchStatus] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [expandedSections, setExpandedSections] = useState({
        progress: true,
        stats: true,
        logs: false,
        results: false
    });
    const [processableFiles, setProcessableFiles] = useState([]);

    // Refs for polling
    const pollingIntervalRef = useRef(null);
    const mountedRef = useRef(true);

    // Settings for OCR processing
    const [settings] = useState({
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
    });

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    // Generate unique batch ID
    const generateBatchId = () => {
        return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    // Format time duration
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

    // Poll batch status with enhanced queued state handling
    const pollBatchStatus = useCallback(async (currentBatchId) => {
        console.log(`[BatchOcrProcessor] pollBatchStatus called with:`, {
            currentBatchId,
            mountedRefCurrent: mountedRef.current,
            willReturn: !currentBatchId || !mountedRef.current
        });
        
        if (!currentBatchId) {
            console.log(`[BatchOcrProcessor] Returning early - no currentBatchId`);
            return;
        }
        
        // Remove mountedRef check for polling to fix progress tracking
        console.log(`[BatchOcrProcessor] Proceeding with polling - currentBatchId: ${currentBatchId}, mounted: ${mountedRef.current}`);

        try {
            console.log(`[BatchOcrProcessor] ATTEMPTING to poll batch ${currentBatchId}`);
            const response = await axios.get(`/api/ocr/batch/status/${currentBatchId}`);
            const status = response.data;
            
            // Enhanced logging for debugging
            console.log(`[BatchOcrProcessor] SUCCESS polling batch ${currentBatchId}:`, {
                status: status.status,
                currentFile: status.current_file?.name || 'None',
                currentFileIndex: status.current_file_index,
                totalFiles: status.total_files,
                processed: status.processed_count,
                failed: status.failed_count,
                skipped: status.skipped_count || 0,
                remaining: status.remaining_files,
                queuePosition: status.queue_position,
                estimatedStartTime: status.estimated_start_time
            });
            
            // Always update status for progress tracking
            setBatchStatus(status);
            
            if (mountedRef.current) {
                
                // Update parent component if callback provided
                if (onProcessingUpdate) {
                    onProcessingUpdate(status);
                }
                
                // Adjust polling frequency based on status
                const currentInterval = pollingIntervalRef.current;
                let newInterval = 2000; // Default 2 seconds
                
                if (status.status === 'queued') {
                    // Poll less frequently for queued batches
                    newInterval = 5000; // 5 seconds for queued
                } else if (status.status === 'processing') {
                    // Poll more frequently during active processing
                    newInterval = 1500; // 1.5 seconds for processing
                } else if (['paused', 'error'].includes(status.status)) {
                    // Poll less frequently for paused/error states
                    newInterval = 10000; // 10 seconds for paused/error
                }
                
                // Update polling interval if it changed
                if (currentInterval && newInterval !== 2000) {
                    clearInterval(currentInterval);
                    pollingIntervalRef.current = setInterval(() => {
                        pollBatchStatus(currentBatchId);
                    }, newInterval);
                }
                
                // Stop polling if batch is completed, error, or cancelled
                if (['completed', 'error', 'cancelled'].includes(status.status)) {
                    setIsProcessing(false);
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                }
            }
        } catch (error) {
            console.error(`[BatchOcrProcessor] ERROR polling batch ${currentBatchId}:`, error);
            console.error(`[BatchOcrProcessor] Error details:`, {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            if (mountedRef.current) {
                // Don't show error immediately for queued batches - they might not be ready yet
                if (batchStatus?.status !== 'queued') {
                    setError(`Error getting batch status: ${error.message}`);
                }
            }
        }
    }, [onProcessingUpdate, batchStatus?.status]);

    // Function to expand folders recursively and get all PDF files
    const expandFoldersToFiles = useCallback(async (selectedItems) => {
        const files = [];
        const folders = [];
        
        // Separate files and folders from selection
        selectedItems.forEach(item => {
            if (item.itemType === 'file' && item.name.toLowerCase().endsWith('.pdf')) {
                files.push(item);
            } else if (item.itemType === 'folder') {
                folders.push(item);
            }
        });

        // For each folder, recursively fetch all PDF files
        for (const folder of folders) {
            try {
                const response = await axios.get(`/api/sharepoint/list_files_recursive`, {
                    params: {
                        libraryId: folder.drive_id || folder.driveId,
                        folderId: folder.id,
                        fileType: 'pdf'
                    }
                });
                
                if (response.data && response.data.files) {
                    files.push(...response.data.files.map(file => ({
                        ...file,
                        itemType: 'file',
                        drive_id: folder.drive_id || folder.driveId
                    })));
                }
            } catch (error) {
                console.error(`Error expanding folder ${folder.name}:`, error);
                setError(`Error expanding folder ${folder.name}: ${error.message}`);
            }
        }

        return files;
    }, []);

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
    }, [selectedFiles, expandFoldersToFiles]);

    // Start batch processing
    const startBatchProcessing = useCallback(async () => {
        if (processableFiles.length === 0) {
            setError('No PDF files found in selection for processing');
            return;
        }

        const newBatchId = generateBatchId();
        setBatchId(newBatchId);
        setIsProcessing(true);
        setError(null);
        setBatchStatus(null);

        try {
            // Prepare files for batch processing
            const filesForProcessing = processableFiles.map(file => ({
                name: file.name,
                item_id: file.id || file.file_id,
                drive_id: file.driveId || file.drive_id,
                size: file.size || 0,
                modified: file.lastModifiedDateTime || file.modified
            }));

            console.log(`[BatchOcrProcessor] STARTING batch processing for ${filesForProcessing.length} files`);
            
            // Start batch processing
            const response = await axios.post('/api/ocr/batch/start', {
                batch_id: newBatchId,
                files: filesForProcessing,
                settings: settings
            });

            console.log(`[BatchOcrProcessor] Batch start response:`, response.data);
            setBatchStatus(response.data);

            // Start polling for status updates with initial faster polling for queued batches
            const initialInterval = response.data.status === 'queued' ? 3000 : 2000;
            console.log(`[BatchOcrProcessor] Setting up polling with interval: ${initialInterval}ms for batch: ${newBatchId}`);
            
            pollingIntervalRef.current = setInterval(() => {
                console.log(`[BatchOcrProcessor] Polling interval triggered for batch: ${newBatchId}`);
                pollBatchStatus(newBatchId);
            }, initialInterval);
            
            console.log(`[BatchOcrProcessor] Polling interval set up successfully for batch: ${newBatchId}`);

        } catch (error) {
            console.error('Error starting batch processing:', error);
            let errorMessage = 'Unknown error occurred';
            
            if (error.response?.data?.detail) {
                errorMessage = error.response.data.detail;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else {
                errorMessage = JSON.stringify(error);
            }
            
            setError(`Error starting batch processing: ${errorMessage}`);
            setIsProcessing(false);
        }
    }, [processableFiles, settings, pollBatchStatus]);

    // Control functions
    const pauseProcessing = async () => {
        if (!batchId) return;
        try {
            const response = await axios.post(`/api/ocr/batch/pause/${batchId}`);
            setBatchStatus(response.data);
        } catch (error) {
            setError(`Error pausing processing: ${error.message}`);
        }
    };

    const resumeProcessing = async () => {
        if (!batchId) return;
        try {
            const response = await axios.post(`/api/ocr/batch/resume/${batchId}`);
            setBatchStatus(response.data);
        } catch (error) {
            setError(`Error resuming processing: ${error.message}`);
        }
    };

    const stopProcessing = async () => {
        if (!batchId) return;
        try {
            const response = await axios.post(`/api/ocr/batch/stop/${batchId}`);
            setBatchStatus(response.data);
            setIsProcessing(false);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        } catch (error) {
            setError(`Error stopping processing: ${error.message}`);
        }
    };

    const refreshStatus = async () => {
        if (!batchId) return;
        await pollBatchStatus(batchId);
    };

    // Toggle section expansion
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Get status color with enhanced queued state
    const getStatusColor = (status) => {
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

    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircleIcon />;
            case 'processing': return <PlayIcon />;
            case 'queued': return <ScheduleIcon />;
            case 'paused': return <PauseIcon />;
            case 'error':
            case 'cancelled': return <ErrorIcon />;
            default: return <ScheduleIcon />;
        }
    };

    // Get enhanced status message for queued state
    const getStatusMessage = (status, batchStatus) => {
        switch (status) {
            case 'queued':
                if (batchStatus?.queue_position) {
                    return `Queued (Position: ${batchStatus.queue_position})`;
                }
                if (batchStatus?.estimated_start_time) {
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

    return (
        <Box>
            {/* Running Processes Monitor */}
            <RunningProcessesMonitor
                onProcessSelect={(batchId, process) => {
                    // If user clicks on a running process, load it into the current view
                    setBatchId(batchId);
                    setBatchStatus(process);
                    setIsProcessing(['processing', 'queued', 'paused'].includes(process.status));
                    
                    // Start polling for this batch if it's active
                    if (['processing', 'queued', 'paused'].includes(process.status)) {
                        if (pollingIntervalRef.current) {
                            clearInterval(pollingIntervalRef.current);
                        }
                        pollingIntervalRef.current = setInterval(() => {
                            pollBatchStatus(batchId);
                        }, 2000);
                    }
                }}
            />
            
            {/* Processing Controls */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Batch OCR Processing
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                        <Button
                            variant="contained"
                            onClick={startBatchProcessing}
                            disabled={isProcessing || processableFiles.length === 0}
                            startIcon={<PlayIcon />}
                            color="primary"
                        >
                            Start Processing ({processableFiles.length} PDF files)
                        </Button>
                        
                        {isProcessing && batchStatus && !batchStatus.is_paused && (
                            <Button
                                variant="outlined"
                                onClick={pauseProcessing}
                                startIcon={<PauseIcon />}
                                color="warning"
                            >
                                Pause
                            </Button>
                        )}
                        
                        {isProcessing && batchStatus && batchStatus.is_paused && (
                            <Button
                                variant="outlined"
                                onClick={resumeProcessing}
                                startIcon={<PlayIcon />}
                                color="success"
                            >
                                Resume
                            </Button>
                        )}
                        
                        {isProcessing && (
                            <Button
                                variant="outlined"
                                onClick={stopProcessing}
                                startIcon={<StopIcon />}
                                color="error"
                            >
                                Stop
                            </Button>
                        )}

                        {batchStatus && (
                            <IconButton onClick={refreshStatus} color="primary">
                                <RefreshIcon />
                            </IconButton>
                        )}
                        
                        {batchStatus && (
                            <Tooltip title={getStatusMessage(batchStatus.status, batchStatus)}>
                                <Chip
                                    label={getStatusMessage(batchStatus.status, batchStatus)}
                                    color={getStatusColor(batchStatus.status)}
                                    icon={getStatusIcon(batchStatus.status)}
                                    sx={{
                                        maxWidth: '300px',
                                        '& .MuiChip-label': {
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }
                                    }}
                                />
                            </Tooltip>
                        )}
                    </Box>

                    {selectedFiles.length > 0 && (
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Selection Summary:
                            </Typography>
                            <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Selected: {selectedFiles.filter(f => f.itemType === 'file').length} files, {selectedFiles.filter(f => f.itemType === 'folder').length} folders
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    PDF files found: {processableFiles.length}
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {processableFiles.slice(0, 5).map((file, index) => (
                                    <Chip
                                        key={index}
                                        label={file.name}
                                        size="small"
                                        variant="outlined"
                                        icon={<PdfIcon />}
                                    />
                                ))}
                                {processableFiles.length > 5 && (
                                    <Chip
                                        label={`+${processableFiles.length - 5} more PDF files`}
                                        size="small"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
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

            {/* Queued Status Alert */}
            {batchStatus && batchStatus.status === 'queued' && (
                <Alert
                    severity="info"
                    sx={{ mb: 3 }}
                    icon={<ScheduleIcon />}
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

            {/* Progress Section */}
            {batchStatus && (
                <Accordion 
                    expanded={expandedSections.progress} 
                    onChange={() => toggleSection('progress')}
                    sx={{ mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <SpeedIcon sx={{ mr: 1 }} />
                            Progress Tracking
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            {/* Overall Progress */}
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Overall Progress
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Box sx={{ width: '100%', mr: 1 }}>
                                            <LinearProgress 
                                                variant="determinate" 
                                                value={batchStatus.progress_percentage || 0} 
                                                sx={{ height: 10, borderRadius: 5 }}
                                            />
                                        </Box>
                                        <Box sx={{ minWidth: 35 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                {Math.round(batchStatus.progress_percentage || 0)}%
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        {batchStatus.processed_count + batchStatus.failed_count} of {batchStatus.total_files} files
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Current File */}
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Current File
                                    </Typography>
                                    {batchStatus.current_file ? (
                                        <>
                                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                                {batchStatus.current_file.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                File {batchStatus.current_file_index + 1} of {batchStatus.total_files}
                                            </Typography>
                                            {batchStatus.status === 'processing' && (
                                                <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                                                    Processing...
                                                </Typography>
                                            )}
                                        </>
                                    ) : (
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {batchStatus.status === 'completed' ? 'All files processed successfully' :
                                                 batchStatus.status === 'processing' ? 'Preparing next file...' :
                                                 batchStatus.status === 'queued' ? (
                                                     batchStatus.queue_position ?
                                                         `Waiting in queue (Position: ${batchStatus.queue_position})` :
                                                         'Initializing batch processing...'
                                                 ) :
                                                 batchStatus.status === 'error' ? 'Processing stopped due to error' :
                                                 batchStatus.status === 'cancelled' ? 'Processing was cancelled' :
                                                 'No file currently being processed'}
                                            </Typography>
                                            
                                            {/* Enhanced queued state information */}
                                            {batchStatus.status === 'queued' && (
                                                <Box sx={{ mt: 1 }}>
                                                    {batchStatus.estimated_start_time && (
                                                        <Typography variant="caption" color="info.main">
                                                            Estimated start: {new Date(batchStatus.estimated_start_time * 1000).toLocaleTimeString()}
                                                        </Typography>
                                                    )}
                                                    {batchStatus.queue_position && (
                                                        <Typography variant="caption" color="info.main" sx={{ display: 'block' }}>
                                                            {batchStatus.queue_position === 1 ? 'Next in line' : `${batchStatus.queue_position - 1} batches ahead`}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                                                        Your batch will start automatically when resources become available
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    )}
                                    {/* Enhanced debug info */}
                                    {process.env.NODE_ENV === 'development' && (
                                        <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                                            Debug: Status={batchStatus.status}, Index={batchStatus.current_file_index},
                                            HasCurrentFile={!!batchStatus.current_file}, BatchId={batchStatus.batch_id}
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>

                            {/* Time Estimates */}
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                        <TimerIcon sx={{ mr: 1 }} />
                                        Time Estimates
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Elapsed: {batchStatus.start_time ? formatDuration((Date.now() - new Date(batchStatus.start_time * 1000)) / 1000) : 'Not started'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Remaining: {formatDuration(batchStatus.estimated_time_remaining)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Avg per file: {formatDuration(batchStatus.processing_stats?.average_processing_time)}
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Queue Status */}
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Queue Status
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        <Chip
                                            label={`Completed: ${batchStatus.processed_count}`}
                                            color="success"
                                            size="small"
                                            icon={<CheckCircleIcon />}
                                        />
                                        <Chip
                                            label={`Failed: ${batchStatus.failed_count}`}
                                            color="error"
                                            size="small"
                                            icon={<ErrorIcon />}
                                        />
                                        <Chip
                                            label={`Skipped: ${batchStatus.skipped_count || 0}`}
                                            color="info"
                                            size="small"
                                            icon={<CheckCircleIcon />}
                                        />
                                        <Chip
                                            label={`Remaining: ${batchStatus.total_files - batchStatus.processed_count - batchStatus.failed_count - (batchStatus.skipped_count || 0)}`}
                                            color="default"
                                            size="small"
                                            icon={<ScheduleIcon />}
                                        />
                                    </Box>
                                </Paper>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            )}

            {/* Statistics Section */}
            {batchStatus && (
                <Accordion 
                    expanded={expandedSections.stats} 
                    onChange={() => toggleSection('stats')}
                    sx={{ mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <AssessmentIcon sx={{ mr: 1 }} />
                            Processing Statistics
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h4" color="primary">
                                        {batchStatus.total_files}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Files
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h4" color="success.main">
                                        {batchStatus.processed_count}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Processed
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h4" color="info.main">
                                        {batchStatus.processing_stats?.total_pages || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Pages
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <Paper sx={{ p: 2, textAlign: 'center' }}>
                                    <Typography variant="h4" color="secondary.main">
                                        {(batchStatus.processing_stats?.total_words || 0).toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Words
                                    </Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            )}

            {/* Processing Logs */}
            {batchStatus && batchStatus.logs && (
                <Accordion 
                    expanded={expandedSections.logs} 
                    onChange={() => toggleSection('logs')}
                    sx={{ mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <DescriptionIcon sx={{ mr: 1 }} />
                            Processing Logs ({batchStatus.logs.length})
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
                            <List dense>
                                {batchStatus.logs.slice().reverse().map((log, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon>
                                            {log.type === 'success' && <CheckCircleIcon color="success" />}
                                            {log.type === 'error' && <ErrorIcon color="error" />}
                                            {log.type === 'warning' && <ErrorIcon color="warning" />}
                                            {log.type === 'info' && <ScheduleIcon color="info" />}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={log.message}
                                            secondary={new Date(log.timestamp).toLocaleTimeString()}
                                        />
                                    </ListItem>
                                ))}
                                {batchStatus.logs.length === 0 && (
                                    <ListItem>
                                        <ListItemText
                                            primary="No logs yet"
                                            secondary="Processing logs will appear here"
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </Paper>
                    </AccordionDetails>
                </Accordion>
            )}

            {/* Results Section */}
            {batchStatus && (batchStatus.results?.length > 0 || batchStatus.errors?.length > 0) && (
                <Accordion 
                    expanded={expandedSections.results} 
                    onChange={() => toggleSection('results')}
                    sx={{ mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <AssessmentIcon sx={{ mr: 1 }} />
                            Processing Results ({(batchStatus.results?.length || 0) + (batchStatus.errors?.length || 0)})
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            {/* Successful Results */}
                            {batchStatus.results && batchStatus.results.length > 0 && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" color="success.main" gutterBottom>
                                        Successfully Processed ({batchStatus.results.length})
                                    </Typography>
                                    <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
                                        <List dense>
                                            {batchStatus.results.map((item, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon>
                                                        <CheckCircleIcon color="success" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={item.file.name}
                                                        secondary={`${item.result?.pageCount || 0} pages, ${item.result?.totalWords || 0} words, ${formatDuration(item.processing_time)}`}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Grid>
                            )}

                            {/* Failed Results */}
                            {batchStatus.errors && batchStatus.errors.length > 0 && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" color="error.main" gutterBottom>
                                        Failed Processing ({batchStatus.errors.length})
                                    </Typography>
                                    <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
                                        <List dense>
                                            {batchStatus.errors.map((item, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon>
                                                        <ErrorIcon color="error" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={item.file.name}
                                                        secondary={item.error}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Grid>
                            )}

                            {(!batchStatus.results || batchStatus.results.length === 0) && 
                             (!batchStatus.errors || batchStatus.errors.length === 0) && (
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        No processing results yet. Results will appear here as files are processed.
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            )}
        </Box>
    );
};

export default BatchOcrProcessor;