/**
 * Shared component for displaying batch processing status
 * Used by both BatchOcrProcessor and PaginatedBatchProcessor
 */
import React from 'react';
import {
    Box,
    Typography,
    LinearProgress,
    Chip,
    Grid,
    Paper,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Speed as SpeedIcon,
    Schedule as ScheduleIcon,
    Assessment as AssessmentIcon,
    Description as DescriptionIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon
} from '@mui/icons-material';

const BatchStatusDisplay = ({
    batchStatus = {},
    expandedSections = {},
    toggleSection = () => {},
    formatDuration = (seconds) => {
        if (!seconds || seconds < 0) return 'Calculating...';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    },
    title = "Batch Processing Status"
}) => {
    // Handle null or undefined batchStatus
    if (!batchStatus || typeof batchStatus !== 'object') {
        return (
            <Box>
                <Typography variant="h6" color="text.secondary">
                    No batch status available
                </Typography>
            </Box>
        );
    }

    // Safe access to batchStatus properties with defaults
    const safeStatus = batchStatus.status || 'unknown';
    const safeProcessedCount = batchStatus.processed_count || 0;
    const safeFailedCount = batchStatus.failed_count || 0;
    const safeSkippedCount = batchStatus.skipped_count || 0;
    const safeTotalFiles = batchStatus.total_files || 0;
    const safeProgressPercentage = batchStatus.progress_percentage || 0;
    const safeCurrentFileIndex = batchStatus.current_file_index || 0;
    const safeCurrentFile = batchStatus.current_file || null;
    // Handle case where current_file might be a string instead of an object
    const currentFileName = typeof safeCurrentFile === 'string' ? safeCurrentFile :
                           (safeCurrentFile && typeof safeCurrentFile === 'object' ? safeCurrentFile.name : null);
    const safeLogs = Array.isArray(batchStatus.logs) ? batchStatus.logs : [];
    const safeResults = Array.isArray(batchStatus.results) ? batchStatus.results : [];
    const safeErrors = Array.isArray(batchStatus.errors) ? batchStatus.errors : [];

    // Debug logging (moved after function definitions)
    const logDebugInfo = () => {
        if (process.env.NODE_ENV === 'development') {
            console.log('[BatchStatusDisplay] Received batchStatus:', {
                status: safeStatus,
                processed_count: safeProcessedCount,
                total_files: safeTotalFiles,
                logs_count: safeLogs.length,
                logs_sample: safeLogs.slice(0, 2),
                logs_raw: batchStatus.logs,
                logs_raw_type: typeof batchStatus.logs,
                logs_is_array: Array.isArray(batchStatus.logs),
                estimated_time_remaining: batchStatus.estimated_time_remaining,
                estimated_time_remaining_type: typeof batchStatus.estimated_time_remaining,
                processing_stats: batchStatus.processing_stats,
                processing_stats_type: typeof batchStatus.processing_stats,
                start_time: batchStatus.start_time,
                start_time_type: typeof batchStatus.start_time,
                avg_processing_time: batchStatus.processing_stats?.average_processing_time,
                avg_processing_time_type: typeof batchStatus.processing_stats?.average_processing_time,
                full_batch_status: batchStatus
            });
            
            // Specific logs debugging
            console.log('[BatchStatusDisplay] Logs debug:', {
                'batchStatus.logs': batchStatus.logs,
                'safeLogs': safeLogs,
                'safeLogs.length': safeLogs.length,
                'Array.isArray(batchStatus.logs)': Array.isArray(batchStatus.logs),
                'typeof batchStatus.logs': typeof batchStatus.logs
            });
        }
    };

    // Safe time calculations
    const getElapsedTime = () => {
        if (!batchStatus.start_time) return 'Not started';
        try {
            const elapsed = (Date.now() / 1000) - batchStatus.start_time;
            return formatDuration(elapsed) || 'Not started';
        } catch (e) {
            return 'Not started';
        }
    };

    const getRemainingTime = () => {
        if (process.env.NODE_ENV === 'development') {
            console.log('[getRemainingTime] Debug:', {
                safeStatus,
                estimatedTime: batchStatus.estimated_time_remaining,
                estimatedTimeType: typeof batchStatus.estimated_time_remaining,
                safeProcessedCount,
                startTime: batchStatus.start_time
            });
        }
        
        if (safeStatus === 'completed') return '0 seconds';
        if (safeStatus === 'error' || safeStatus === 'cancelled') return 'N/A';
        
        // Check for estimated_time_remaining from backend
        const estimatedTime = batchStatus.estimated_time_remaining;
        if (typeof estimatedTime === 'number' && estimatedTime > 0) {
            const result = formatDuration(estimatedTime);
            if (process.env.NODE_ENV === 'development') {
                console.log('[getRemainingTime] Using backend estimate:', estimatedTime, 'formatted:', result);
            }
            return result;
        }
        
        if (estimatedTime === 0) return '0 seconds';
        
        // Fallback calculation if backend doesn't provide estimate
        if (safeProcessedCount > 0 && batchStatus.start_time) {
            try {
                const elapsed = (Date.now() / 1000) - batchStatus.start_time;
                const avgTimePerFile = elapsed / safeProcessedCount;
                const remaining = safeTotalFiles - safeProcessedCount - safeFailedCount - safeSkippedCount;
                if (remaining > 0) {
                    const estimatedRemaining = remaining * avgTimePerFile;
                    const result = formatDuration(estimatedRemaining);
                    if (process.env.NODE_ENV === 'development') {
                        console.log('[getRemainingTime] Using fallback calculation:', estimatedRemaining, 'formatted:', result);
                    }
                    return result;
                }
                return '0 seconds';
            } catch (e) {
                console.warn('Error calculating remaining time:', e);
            }
        }
        
        if (safeStatus === 'queued') return 'Waiting in queue...';
        return 'Calculating...';
    };

    const getAverageTime = () => {
        if (process.env.NODE_ENV === 'development') {
            console.log('[getAverageTime] Debug:', {
                avgTime: batchStatus.processing_stats?.average_processing_time,
                avgTimeType: typeof batchStatus.processing_stats?.average_processing_time,
                processing_stats: batchStatus.processing_stats,
                safeProcessedCount,
                startTime: batchStatus.start_time
            });
        }
        
        // First try to get from backend processing_stats
        const avgTime = batchStatus.processing_stats?.average_processing_time;
        if (typeof avgTime === 'number' && avgTime > 0) {
            const result = formatDuration(avgTime);
            if (process.env.NODE_ENV === 'development') {
                console.log('[getAverageTime] Using backend avg time:', avgTime, 'formatted:', result);
            }
            return result;
        }
        
        // Calculate from actual data if we have processed files
        if (safeProcessedCount > 0 && batchStatus.start_time) {
            try {
                const totalTime = (Date.now() / 1000) - batchStatus.start_time;
                const avgTimePerFile = totalTime / safeProcessedCount;
                const result = formatDuration(avgTimePerFile);
                if (process.env.NODE_ENV === 'development') {
                    console.log('[getAverageTime] Using calculated avg time:', avgTimePerFile, 'formatted:', result);
                }
                return result;
            } catch (e) {
                console.warn('Error calculating average time:', e);
            }
        }
        
        // Try to get from total_processing_time if available
        const totalProcessingTime = batchStatus.processing_stats?.total_processing_time;
        if (typeof totalProcessingTime === 'number' && totalProcessingTime > 0 && safeProcessedCount > 0) {
            const avgTimePerFile = totalProcessingTime / safeProcessedCount;
            const result = formatDuration(avgTimePerFile);
            if (process.env.NODE_ENV === 'development') {
                console.log('[getAverageTime] Using total processing time avg:', avgTimePerFile, 'formatted:', result);
            }
            return result;
        }
        
        if (safeStatus === 'queued') return 'Estimating...';
        if (safeProcessedCount === 0) return 'Estimating...';
        return 'Calculating...';
    };

    // Call debug logging after all functions are defined
    logDebugInfo();
    
    // Additional debug for time calculations
    if (process.env.NODE_ENV === 'development') {
        console.log('[BatchStatusDisplay] Time calculation debug:', {
            getRemainingTime_result: getRemainingTime(),
            getAverageTime_result: getAverageTime(),
            getElapsedTime_result: getElapsedTime()
        });
    }

    return (
        <Box>
            {/* Progress Section */}
            <Accordion 
                expanded={expandedSections.progress} 
                onChange={() => toggleSection('progress')}
                sx={{ mb: 2 }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <SpeedIcon sx={{ mr: 1 }} />
                        {String(title)} - Progress Tracking
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Overall Progress
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, Math.max(0, safeProgressPercentage))}
                                    sx={{ height: 10, borderRadius: 5 }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {Math.round(safeProgressPercentage)}%
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {safeProcessedCount + safeFailedCount} of {safeTotalFiles} files
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Current File
                                </Typography>
                                {currentFileName ? (
                                    <>
                                        <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                            {String(currentFileName)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            File {safeCurrentFileIndex + 1} of {safeTotalFiles}
                                        </Typography>
                                        {safeStatus === 'processing' && (
                                            <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                                                Processing...
                                            </Typography>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="body2" color="text.secondary">
                                            {safeStatus === 'completed' ? 'All files processed successfully' :
                                             safeStatus === 'processing' ? 'Preparing next file...' :
                                             safeStatus === 'queued' ? 'Initializing batch processing...' :
                                             safeStatus === 'error' ? 'Processing stopped due to error' :
                                             safeStatus === 'cancelled' ? 'Processing was cancelled' :
                                             'No file currently being processed'}
                                        </Typography>

                                        {/* Enhanced queued state information */}
                                        {safeStatus === 'queued' && (
                                            <Box sx={{ mt: 1 }}>
                                                {batchStatus.estimated_start_time && (
                                                    <Typography variant="caption" color="info.main">
                                                        Estimated start: {String(new Date(batchStatus.estimated_start_time * 1000).toLocaleTimeString())}
                                                    </Typography>
                                                )}
                                                {batchStatus.queue_position && (
                                                    <Typography variant="caption" color="info.main" sx={{ display: 'block' }}>
                                                        {batchStatus.queue_position === 1 ? 'Next in line' : `${batchStatus.queue_position - 1} batches ahead`}
                                                    </Typography>
                                                )}
                                            </Box>
                                        )}
                                    </>
                                )}

                                {/* Debug information */}
                                {process.env.NODE_ENV === 'development' && (
                                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                                        Debug: Status={String(safeStatus)}, Index={safeCurrentFileIndex},
                                        HasCurrentFile={String(currentFileName || 'none')}, BatchId={String(batchStatus.batch_id || 'null')}
                                    </Typography>
                                )}
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <ScheduleIcon sx={{ mr: 1, fontSize: 16 }} />
                                    Time Estimates
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Elapsed: {String(getElapsedTime())}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Remaining: {String(getRemainingTime())}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Avg per file: {String(getAverageTime())}
                                </Typography>
                                {/* Debug info for time estimates */}
                                {process.env.NODE_ENV === 'development' && (
                                    <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                                        Debug Time: start_time={String(batchStatus.start_time || 'null')}, estimated_remaining={String(batchStatus.estimated_time_remaining || 'null')}, avg_time={String(batchStatus.processing_stats?.average_processing_time || 'null')}
                                    </Typography>
                                )}
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                    label={`Completed: ${safeProcessedCount}`}
                                    color="success"
                                    size="small"
                                />
                                <Chip
                                    label={`Failed: ${safeFailedCount}`}
                                    color="error"
                                    size="small"
                                />
                                <Chip
                                    label={`Skipped: ${safeSkippedCount}`}
                                    color="info"
                                    size="small"
                                />
                                <Chip
                                    label={`Remaining: ${safeTotalFiles - safeProcessedCount - safeFailedCount - safeSkippedCount}`}
                                    color="default"
                                    size="small"
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </AccordionDetails>
            </Accordion>

            {/* Statistics Section */}
            <Accordion 
                expanded={expandedSections.statistics} 
                onChange={() => toggleSection('statistics')}
                sx={{ mb: 2 }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <AssessmentIcon sx={{ mr: 1 }} />
                        Processing Statistics
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={3}>
                        <Grid item xs={6} md={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h4" color="primary">
                                    {safeTotalFiles}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Files
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h4" color="success.main">
                                    {safeProcessedCount}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Processed
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Paper sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h4" color="info.main">
                                    {batchStatus.processing_stats?.total_pages || 0}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Total Pages
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={6} md={3}>
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

            {/* Logs Section */}
            <Accordion 
                expanded={expandedSections.logs} 
                onChange={() => toggleSection('logs')}
                sx={{ mb: 2 }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                        <DescriptionIcon sx={{ mr: 1 }} />
                        Processing Logs ({safeLogs.length})
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Paper sx={{ maxHeight: 300, overflow: 'auto' }}>
                        <List dense>
                            {safeLogs.length > 0 ? (
                                safeLogs.slice().reverse().map((log, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon>
                                            {log.type === 'success' && <CheckCircleIcon color="success" />}
                                            {log.type === 'error' && <ErrorIcon color="error" />}
                                            {log.type === 'warning' && <WarningIcon color="warning" />}
                                            {log.type === 'info' && <InfoIcon color="info" />}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={String(log.message || 'No message')}
                                            secondary={String(log.timestamp || 'No timestamp')}
                                        />
                                    </ListItem>
                                ))
                            ) : (
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
            {(safeResults.length > 0 || safeErrors.length > 0) && (
                <Accordion
                    expanded={expandedSections.results}
                    onChange={() => toggleSection('results')}
                    sx={{ mb: 2 }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                            <AssessmentIcon sx={{ mr: 1 }} />
                            Processing Results ({safeResults.length + safeErrors.length})
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            {/* Successful Results */}
                            {safeResults.length > 0 && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" color="success.main" gutterBottom>
                                        Successfully Processed ({safeResults.length})
                                    </Typography>
                                    <Paper sx={{ maxHeight: 200, overflow: 'auto' }}>
                                        <List dense>
                                            {safeResults.map((item, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon>
                                                        <CheckCircleIcon color="success" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={String(item.file?.name || 'Unknown file')}
                                                        secondary={`${item.result?.pageCount || 0} pages, ${item.result?.totalWords || 0} words, ${formatDuration(item.processing_time) || '0s'}`}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Grid>
                            )}

                            {/* Failed Results */}
                            {safeErrors.length > 0 && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" color="error.main" gutterBottom>
                                        Failed Processing ({safeErrors.length})
                                    </Typography>
                                    <Paper sx={{ maxHeight: 200, overflow: 'auto' }}>
                                        <List dense>
                                            {safeErrors.map((item, index) => (
                                                <ListItem key={index}>
                                                    <ListItemIcon>
                                                        <ErrorIcon color="error" />
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={String(item.file?.name || 'Unknown file')}
                                                        secondary={String(item.error || 'Unknown error')}
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                </Grid>
                            )}

                            {safeResults.length === 0 && safeErrors.length === 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary" textAlign="center">
                                        No results yet. Results will appear here as files are processed.
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

export default BatchStatusDisplay;