import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  PictureAsPdf as PictureAsPdfIcon,
  Description as DescriptionIcon,
  TableChart as TableChartIcon,
  Image as ImageIcon,
  InsertDriveFile as InsertDriveFileIcon,
  Visibility as VisibilityIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';

// File icon helper function with correct colors
function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return <PictureAsPdfIcon sx={{ color: '#D32F2F', fontSize: 20, mr: 1 }} />; // Red for PDF
  if (['doc', 'docx'].includes(ext)) return <DescriptionIcon sx={{ color: '#1976D2', fontSize: 20, mr: 1 }} />; // Blue for Word
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <TableChartIcon sx={{ color: '#388E3C', fontSize: 20, mr: 1 }} />; // Green for Excel
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) return <ImageIcon sx={{ color: '#FF9800', fontSize: 20, mr: 1 }} />; // Orange for images
  return <InsertDriveFileIcon sx={{ color: '#757575', fontSize: 20, mr: 1 }} />; // Gray for other files
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

const SharePointFileTable = ({ files, selectedLibrary, onPreview, selectedFiles = [], onFileSelectionChange }) => {
  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [nameFilter, setNameFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [modifiedByFilter, setModifiedByFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
      const allFileIds = filteredFiles.map(file => file.id);
      onFileSelectionChange && onFileSelectionChange(allFileIds);
    } else {
      onFileSelectionChange && onFileSelectionChange([]);
    }
  };

  const handleSelectFile = (fileId) => {
    if (!onFileSelectionChange) return;
    
    const newSelection = selectedFiles.includes(fileId)
      ? selectedFiles.filter(id => id !== fileId)
      : [...selectedFiles, fileId];
    
    onFileSelectionChange(newSelection);
  };

  const isAllSelected = filteredFiles.length > 0 && filteredFiles.every(file => selectedFiles.includes(file.id));
  const isIndeterminate = selectedFiles.length > 0 && !isAllSelected;

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
          {paginatedFiles.map((file, idx) => (
            <TableRow key={file.id} hover sx={{ height: 28 }}>
              <TableCell padding="checkbox">
                <input
                  type="checkbox"
                  checked={selectedFiles.includes(file.id)}
                  onChange={() => handleSelectFile(file.id)}
                />
              </TableCell>
              <TableCell sx={{ width: 32, fontWeight: 500, color: '#512698' }}>
                {page * rowsPerPage + idx + 1}
              </TableCell>
              <TableCell component="th" scope="row" sx={{ py: 0.5 }}>
                <Box display="flex" alignItems="center">
                  {getFileIcon(file.name)}
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
                    }}
                  >
                    {file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '-'}
                  </Typography>
                </Tooltip>
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
                  >
                    <GetAppIcon />
                  </IconButton>
                  {getPreviewType(file.name) && (
                    <IconButton 
                      onClick={() => handlePreview(file)} 
                      size="small" 
                      title="Preview"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {/* Pagination controls below files */}
          {fileCount > 0 && (
            <TableRow>
              <TableCell colSpan={8} sx={{ p: 0 }}>
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
    </TableContainer>
  );
};

export default SharePointFileTable;