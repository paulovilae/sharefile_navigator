import { useState, useCallback, useRef } from 'react';

const useSharePointMetrics = () => {
  const [metrics, setMetrics] = useState({
    sessionStartTime: Date.now(),
    totalInteractions: 0,
    foldersAccessed: 0,
    filesViewed: 0,
    librariesExplored: new Set(),
    averageResponseTime: 0,
    responseTimes: [],
    errorCount: 0,
    lastActivity: Date.now(),
    currentFolderCount: 0,
    currentFileCount: 0,
    totalItemsLoaded: 0,
    cacheHits: 0,
    cacheMisses: 0,
    largestFileSize: 0,
    totalDataTransferred: 0,
    pdfFilesCount: 0,
    otherFilesCount: 0,
    searchQueries: 0,
    downloadCount: 0,
    previewCount: 0,
    selectionCount: 0,
    navigationDepth: 0,
    maxNavigationDepth: 0
  });

  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Helper function to calculate session duration
  const getSessionDuration = useCallback(() => {
    const duration = Date.now() - startTimeRef.current;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Track user interactions
  const trackInteraction = useCallback((type, data = {}) => {
    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        totalInteractions: prev.totalInteractions + 1,
        lastActivity: Date.now()
      };

      switch (type) {
        case 'folder_click':
          newMetrics.foldersAccessed = prev.foldersAccessed + 1;
          newMetrics.navigationDepth = data.depth || 0;
          newMetrics.maxNavigationDepth = Math.max(prev.maxNavigationDepth, data.depth || 0);
          break;
        
        case 'file_view':
          newMetrics.filesViewed = prev.filesViewed + 1;
          newMetrics.previewCount = prev.previewCount + 1;
          break;
        
        case 'library_select':
          newMetrics.librariesExplored = new Set([...prev.librariesExplored, data.libraryId]);
          break;
        
        case 'search':
          newMetrics.searchQueries = prev.searchQueries + 1;
          break;
        
        case 'download':
          newMetrics.downloadCount = prev.downloadCount + 1;
          break;
        
        case 'selection':
          newMetrics.selectionCount = prev.selectionCount + 1;
          break;
        
        case 'error':
          newMetrics.errorCount = prev.errorCount + 1;
          break;
        
        default:
          break;
      }

      return newMetrics;
    });
  }, []);

  // Track response times
  const trackResponseTime = useCallback((responseTime) => {
    setMetrics(prev => {
      const newResponseTimes = [...prev.responseTimes, responseTime];
      // Keep only last 50 response times for average calculation
      if (newResponseTimes.length > 50) {
        newResponseTimes.shift();
      }
      
      const averageResponseTime = newResponseTimes.reduce((sum, time) => sum + time, 0) / newResponseTimes.length;
      
      return {
        ...prev,
        responseTimes: newResponseTimes,
        averageResponseTime
      };
    });
  }, []);

  // Update current view metrics
  const updateCurrentView = useCallback((folders, files) => {
    setMetrics(prev => {
      const pdfFiles = files.filter(file =>
        file.name?.toLowerCase().endsWith('.pdf')
      ).length;
      
      const otherFiles = files.length - pdfFiles;
      
      return {
        ...prev,
        currentFolderCount: folders.length,
        currentFileCount: files.length,
        pdfFilesCount: pdfFiles,
        otherFilesCount: otherFiles,
        totalItemsLoaded: prev.totalItemsLoaded + folders.length + files.length
      };
    });
  }, []);

  // Track cache performance
  const trackCacheHit = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      cacheHits: prev.cacheHits + 1
    }));
  }, []);

  const trackCacheMiss = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      cacheMisses: prev.cacheMisses + 1
    }));
  }, []);

  // Track data transfer
  const trackDataTransfer = useCallback((bytes) => {
    setMetrics(prev => ({
      ...prev,
      totalDataTransferred: prev.totalDataTransferred + bytes,
      largestFileSize: Math.max(prev.largestFileSize, bytes)
    }));
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    startTimeRef.current = Date.now();
    setMetrics({
      sessionStartTime: Date.now(),
      totalInteractions: 0,
      foldersAccessed: 0,
      filesViewed: 0,
      librariesExplored: new Set(),
      averageResponseTime: 0,
      responseTimes: [],
      errorCount: 0,
      lastActivity: Date.now(),
      currentFolderCount: 0,
      currentFileCount: 0,
      totalItemsLoaded: 0,
      cacheHits: 0,
      cacheMisses: 0,
      largestFileSize: 0,
      totalDataTransferred: 0,
      pdfFilesCount: 0,
      otherFilesCount: 0,
      searchQueries: 0,
      downloadCount: 0,
      previewCount: 0,
      selectionCount: 0,
      navigationDepth: 0,
      maxNavigationDepth: 0
    });
  }, []);

  // Get cache hit rate
  const getCacheHitRate = useCallback(() => {
    const total = metrics.cacheHits + metrics.cacheMisses;
    return total > 0 ? (metrics.cacheHits / total) * 100 : 0;
  }, [metrics.cacheHits, metrics.cacheMisses]);

  return {
    metrics,
    setMetrics,
    metricsExpanded,
    setMetricsExpanded,
    getSessionDuration,
    trackInteraction,
    trackResponseTime,
    updateCurrentView,
    trackCacheHit,
    trackCacheMiss,
    trackDataTransfer,
    resetMetrics,
    getCacheHitRate
  };
};

export default useSharePointMetrics;