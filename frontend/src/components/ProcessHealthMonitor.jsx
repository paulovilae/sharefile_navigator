import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  LinearProgress,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  CleaningServices as CleanupIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const ProcessHealthMonitor = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupDialog, setCleanupDialog] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ocr/health');
      const data = await response.json();
      setHealthData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (fileIds = null) => {
    setCleanupLoading(true);
    try {
      const response = await fetch('/api/ocr/health/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fileIds ? { file_ids: fileIds } : {}),
      });
      const result = await response.json();
      
      // Refresh health data after cleanup
      await fetchHealthData();
      setCleanupDialog(false);
      setSelectedFileIds([]);
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      setCleanupLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'completed':
        return 'success';
      case 'warning':
      case 'processing':
        return 'warning';
      case 'error':
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'completed':
        return <CheckCircleIcon />;
      case 'warning':
      case 'processing':
        return <WarningIcon />;
      case 'error':
      case 'failed':
        return <ErrorIcon />;
      default:
        return <InfoIcon />;
    }
  };

  if (!healthData) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Process Health Monitor
        </Typography>
        {loading ? <LinearProgress /> : <Button onClick={fetchHealthData}>Load Health Data</Button>}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Process Health Monitor
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchHealthData}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
          <Button
            startIcon={<CleanupIcon />}
            onClick={() => setCleanupDialog(true)}
            disabled={cleanupLoading}
            color="warning"
            size="small"
          >
            Cleanup
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* Overall Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                {getStatusIcon(healthData.overall_status)}
                <Typography variant="h6">
                  Overall Status
                </Typography>
                <Chip
                  label={healthData.overall_status}
                  color={getStatusColor(healthData.overall_status)}
                  size="small"
                />
              </Box>
              
              {healthData.recommendations?.length > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommendations:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {healthData.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Active Batches
                  </Typography>
                  <Typography variant="h4">
                    {healthData.statistics?.active_batches || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Processing Files
                  </Typography>
                  <Typography variant="h4">
                    {healthData.statistics?.processing_files || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Stuck Processes
                  </Typography>
                  <Typography variant="h4" color="error">
                    {healthData.statistics?.stuck_processes || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Queued
                  </Typography>
                  <Typography variant="h4">
                    {healthData.statistics?.queued_files || 0}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Batch Jobs */}
        {healthData.batch_jobs?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Batch Jobs
                </Typography>
                <List>
                  {healthData.batch_jobs.map((job, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={`Batch ${job.batch_id}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Status: {job.status} | Progress: {job.progress}% | 
                              Files: {job.completed_files}/{job.total_files}
                            </Typography>
                            {job.started_at && (
                              <Typography variant="caption" color="text.secondary">
                                Started: {new Date(job.started_at).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          label={job.status}
                          color={getStatusColor(job.status)}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Stuck Processes */}
        {healthData.stuck_processes?.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="error">
                  Stuck Processes ({healthData.stuck_processes.length})
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  These processes appear to be stuck and may need cleanup.
                </Alert>
                <List>
                  {healthData.stuck_processes.map((process, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={process.filename || `File ID: ${process.file_id}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Status: {process.status} | 
                              Started: {new Date(process.created_at).toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Stuck for: {process.stuck_duration}
                            </Typography>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Select for cleanup">
                          <IconButton
                            onClick={() => {
                              const fileId = process.file_id;
                              setSelectedFileIds(prev => 
                                prev.includes(fileId) 
                                  ? prev.filter(id => id !== fileId)
                                  : [...prev, fileId]
                              );
                            }}
                            color={selectedFileIds.includes(process.file_id) ? 'primary' : 'default'}
                          >
                            <CleanupIcon />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                {selectedFileIds.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<CleanupIcon />}
                      onClick={() => handleCleanup(selectedFileIds)}
                      disabled={cleanupLoading}
                    >
                      Cleanup Selected ({selectedFileIds.length})
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Detailed Process Information */}
        {healthData.process_details && (
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Detailed Process Information
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                  {JSON.stringify(healthData.process_details, null, 2)}
                </pre>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}
      </Grid>

      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialog} onClose={() => setCleanupDialog(false)}>
        <DialogTitle>Cleanup Processes</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            This will clean up stuck or problematic OCR processes. 
            {healthData.stuck_processes?.length > 0 
              ? `${healthData.stuck_processes.length} stuck processes detected.`
              : 'No stuck processes detected.'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action will reset the status of stuck processes and allow them to be reprocessed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => handleCleanup()}
            color="warning"
            disabled={cleanupLoading}
          >
            {cleanupLoading ? 'Cleaning...' : 'Cleanup All'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProcessHealthMonitor;