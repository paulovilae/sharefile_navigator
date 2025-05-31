import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  TextSnippet as TextSnippetIcon,
  Assessment as MetricsIcon,
  Speed as SpeedIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

import OCRContent from './OCRContent';
import OCRHeader from './OCRHeader';
import useOcrState from './hooks/useOcrState';
import useOcrEngine from './hooks/useOcrEngine';
import useOcrMetrics from './hooks/useOcrMetrics';

/**
 * OCR Block Component
 * Handles PDF to text conversion using client-side processing
 * Integrates pdf.js for PDF rendering and Tesseract.js for OCR
 */
const OCRBlock = ({ config, onExecutionUpdate, inputData = [] }) => {
  const {
    files,
    setFiles,
    currentFile,
    setCurrentFile,
    ocrResults,
    setOcrResults,
    processing,
    setProcessing,
    error,
    setError,
    progress,
    setProgress,
  } = useOcrState();

  const {
    processFile,
    cancelProcessing,
    isEngineReady,
    engineError,
  } = useOcrEngine({
    setProcessing,
    setError,
    setProgress,
    setOcrResults,
  });

  const {
    metrics,
    updateMetrics,
    metricsExpanded,
    setMetricsExpanded,
  } = useOcrMetrics();

  // Handle input data from previous blocks (SharePoint Navigator)
  useEffect(() => {
    if (inputData && inputData.length > 0) {
      const pdfFiles = inputData.filter(item => 
        item.name && item.name.toLowerCase().endsWith('.pdf')
      );
      setFiles(pdfFiles);
      updateMetrics('filesReceived', pdfFiles.length);
    }
  }, [inputData, setFiles, updateMetrics]);

  // Update execution status
  useEffect(() => {
    if (onExecutionUpdate) {
      onExecutionUpdate({
        status: processing ? 'processing' : 'ready',
        result: {
          filesProcessed: Object.keys(ocrResults).length,
          totalFiles: files.length,
          results: ocrResults,
        },
      });
    }
  }, [processing, ocrResults, files.length, onExecutionUpdate]);

  const handleFileProcess = async (file) => {
    setCurrentFile(file);
    updateMetrics('processingStarted');
    
    try {
      await processFile(file);
      updateMetrics('processingCompleted');
    } catch (err) {
      updateMetrics('processingFailed');
      console.error('OCR processing failed:', err);
    }
  };

  const getSessionDuration = () => {
    const duration = Date.now() - metrics.sessionStartTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Box>
      {/* OCR Metrics */}
      <Accordion
        expanded={metricsExpanded}
        onChange={() => setMetricsExpanded(!metricsExpanded)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <MetricsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              OCR Metrics
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                icon={<TextSnippetIcon />}
                label={`${Object.keys(ocrResults).length}/${files.length} processed`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<SpeedIcon />}
                label={`${Math.round(metrics.averageProcessingTime)}ms avg`}
                size="small"
                color={metrics.averageProcessingTime < 5000 ? 'success' : 'warning'}
                variant="outlined"
              />
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TextSnippetIcon sx={{ mr: 1, fontSize: 16 }} />
                Processing Status
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                    <Typography variant="h5" color="primary.contrastText">
                      {files.length}
                    </Typography>
                    <Typography variant="caption" color="primary.contrastText">Total Files</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="h5" color="success.contrastText">
                      {Object.keys(ocrResults).length}
                    </Typography>
                    <Typography variant="caption" color="success.contrastText">Processed</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
                    <Typography variant="h5" color="warning.contrastText">
                      {files.length - Object.keys(ocrResults).length}
                    </Typography>
                    <Typography variant="caption" color="warning.contrastText">Remaining</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SpeedIcon sx={{ mr: 1, fontSize: 16 }} />
                Performance
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="info.contrastText">
                      {Math.round(metrics.averageProcessingTime)}ms
                    </Typography>
                    <Typography variant="caption" color="info.contrastText">Avg Time</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'secondary.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="secondary.contrastText">
                      {getSessionDuration()}
                    </Typography>
                    <Typography variant="caption" color="secondary.contrastText">Session</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* OCR Header */}
      <OCRHeader 
        isEngineReady={isEngineReady}
        engineError={engineError}
        processing={processing}
        currentFile={currentFile}
        progress={progress}
      />

      {/* Main OCR Content */}
      <OCRContent
        files={files}
        ocrResults={ocrResults}
        processing={processing}
        error={error}
        progress={progress}
        currentFile={currentFile}
        onFileProcess={handleFileProcess}
        onCancelProcessing={cancelProcessing}
        isEngineReady={isEngineReady}
      />

      {/* Global Progress Bar */}
      {processing && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Processing: {currentFile?.name || 'Unknown file'}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary">
            {Math.round(progress)}% complete
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default OCRBlock;