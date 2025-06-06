import { ThemeProvider } from '@mui/material/styles';
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
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox, // Added for selection
  useTheme, // Added for styling selected cards
  Button // Added for Process with OCR button
} from '@mui/material';
import {
Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  Visibility as ViewIcon,
  Assessment as MetricsIcon,
  Timer as TimerIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon, // Keep for a potential explicit refresh, if added later
  ArrowBack as ArrowBackIcon, // Added for back navigation
  ExpandMore as ExpandMoreIcon,
  Speed as SpeedIcon,
  Storage as CacheIcon,
  FolderOpen as FolderOpenIcon,
  Description as FileCountIcon
} from '@mui/icons-material';

import GenericFileEditor from '../../../components/GenericFileEditor'; // Adjusted path
import { formatDate, formatFileSize } from '../../../utils/formattingUtils'; // For column rendering
import { getFileIcon, isDigitizable, isPreviewable } from '../../../utils/fileUtils'; // For column rendering & status
import sharePointCache, { withCache } from '../../../utils/cacheUtils'; // Added for caching
import { fetchOcrStatuses as fetchOcrStatusesAPI } from '../../../utils/apiUtils'; // For fetching statuses

// Import status icons
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CachedIcon from '@mui/icons-material/Cached'; // For processing states
import GetAppIcon from '@mui/icons-material/GetApp'; // For download action
import ExplorerCardGrid from './ExplorerCardGrid'; // Single import
import SharePointExplorerHeader from './SharePointExplorerHeader';
import SharePointExplorerMetrics from './SharePointExplorerMetrics';
import SharePointExplorerBlockWrapper from './SharePointExplorerBlockWrapper';


// ExplorerCardGrid component is now imported from its own file.

/**
 * SharePoint Explorer Block with integrated metrics tracking
 * Tracks user interactions, file access patterns, and performance metrics
 */
const SharePointExplorerBlock = ({ config, onExecutionUpdate, onSelectionChange, multiSelect = true }) => {
  //const theme = useTheme(); // Added for ExplorerCardGrid styling if needed directly here later

  const [currentPath, setCurrentPath] = useState([]); // Initialize currentPath state
  const [metricsExpanded, setMetricsExpanded] = useState(false);
  
  // State to hold metrics from the wrapper
  const [metricsData, setMetricsData] = useState({
    metrics: {
      currentFolderCount: 0,
      currentFileCount: 0,
      librariesExplored: new Set(),
      averageResponseTime: 0,
      totalDataTransferred: 0,
      totalInteractions: 0,
      totalItemsLoaded: 0
    },
    setMetrics: () => {},
    getSessionDuration: () => '0s'
  });

  // Placeholder for navigation logic
  const handleNavigateBack = useCallback(() => {
    if (currentPath.length > 0) {
      // Basic example: go back one level.
      // More sophisticated logic might be needed depending on how paths are structured.
      // This will be further refined when useSharePointHandlers is implemented.
      setCurrentPath(prevPath => prevPath.slice(0, -1));
      console.log("Navigating back. New path:", currentPath.slice(0, -1));
    }
  }, [currentPath, setCurrentPath]);

  // Callback to receive metrics from wrapper
  const handleMetricsUpdate = useCallback((newMetricsData) => {
    setMetricsData(newMetricsData);
  }, []);

return (
  <Box>
    <SharePointExplorerMetrics
      metrics={metricsData.metrics}
      metricsExpanded={metricsExpanded}
      setMetricsExpanded={setMetricsExpanded}
      getSessionDuration={metricsData.getSessionDuration}
    />

        <SharePointExplorerHeader currentPath={currentPath} handleNavigateBack={handleNavigateBack} />

        <SharePointExplorerBlockWrapper
          config={config}
          onSelectionChange={onSelectionChange}
          onExecutionUpdate={(update) => {
            if (onExecutionUpdate) {
              // Add reload function to the execution update
              onExecutionUpdate({
                ...update,
                onReload: () => {
                  // This will be provided by the wrapper
                  if (update.onReload) {
                    update.onReload();
                  }
                }
              });
            }
          }}
          multiSelect={multiSelect}
          onMetricsUpdate={handleMetricsUpdate}
        />
    </Box>
  );
};

export default SharePointExplorerBlock;