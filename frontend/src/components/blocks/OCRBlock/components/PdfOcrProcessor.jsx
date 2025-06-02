import React, { useState, useCallback } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  LinearProgress
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';

import OCRSettings from './OCRSettings';
import PdfResultsDisplay from './PdfResultsDisplay';
import useOcrMetrics from '../hooks/useOcrMetrics';
import useFileProcessor from '../hooks/useFileProcessor';

/**
 * PDF OCR Processor - Simplified PDF to image conversion and OCR processing
 * Clean implementation that preserves block metrics functionality
 */
const PdfOcrProcessor = ({ config, selectedFiles = [], onMetricsUpdate, onExecutionUpdate }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('idle');
  const [pdfResults, setPdfResults] = useState([]);
  const [error, setError] = useState(null);
  
  // Simplified settings - removed complex retry and quality assessment logic
  const [settings, setSettings] = useState({
    dpi: 300,
    ocrEngine: 'easyocr',
    language: 'spa',
    batchSize: 5
  });

  // Custom hooks for metrics and file processing
  const { trackMetric } = useOcrMetrics(onMetricsUpdate);
  const { fileToBase64 } = useFileProcessor();

  // Handle settings change
  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // Simplified PDF processing - removed complex retry logic and preload checking
  const processPdf = useCallback(async (pdfFile) => {
    setIsProcessing(true);
    setCurrentStep('processing');
    setError(null);
    
    try {
      // Convert file to base64
      const base64Data = await fileToBase64(pdfFile);
      
      setCurrentStep('extracting');
      
      // Call backend API with simplified approach
      const endpoint = '/api/ocr/pdf_ocr';
      const requestData = {
        file_data: base64Data,
        filename: pdfFile.name,
        settings: settings
      };
      
      const response = await axios.post(endpoint, requestData);
      const apiResult = response.data;
      
      // Track metrics for block metrics functionality
      trackMetric('pdf_processed', {
        pageCount: apiResult.pageCount,
        wordCount: apiResult.totalWords,
        processingTime: apiResult.processingTime
      });
      
      // Create result object
      const result = {
        id: Date.now(),
        filename: apiResult.filename,
        pageCount: apiResult.pageCount,
        pages: apiResult.pages.map(page => ({
          ...page,
          imageUrl: `http://localhost:8000${page.imageUrl}`
        })),
        totalWords: apiResult.totalWords,
        totalCharacters: apiResult.totalCharacters,
        processingTime: apiResult.processingTime,
        status: apiResult.status
      };
      
      setPdfResults(prev => [...prev, result]);
      
      // Update global metrics (this feeds into the block metrics display)
      if (onMetricsUpdate) {
        onMetricsUpdate({
          totalFiles: 1,
          totalPages: apiResult.pageCount,
          totalWords: apiResult.totalWords,
          totalCharacters: apiResult.totalCharacters,
          totalProcessingTime: apiResult.processingTime,
          successfulProcesses: 1,
          failedProcesses: 0
        });
      }
      
    } catch (err) {
      console.error('PDF processing error:', err);
      setError(err.response?.data?.detail || err.message || 'PDF processing failed');
      trackMetric('process_failed');
      
      // Update metrics for failed process
      if (onMetricsUpdate) {
        onMetricsUpdate({
          failedProcesses: 1
        });
      }
    } finally {
      setIsProcessing(false);
      setCurrentStep('idle');
    }
  }, [trackMetric, settings, fileToBase64, onMetricsUpdate]);

  // Handle PDF upload from file input
  const handlePdfUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.type === 'application/pdf') {
        processPdf(file);
      }
    });
  };

  // Process selected files from SharePoint
  const processSelectedFiles = () => {
    const pdfFiles = selectedFiles.filter(file =>
      file.name.toLowerCase().endsWith('.pdf') && file.itemType === 'file'
    );
    
    if (pdfFiles.length === 0) {
      setError('No PDF files selected from SharePoint.');
      return;
    }

    console.log(`Processing ${pdfFiles.length} PDF files`);
    pdfFiles.forEach(file => processPdf(file));
  };

  // Clear results
  const clearResults = () => {
    setPdfResults([]);
    setError(null);
  };

  // Get current step description
  const getCurrentStepDescription = () => {
    switch (currentStep) {
      case 'processing': return 'Converting PDF to images...';
      case 'extracting': return 'Extracting text with OCR...';
      default: return 'Ready to process';
    }
  };

  return (
    <Box>
      {/* Settings Panel */}
      <OCRSettings 
        settings={settings}
        onSettingChange={handleSettingChange}
        title="PDF OCR Settings"
      />

      {/* PDF OCR Processing Interface */}
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <PdfIcon sx={{ mr: 1 }} />
            PDF OCR Processing
          </Typography>
          
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Show upload button when no SharePoint files are selected */}
            {selectedFiles.length === 0 && (
              <>
                <input
                  type="file"
                  multiple
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  style={{ display: 'none' }}
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload">
                  <Button
                    variant="contained"
                    component="span"
                    disabled={isProcessing}
                    startIcon={<UploadIcon />}
                  >
                    {isProcessing ? 'Processing...' : 'Upload PDFs'}
                  </Button>
                </label>
              </>
            )}
            
            {/* Show SharePoint processing button when files are selected */}
            {selectedFiles.length > 0 && (
              <>
                <Button
                  variant="contained"
                  onClick={processSelectedFiles}
                  disabled={isProcessing || selectedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf')).length === 0}
                  startIcon={<PdfIcon />}
                  color="secondary"
                >
                  {isProcessing ? 'Processing...' : `Process Selected Files (${selectedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf')).length})`}
                </Button>
                
                {/* Clear Results Button */}
                {pdfResults.length > 0 && (
                  <Button
                    variant="outlined"
                    onClick={clearResults}
                    disabled={isProcessing}
                    color="error"
                  >
                    Clear Results
                  </Button>
                )}
              </>
            )}
            
            {/* Show info message when SharePoint files are selected */}
            {selectedFiles.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                Processing files from SharePoint: {selectedFiles.map(f => f.name).join(', ')}
              </Typography>
            )}
          </Box>

          {/* Processing indicator */}
          {isProcessing && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2">
                  {getCurrentStepDescription()}
                </Typography>
              </Box>
              <LinearProgress />
            </Box>
          )}

          {/* Error display */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* PDF Results Display */}
          <PdfResultsDisplay results={pdfResults} />
        </CardContent>
      </Card>
    </Box>
  );
};

export default PdfOcrProcessor;