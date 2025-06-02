import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

import PdfOcrProcessor from './components/PdfOcrProcessor';
import OCRMetrics from './components/OCRMetrics';

/**
 * Unified OCR Block - Handles PDF OCR processing with automatic image extraction
 * Features:
 * - PDF to image conversion + OCR (when no embedded text)
 * - Automatic preload detection and display
 * - Unified metrics tracking
 * - Streamlined single-purpose interface
 */
const OCRBlock = ({ config, onExecutionUpdate, selectedFiles = [] }) => {
  const [globalMetrics, setGlobalMetrics] = useState({
    sessionStartTime: Date.now(),
    totalProcessingTime: 0,
    totalFiles: 0,
    totalPages: 0,
    totalWords: 0,
    totalCharacters: 0,
    successfulProcesses: 0,
    failedProcesses: 0,
    lastActivity: Date.now()
  });

  // Update global metrics from child components (accumulative)
  const updateGlobalMetrics = (newMetrics) => {
    setGlobalMetrics(prev => {
      const updated = {
        ...prev,
        // Accumulate metrics instead of overwriting
        totalProcessingTime: prev.totalProcessingTime + (newMetrics.totalProcessingTime || 0),
        totalFiles: prev.totalFiles + (newMetrics.totalFiles || 0),
        totalPages: prev.totalPages + (newMetrics.totalPages || 0),
        totalWords: prev.totalWords + (newMetrics.totalWords || 0),
        totalCharacters: prev.totalCharacters + (newMetrics.totalCharacters || 0),
        successfulProcesses: prev.successfulProcesses + (newMetrics.successfulProcesses || 0),
        failedProcesses: prev.failedProcesses + (newMetrics.failedProcesses || 0),
        lastActivity: Date.now()
      };

      // Report to parent component
      if (onExecutionUpdate) {
        onExecutionUpdate({
          status: 'running',
          logs: `OCR metrics updated at ${new Date().toISOString()}`,
          result: { metrics: updated }
        });
      }

      return updated;
    });
  };

  return (
    <Box>
      {/* Global Metrics */}
      <OCRMetrics
        metrics={globalMetrics}
        title="PDF OCR Metrics"
      />

      {/* Single PDF OCR Processor */}
      <PdfOcrProcessor
        config={config}
        selectedFiles={selectedFiles}
        onMetricsUpdate={updateGlobalMetrics}
        onExecutionUpdate={onExecutionUpdate}
      />
    </Box>
  );
};

export default OCRBlock;