import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  PictureAsPdf as PictureAsPdfIcon,
  Description as DescriptionIcon,
  TableChart as TableChartIcon,
  Image as ImageIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassEmptyIcon,
  NotInterested as NotInterestedIcon,
  TextSnippet as TextSnippetIcon,
} from '@mui/icons-material';

// File icon helper function with correct colors
function getFileIcon(filename, disabled = false) {
  const ext = filename.split('.').pop().toLowerCase();
  const baseColor = disabled ? '#BDBDBD' : undefined; // Grey color for disabled state
  
  if (['pdf'].includes(ext)) return <PictureAsPdfIcon sx={{ color: baseColor || '#D32F2F', fontSize: 20, mr: 1 }} />; // Red for PDF
  if (['doc', 'docx'].includes(ext)) return <DescriptionIcon sx={{ color: baseColor || '#1976D2', fontSize: 20, mr: 1 }} />; // Blue for Word
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <TableChartIcon sx={{ color: baseColor || '#388E3C', fontSize: 20, mr: 1 }} />; // Green for Excel
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) return <ImageIcon sx={{ color: baseColor || '#FF9800', fontSize: 20, mr: 1 }} />; // Orange for images
  return <InsertDriveFileIcon sx={{ color: baseColor || '#757575', fontSize: 20, mr: 1 }} />; // Gray for other files
}

// Helper function to check if a file is digitizable (PDF)
function isDigitizable(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return ['pdf'].includes(ext);
}

// Smart file size formatter
function formatFileSize(bytes) {
  if (bytes === 0 || bytes == null) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Helper to check previewable type
function getPreviewType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (["pdf"].includes(ext)) return "pdf";
  if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) return "image";
  if (["txt", "csv", "log", "md", "json"].includes(ext)) return "text";
  return null;
}

// Function to get OCR status icon and color
function getOcrStatusDisplay(status) {
  if (!status) {
    return {
      icon: <NotInterestedIcon sx={{ fontSize: 16, color: '#757575' }} />,
      text: 'Not processed',
      color: '#757575'
    };
  }
  
  switch (status.toLowerCase()) {
    case 'completed':
    case 'ocr done':
    case 'text_extracted':
    case 'ocr_processed':
    case 'preloaded':
      return {
        icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#4caf50' }} />,
        text: status.toLowerCase() === 'text_extracted' ? 'Text Extracted' :
              status.toLowerCase() === 'ocr_processed' ? 'OCR Processed' :
              status.toLowerCase() === 'preloaded' ? 'Previously Processed' : 'Completed',
        color: '#4caf50'
      };
    case 'error':
    case 'failed':
      return {
        icon: <ErrorIcon sx={{ fontSize: 16, color: '#f44336' }} />,
        text: 'Error',
        color: '#f44336'
      };
    case 'processing':
    case 'processing ocr':
    case 'queued':
    case 'pending':
    case 'llm reviewing':
    case 'retry w/ dpi':
    case 'retry w/ image ocr':
      return {
        icon: <HourglassEmptyIcon sx={{ fontSize: 16, color: '#ff9800' }} />,
        text: 'Processing',
        color: '#ff9800'
      };
    case 'needs manual review':
      return {
        icon: <ErrorIcon sx={{ fontSize: 16, color: '#ff9800' }} />,
        text: 'Needs Review',
        color: '#ff9800'
      };
    default:
      return {
        icon: <NotInterestedIcon sx={{ fontSize: 16, color: '#757575' }} />,
        text: status,
        color: '#757575'
      };
  }
}

const SharePointFileTable = ({ files, selectedLibrary, onPreview, selectedFiles = [], onFileSelectionChange, selectionMode = false }) => {
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [nameFilter, setNameFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [modifiedByFilter, setModifiedByFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [ocrStatuses, setOcrStatuses] = useState({});
  const [ocrTextDialog, setOcrTextDialog] = useState({ open: false, file: null, text: '', loading: false });

  // Fetch OCR statuses for PDF files
  useEffect(() => {
    const fetchOcrStatuses = async () => {
      const pdfFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
      
      const statusPromises = pdfFiles.map(async (file) => {
        try {
          const url = `/api/ocr/status/${file.id}`;
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            return { fileId: file.id, status: data.status };
          }
        } catch (error) {
          console.log(`Error fetching OCR status for ${file.name}:`, error);
        }
        return { fileId: file.id, status: null };
      });

      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(({ fileId, status }) => {
        statusMap[fileId] = status;
      });
      
      setOcrStatuses(statusMap);
    };

    if (files.length > 0) {
      fetchOcrStatuses();
    }
  }, [files]);

  // Update sort logic for nested fields
  const getSortValue = (file, field) => {
    if (field === 'createdBy') return file.createdBy?.displayName || file.createdBy?.email || '';
    if (field === 'lastModifiedBy') return file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '';
    if (field === 'size') return file.size || 0;
    if (field === 'created' || field === 'modified') return file[field] || '';
    return file[field] ?? '';
  };

  // Sort and filter files
  const sortedFiles = useMemo(() => {
    const sorted = [...files];
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, sortField);
      const bValue = getSortValue(b, sortField);
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [files, sortField, sortOrder]);

  const filteredFiles = useMemo(() => {
    return sortedFiles.filter(file => {
      const nameMatch = file.name.toLowerCase().includes(nameFilter.toLowerCase());
      const createdBy = file.createdBy?.displayName || file.createdBy?.email || '';
      const createdByMatch = createdBy.toLowerCase().includes(createdByFilter.toLowerCase());
      const modifiedBy = file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '';
      const modifiedByMatch = modifiedBy.toLowerCase().includes(modifiedByFilter.toLowerCase());
      return nameMatch && createdByMatch && modifiedByMatch;
    });
  }, [sortedFiles, nameFilter, createdByFilter, modifiedByFilter]);

  // Pagination for files
  const paginatedFiles = filteredFiles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const fileCount = filteredFiles.length;

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handlePreview = (file) => {
    const type = getPreviewType(file.name);
    if (type && onPreview) {
      onPreview(file);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      // Only select digitizable files when in selection mode
      const filesToSelect = selectionMode
        ? filteredFiles.filter(file => isDigitizable(file.name))
        : filteredFiles;
      const allFileIds = filesToSelect.map(file => file.id);
      onFileSelectionChange && onFileSelectionChange(allFileIds);
    } else {
      onFileSelectionChange && onFileSelectionChange([]);
    }
  };

  const handleSelectFile = (fileId, filename) => {
    if (!onFileSelectionChange) return;
    
    // Prevent selection of non-digitizable files in selection mode
    if (selectionMode && !isDigitizable(filename)) {
      return;
    }
    
    const newSelection = selectedFiles.includes(fileId)
      ? selectedFiles.filter(id => id !== fileId)
      : [...selectedFiles, fileId];
    
    onFileSelectionChange(newSelection);
  };

  const selectableFiles = selectionMode ? filteredFiles.filter(file => isDigitizable(file.name)) : filteredFiles;
  const isAllSelected = selectableFiles.length > 0 && selectableFiles.every(file => selectedFiles.includes(file.id));
  const isIndeterminate = selectedFiles.length > 0 && !isAllSelected;

  // Function to view OCR text for a file
  const handleViewOcrText = async (file) => {
    setOcrTextDialog({ open: true, file, text: '', loading: true });
    
    try {
      const response = await fetch(`/api/ocr/text/${file.id}`);
      if (response.ok) {
        const data = await response.json();
        const text = data.text || 'No text content available';
        setOcrTextDialog({ open: true, file, text, loading: false });
      } else {
        setOcrTextDialog({ open: true, file, text: 'Failed to load OCR text', loading: false });
      }
    } catch (error) {
      console.error('Error fetching OCR text:', error);
      setOcrTextDialog({ open: true, file, text: 'Error loading OCR text', loading: false });
    }
  };

  // Function to close OCR text dialog
  const handleCloseOcrText = () => {
    setOcrTextDialog({ open: false, file: null, text: '', loading: false });
  };

  // Check if file has processed OCR text
  const hasOcrText = (fileId) => {
    const status = ocrStatuses[fileId];
    if (!status) return false;
    
    const normalizedStatus = status.toLowerCase().trim();
    const validStatuses = [
      'completed',
      'ocr done',
      'text_extracted',
      'ocr_processed',
      'preloaded',
      'success'
    ];
    
    const successIndicators = ['extract', 'process', 'complet', 'done', 'success'];
    const hasSuccessIndicator = successIndicators.some(indicator =>
      normalizedStatus.includes(indicator)
    );
    
    return validStatuses.includes(normalizedStatus) || hasSuccessIndicator;
  };

  if (files.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary">
          No files found in this location.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={input => {
                  if (input) input.indeterminate = isIndeterminate;
                }}
                onChange={handleSelectAll}
              />
            </TableCell>
            <TableCell sx={{ width: 32, fontWeight: 600, color: '#512698' }}>#</TableCell>
            <TableCell sortDirection={sortField === 'name' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'name'}
                direction={sortField === 'name' ? sortOrder : 'asc'}
                onClick={() => handleSort('name')}
              >
                Name
              </TableSortLabel>
            </TableCell>
            <TableCell align="right" sortDirection={sortField === 'size' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'size'}
                direction={sortField === 'size' ? sortOrder : 'asc'}
                onClick={() => handleSort('size')}
              >
                Size
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'created' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'created'}
                direction={sortField === 'created' ? sortOrder : 'asc'}
                onClick={() => handleSort('created')}
              >
                Created
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'createdBy' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'createdBy'}
                direction={sortField === 'createdBy' ? sortOrder : 'asc'}
                onClick={() => handleSort('createdBy')}
              >
                Created by
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'modified' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'modified'}
                direction={sortField === 'modified' ? sortOrder : 'asc'}
                onClick={() => handleSort('modified')}
              >
                Modified
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'lastModifiedBy' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'lastModifiedBy'}
                direction={sortField === 'lastModifiedBy' ? sortOrder : 'asc'}
                onClick={() => handleSort('lastModifiedBy')}
              >
                Modified by
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
          <TableRow>
            <TableCell />
            <TableCell>
              <TextField
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                placeholder="Filter"
                variant="standard"
                size="small"
                fullWidth
                InputProps={{ sx: { fontSize: 13 } }}
              />
            </TableCell>
            <TableCell />
            <TableCell />
            <TableCell />
            <TableCell>
              <TextField
                value={createdByFilter}
                onChange={e => setCreatedByFilter(e.target.value)}
                placeholder="Filter"
                variant="standard"
                size="small"
                fullWidth
                InputProps={{ sx: { fontSize: 13 } }}
              />
            </TableCell>
            <TableCell />
            <TableCell>
              <TextField
                value={modifiedByFilter}
                onChange={e => setModifiedByFilter(e.target.value)}
                placeholder="Filter"
                variant="standard"
                size="small"
                fullWidth
                InputProps={{ sx: { fontSize: 13 } }}
              />
            </TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedFiles.map((file, idx) => {
            const isFileDigitizable = isDigitizable(file.name);
            const isFileDisabled = selectionMode && !isFileDigitizable;
            
            return (
              <TableRow
                key={file.id}
                hover={!isFileDisabled}
                sx={{
                  height: 28,
                  opacity: isFileDisabled ? 0.5 : 1,
                  cursor: isFileDisabled ? 'not-allowed' : 'default'
                }}
              >
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.id)}
                    onChange={() => handleSelectFile(file.id, file.name)}
                    disabled={isFileDisabled}
                    style={{ opacity: isFileDisabled ? 0.3 : 1 }}
                  />
                </TableCell>
                <TableCell sx={{ width: 32, fontWeight: 500, color: isFileDisabled ? '#BDBDBD' : '#512698' }}>
                  {page * rowsPerPage + idx + 1}
                </TableCell>
                <TableCell component="th" scope="row" sx={{ py: 0.5 }}>
                  <Box display="flex" alignItems="center">
                    {getFileIcon(file.name, isFileDisabled)}
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        ml: 1,
                        maxWidth: 220,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        color: isFileDisabled ? 'text.disabled' : 'inherit'
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{
                      maxWidth: 90,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      color: isFileDisabled ? 'text.disabled' : 'inherit'
                    }}
                    title={formatFileSize(file.size)}
                  >
                    {formatFileSize(file.size)}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Tooltip title={file.created ? new Date(file.created).toLocaleString() : '-'}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        maxWidth: 80,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        color: isFileDisabled ? 'text.disabled' : 'inherit'
                      }}
                    >
                      {file.created ? new Date(file.created).toLocaleDateString() : '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Tooltip title={file.createdBy?.displayName || file.createdBy?.email || '-'}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        maxWidth: 100,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        color: isFileDisabled ? 'text.disabled' : 'inherit'
                      }}
                    >
                      {file.createdBy?.displayName || file.createdBy?.email || '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Tooltip title={file.modified ? new Date(file.modified).toLocaleString() : '-'}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        maxWidth: 80,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        color: isFileDisabled ? 'text.disabled' : 'inherit'
                      }}
                    >
                      {file.modified ? new Date(file.modified).toLocaleDateString() : '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Tooltip title={file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '-'}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        maxWidth: 100,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                        color: isFileDisabled ? 'text.disabled' : 'inherit'
                      }}
                    >
                      {file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '-'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="center" sx={{ py: 0.5 }}>
                  {file.name.toLowerCase().endsWith('.pdf') ? (
                    <Box display="flex" alignItems="center" justifyContent="center">
                      {(() => {
                        const statusDisplay = getOcrStatusDisplay(ocrStatuses[file.id]);
                        return (
                          <>
                            {statusDisplay.icon}
                            <Typography
                              variant="caption"
                              sx={{
                                ml: 0.5,
                                color: isFileDisabled ? 'text.disabled' : statusDisplay.color,
                                fontWeight: 500
                              }}
                            >
                              {statusDisplay.text}
                            </Typography>
                          </>
                        );
                      })()}
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.disabled">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center" sx={{ py: 0.5 }}>
                  <Box display="flex" flexDirection="row" alignItems="center" gap={0.5}>
                    <IconButton
                      onClick={() => {
                        // Download file
                        const url = `/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${file.id}&download=1`;
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', file.name);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      size="small"
                      title="Download"
                      disabled={isFileDisabled}
                      sx={{ opacity: isFileDisabled ? 0.3 : 1 }}
                    >
                      <GetAppIcon />
                    </IconButton>
                    {getPreviewType(file.name) && (
                      <IconButton
                        onClick={() => handlePreview(file)}
                        size="small"
                        title="Preview"
                        disabled={isFileDisabled}
                        sx={{ opacity: isFileDisabled ? 0.3 : 1 }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    )}
                    {file.name.toLowerCase().endsWith('.pdf') && hasOcrText(file.id) && (
                      <Tooltip title="View extracted OCR text">
                        <IconButton
                          onClick={() => handleViewOcrText(file)}
                          size="small"
                          disabled={isFileDisabled}
                          sx={{
                            color: isFileDisabled ? 'text.disabled' : '#4caf50',
                            opacity: isFileDisabled ? 0.3 : 1,
                            '&:hover': {
                              backgroundColor: isFileDisabled ? 'transparent' : 'rgba(76, 175, 80, 0.1)',
                              color: isFileDisabled ? 'text.disabled' : '#2e7d32'
                            }
                          }}
                        >
                          <TextSnippetIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
          {/* Pagination controls below files */}
          {fileCount > 0 && (
            <TableRow>
              <TableCell colSpan={10} sx={{ p: 0 }}>
                <TablePagination
                  component="div"
                  count={fileCount}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[5, 10, 20, 50, 100]}
                  labelRowsPerPage="Files per page:"
                  showFirstButton
                  showLastButton
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* OCR Text Dialog */}
      <Dialog
        open={ocrTextDialog.open}
        onClose={handleCloseOcrText}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          OCR Text - {ocrTextDialog.file?.name}
        </DialogTitle>
        <DialogContent>
          {ocrTextDialog.loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Loading OCR text...
              </Typography>
            </Box>
          ) : (
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxHeight: 400,
                overflow: 'auto',
                bgcolor: 'grey.50',
                fontFamily: 'monospace'
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {ocrTextDialog.text}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOcrText}>
            Close
          </Button>
          {!ocrTextDialog.loading && ocrTextDialog.text && (
            <Button
              variant="contained"
              onClick={() => {
                navigator.clipboard.writeText(ocrTextDialog.text);
                // Could add a toast notification here
              }}
            >
              Copy Text
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </TableContainer>
  );
};

export default SharePointFileTable;