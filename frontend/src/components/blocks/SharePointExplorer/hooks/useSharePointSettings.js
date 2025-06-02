import { useState, useCallback } from 'react';

const useSharePointSettings = () => {
  const [settings, setSettings] = useState({
    // File filtering
    showOnlyPDFs: false,
    enableFileTypeFilter: false,
    allowedExtensions: ['pdf', 'docx', 'xlsx', 'pptx'],
    
    // Display options
    viewMode: 'table', // 'table', 'grid', 'list'
    itemsPerPage: 25,
    showFilePreview: true,
    
    // Performance
    autoRefreshInterval: 0, // 0 = disabled, in seconds
    enableMetrics: true,
    
    // Caching
    enableCaching: true,
    cacheTTL: 15, // minutes
    
    // Selection
    multiSelect: true,
    enableBulkActions: true,
    
    // Advanced
    enableDebugMode: false,
    showHiddenFiles: false
  });

  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({
      showOnlyPDFs: false,
      enableFileTypeFilter: false,
      allowedExtensions: ['pdf', 'docx', 'xlsx', 'pptx'],
      viewMode: 'table',
      itemsPerPage: 25,
      showFilePreview: true,
      autoRefreshInterval: 0,
      enableMetrics: true,
      enableCaching: true,
      cacheTTL: 15,
      multiSelect: true,
      enableBulkActions: true,
      enableDebugMode: false,
      showHiddenFiles: false
    });
  }, []);

  // Helper function to check if a file should be displayed based on settings
  const shouldDisplayFile = useCallback((file) => {
    if (!file || !file.name) return false;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    // If showing only PDFs
    if (settings.showOnlyPDFs) {
      return ext === 'pdf';
    }
    
    // If file type filter is enabled
    if (settings.enableFileTypeFilter && settings.allowedExtensions.length > 0) {
      return settings.allowedExtensions.includes(ext);
    }
    
    // Show all files by default
    return true;
  }, [settings.showOnlyPDFs, settings.enableFileTypeFilter, settings.allowedExtensions]);

  // Helper function to filter files based on settings
  const filterFiles = useCallback((files) => {
    if (!Array.isArray(files)) return [];
    
    return files.filter(shouldDisplayFile);
  }, [shouldDisplayFile]);

  // Helper function to get display settings for the current view mode
  const getDisplaySettings = useCallback(() => {
    return {
      viewMode: settings.viewMode,
      itemsPerPage: settings.itemsPerPage,
      showPreview: settings.showFilePreview,
      enableMetrics: settings.enableMetrics,
      multiSelect: settings.multiSelect
    };
  }, [settings]);

  return {
    settings,
    settingsExpanded,
    setSettingsExpanded,
    updateSettings,
    resetSettings,
    shouldDisplayFile,
    filterFiles,
    getDisplaySettings
  };
};

export default useSharePointSettings;