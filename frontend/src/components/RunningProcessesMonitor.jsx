import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
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
    IconButton,
    Tooltip,
    Collapse,
    Divider
} from '@mui/material';
import {
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    Stop as StopIcon,
    Schedule as ScheduleIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Refresh as RefreshIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Timer as TimerIcon,
    Description as DescriptionIcon,
    Speed as SpeedIcon
} from '@mui/icons-material';

const RunningProcessesMonitor = ({ onProcessSelect }) => {
    const [runningProcesses, setRunningProcesses] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(true);
    const pollingIntervalRef = useRef(null);
    const mountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            mountedRef.current = false;
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

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

    // Calculate elapsed time
    const getElapsedTime = (startTime) => {
        if (!startTime) return 'Unknown';
        const now = Date.now() / 1000;
        const elapsed = now - startTime;
        return formatDuration(elapsed);
    };

    // Fetch running processes
    const fetchRunningProcesses = async () => {
        if (!mountedRef.current) return;

        try {
            setLoading(true);
            const response = await axios.get('/api/ocr/batch/list');
            
            if (mountedRef.current) {
                // The API returns {jobs: {...}} so we need to extract the jobs object
                const jobs = response.data?.jobs || {};
                setRunningProcesses(jobs);
                setError(null);
            }
        } catch (error) {
            console.error('Error fetching running processes:', error);
            if (mountedRef.current) {
                setError(`Error fetching processes: ${error.message}`);
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    // Start polling when component mounts
    useEffect(() => {
        fetchRunningProcesses();
        
        // Poll every 3 seconds
        pollingIntervalRef.current = setInterval(fetchRunningProcesses, 3000);
        
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    // Get status color
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

    // Control functions
    const pauseProcess = async (batchId) => {
        try {
            await axios.post(`/api/ocr/batch/pause/${batchId}`);
            await fetchRunningProcesses(); // Refresh immediately
        } catch (error) {
            setError(`Error pausing process: ${error.message}`);
        }
    };

    const resumeProcess = async (batchId) => {
        try {
            await axios.post(`/api/ocr/batch/resume/${batchId}`);
            await fetchRunningProcesses(); // Refresh immediately
        } catch (error) {
            setError(`Error resuming process: ${error.message}`);
        }
    };

    const stopProcess = async (batchId) => {
        try {
            await axios.post(`/api/ocr/batch/stop/${batchId}`);
            await fetchRunningProcesses(); // Refresh immediately
        } catch (error) {
            setError(`Error stopping process: ${error.message}`);
        }
    };

    const processCount = Object.keys(runningProcesses).length;
    const activeProcesses = Object.values(runningProcesses).filter(p =>
        ['processing', 'queued', 'paused'].includes(p.status)
    ).length;
    
    // Debug logging
    console.log('[RunningProcessesMonitor] Current processes:', runningProcesses);
    console.log('[RunningProcessesMonitor] Process count:', processCount, 'Active:', activeProcesses);

    return (
        <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6">
                            Running Processes Monitor
                        </Typography>
                        <Chip 
                            label={`${activeProcesses} active`} 
                            size="small" 
                            color={activeProcesses > 0 ? 'primary' : 'default'}
                        />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton 
                            onClick={fetchRunningProcesses} 
                            disabled={loading}
                            size="small"
                        >
                            <RefreshIcon />
                        </IconButton>
                        <IconButton 
                            onClick={() => setExpanded(!expanded)}
                            size="small"
                        >
                            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </Box>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Collapse in={expanded}>
                    {processCount === 0 ? (
                        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                            <Typography variant="body2" color="text.secondary">
                                No batch processing jobs found
                            </Typography>
                        </Paper>
                    ) : (
                        <List sx={{ p: 0 }}>
                            {Object.entries(runningProcesses).map(([batchId, process], index) => (
                                <React.Fragment key={batchId}>
                                    {index > 0 && <Divider />}
                                    <ListItem 
                                        sx={{ 
                                            px: 0, 
                                            py: 2,
                                            cursor: onProcessSelect ? 'pointer' : 'default'
                                        }}
                                        onClick={() => onProcessSelect && onProcessSelect(batchId, process)}
                                    >
                                        <ListItemIcon>
                                            {getStatusIcon(process.status)}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                    <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                                                        {batchId}
                                                    </Typography>
                                                    <Chip
                                                        label={process.status}
                                                        size="small"
                                                        color={getStatusColor(process.status)}
                                                        variant="outlined"
                                                    />
                                                    {process.is_paused && (
                                                        <Chip
                                                            label="PAUSED"
                                                            size="small"
                                                            color="warning"
                                                            variant="filled"
                                                        />
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <Box>
                                                    <Grid container spacing={2} sx={{ mb: 1 }}>
                                                        <Grid item xs={12} sm={6}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <DescriptionIcon fontSize="small" color="action" />
                                                                <Typography variant="body2">
                                                                    {process.processed_count}/{process.total_files} files
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                <TimerIcon fontSize="small" color="action" />
                                                                <Typography variant="body2">
                                                                    {getElapsedTime(process.start_time)}
                                                                </Typography>
                                                            </Box>
                                                        </Grid>
                                                    </Grid>
                                                    
                                                    {process.current_file && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                            Current: {process.current_file.name || 'Unknown file'}
                                                        </Typography>
                                                    )}
                                                    
                                                    {process.total_files > 0 && (
                                                        <Box sx={{ mb: 1 }}>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={(process.processed_count / process.total_files) * 100}
                                                                sx={{ height: 6, borderRadius: 3 }}
                                                            />
                                                        </Box>
                                                    )}
                                                    
                                                    {process.failed_count > 0 && (
                                                        <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                                                            Failed: {process.failed_count} files
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                                            {process.status === 'processing' && !process.is_paused && (
                                                <Tooltip title="Pause">
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            pauseProcess(batchId);
                                                        }}
                                                        color="warning"
                                                    >
                                                        <PauseIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            
                                            {(process.status === 'paused' || process.is_paused) && (
                                                <Tooltip title="Resume">
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            resumeProcess(batchId);
                                                        }}
                                                        color="success"
                                                    >
                                                        <PlayIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            
                                            {['processing', 'queued', 'paused'].includes(process.status) && (
                                                <Tooltip title="Stop">
                                                    <IconButton 
                                                        size="small" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            stopProcess(batchId);
                                                        }}
                                                        color="error"
                                                    >
                                                        <StopIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </ListItem>
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </Collapse>
            </CardContent>
        </Card>
    );
};

export default RunningProcessesMonitor;