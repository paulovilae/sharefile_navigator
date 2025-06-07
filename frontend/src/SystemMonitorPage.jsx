import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Grid, 
  Box, 
  LinearProgress, 
  CircularProgress, 
  Typography, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Alert, 
  Chip
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  Dashboard as DashboardIcon, 
  Warning as WarningIcon, 
  CheckCircle as CheckCircleIcon 
} from '@mui/icons-material';
import axios from 'axios';

const SystemMonitorPage = () => {
  const [resources, setResources] = useState(null);
  const [history, setHistory] = useState({ timestamps: [], cpu: [], memory: [], gpu: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef(null);
  
  // For chart data format
  const [chartData, setChartData] = useState([]);

  // Fetch current resources
  const fetchResources = async () => {
    try {
      const response = await axios.get('/api/system-monitor/resources');
      setResources(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to fetch system resources');
    } finally {
      setLoading(false);
    }
  };

  // Fetch resource history
  const fetchHistory = async () => {
    try {
      const response = await axios.get('/api/system-monitor/history');
      setHistory(response.data);
      
      // Format data for chart
      if (response.data.timestamps && response.data.timestamps.length > 0) {
        const formattedData = response.data.timestamps.map((ts, index) => {
          const date = new Date(ts);
          const timeLabel = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
          
          return {
            time: timeLabel,
            CPU: response.data.cpu[index] || 0,
            Memory: response.data.memory[index] || 0,
            GPU: response.data.gpu && response.data.gpu[index] !== undefined ? response.data.gpu[index] : 0
          };
        });
        
        setChartData(formattedData);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Initialize data fetching
  useEffect(() => {
    fetchResources();
    fetchHistory();

    // Set up polling if autoRefresh is enabled
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchResources();
        fetchHistory();
      }, 2000); // Update every 2 seconds
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [autoRefresh]);

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      fetchResources();
      fetchHistory();
      timerRef.current = setInterval(() => {
        fetchResources();
        fetchHistory();
      }, 2000);
    }
    setAutoRefresh(!autoRefresh);
  };

  // Manual refresh
  const handleRefresh = () => {
    setLoading(true);
    fetchResources();
    fetchHistory();
  };

  // Render batch processing information
  const renderBatchInfo = () => {
    if (!resources || !resources.batch_processing) {
      return <Alert severity="info">No batch processing information available</Alert>;
    }

    const { batch_processing } = resources;
    const activeBatches = batch_processing.active_batches || 0;
    
    if (activeBatches === 0) {
      return <Alert severity="info">No active batch processing jobs</Alert>;
    }

    const batchJobs = batch_processing.jobs || {};
    const jobsData = Object.entries(batchJobs).map(([batchId, job]) => ({
      id: batchId,
      batchId,
      status: job.status,
      progress: job.progress_percentage || 0,
      processed: `${job.processed_count || 0}/${job.total_files || 0}`,
      currentFile: job.current_file ? (job.current_file.name || 'Unknown') : 'None',
    }));

    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Batch ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Processed</TableCell>
              <TableCell>Current File</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobsData.map((job) => (
              <TableRow key={job.id}>
                <TableCell>{job.batchId}</TableCell>
                <TableCell>
                  {job.status === 'completed' ? (
                    <Chip 
                      icon={<CheckCircleIcon />} 
                      label={job.status} 
                      color="success" 
                      size="small" 
                    />
                  ) : job.status === 'error' || job.status === 'cancelled' ? (
                    <Chip 
                      icon={<WarningIcon />} 
                      label={job.status} 
                      color="error" 
                      size="small" 
                    />
                  ) : (
                    <Chip 
                      icon={<CircularProgress size={12} />} 
                      label={job.status} 
                      color="primary" 
                      size="small" 
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress variant="determinate" value={Math.round(job.progress)} />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">{`${Math.round(job.progress)}%`}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{job.processed}</TableCell>
                <TableCell>{job.currentFile}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading && !resources) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading system resources...</Typography>
      </Box>
    );
  }

  if (error && !resources) {
    return (
      <Alert 
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          System Resource Monitor
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh} 
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button 
            variant={autoRefresh ? "outlined" : "contained"}
            onClick={toggleAutoRefresh}
          >
            {autoRefresh ? "Stop Auto-refresh" : "Start Auto-refresh"}
          </Button>
        </Box>
      </Box>

      {/* Resource Usage Chart */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Resource Usage History" />
        <CardContent>
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              Chart data will appear here. Using native browser charts instead of external libraries.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Current Resource Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="CPU Usage" />
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={Math.round(resources?.cpu?.percent || 0)} 
                  size={100}
                  thickness={5}
                  sx={{ 
                    color: resources?.cpu?.percent > 80 ? '#ff4d4f' : 
                           resources?.cpu?.percent > 60 ? '#faad14' : '#52c41a' 
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h5" component="div">
                    {`${Math.round(resources?.cpu?.percent || 0)}%`}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body1" sx={{ mt: 2 }}>
                CPU Cores: {resources?.cpu?.count || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Memory Usage" />
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={Math.round(resources?.memory?.percent || 0)} 
                  size={100}
                  thickness={5}
                  sx={{ 
                    color: resources?.memory?.percent > 80 ? '#ff4d4f' : 
                           resources?.memory?.percent > 60 ? '#faad14' : '#52c41a' 
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h5" component="div">
                    {`${Math.round(resources?.memory?.percent || 0)}%`}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body1" sx={{ mt: 2 }}>
                {(resources?.memory?.used?.toFixed(2) || 0)} / {(resources?.memory?.total?.toFixed(2) || 0)} GB
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="Disk Usage" />
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress 
                  variant="determinate" 
                  value={Math.round(resources?.disk?.percent || 0)} 
                  size={100}
                  thickness={5}
                  sx={{ 
                    color: resources?.disk?.percent > 90 ? '#ff4d4f' : 
                           resources?.disk?.percent > 70 ? '#faad14' : '#52c41a' 
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography variant="h5" component="div">
                    {`${Math.round(resources?.disk?.percent || 0)}%`}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body1" sx={{ mt: 2 }}>
                {(resources?.disk?.used?.toFixed(2) || 0)} / {(resources?.disk?.total?.toFixed(2) || 0)} GB
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardHeader title="GPU Status" />
            <CardContent sx={{ textAlign: 'center' }}>
              {resources?.gpu?.available ? (
                <>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={100} 
                      size={100}
                      thickness={5}
                      sx={{ color: resources?.gpu?.usage?.gpu_count > 0 ? '#52c41a' : '#ff4d4f' }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h6" component="div">
                        {resources?.gpu?.usage?.gpu_count > 0 ? 'Available' : 'Error'}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    GPU Devices: {resources?.gpu?.device_count || 0}
                  </Typography>
                </>
              ) : (
                <>
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <CircularProgress 
                      variant="determinate" 
                      value={100} 
                      size={100}
                      thickness={5}
                      sx={{ color: '#ff4d4f' }}
                    />
                    <Box
                      sx={{
                        top: 0,
                        left: 0,
                        bottom: 0,
                        right: 0,
                        position: 'absolute',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="h6" component="div">
                        Not Available
                      </Typography>
                    </Box>
                  </Box>
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    GPU acceleration is not available
                  </Alert>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Process Information */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Process Information" />
            <CardContent>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell component="th" scope="row">Process ID</TableCell>
                      <TableCell>{resources?.process?.pid || 'N/A'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">CPU Usage</TableCell>
                      <TableCell>{resources?.process?.cpu_percent?.toFixed(2) || 0}%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Memory Usage</TableCell>
                      <TableCell>{resources?.process?.memory_info?.rss?.toFixed(2) || 0} MB</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell component="th" scope="row">Threads</TableCell>
                      <TableCell>{resources?.process?.threads || 0}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Batch Processing Status" />
            <CardContent>
              {renderBatchInfo()}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemMonitorPage;