import { useState, useCallback } from 'react';

const useOcrMetrics = () => {
  const [metrics, setMetrics] = useState({
    sessionStartTime: Date.now(),
    filesReceived: 0,
    filesProcessed: 0,
    filesFailed: 0,
    totalProcessingTime: 0,
    averageProcessingTime: 0,
    processingTimes: [],
    totalCharactersExtracted: 0,
    averageConfidence: 0,
    confidenceScores: [],
    pagesProcessed: 0,
    errorsEncountered: 0,
    lastActivity: Date.now(),
  });

  const [metricsExpanded, setMetricsExpanded] = useState(false);

  const updateMetrics = useCallback((type, value) => {
    setMetrics(prev => {
      const newMetrics = { ...prev };
      const now = Date.now();
      newMetrics.lastActivity = now;

      switch (type) {
        case 'filesReceived':
          newMetrics.filesReceived = value;
          break;

        case 'processingStarted':
          // No specific metric update needed, just timestamp
          break;

        case 'processingCompleted':
          newMetrics.filesProcessed += 1;
          if (value && typeof value === 'object') {
            // value should contain: { processingTime, confidence, charactersExtracted, pages }
            if (value.processingTime) {
              newMetrics.processingTimes.push(value.processingTime);
              newMetrics.totalProcessingTime += value.processingTime;
              newMetrics.averageProcessingTime = newMetrics.totalProcessingTime / newMetrics.processingTimes.length;
            }
            
            if (value.confidence !== undefined) {
              newMetrics.confidenceScores.push(value.confidence);
              newMetrics.averageConfidence = newMetrics.confidenceScores.reduce((a, b) => a + b, 0) / newMetrics.confidenceScores.length;
            }
            
            if (value.charactersExtracted) {
              newMetrics.totalCharactersExtracted += value.charactersExtracted;
            }
            
            if (value.pages) {
              newMetrics.pagesProcessed += value.pages;
            }
          }
          break;

        case 'processingFailed':
          newMetrics.filesFailed += 1;
          newMetrics.errorsEncountered += 1;
          break;

        case 'error':
          newMetrics.errorsEncountered += 1;
          break;

        case 'reset':
          return {
            sessionStartTime: now,
            filesReceived: 0,
            filesProcessed: 0,
            filesFailed: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0,
            processingTimes: [],
            totalCharactersExtracted: 0,
            averageConfidence: 0,
            confidenceScores: [],
            pagesProcessed: 0,
            errorsEncountered: 0,
            lastActivity: now,
          };

        default:
          console.warn(`Unknown metrics type: ${type}`);
      }

      return newMetrics;
    });
  }, []);

  const getSessionDuration = useCallback(() => {
    const duration = Date.now() - metrics.sessionStartTime;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }, [metrics.sessionStartTime]);

  const getSuccessRate = useCallback(() => {
    const totalAttempted = metrics.filesProcessed + metrics.filesFailed;
    if (totalAttempted === 0) return 0;
    return (metrics.filesProcessed / totalAttempted) * 100;
  }, [metrics.filesProcessed, metrics.filesFailed]);

  const getAverageCharactersPerFile = useCallback(() => {
    if (metrics.filesProcessed === 0) return 0;
    return Math.round(metrics.totalCharactersExtracted / metrics.filesProcessed);
  }, [metrics.totalCharactersExtracted, metrics.filesProcessed]);

  const getProcessingSpeed = useCallback(() => {
    if (metrics.averageProcessingTime === 0) return 0;
    return Math.round(60000 / metrics.averageProcessingTime); // Files per minute
  }, [metrics.averageProcessingTime]);

  const resetMetrics = useCallback(() => {
    updateMetrics('reset');
  }, [updateMetrics]);

  return {
    metrics,
    metricsExpanded,
    setMetricsExpanded,
    updateMetrics,
    getSessionDuration,
    getSuccessRate,
    getAverageCharactersPerFile,
    getProcessingSpeed,
    resetMetrics,
  };
};

export default useOcrMetrics;