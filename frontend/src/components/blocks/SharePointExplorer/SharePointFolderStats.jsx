import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Folder as FolderIcon,
  Description as FileIcon,
  PictureAsPdf as PdfIcon,
  Storage as SizeIcon,
  Refresh as RefreshIcon,
  Assessment as StatsIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import useSharePointFolderStats from './hooks/useSharePointFolderStats';

const SharePointFolderStats = ({ 
  selectedItems, 
  selectedLibrary, 
  onClose,
  title = "Selection Statistics" 
}) => {
  const { stats, loading, error, fetchFolderStats, clearStats } = useSharePointFolderStats();

  // Calculate stats for all selected folders
  useEffect(() => {
    if (selectedItems && selectedItems.length > 0 && selectedLibrary) {
      // For now, we'll calculate stats for the first selected folder
      // In a more advanced implementation, we could aggregate stats for multiple folders
      const firstFolderItem = selectedItems.find(item => item.startsWith('folder-'));
      if (firstFolderItem) {
        const folderId = firstFolderItem.replace('folder-', '');
        fetchFolderStats(selectedLibrary.id, folderId);
      }
    } else {
      clearStats();
    }
  }, [selectedItems, selectedLibrary, fetchFolderStats, clearStats]);

  if (!selectedItems || selectedItems.length === 0) {
    return null;
  }

  const selectedFolders = selectedItems.filter(item => item.startsWith('folder-'));
  const selectedFiles = selectedItems.filter(item => item.startsWith('file-'));

  return (
    <Card sx={{ mb: 2, border: '2px solid', borderColor: 'primary.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StatsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" color="primary.main">
              {title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {stats && (
              <Tooltip title="Refresh Statistics">
                <IconButton 
                  size="small" 
                  onClick={() => {
                    const firstFolderItem = selectedItems.find(item => item.startsWith('folder-'));
                    if (firstFolderItem) {
                      const folderId = firstFolderItem.replace('folder-', '');
                      fetchFolderStats(selectedLibrary.id, folderId);
                    }
                  }}
                  disabled={loading}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Close Statistics">
              <IconButton size="small" onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Selected Items Summary */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Items:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {selectedFolders.length > 0 && (
              <Chip
                icon={<FolderIcon />}
                label={`${selectedFolders.length} folder${selectedFolders.length > 1 ? 's' : ''}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            {selectedFiles.length > 0 && (
              <Chip
                icon={<FileIcon />}
                label={`${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
                color="secondary"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Folder Statistics */}
        {selectedFolders.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <FolderIcon sx={{ mr: 1, fontSize: 16 }} />
              Folder Contents Analysis
            </Typography>

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={24} sx={{ mr: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Analyzing folder contents...
                </Typography>
              </Box>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                Error loading folder statistics: {error}
              </Alert>
            )}

            {stats && !loading && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6} sm={3}>
                  <Box 
                    sx={{ 
                      textAlign: 'center', 
                      p: 2, 
                      bgcolor: 'primary.light', 
                      borderRadius: 1,
                      color: 'primary.contrastText'
                    }}
                  >
                    <Typography variant="h4">
                      {stats.total_folders}
                    </Typography>
                    <Typography variant="caption">
                      Total Folders
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box 
                    sx={{ 
                      textAlign: 'center', 
                      p: 2, 
                      bgcolor: 'secondary.light', 
                      borderRadius: 1,
                      color: 'secondary.contrastText'
                    }}
                  >
                    <Typography variant="h4">
                      {stats.total_files}
                    </Typography>
                    <Typography variant="caption">
                      Total Files
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box 
                    sx={{ 
                      textAlign: 'center', 
                      p: 2, 
                      bgcolor: 'error.light', 
                      borderRadius: 1,
                      color: 'error.contrastText'
                    }}
                  >
                    <Typography variant="h4">
                      {stats.pdf_files}
                    </Typography>
                    <Typography variant="caption">
                      PDF Files
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box 
                    sx={{ 
                      textAlign: 'center', 
                      p: 2, 
                      bgcolor: 'success.light', 
                      borderRadius: 1,
                      color: 'success.contrastText'
                    }}
                  >
                    <Typography variant="h6">
                      {stats.formatted_size}
                    </Typography>
                    <Typography variant="caption">
                      Total Size
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            )}

            {stats && !loading && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Work Ahead Summary:</strong> This selection contains {stats.total_files} files 
                  ({stats.pdf_files} PDFs ready for OCR processing) across {stats.total_folders} folders, 
                  totaling {stats.formatted_size} of data.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* File-only selection info */}
        {selectedFolders.length === 0 && selectedFiles.length > 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              <strong>File Selection:</strong> You have selected {selectedFiles.length} individual file{selectedFiles.length > 1 ? 's' : ''}.
              To see detailed statistics including total size, please select a folder.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SharePointFolderStats;