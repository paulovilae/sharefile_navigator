import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Button,
  Stack,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  Cached as CachedIcon,
  Visibility as ViewIcon,
  GetApp as GetAppIcon,
  ArrowBack as ArrowBackIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import ExplorerCardGrid from './ExplorerCardGrid';
import SharePointFileTable from './SharePointFileTable';
import { formatDate, formatFileSize } from '../../../utils/formattingUtils';
import { getFileIcon, isDigitizable, isPreviewable } from '../../../utils/fileUtils';

const SharePointExplorerContent = ({
  selectedLibrary,
  loading,
  error,
  libraries,
  items,
  currentPath,
  setCurrentPath,
  setSelectedLibrary,
  handleLibrarySelect,
  handleFolderClick,
  handleBackNavigation,
  isItemSelected,
  handleSelectItem,
  fileStatuses,
  selectedItems,
  handleFileSelectionChange,
  fetchLibraries, // For refresh on initial error
}) => {

  // Navigation handlers
  const handleBackClick = () => {
    if (currentPath && currentPath.length > 1) {
      // Navigate to parent folder
      const newPath = currentPath.slice(0, -1);
      const libraryId = selectedLibrary?.id;
      handleBackNavigation(newPath, libraryId);
    } else {
      // Back to library selection
      handleBackNavigation([], null);
    }
  };

  const handleBreadcrumbClick = (index) => {
    if (index === 0 && currentPath.length > 1) {
      // Clicked on library name, go back to library root
      const libraryPath = currentPath.slice(0, 1);
      const libraryId = selectedLibrary?.id;
      handleBackNavigation(libraryPath, libraryId);
    } else if (index < currentPath.length - 1) {
      // Clicked on intermediate folder
      const newPath = currentPath.slice(0, index + 1);
      const libraryId = selectedLibrary?.id;
      handleBackNavigation(newPath, libraryId);
    }
  };

  // Initial loading state for libraries
  if (loading && !selectedLibrary && libraries.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading SharePoint libraries...
        </Typography>
      </Box>
    );
  }

  // Initial error state for libraries
  if (error && !selectedLibrary && libraries.length === 0) {
    return (
      <Alert severity="error" action={
        <IconButton size="small" onClick={fetchLibraries}>
          <RefreshIcon />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {!selectedLibrary ? (
        // Library Selection
        <Box>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, color: 'primary.main' }}>
            SharePoint Libraries
          </Typography>
          <Grid container spacing={2}>
          {libraries.map((library) => (
            <Grid item xs={12} sm={6} md={4} key={library.id}>
              <Card 
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} // Use boxShadow for hover
                onClick={() => handleLibrarySelect(library)}
              >
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <FolderIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" noWrap>
                      {library.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {library.description || 'SharePoint Document Library'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
         </Grid>
       </Box>
      ) : (
        // Folder/File Listing with Navigation
        <Box>
          {/* Navigation Header */}
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackClick}
              size="small"
            >
              Back
            </Button>
            
            {/* Breadcrumb Navigation */}
            <Box flex={1}>
              <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                aria-label="breadcrumb"
                sx={{
                  '& .MuiBreadcrumbs-separator': {
                    color: 'primary.main'
                  }
                }}
              >
                <Link
                  component="button"
                  variant="body1"
                  onClick={() => handleBreadcrumbClick(0)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: 'primary.main',
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
                  {selectedLibrary.name}
                </Link>
                
                {currentPath && currentPath.length > 1 && currentPath.slice(1).map((pathItem, index) => {
                  const isLast = index === currentPath.length - 2;
                  return isLast ? (
                    <Typography
                      key={pathItem.id}
                      color="text.primary"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 500
                      }}
                    >
                      <FolderIcon sx={{ mr: 0.5, fontSize: 20 }} />
                      {pathItem.name}
                    </Typography>
                  ) : (
                    <Link
                      key={pathItem.id}
                      component="button"
                      variant="body1"
                      onClick={() => handleBreadcrumbClick(index + 1)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: 'primary.main',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      <FolderIcon sx={{ mr: 0.5, fontSize: 20 }} />
                      {pathItem.name}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            </Box>
          </Stack>
          {/* Loading indicator for folder/file items specifically */}
          {loading && items.length === 0 && ( 
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Loading items...
              </Typography>
            </Box>
          )}
          
          {/* More subtle loading when items already exist but are being refreshed */}
          {loading && items.length > 0 && ( 
             <Box display="flex" justifyContent="center" my={2}>
               <CircularProgress size={24} />
             </Box>
          )}
          
          {/* Error display for folder/file items */}
          {error && !loading && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Folders */}
          {!loading && !error && items.filter(item => item.type === 'folder').length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Folders</Typography>
              <ExplorerCardGrid
                data={items.filter(item => item.type === 'folder')}
                onCardClick={handleFolderClick}
                icon={<FolderIcon />}
                isItemSelected={isItemSelected}
                handleSelectItem={handleSelectItem}
                itemType="folder"
                selectionMode={!!handleFileSelectionChange}
              />
            </Box>
          )}

          {/* Files */}
          {!loading && !error && items.filter(item => item.type === 'file').length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Files</Typography>
              <SharePointFileTable
                files={items.filter(item => item.type === 'file')}
                selectedLibrary={selectedLibrary}
                selectedFiles={selectedItems.filter(id => id.startsWith('file-')).map(id => id.replace(/^file-/, ''))}
                onFileSelectionChange={(fileIds) => {
                  const fileSelections = fileIds.map(id => `file-${id}`);
                  const otherSelections = selectedItems.filter(id => !id.startsWith('file-'));
                  handleFileSelectionChange && handleFileSelectionChange([...otherSelections, ...fileSelections]);
                }}
                onPreview={(file) => {
                  // Simple preview: open file in new tab
                  const url = `/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${file.id}&preview=true`;
                  window.open(url, '_blank');
                }}
                selectionMode={!!handleFileSelectionChange}
              />
            </Box>
          )}
        </Box>
          )}

          {/* Message for empty folder/no items */}
          {!loading && !error && items.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No items found in this location.
              </Typography>
            </Box>
          )}
        </Box>
  );
};

export default SharePointExplorerContent;