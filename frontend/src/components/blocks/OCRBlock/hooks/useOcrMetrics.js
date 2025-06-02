import { useState, useCallback } from 'react';

/**
 * Custom hook for OCR metrics tracking
 * Provides centralized metrics management for OCR operations
 */
const useOcrMetrics = (onMetricsUpdate) => {
  const [metrics, setMetrics] = useState({
    sessionStartTime: Date.now(),
    totalProcessingTime: 0,
    totalFiles: 0,
    totalPages: 0,
    imagesProcessed: 0,
    pdfsProcessed: 0,
    textExtracted: 0,
    ocrProcessed: 0,
    totalWords: 0,
    totalCharacters: 0,
    averageWordsPerPage: 0,
    averageProcessingTimePerPage: 0,
    successfulProcesses: 0,
    failedProcesses: 0,
    largestImageSize: 0,
    smallestImageSize: Infinity,
    processingTimes: [],
    conversionTimes: [],
    ocrTimes: [],
    lastActivity: Date.now(),
    gpuUtilization: 0,
    memoryUsage: 0
  });

  // Track specific OCR metrics
  const trackMetric = useCallback((action, data = {}) => {
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
          newMetrics.averageProcessingTimePerPage = 
            newMetrics.totalProcessingTime / Math.max(newMetrics.imagesProcessed, 1);
          newMetrics.averageWordsPerPage = 
            newMetrics.totalWords / Math.max(newMetrics.imagesProcessed, 1);
          if (data.imageSize) {
            newMetrics.largestImageSize = Math.max(newMetrics.largestImageSize, data.imageSize);
            newMetrics.smallestImageSize = Math.min(newMetrics.smallestImageSize, data.imageSize);
          }
          break;
          
        case 'pdf_converted':
          newMetrics.pdfsProcessed += 1;
          newMetrics.totalPages += data.pageCount || 0;
          newMetrics.imagesProcessed += data.imageCount || 0;
          newMetrics.conversionTimes.push(data.conversionTime || 0);
          newMetrics.totalProcessingTime += data.conversionTime || 0;
          break;
          
        case 'text_extracted':
          newMetrics.textExtracted += 1;
          newMetrics.totalWords += data.wordCount || 0;
          newMetrics.totalCharacters += data.characterCount || 0;
          break;
          
        case 'ocr_processed':
          newMetrics.ocrProcessed += 1;
          newMetrics.totalWords += data.wordCount || 0;
          newMetrics.totalCharacters += data.characterCount || 0;
          newMetrics.ocrTimes.push(data.ocrTime || 0);
          newMetrics.totalProcessingTime += data.ocrTime || 0;
          newMetrics.averageProcessingTimePerPage = 
            newMetrics.totalProcessingTime / Math.max(newMetrics.totalPages, 1);
          newMetrics.averageWordsPerPage = 
            newMetrics.totalWords / Math.max(newMetrics.totalPages, 1);
          break;
          
        case 'process_success':
          newMetrics.successfulProcesses += 1;
          break;
          
        case 'process_failed':
          newMetrics.failedProcesses += 1;
          break;
          
        case 'gpu_stats':
          newMetrics.gpuUtilization = data.gpuUtilization || 0;
          newMetrics.memoryUsage = data.memoryUsage || 0;
          break;
          
        default:
          console.warn(`Unknown metric action: ${action}`);
      }
      
      return newMetrics;
    });

    // Report metrics to parent component if callback provided
    if (onMetricsUpdate) {
      onMetricsUpdate({
        status: 'running',
        logs: `OCR Action: ${action} at ${new Date(timestamp).toISOString()}`,
        result: { metrics: { ...metrics, [action]: timestamp } }
      });
    }
  }, [metrics, onMetricsUpdate]);

  // Get current metrics
  const getMetrics = useCallback(() => {
    return { ...metrics };
  }, [metrics]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({
      sessionStartTime: Date.now(),
      totalProcessingTime: 0,
      totalFiles: 0,
      totalPages: 0,
      imagesProcessed: 0,
      pdfsProcessed: 0,
      textExtracted: 0,
      ocrProcessed: 0,
      totalWords: 0,
      totalCharacters: 0,
      averageWordsPerPage: 0,
      averageProcessingTimePerPage: 0,
      successfulProcesses: 0,
      failedProcesses: 0,
      largestImageSize: 0,
      smallestImageSize: Infinity,
      processingTimes: [],
      conversionTimes: [],
      ocrTimes: [],
      lastActivity: Date.now(),
      gpuUtilization: 0,
      memoryUsage: 0
    });
  }, []);

  // Calculate derived metrics
  const getDerivedMetrics = useCallback(() => {
    const sessionDuration = Math.round((Date.now() - metrics.sessionStartTime) / 1000);
    const successRate = metrics.successfulProcesses + metrics.failedProcesses > 0 
      ? Math.round((metrics.successfulProcesses / (metrics.successfulProcesses + metrics.failedProcesses)) * 100) 
      : 0;
    
    return {
      sessionDuration,
      successRate,
      averageProcessingTime: metrics.totalFiles > 0 ? Math.round(metrics.totalProcessingTime / metrics.totalFiles) : 0,
      averageWordsPerFile: metrics.totalFiles > 0 ? Math.round(metrics.totalWords / metrics.totalFiles) : 0
    };
  }, [metrics]);

  return {
    metrics,
    trackMetric,
    getMetrics,
    resetMetrics,
    getDerivedMetrics
  };
};

export default useOcrMetrics;