import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  Button,
  Paper,
  Divider,
  Chip
} from '@mui/material';
import {
  Assessment as MetricsIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import SharePointExplorerBlock from '../components/blocks/SharePointExplorer/SharePointExplorerBlock';

/**
 * Demo component to showcase SharePoint Explorer with integrated metrics tracking
 */
const SharePointMetricsDemo = () => {
  const [blockExecution, setBlockExecution] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  // Handle block execution updates
  const handleExecutionUpdate = async (update) => {
    console.log('Block execution update:', update);
    
    try {
      if (!blockExecution) {
        // Create new execution
        const response = await fetch('/api/blocks/executions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow_block_id: 1, // Using the workflow block we created
            user_id: 1, // Default user
            status: update.status || 'running',
            logs: update.logs || 'SharePoint Explorer started',
            result: update.result || {}
          }),
        });
        
        if (response.ok) {
          const execution = await response.json();
          setBlockExecution(execution);
          console.log('Created block execution:', execution);
        }
      } else {
        // Update existing execution
        const response = await fetch(`/api/blocks/executions/${blockExecution.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
        });
        
        if (response.ok) {
          const updatedExecution = await response.json();
          setBlockExecution(updatedExecution);
          console.log('Updated block execution:', updatedExecution);
        }
      }
    } catch (err) {
      console.error('Error updating block execution:', err);
      setError(err.message);
    }
  };

  // Start the block execution
  const startExecution = () => {
    setIsRunning(true);
    setError(null);
    setBlockExecution(null);
  };

  // Stop the block execution
  const stopExecution = async () => {
    if (blockExecution) {
      try {
        await fetch(`/api/blocks/executions/${blockExecution.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'completed',
            logs: 'SharePoint Explorer session ended by user'
          }),
        });
      } catch (err) {
        console.error('Error stopping execution:', err);
      }
    }
    setIsRunning(false);
  };

  // Fetch metrics summary
  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/blocks/metrics/sharepoint?days=7');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  };

  // Fetch metrics on component mount and periodically
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <MetricsIcon sx={{ mr: 2 }} />
        SharePoint Explorer - Block Metrics Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        This demo showcases the SharePoint Explorer block with integrated metrics tracking. 
        All user interactions, performance data, and usage patterns are automatically captured and stored.
      </Typography>

      {/* Control Panel */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Block Execution Control
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<StartIcon />}
            onClick={startExecution}
            disabled={isRunning}
            color="success"
          >
            Start Session
          </Button>
          <Button
            variant="contained"
            startIcon={<StopIcon />}
            onClick={stopExecution}
            disabled={!isRunning}
            color="error"
          >
            Stop Session
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchMetrics}
          >
            Refresh Metrics
          </Button>
          <Chip 
            label={isRunning ? 'Running' : 'Stopped'} 
            color={isRunning ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>
        
        {blockExecution && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Execution ID: {blockExecution.id} | Status: {blockExecution.status}
            </Typography>
          </Box>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Metrics Summary */}
      {metrics && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            7-Day Metrics Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {metrics.total_sessions}
                </Typography>
                <Typography variant="caption">Total Sessions</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="secondary">
                  {metrics.total_interactions}
                </Typography>
                <Typography variant="caption">Total Interactions</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {metrics.total_files_viewed}
                </Typography>
                <Typography variant="caption">Files Viewed</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="info.main">
                  {Math.round(metrics.average_response_time)}ms
                </Typography>
                <Typography variant="caption">Avg Response Time</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Divider sx={{ my: 3 }} />

      {/* SharePoint Explorer Block */}
      <Card elevation={3}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            SharePoint Explorer Block
          </Typography>
          {isRunning ? (
            <SharePointExplorerBlock
              config={{}}
              onExecutionUpdate={handleExecutionUpdate}
            />
          ) : (
            <Box 
              sx={{ 
                p: 4, 
                textAlign: 'center', 
                bgcolor: 'grey.50',
                borderRadius: 1
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Click "Start Session" to begin using the SharePoint Explorer with metrics tracking
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SharePointMetricsDemo;