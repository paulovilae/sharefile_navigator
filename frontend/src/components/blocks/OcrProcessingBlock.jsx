import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Paper,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button
} from '@mui/material';
import {
  TextFields as OcrIcon,
  Image as ImageIcon,
  Timer as TimerIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Assessment as MetricsIcon,
  ExpandMore as ExpandMoreIcon,
  Speed as SpeedIcon,
  Description as WordCountIcon,
  PhotoLibrary as ImageCountIcon,
  Memory as ProcessingIcon
} from '@mui/icons-material';

/**
 * OCR Processing Block with integrated metrics tracking
 * Tracks OCR-specific metrics like processing time, word count, image count, etc.
 */
const OcrProcessingBlock = ({ config, onExecutionUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState([]);
  const [error, setError] = useState(null);
  
  // OCR-specific metrics
  const [metrics, setMetrics] = useState({
    sessionStartTime: Date.now(),
    totalProcessingTime: 0,
    imagesProcessed: 0,
    totalWords: 0,
    totalCharacters: 0,
    averageWordsPerImage: 0,
    averageProcessingTimePerImage: 0,
    successfulProcesses: 0,
    failedProcesses: 0,
    largestImageSize: 0,
    smallestImageSize: Infinity,
    processingTimes: [],
    lastActivity: Date.now()
  });
  
  const [metricsExpanded, setMetricsExpanded] = useState(false);

  // Track OCR metrics helper
  const trackOcrMetric = useCallback((action, data = {}) => {
    const timestamp = Date.now();
    setMetrics(prev => {
      const newMetrics = { ...prev };
      newMetrics.lastActivity = timestamp;
      
      switch (action) {
        case 'image_processed':
          newMetrics.imagesProcessed += 1;
          newMetrics.totalWords += data.wordCount || 0;
          newMetrics.totalCharacters += data.characterCount || 0;
          newMetrics.processingTimes.push(data.processingTime || 0);
          newMetrics.totalProcessingTime += data.processingTime || 0;
          newMetrics.averageProcessingTimePerImage = 
            newMetrics.totalProcessingTime / newMetrics.imagesProcessed;
          newMetrics.averageWordsPerImage = 
            newMetrics.totalWords / newMetrics.imagesProcessed;
          if (data.imageSize) {
            newMetrics.largestImageSize = Math.max(newMetrics.largestImageSize, data.imageSize);
            newMetrics.smallestImageSize = Math.min(newMetrics.smallestImageSize, data.imageSize);
          }
          break;
        case 'process_success':
          newMetrics.successfulProcesses += 1;
          break;
        case 'process_failed':
          newMetrics.failedProcesses += 1;
          break;
      }
      
      return newMetrics;
    });

    // Report metrics to parent component
    if (onExecutionUpdate) {
      onExecutionUpdate({
        status: 'running',
        logs: `OCR Action: ${action} at ${new Date(timestamp).toISOString()}`,
        result: { metrics: { ...metrics, [action]: timestamp } }
      });
    }
  }, [metrics, onExecutionUpdate]);

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
      
      trackOcrMetric('image_processed', {
        wordCount,
        characterCount,
        processingTime,
        imageSize: imageFile.size
      });
      
      trackOcrMetric('process_success');
      
    } catch (err) {
      setError(err.message);
      trackOcrMetric('process_failed');
    } finally {
      setIsProcessing(false);
    }
  }, [trackOcrMetric]);

  // Handle file upload
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        processImage(file);
      }
    });
  };

  // Calculate session duration
  const getSessionDuration = () => {
    return Math.round((Date.now() - metrics.sessionStartTime) / 1000);
  };

  // Calculate success rate
  const getSuccessRate = () => {
    const total = metrics.successfulProcesses + metrics.failedProcesses;
    return total > 0 ? Math.round((metrics.successfulProcesses / total) * 100) : 0;
  };

  return (
    <Box>
      {/* Collapsible OCR Block Metrics */}
      <Accordion 
        expanded={metricsExpanded} 
        onChange={() => setMetricsExpanded(!metricsExpanded)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <MetricsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              OCR Block Metrics
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
              <Chip 
                icon={<ImageCountIcon />} 
                label={`${metrics.imagesProcessed} images`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
              <Chip 
                icon={<WordCountIcon />} 
                label={`${metrics.totalWords} words`} 
                size="small" 
                color="secondary" 
                variant="outlined"
              />
              <Chip 
                icon={<SpeedIcon />} 
                label={`${Math.round(metrics.averageProcessingTimePerImage)}ms avg`} 
                size="small" 
                color={metrics.averageProcessingTimePerImage < 2000 ? 'success' : 'warning'} 
                variant="outlined"
              />
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <ProcessingIcon sx={{ mr: 1, fontSize: 16 }} />
                Processing Stats
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                    <Typography variant="h5" color="primary.contrastText">
                      {metrics.imagesProcessed}
                    </Typography>
                    <Typography variant="caption" color="primary.contrastText">Images Processed</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'secondary.light', borderRadius: 1 }}>
                    <Typography variant="h5" color="secondary.contrastText">
                      {getSuccessRate()}%
                    </Typography>
                    <Typography variant="caption" color="secondary.contrastText">Success Rate</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <WordCountIcon sx={{ mr: 1, fontSize: 16 }} />
                Text Extraction
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="success.contrastText">
                      {metrics.totalWords}
                    </Typography>
                    <Typography variant="caption" color="success.contrastText">Total Words</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="info.contrastText">
                      {Math.round(metrics.averageWordsPerImage)}
                    </Typography>
                    <Typography variant="caption" color="info.contrastText">Avg Words/Image</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TimerIcon sx={{ mr: 1, fontSize: 16 }} />
                Performance Metrics
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={3}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">{Math.round(metrics.averageProcessingTimePerImage)}ms</Typography>
                    <Typography variant="caption">Avg Processing Time</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">{Math.round(metrics.totalProcessingTime / 1000)}s</Typography>
                    <Typography variant="caption">Total Processing</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">{metrics.totalCharacters}</Typography>
                    <Typography variant="caption">Characters</Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">{getSessionDuration()}s</Typography>
                    <Typography variant="caption">Session Time</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* OCR Processing Interface */}
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <OcrIcon sx={{ mr: 1 }} />
            OCR Processing
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
              <Button variant="contained" component="span" disabled={isProcessing}>
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

export default OcrProcessingBlock;