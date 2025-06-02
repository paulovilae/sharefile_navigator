import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { 
  FolderOpen as FolderIcon,
  Settings as SettingsIcon 
} from '@mui/icons-material';

import SharePointMetrics from './components/SharePointMetrics';
import SharePointSettings from './components/SharePointSettings';
import SharePointProcessor from './components/SharePointProcessor';
import SharePointResults from './components/SharePointResults';
import useSharePointMetrics from './hooks/useSharePointMetrics';

/**
 * Unified SharePoint Explorer Block - Handles SharePoint file exploration and selection
 * Features:
 * - File and folder navigation
 * - Multi-select capabilities
 * - Real-time metrics tracking
 * - Configurable settings
 * - Modular component architecture
 */
const SharePointExplorer = ({ 
  config = {}, 
  onExecutionUpdate, 
  onSelectionChange, 
  multiSelect = true,
  selectedFiles = []
}) => {
  const [globalMetrics, setGlobalMetrics] = useState({
    sessionStartTime: Date.now(),
    totalInteractions: 0,
    totalItemsLoaded: 0,
    currentFolderCount: 0,
    currentFileCount: 0,
    librariesExplored: new Set(),
    averageResponseTime: 0,
    totalDataTransferred: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastActivity: Date.now()
  });

  const [settings, setSettings] = useState({
    // Display Settings
    viewMode: 'grid', // grid, list, table
    itemsPerPage: 20,
    showHiddenFiles: false,
    sortBy: 'name',
    sortOrder: 'asc',
    
    // Performance Settings
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    preloadThumbnails: true,
    batchSize: 50,
    
    // Selection Settings
    multiSelect: multiSelect,
    selectFoldersOnly: false,
    selectFilesOnly: false,
    allowedFileTypes: [], // Empty means all types
    
    // Navigation Settings
    showBreadcrumbs: true,
    enableBackButton: true,
    rememberLastPath: true
  });

  const [explorerResults, setExplorerResults] = useState({
    currentPath: [],
    items: [],
    selectedItems: selectedFiles,
    isLoading: false,
    error: null
  });

  // Custom hooks
  const { trackMetric, getMetrics, resetMetrics } = useSharePointMetrics();

  // Update global metrics from child components
  const updateGlobalMetrics = useCallback((metrics) => {
    setGlobalMetrics(prev => ({
      ...prev,
      ...metrics,
      lastActivity: Date.now()
    }));

    // Report to parent component
    if (onExecutionUpdate) {
      onExecutionUpdate({
        status: 'running',
        logs: `SharePoint metrics updated at ${new Date().toISOString()}`,
        result: { metrics: { ...globalMetrics, ...metrics } }
      });
    }
  }, [globalMetrics, onExecutionUpdate]);

  // Handle settings change
  const handleSettingChange = useCallback((setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback((selectedItems) => {
    setExplorerResults(prev => ({
      ...prev,
      selectedItems
    }));

    // Track selection metric
    trackMetric('items_selected', {
      count: selectedItems.length,
      types: selectedItems.map(item => item.itemType)
    });

    // Report to parent
    if (onSelectionChange) {
      onSelectionChange(selectedItems);
    }
  }, [trackMetric, onSelectionChange]);

  // Handle navigation
  const handleNavigation = useCallback((path, items) => {
    setExplorerResults(prev => ({
      ...prev,
      currentPath: path,
      items: items || []
    }));

    // Track navigation metric
    trackMetric('navigation', {
      pathDepth: path.length,
      itemCount: items?.length || 0
    });

    // Update folder/file counts
    const folderCount = items?.filter(item => item.itemType === 'folder').length || 0;
    const fileCount = items?.filter(item => item.itemType === 'file').length || 0;
    
    updateGlobalMetrics({
      currentFolderCount: folderCount,
      currentFileCount: fileCount,
      totalItemsLoaded: globalMetrics.totalItemsLoaded + (items?.length || 0)
    });
  }, [trackMetric, updateGlobalMetrics, globalMetrics.totalItemsLoaded]);

  return (
    <Box>
      {/* Global Metrics */}
      <SharePointMetrics 
        metrics={globalMetrics}
        title="SharePoint Explorer Metrics"
      />

      {/* Settings Panel */}
      <SharePointSettings 
        settings={settings}
        onSettingChange={handleSettingChange}
        title="SharePoint Explorer Settings"
      />

      {/* Main Processor */}
      <SharePointProcessor
        config={config}
        settings={settings}
        onMetricsUpdate={updateGlobalMetrics}
        onExecutionUpdate={onExecutionUpdate}
        onSelectionChange={handleSelectionChange}
        onNavigation={handleNavigation}
        multiSelect={multiSelect}
      />

      {/* Results Display */}
      <SharePointResults
        results={explorerResults}
        settings={settings}
        onSelectionChange={handleSelectionChange}
        onNavigation={handleNavigation}
      />
    </Box>
  );
};

export default SharePointExplorer;