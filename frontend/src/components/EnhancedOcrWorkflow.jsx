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
    Divider,
    Alert,
    CircularProgress,
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
    Visibility as VisibilityIcon,
    Assessment as AssessmentIcon,
    Speed as SpeedIcon,
    Timer as TimerIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';

import SharePointExplorerBlock from './blocks/SharePointExplorer/SharePointExplorerBlock';

const EnhancedOcrWorkflow = () => {
    // Main workflow state
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);
    const [processedFiles, setProcessedFiles] = useState([]);
    const [failedFiles, setFailedFiles] = useState([]);
    const [processingQueue, setProcessingQueue] = useState([]);
    
    // Progress and statistics
    const [overallProgress, setOverallProgress] = useState(0);
    const [currentFileProgress, setCurrentFileProgress] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
    const [processingStats, setProcessingStats] = useState({
        totalFiles: 0,
        processedCount: 0,
        failedCount: 0,
        totalPages: 0,
        totalWords: 0,
        totalCharacters: 0,
        averageProcessingTime: 0,
        totalProcessingTime: 0
    });
    
    // Current processing state
    const [currentFile, setCurrentFile] = useState(null);
    const [currentStep, setCurrentStep] = useState('idle');
    const [processingLogs, setProcessingLogs] = useState([]);
    const [expandedSections, setExpandedSections] = useState({
        progress: true,
        stats: true,
        logs: false,
        results: false
    });
    
    // Refs for managing processing
    const processingRef = useRef(false);
    const pauseRef = useRef(false);
    const abortControllerRef = useRef(null);

    // Handle file selection from SharePoint
    const handleSelectionChange = useCallback((selectedItems) => {
        console.log('SharePoint selection changed:', selectedItems);
        const pdfFiles = selectedItems.filter(item => 
            item.name.toLowerCase().endsWith('.pdf') && item.itemType === 'file'
        );
        setSelectedFiles(pdfFiles);
        setProcessingQueue(pdfFiles);
        setProcessingStats(prev => ({ ...prev, totalFiles: pdfFiles.length }));
    }, []);

    // Add log entry
    const addLog = useCallback((message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setProcessingLogs(prev => [...prev, { timestamp, message, type }]);
    }, []);

    // Calculate estimated time remaining
    const calculateEstimatedTime = useCallback((processedCount, totalFiles, elapsedTime) => {
        if (processedCount === 0) return null;
        const averageTimePerFile = elapsedTime / processedCount;
        const remainingFiles = totalFiles - processedCount;
        return remainingFiles * averageTimePerFile;
    }, []);

    // Format time duration
    const formatDuration = (milliseconds) => {
        if (!milliseconds) return 'Calculating...';
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    };

    // Process single file with enhanced tracking
    const processSingleFile = useCallback(async (file, index) => {
        if (pauseRef.current) {
            addLog(`Processing paused at file: ${file.name}`, 'warning');
            return null;
        }

        setCurrentFile(file);
        setCurrentFileIndex(index);
        setCurrentStep('converting');
        setCurrentFileProgress(0);
        
        addLog(`Starting OCR processing for: ${file.name}`, 'info');

        try {
            // Create abort controller for this request
            abortControllerRef.current = new AbortController();
            
            // Convert file to base64
            const fileToBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => {
                        const base64 = reader.result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = error => reject(error);
                });
            };

            setCurrentStep('uploading');
            setCurrentFileProgress(25);
            
            const base64Data = await fileToBase64(file);
            
            setCurrentStep('processing');
            setCurrentFileProgress(50);
            
            // Prepare request data
            const requestData = {
                file_data: base64Data,
                filename: file.name,
                settings: {
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
                }
            };

            const fileId = file.id || file.file_id || null;
            const url = fileId ? `/api/ocr/pdf_ocr?file_id=${encodeURIComponent(fileId)}` : '/api/ocr/pdf_ocr';
            
            setCurrentFileProgress(75);
            
            const response = await axios.post(url, requestData, {
                signal: abortControllerRef.current.signal,
                timeout: 300000 // 5 minutes timeout
            });
            
            setCurrentFileProgress(100);
            setCurrentStep('completed');
            
            const result = response.data;
            
            // Update statistics
            setProcessingStats(prev => ({
                ...prev,
                processedCount: prev.processedCount + 1,
                totalPages: prev.totalPages + (result.pageCount || 0),
                totalWords: prev.totalWords + (result.totalWords || 0),
                totalCharacters: prev.totalCharacters + (result.totalCharacters || 0),
                totalProcessingTime: prev.totalProcessingTime + (result.processingTime || 0)
            }));
            
            addLog(`Successfully processed: ${file.name} (${result.pageCount} pages, ${result.totalWords} words)`, 'success');
            
            return {
                file,
                result,
                status: 'success',
                processingTime: result.processingTime || 0
            };
            
        } catch (error) {
            if (error.name === 'AbortError') {
                addLog(`Processing cancelled for: ${file.name}`, 'warning');
                return null;
            }
            
            console.error('Error processing file:', error);
            addLog(`Failed to process: ${file.name} - ${error.message}`, 'error');
            
            setProcessingStats(prev => ({
                ...prev,
                failedCount: prev.failedCount + 1
            }));
            
            return {
                file,
                error: error.message,
                status: 'error'
            };
        }
    }, [addLog]);

    // Main processing function with lazy loading
    const startProcessing = useCallback(async () => {
        if (processingQueue.length === 0) {
            addLog('No files selected for processing', 'warning');
            return;
        }

        setIsProcessing(true);
        setIsPaused(false);
        setStartTime(Date.now());
        setProcessedFiles([]);
        setFailedFiles([]);
        setCurrentFileIndex(0);
        processingRef.current = true;
        pauseRef.current = false;
        
        addLog(`Starting batch OCR processing for ${processingQueue.length} files`, 'info');

        try {
            for (let i = 0; i < processingQueue.length; i++) {
                // Check if processing should be paused or stopped
                if (!processingRef.current) {
                    addLog('Processing stopped by user', 'warning');
                    break;
                }
                
                if (pauseRef.current) {
                    addLog('Processing paused by user', 'warning');
                    setIsPaused(true);
                    // Wait for resume
                    while (pauseRef.current && processingRef.current) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    if (!processingRef.current) break;
                    addLog('Processing resumed', 'info');
                    setIsPaused(false);
                }

                const file = processingQueue[i];
                const result = await processSingleFile(file, i);
                
                if (result) {
                    if (result.status === 'success') {
                        setProcessedFiles(prev => [...prev, result]);
                    } else {
                        setFailedFiles(prev => [...prev, result]);
                    }
                }

                // Update overall progress
                const progress = ((i + 1) / processingQueue.length) * 100;
                setOverallProgress(progress);
                
                // Calculate estimated time remaining
                if (startTime) {
                    const elapsedTime = Date.now() - startTime;
                    const estimatedTime = calculateEstimatedTime(i + 1, processingQueue.length, elapsedTime);
                    setEstimatedTimeRemaining(estimatedTime);
                }

                // Small delay between files to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
        } catch (error) {
            console.error('Batch processing error:', error);
            addLog(`Batch processing error: ${error.message}`, 'error');
        } finally {
            setIsProcessing(false);
            setIsPaused(false);
            setCurrentStep('idle');
            setCurrentFile(null);
            setCurrentFileProgress(0);
            processingRef.current = false;
            
            const finalStats = {
                totalProcessed: processedFiles.length,
                totalFailed: failedFiles.length,
                totalTime: startTime ? Date.now() - startTime : 0
            };
            
            addLog(`Batch processing completed. Processed: ${finalStats.totalProcessed}, Failed: ${finalStats.totalFailed}, Total time: ${formatDuration(finalStats.totalTime)}`, 'info');
        }
    }, [processingQueue, addLog, processSingleFile, calculateEstimatedTime, startTime, processedFiles.length, failedFiles.length]);

    // Control functions
    const pauseProcessing = () => {
        pauseRef.current = true;
        addLog('Pausing processing...', 'warning');
    };

    const resumeProcessing = () => {
        pauseRef.current = false;
        addLog('Resuming processing...', 'info');
    };

    const stopProcessing = () => {
        processingRef.current = false;
        pauseRef.current = false;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        addLog('Stopping processing...', 'warning');
    };

    // Toggle section expansion
    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Get current step description
    const getCurrentStepDescription = () => {
        switch (currentStep) {
            case 'converting': return 'Converting PDF to images...';
            case 'uploading': return 'Uploading file data...';
            case 'processing': return 'Extracting text with OCR...';
            case 'completed': return 'Processing completed';
            default: return 'Ready to process';
        }
    };

    return (
        <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                Enhanced OCR Processing Workflow
            </Typography>
            
            {/* File Selection Section */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <FolderOpenIcon sx={{ mr: 1 }} />
                        SharePoint File Selection
                    </Typography>
                    
                    <SharePointExplorerBlock
                        config={{}}
                        onSelectionChange={handleSelectionChange}
                        multiSelect={true}
                    />
                    
                    {selectedFiles.length > 0 && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Selected PDF Files ({selectedFiles.length}):
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {selectedFiles.map((file, index) => (
                                    <Chip
                                        key={index}
                                        label={file.name}
                                        size="small"
                                        variant="outlined"
                                        icon={<PdfIcon />}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Processing Controls */}
            <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Processing Controls
                    </Typography>
                    
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            onClick={startProcessing}
                            disabled={isProcessing || selectedFiles.length === 0}
                            startIcon={<PlayIcon />}
                            color="primary"
                        >
                            Start Processing ({selectedFiles.length} files)
                        </Button>
                        
                        {isProcessing && !isPaused && (
                            <Button
                                variant="outlined"
                                onClick={pauseProcessing}
                                startIcon={<PauseIcon />}
                                color="warning"
                            >
                                Pause
                            </Button>
                        )}
                        
                        {isProcessing && isPaused && (
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
                        
                        {isPaused && (
                            <Chip
                                label="PAUSED"
                                color="warning"
                                icon={<PauseIcon />}
                            />
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Progress Section */}
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
                                            value={overallProgress} 
                                            sx={{ height: 10, borderRadius: 5 }}
                                        />
                                    </Box>
                                    <Box sx={{ minWidth: 35 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            {Math.round(overallProgress)}%
                                        </Typography>
                                    </Box>
                                </Box>
                                <Typography variant="body2" color="text.secondary">
                                    {processingStats.processedCount + processingStats.failedCount} of {processingStats.totalFiles} files
                                </Typography>
                            </Paper>
                        </Grid>

                        {/* Current File Progress */}
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Current File Progress
                                </Typography>
                                {currentFile ? (
                                    <>
                                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                            {currentFile.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={currentFileProgress} 
                                                    sx={{ height: 8, borderRadius: 4 }}
                                                    color="secondary"
                                                />
                                            </Box>
                                            <Box sx={{ minWidth: 35 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    {Math.round(currentFileProgress)}%
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {getCurrentStepDescription()}
                                        </Typography>
                                    </>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No file currently being processed
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
                                    Elapsed: {startTime ? formatDuration(Date.now() - startTime) : 'Not started'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Remaining: {estimatedTimeRemaining ? formatDuration(estimatedTimeRemaining) : 'Calculating...'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Avg per file: {processingStats.processedCount > 0 ? 
                                        formatDuration(processingStats.totalProcessingTime / processingStats.processedCount) : 
                                        'Calculating...'}
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
                                        label={`Completed: ${processingStats.processedCount}`}
                                        color="success"
                                        size="small"
                                        icon={<CheckCircleIcon />}
                                    />
                                    <Chip 
                                        label={`Failed: ${processingStats.failedCount}`}
                                        color="error"
                                        size="small"
                                        icon={<ErrorIcon />}
                                    />
                                    <Chip 
                                        label={`Remaining: ${processingStats.totalFiles - processingStats.processedCount - processingStats.failedCount}`}
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

            {/* Statistics Section */}
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
                                    {processingStats.totalFiles}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Files
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h4" color="success.main">
                                    {processingStats.processedCount}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Processed
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h4" color="info.main">
                                    {processingStats.totalPages}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Pages
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h4" color="secondary.main">
                                    {processingStats.totalWords.toLocaleString()}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Words
                                </Typography>
                            </Paper>
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Processing Logs */}
            <Accordion 
                expanded={expandedSections.logs} 
                onChange={() => toggleSection('logs')}
                sx={{ mb: 2 }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <DescriptionIcon sx={{ mr: 1 }} />
                        Processing Logs ({processingLogs.length})
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
                        <List dense>
                            {processingLogs.slice(-50).reverse().map((log, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon>
                                        {log.type === 'success' && <CheckCircleIcon color="success" />}
                                        {log.type === 'error' && <ErrorIcon color="error" />}
                                        {log.type === 'warning' && <ErrorIcon color="warning" />}
                                        {log.type === 'info' && <ScheduleIcon color="info" />}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={log.message}
                                        secondary={log.timestamp}
                                    />
                                </ListItem>
                            ))}
                            {processingLogs.length === 0 && (
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

            {/* Results Section */}
            <Accordion 
                expanded={expandedSections.results} 
                onChange={() => toggleSection('results')}
                sx={{ mb: 2 }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <VisibilityIcon sx={{ mr: 1 }} />
                        Processing Results ({processedFiles.length + failedFiles.length})
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={2}>
                        {/* Successful Results */}
                        {processedFiles.length > 0 && (
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" color="success.main" gutterBottom>
                                    Successfully Processed ({processedFiles.length})
                                </Typography>
                                <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    <List dense>
                                        {processedFiles.map((item, index) => (
                                            <ListItem key={index}>
                                                <ListItemIcon>
                                                    <CheckCircleIcon color="success" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={item.file.name}
                                                    secondary={`${item.result.pageCount} pages, ${item.result.totalWords} words, ${formatDuration(item.processingTime)}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Paper>
                            </Grid>
                        )}

                        {/* Failed Results */}
                        {failedFiles.length > 0 && (
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle1" color="error.main" gutterBottom>
                                    Failed Processing ({failedFiles.length})
                                </Typography>
                                <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    <List dense>
                                        {failedFiles.map((item, index) => (
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

                        {processedFiles.length === 0 && failedFiles.length === 0 && (
                            <Grid item xs={12}>
                                <Typography variant="body2" color="text.secondary" textAlign="center">
                                    No processing results yet. Start processing to see results here.
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};

export default EnhancedOcrWorkflow;