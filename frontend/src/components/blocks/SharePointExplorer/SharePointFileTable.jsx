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
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import { getSharePointFilterSettings, applySettingsToTableState } from '../../../utils/sharepointFilterSettings';
import { useTranslate } from 'react-admin';
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
function getOcrStatusDisplay(status, translate) {
  if (!status) {
    return {
      icon: <NotInterestedIcon sx={{ fontSize: 16, color: '#757575' }} />,
      text: translate('status.not_processed'),
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
        text: status.toLowerCase() === 'text_extracted' ? translate('status.text_extracted') :
              status.toLowerCase() === 'ocr_processed' ? translate('status.ocr_processed') :
              status.toLowerCase() === 'preloaded' ? translate('status.previously_processed') : translate('status.completed'),
        color: '#4caf50'
      };
    case 'error':
    case 'failed':
      return {
        icon: <ErrorIcon sx={{ fontSize: 16, color: '#f44336' }} />,
        text: translate('status.error'),
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
        text: translate('status.processing'),
        color: '#ff9800'
      };
    case 'needs manual review':
      return {
        icon: <ErrorIcon sx={{ fontSize: 16, color: '#ff9800' }} />,
        text: translate('status.needs_review'),
        color: '#ff9800'
      };
    case 'not_processed':
      return {
        icon: <NotInterestedIcon sx={{ fontSize: 16, color: '#757575' }} />,
        text: translate('status.not_processed'),
        color: '#757575'
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
  const translate = useTranslate();
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [nameFilter, setNameFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [modifiedByFilter, setModifiedByFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all'); // New file type filter
  const [statusFilter, setStatusFilter] = useState('all'); // New status filter
  const [createdByFilterType, setCreatedByFilterType] = useState('text'); // 'text' or 'dropdown'
  const [modifiedByFilterType, setModifiedByFilterType] = useState('text'); // 'text' or 'dropdown'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [ocrStatuses, setOcrStatuses] = useState({});
  const [ocrTextDialog, setOcrTextDialog] = useState({ open: false, file: null, text: '', loading: false });
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load persistent settings on component mount
  useEffect(() => {
    const loadPersistentSettings = async () => {
      try {
        const settings = await getSharePointFilterSettings();
        const tableState = applySettingsToTableState(settings);
        
        // Apply settings to component state
        setFileTypeFilter(tableState.fileTypeFilter);
        setStatusFilter(tableState.statusFilter);
        setSortField(tableState.sortField);
        setSortOrder(tableState.sortOrder);
        setRowsPerPage(tableState.rowsPerPage);
        setPage(0); // Reset to first page when applying settings
        
        setSettingsLoaded(true);
        console.log('[SharePointFileTable] Loaded persistent settings:', tableState);
      } catch (error) {
        console.error('[SharePointFileTable] Error loading persistent settings:', error);
        setSettingsLoaded(true); // Continue with defaults
      }
    };

    if (!settingsLoaded) {
      loadPersistentSettings();
    }
  }, [settingsLoaded]);

  // Fetch OCR statuses for PDF files
  useEffect(() => {
    const fetchOcrStatuses = async () => {
      const pdfFiles = files.filter(file => file.name.toLowerCase().endsWith('.pdf'));
      
      // Only fetch status for files we haven't checked yet or that might have changed
      const filesToCheck = pdfFiles.filter(file => {
        const existingStatus = ocrStatuses[file.id];
        // Skip files that are already fully processed
        return !existingStatus || !['ocr_processed', 'text_extracted'].includes(existingStatus);
      });

      console.log(`[SharePointFileTable] Checking OCR status for ${filesToCheck.length}/${pdfFiles.length} PDF files (skipping ${pdfFiles.length - filesToCheck.length} already processed)`);
      
      if (filesToCheck.length === 0) {
        return; // No files need status checking
      }

      const statusPromises = filesToCheck.map(async (file) => {
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
      setOcrStatuses(prevStatuses => {
        const newStatusMap = { ...prevStatuses }; // Preserve existing statuses
        statuses.forEach(({ fileId, status }) => {
          newStatusMap[fileId] = status;
        });
        return newStatusMap;
      });
    };

    if (files.length > 0) {
      fetchOcrStatuses();
    }
  }, [files]); // Removed ocrStatuses dependency to prevent infinite loop

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
    const filtered = sortedFiles.filter(file => {
      const nameMatch = file.name.toLowerCase().includes(nameFilter.toLowerCase());
      const createdBy = file.createdBy?.displayName || file.createdBy?.email || '';
      const createdByMatch = createdBy.toLowerCase().includes(createdByFilter.toLowerCase());
      const modifiedBy = file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '';
      const modifiedByMatch = modifiedBy.toLowerCase().includes(modifiedByFilter.toLowerCase());
      
      // File type filter
      let fileTypeMatch = true;
      if (fileTypeFilter === 'pdf') {
        fileTypeMatch = file.name.toLowerCase().endsWith('.pdf');
      } else if (fileTypeFilter === 'all') {
        fileTypeMatch = true;
      }
      
      // Status filter
      let statusMatch = true;
      if (statusFilter !== 'all') {
        const fileStatus = ocrStatuses[file.id];
        if (statusFilter === 'processed') {
          // Show files with successful processing status
          statusMatch = fileStatus && ['completed', 'ocr done', 'text_extracted', 'ocr_processed', 'preloaded'].includes(fileStatus.toLowerCase());
        } else if (statusFilter === 'processing') {
          // Show files currently being processed
          statusMatch = fileStatus && ['processing', 'processing ocr', 'queued', 'pending', 'llm reviewing', 'retry w/ dpi', 'retry w/ image ocr'].includes(fileStatus.toLowerCase());
        } else if (statusFilter === 'error') {
          // Show files with errors
          statusMatch = fileStatus && ['error', 'failed'].includes(fileStatus.toLowerCase());
        } else if (statusFilter === 'not_processed') {
          // Show files not processed (no status or not_processed status)
          // Be more permissive: if we don't have status data yet, assume not processed
          statusMatch = !fileStatus || fileStatus.toLowerCase() === 'not_processed' || fileStatus.toLowerCase() === '';
        } else if (statusFilter === 'needs_review') {
          // Show files needing manual review
          statusMatch = fileStatus && fileStatus.toLowerCase() === 'needs manual review';
        } else if (statusFilter === 'pdf_only') {
          // Show only PDF files (regardless of status)
          statusMatch = file.name.toLowerCase().endsWith('.pdf');
        }
      }
      
      return nameMatch && createdByMatch && modifiedByMatch && fileTypeMatch && statusMatch;
    });
    
    // Debug logging to help identify filtering issues
    console.log('[SharePointFileTable] Filtering debug:', {
      totalFiles: sortedFiles.length,
      filteredFiles: filtered.length,
      filters: {
        nameFilter,
        fileTypeFilter,
        statusFilter,
        createdByFilter,
        modifiedByFilter
      },
      ocrStatusesCount: Object.keys(ocrStatuses).length
    });
    
    return filtered;
  }, [sortedFiles, nameFilter, createdByFilter, modifiedByFilter, fileTypeFilter, statusFilter, ocrStatuses]);

  // Reset page to 0 when filters change to prevent being on non-existent pages
  useEffect(() => {
    setPage(0);
  }, [nameFilter, createdByFilter, modifiedByFilter, fileTypeFilter, statusFilter]);

  // Extract unique users for dropdown options
  const uniqueCreatedByUsers = useMemo(() => {
    const users = new Set();
    files.forEach(file => {
      const user = file.createdBy?.displayName || file.createdBy?.email;
      if (user) users.add(user);
    });
    return Array.from(users).sort();
  }, [files]);

  const uniqueModifiedByUsers = useMemo(() => {
    const users = new Set();
    files.forEach(file => {
      const user = file.lastModifiedBy?.displayName || file.lastModifiedBy?.email;
      if (user) users.add(user);
    });
    return Array.from(users).sort();
  }, [files]);

  // Pagination for files
  const paginatedFiles = filteredFiles.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const fileCount = filteredFiles.length;

  // Reset page when filtered results change to prevent being on a non-existent page
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(fileCount / rowsPerPage) - 1);
    if (page > maxPage) {
      setPage(0);
    }
  }, [fileCount, rowsPerPage, page]);

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
    
    const newSelection = selectedFiles && selectedFiles.includes(fileId)
      ? selectedFiles.filter(id => id !== fileId)
      : [...(selectedFiles || []), fileId];
    
    onFileSelectionChange(newSelection);
  };

  const selectableFiles = selectionMode ? filteredFiles.filter(file => isDigitizable(file.name)) : filteredFiles;
  const isAllSelected = selectableFiles.length > 0 && selectedFiles && selectableFiles.every(file => selectedFiles.includes(file.id));
  const isIndeterminate = selectedFiles && selectedFiles.length > 0 && !isAllSelected;

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
          {translate('table.no_files')}
        </Typography>
      </Box>
    );
  }

  if (filteredFiles.length === 0 && files.length > 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {translate('table.no_matches')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {translate('table.total_files')}: {files.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {translate('table.adjust_filters')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Filter Controls */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{translate('label.file_type')}</InputLabel>
          <Select
            value={fileTypeFilter}
            label={translate('label.file_type')}
            onChange={(e) => setFileTypeFilter(e.target.value)}
          >
            <MenuItem value="all">{translate('filter.all_files')}</MenuItem>
            <MenuItem value="pdf">{translate('filter.pdf_only')}</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>{translate('table.header.status')}</InputLabel>
          <Select
            value={statusFilter}
            label={translate('table.header.status')}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">{translate('filter.all_status')}</MenuItem>
            <MenuItem value="processed">✅ {translate('filter.processed')}</MenuItem>
            <MenuItem value="processing">⏳ {translate('filter.processing')}</MenuItem>
            <MenuItem value="error">❌ {translate('filter.error')}</MenuItem>
            <MenuItem value="not_processed">⚪ {translate('filter.not_processed')}</MenuItem>
            <MenuItem value="needs_review">⚠️ {translate('filter.needs_review')}</MenuItem>
          </Select>
        </FormControl>
        
        <Typography variant="body2" color="text.secondary">
          Showing {filteredFiles.length} of {files.length} files
        </Typography>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={handleSelectAll}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ width: 32, fontWeight: 600, color: '#512698' }}>#</TableCell>
              <TableCell sortDirection={sortField === 'name' ? sortOrder : false}>
                <TableSortLabel
                  active={sortField === 'name'}
                  direction={sortField === 'name' ? sortOrder : 'asc'}
                  onClick={() => handleSort('name')}
                >
                  {translate('table.header.name')}
                </TableSortLabel>
              </TableCell>
            <TableCell align="right" sortDirection={sortField === 'size' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'size'}
                direction={sortField === 'size' ? sortOrder : 'asc'}
                onClick={() => handleSort('size')}
              >
                {translate('table.header.size')}
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'created' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'created'}
                direction={sortField === 'created' ? sortOrder : 'asc'}
                onClick={() => handleSort('created')}
              >
                {translate('table.header.created')}
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'createdBy' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'createdBy'}
                direction={sortField === 'createdBy' ? sortOrder : 'asc'}
                onClick={() => handleSort('createdBy')}
              >
                {translate('table.header.created_by')}
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'modified' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'modified'}
                direction={sortField === 'modified' ? sortOrder : 'asc'}
                onClick={() => handleSort('modified')}
              >
                {translate('table.header.modified')}
              </TableSortLabel>
            </TableCell>
            <TableCell sortDirection={sortField === 'lastModifiedBy' ? sortOrder : false}>
              <TableSortLabel
                active={sortField === 'lastModifiedBy'}
                direction={sortField === 'lastModifiedBy' ? sortOrder : 'asc'}
                onClick={() => handleSort('lastModifiedBy')}
              >
                {translate('table.header.modified_by')}
              </TableSortLabel>
            </TableCell>
            <TableCell align="center">{translate('table.header.status')}</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
          <TableRow>
            <TableCell />
            <TableCell />
            <TableCell>
              <TextField
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                placeholder={translate('filter.label')}
                variant="standard"
                size="small"
                fullWidth
                InputProps={{ sx: { fontSize: 13 } }}
              />
            </TableCell>
            <TableCell />
            <TableCell />
            <TableCell>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={createdByFilter}
                  onChange={(e) => setCreatedByFilter(e.target.value)}
                  displayEmpty
                  variant="standard"
                  sx={{ fontSize: 13 }}
                >
                  <MenuItem value="">{translate('filter.all_users')}</MenuItem>
                  {uniqueCreatedByUsers.map((user) => (
                    <MenuItem key={user} value={user}>
                      {user}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </TableCell>
            <TableCell />
            <TableCell>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={modifiedByFilter}
                  onChange={(e) => setModifiedByFilter(e.target.value)}
                  displayEmpty
                  variant="standard"
                  sx={{ fontSize: 13 }}
                >
                  <MenuItem value="">{translate('filter.all_users')}</MenuItem>
                  {uniqueModifiedByUsers.map((user) => (
                    <MenuItem key={user} value={user}>
                      {user}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </TableCell>
            <TableCell>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  displayEmpty
                  variant="standard"
                  sx={{ fontSize: 13 }}
                >
                  <MenuItem value="all">{translate('filter.all_status')}</MenuItem>
                  <MenuItem value="processed">✅ {translate('filter.processed')}</MenuItem>
                  <MenuItem value="processing">⏳ {translate('filter.processing')}</MenuItem>
                  <MenuItem value="error">❌ {translate('filter.error')}</MenuItem>
                  <MenuItem value="not_processed">⚪ {translate('filter.not_processed')}</MenuItem>
                  <MenuItem value="needs_review">⚠️ {translate('filter.needs_review')}</MenuItem>
                </Select>
              </FormControl>
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
                <Checkbox
                  checked={selectedFiles && selectedFiles.includes(file.id)}
                  onChange={() => handleSelectFile(file.id, file.name)}
                  disabled={isFileDisabled}
                  size="small"
                  sx={{ opacity: isFileDisabled ? 0.3 : 1 }}
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
                        const statusDisplay = getOcrStatusDisplay(ocrStatuses[file.id], translate);
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
                      title={translate('action.download')}
                      disabled={isFileDisabled}
                      sx={{ opacity: isFileDisabled ? 0.3 : 1 }}
                    >
                      <GetAppIcon />
                    </IconButton>
                    {getPreviewType(file.name) && (
                      <IconButton
                        onClick={() => handlePreview(file)}
                        size="small"
                        title={translate('action.preview')}
                        disabled={isFileDisabled}
                        sx={{ opacity: isFileDisabled ? 0.3 : 1 }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    )}
                    {file.name.toLowerCase().endsWith('.pdf') && hasOcrText(file.id) && (
                      <Tooltip title={translate('action.view_ocr_text')}>
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
          {(fileCount > 0 || files.length > 0) && (
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
                  labelRowsPerPage={translate('pagination.files_per_page')}
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
          {translate('dialog.ocr_text_title')} - {ocrTextDialog.file?.name}
        </DialogTitle>
        <DialogContent>
          {ocrTextDialog.loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                {translate('dialog.loading_ocr_text')}
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
            {translate('action.close')}
          </Button>
          {!ocrTextDialog.loading && ocrTextDialog.text && (
            <Button
              variant="contained"
              onClick={() => {
                navigator.clipboard.writeText(ocrTextDialog.text);
                // Could add a toast notification here
              }}
            >
              {translate('action.copy_text')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      </TableContainer>
    </Box>
  );
};

export default SharePointFileTable;