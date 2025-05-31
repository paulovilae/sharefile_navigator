import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  Paper
} from '@mui/material';
import {
  Assessment as MetricsIcon
} from '@mui/icons-material';
import SharePointExplorerBlock from '../__archive__/SharePointExplorerBlock';
import OcrProcessingBlock from './blocks/OcrProcessingBlock';

/**
 * Demo page showcasing blocks with embedded collapsible metrics
 */
const BlockMetricsDemo = () => {
  const [sharePointExecution, setSharePointExecution] = useState(null);
  const [ocrExecution, setOcrExecution] = useState(null);

  // Handle SharePoint block execution updates
  const handleSharePointUpdate = useCallback((update) => {
    console.log('SharePoint block update:', update);
    setSharePointExecution(prev => ({ ...prev, ...update }));
  }, []);

  // Handle OCR block execution updates
  const handleOcrUpdate = useCallback((update) => {
    console.log('OCR block update:', update);
    setOcrExecution(prev => ({ ...prev, ...update }));
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <MetricsIcon sx={{ mr: 2 }} />
        Block Metrics Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        This demo showcases blocks with embedded collapsible metrics panels. Each block tracks 
        relevant metrics specific to its functionality and displays them in a compact, expandable format.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>How to use:</strong> Click on the "Block Metrics" accordion headers to expand and view 
        detailed metrics for each block. Metrics update in real-time as you interact with the blocks.
      </Alert>

      <Grid container spacing={3}>
        {/* SharePoint Explorer Block */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom color="primary">
              SharePoint Explorer Block
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Tracks: folders/files count, load times, data transfer, cache stats, user interactions
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <SharePointExplorerBlock
              config={{}}
              onExecutionUpdate={handleSharePointUpdate}
            />
          </Paper>
        </Grid>

        {/* OCR Processing Block */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom color="secondary">
              OCR Processing Block
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Tracks: processing time, word count, image count, success rate, character extraction
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <OcrProcessingBlock
              config={{}}
              onExecutionUpdate={handleOcrUpdate}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* Execution Status */}
      {(sharePointExecution || ocrExecution) && (
        <Paper elevation={1} sx={{ p: 2, mt: 3, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom>
            Block Execution Status
          </Typography>
          <Grid container spacing={2}>
            {sharePointExecution && (
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="primary">
                      SharePoint Explorer
                    </Typography>
                    <Typography variant="body2">
                      Status: {sharePointExecution.status}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last update: {new Date().toLocaleTimeString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
            {ocrExecution && (
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="secondary">
                      OCR Processing
                    </Typography>
                    <Typography variant="body2">
                      Status: {ocrExecution.status}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Last update: {new Date().toLocaleTimeString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default BlockMetricsDemo;