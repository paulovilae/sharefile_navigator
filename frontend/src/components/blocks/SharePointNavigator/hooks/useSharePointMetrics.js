import { useState } from 'react';

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
    totalDataTransferred: 0
  });

  return { metrics, setMetrics };
};

export default useSharePointMetrics;