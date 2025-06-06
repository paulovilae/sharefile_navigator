import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Divider,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Assessment as StatsIcon,
  ExpandMore as ExpandMoreIcon,
  Folder as FolderIcon,
  Description as FileIcon
} from '@mui/icons-material';

const SharePointSelectionMetrics = ({
  selectedItems = [],
  items = [],
  title = "Selection Statistics"
}) => {
  const [expanded, setExpanded] = useState(false);

  // Filter selected items by type
  const selectedFolders = selectedItems.filter(item => item.startsWith('folder-'));
  const selectedFiles = selectedItems.filter(item => item.startsWith('file-'));
  
  // Get actual file objects for detailed display
  const selectedFileObjects = items
    .filter(item => item.type === 'file')
    .filter(file => selectedFiles.includes(`file-${file.id}`));

  // Don't render if no items are selected
  if (!selectedItems || selectedItems.length === 0) {
    return null;
  }

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{ mb: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <StatsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Colored Chips on the Right - matching Block Metrics style */}
            {selectedFolders.length > 0 && (
              <Chip
                icon={<FolderIcon />}
                label={`${selectedFolders.length} folder${selectedFolders.length > 1 ? 's' : ''}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            {selectedFiles.length > 0 && (
              <Chip
                icon={<FileIcon />}
                label={`${selectedFiles.length} PDF${selectedFiles.length > 1 ? 's' : ''}`}
                size="small"
                color="error"
                variant="outlined"
              />
            )}
            {selectedItems.length > 0 && (
              <Chip
                icon={<FileIcon />}
                label={`${selectedItems.length} total`}
                size="small"
                color="secondary"
                variant="outlined"
              />
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {/* Selected Items List */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Selected Items ({selectedItems.length}):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selectedFileObjects.map((file) => (
              <Chip
                key={file.id}
                label={`${file.name} (file)`}
                size="small"
                variant="outlined"
              />
            ))}
            
            {selectedFolders.map((folderId) => {
              const folderIdClean = folderId.replace('folder-', '');
              const folder = items.find(item => item.type === 'folder' && item.id === folderIdClean);
              return (
                <Chip
                  key={folderId}
                  label={`${folder?.name || folderIdClean} (folder)`}
                  size="small"
                  variant="outlined"
                />
              );
            })}
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default SharePointSelectionMetrics;