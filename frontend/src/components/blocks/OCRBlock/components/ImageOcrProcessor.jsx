import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Paper,
  Button
} from '@mui/material';
import {
  TextFields as OcrIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';

import useOcrMetrics from '../hooks/useOcrMetrics';

/**
 * Image OCR Processor - Handles direct image OCR processing
 */
const ImageOcrProcessor = ({ config, onMetricsUpdate, onExecutionUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState([]);
  const [error, setError] = useState(null);

  // Custom hooks
  const { trackMetric, getMetrics } = useOcrMetrics(onMetricsUpdate);

  // Simulate OCR processing
  const processImage = useCallback(async (imageFile) => {
    const startTime = Date.now();
    setIsProcessing(true);
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      // Simulate OCR results
      const wordCount = Math.floor(Math.random() * 500) + 50;
      const characterCount = wordCount * 5; // Approximate
      const processingTime = Date.now() - startTime;
      
      const result = {
        id: Date.now(),
        filename: imageFile.name,
        wordCount,
        characterCount,
        processingTime,
        imageSize: imageFile.size,
        text: `Simulated OCR text with ${wordCount} words...`,
        confidence: 0.85 + Math.random() * 0.15
      };
      
      setOcrResults(prev => [...prev, result]);
      
      trackMetric('image_processed', {
        wordCount,
        characterCount,
        processingTime,
        imageSize: imageFile.size
      });
      
      trackMetric('process_success');

      // Update global metrics
      if (onMetricsUpdate) {
        const currentMetrics = getMetrics();
        onMetricsUpdate({
          totalFiles: currentMetrics.totalFiles + 1,
          totalPages: currentMetrics.totalPages + 1, // Each image is one "page"
          totalWords: currentMetrics.totalWords + wordCount,
          totalCharacters: currentMetrics.totalCharacters + characterCount,
          totalProcessingTime: currentMetrics.totalProcessingTime + processingTime,
          successfulProcesses: currentMetrics.successfulProcesses + 1
        });
      }
      
    } catch (err) {
      setError(err.message);
      trackMetric('process_failed');

      // Update global metrics for failed process
      if (onMetricsUpdate) {
        const currentMetrics = getMetrics();
        onMetricsUpdate({
          failedProcesses: currentMetrics.failedProcesses + 1
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [trackMetric, getMetrics, onMetricsUpdate]);

  // Handle file upload
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        processImage(file);
      }
    });
  };

  return (
    <Box>
      {/* Image OCR Processing Interface */}
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <OcrIcon sx={{ mr: 1 }} />
            Image OCR Processing
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="image-upload"
            />
            <label htmlFor="image-upload">
              <Button 
                variant="contained" 
                component="span" 
                disabled={isProcessing}
                startIcon={<UploadIcon />}
              >
                {isProcessing ? 'Processing...' : 'Upload Images'}
              </Button>
            </label>
          </Box>

          {isProcessing && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Processing image...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* OCR Results */}
          {ocrResults.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                OCR Results ({ocrResults.length})
              </Typography>
              <Grid container spacing={2}>
                {ocrResults.map((result) => (
                  <Grid item xs={12} md={6} key={result.id}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {result.filename}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip size="small" label={`${result.wordCount} words`} />
                        <Chip size="small" label={`${result.processingTime}ms`} />
                        <Chip size="small" label={`${Math.round(result.confidence * 100)}% confidence`} />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {result.text.substring(0, 100)}...
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ImageOcrProcessor;