import * as React from 'react';
import { Admin, Resource, Layout } from 'react-admin';
import christusTheme from './christusTheme';
import { Box, Typography, Card, CardActionArea, CardContent, Grid, CircularProgress, Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import ImageIcon from '@mui/icons-material/Image';
import CustomAppBar from './CustomAppBar';
import Tooltip from '@mui/material/Tooltip';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { Document, Page, pdfjs } from 'react-pdf';
import Papa from 'papaparse';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { grey } from '@mui/material/colors';
import { useEffect, useState } from 'react';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return <PictureAsPdfIcon sx={{ color: 'red' }} />;
  if (['doc', 'docx'].includes(ext)) return <DescriptionIcon sx={{ color: '#1976d2' }} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <TableChartIcon sx={{ color: 'green' }} />;
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) return <ImageIcon sx={{ color: 'orange' }} />;
  return <InsertDriveFileIcon sx={{ color: 'grey' }} />;
}

const SharePointMUIFileExplorer = () => {
  const [libraries, setLibraries] = React.useState([]);
  const [selectedLibrary, setSelectedLibrary] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [treeData, setTreeData] = React.useState([]);
  const [currentParentId, setCurrentParentId] = React.useState(null);
  const [fileSort, setFileSort] = React.useState({ field: 'name', order: 'asc' });
  const [previewFile, setPreviewFile] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [csvData, setCsvData] = React.useState(null);
  const [txtData, setTxtData] = React.useState(null);
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(20);
  const pageSizeOptions = [10, 20, 50, 100];
  const [filterQuery, setFilterQuery] = React.useState('');
  const [filterCreatedBy, setFilterCreatedBy] = React.useState('');
  const [filterModifiedBy, setFilterModifiedBy] = React.useState('');
  const [debouncedFilterQuery, setDebouncedFilterQuery] = useState(filterQuery);
  const [debouncedFilterCreatedBy, setDebouncedFilterCreatedBy] = useState(filterCreatedBy);
  const [debouncedFilterModifiedBy, setDebouncedFilterModifiedBy] = useState(filterModifiedBy);

  React.useEffect(() => {
    setLoading(true);
    fetch('/api/sharepoint/libraries')
      .then((res) => res.ok ? res.json() : Promise.reject('Failed to fetch libraries'))
      .then((data) => {
        setLibraries(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedFilterQuery(filterQuery), 300);
    return () => clearTimeout(handler);
  }, [filterQuery]);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedFilterCreatedBy(filterCreatedBy), 300);
    return () => clearTimeout(handler);
  }, [filterCreatedBy]);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedFilterModifiedBy(filterModifiedBy), 300);
    return () => clearTimeout(handler);
  }, [filterModifiedBy]);

  React.useEffect(() => {
    if (!selectedLibrary) return;
    setLoading(true);
    const driveId = selectedLibrary.id;
    const folderUrl = currentParentId
      ? `/api/sharepoint/folders?drive_id=${driveId}&parent_id=${currentParentId}`
      : `/api/sharepoint/folders?drive_id=${driveId}`;
    const params = new URLSearchParams({
      drive_id: driveId,
      ...(currentParentId ? { parent_id: currentParentId } : {}),
      ...(debouncedFilterQuery ? { filter_name: debouncedFilterQuery } : {}),
      ...(debouncedFilterCreatedBy ? { filter_created_by: debouncedFilterCreatedBy } : {}),
      ...(debouncedFilterModifiedBy ? { filter_modified_by: debouncedFilterModifiedBy } : {}),
      ...(fileSort.field ? { sort_field: fileSort.field } : {}),
      ...(fileSort.order ? { sort_order: fileSort.order } : {}),
    });
    const fileUrl = `/api/sharepoint/files?${params.toString()}`;
    Promise.all([
      fetch(folderUrl).then((res) => res.ok ? res.json() : []),
      fetch(fileUrl).then((res) => res.ok ? res.json() : []),
    ]).then(([folders, files]) => {
      const folderItems = folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        isFolder: true,
      }));
      const fileItems = files.map((file) => ({
        ...file,
        isFolder: false,
      }));
      setTreeData([...folderItems, ...fileItems]);
      setLoading(false);
    }).catch((err) => {
      setTreeData([]);
      setLoading(false);
    });
  }, [selectedLibrary, currentParentId, debouncedFilterQuery, debouncedFilterCreatedBy, debouncedFilterModifiedBy, fileSort, pageSize]);

  // Folders grid
  const folders = treeData.filter(item => item.isFolder);
  // Files table (do not filter or sort folders)
  let files = treeData.filter(item => !item.isFolder);

  React.useEffect(() => {
    setPage(0);
  }, [filterQuery, pageSize, fileSort]);

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Typography color="error">{error}</Typography></Box>;

  if (!selectedLibrary) {
    return (
      <Box p={2}>
        <Grid container spacing={2}>
          {libraries.map((lib) => (
            <Grid item key={lib.id} xs={6} sm={4} md={2} lg={2} xl={2}>
              <Card sx={{ border: '1px solid #eee', boxShadow: 1, width: 120, height: 120, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <CardActionArea onClick={() => { setSelectedLibrary(lib); setCurrentParentId(null); }} sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <LibraryBooksIcon sx={{ fontSize: 48, color: '#b39ddb', mb: 1, alignSelf: 'center' }} />
                    <Tooltip title={lib.name} placement="top">
                      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100, minHeight: 36, alignSelf: 'center' }}>{lib.name}</Typography>
                    </Tooltip>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const handleItemClick = (item) => {
    if (item.isFolder) {
      setCurrentParentId(item.id);
    } else {
      setPreviewFile(item);
      setDrawerOpen(true);
      // Reset preview data
      setCsvData(null);
      setTxtData(null);
      // Fetch file content for preview
      const url = `/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${item.id}`;
      const ext = item.name.split('.').pop().toLowerCase();
      if (["csv"].includes(ext)) {
        fetch(url)
          .then(res => res.text())
          .then(text => setCsvData(Papa.parse(text, { header: true }).data));
      } else if (["txt", "log", "md"].includes(ext)) {
        fetch(url)
          .then(res => res.text())
          .then(text => setTxtData(text));
      }
    }
  };

  const handleSort = (field, order) => {
    setFileSort(prev => ({
      field,
      order: prev.field === field ? (prev.order === 'asc' ? 'desc' : 'asc') : order === 'asc' ? 'asc' : 'desc',
    }));
  };

  // File preview rendering
  const renderFilePreview = () => {
    if (!previewFile) return null;
    const ext = previewFile.name.split('.').pop().toLowerCase();
    const url = `/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${previewFile.id}`;
    if (["pdf"].includes(ext)) {
      return (
        <Box p={2}>
          <iframe src={url} title="PDF Preview" width="100%" height="600px" style={{ border: 0 }} />
        </Box>
      );
    }
    if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) {
      return <Box p={2}><img src={url} alt={previewFile.name} style={{ maxWidth: '100%' }} /></Box>;
    }
    if (["csv"].includes(ext) && csvData) {
      return (
        <Box p={2}>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {Object.keys(csvData[0] || {}).map((col) => (
                    <TableCell key={col}>{col}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {csvData.map((row, idx) => (
                  <TableRow key={idx}>
                    {Object.values(row).map((val, i) => (
                      <TableCell key={i}>{val}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      );
    }
    if (["txt", "log", "md"].includes(ext) && txtData) {
      return <Box p={2}><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{txtData}</pre></Box>;
    }
    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext)) {
      // Fallback: Office preview not available
      return <Box p={2}><Typography color="text.secondary">Preview not available for Office files. <a href={url} download>Download file</a>.</Typography></Box>;
    }
    return <Box p={2}><a href={url} target="_blank" rel="noopener noreferrer">Download {previewFile.name}</a></Box>;
  };

  // Add a smart file size formatter
  function formatFileSize(bytes) {
    if (bytes === 0 || bytes === undefined || bytes === null) return '';
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = bytes > 0 ? Math.floor(Math.log(bytes) / Math.log(1024)) : 0;
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
  }

  // Pagination controls as a component
  const PaginationControls = () => (
    <Box mb={1} display="flex" alignItems="center" justifyContent="space-between">
      <Typography variant="subtitle2" color="text.secondary">
        {files.length === 0
          ? 'No files'
          : `1-${files.length} of ${files.length} file${files.length === 1 ? '' : 's'}`}
      </Typography>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2">Rows per page:</Typography>
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value));
          }}
          style={{ fontSize: '1rem', padding: '2px 8px', borderRadius: 4, border: '1px solid #ccc' }}
        >
          {pageSizeOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <Button size="small" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
        <Typography variant="caption" component="span" mx={1}>{page + 1} / {Math.ceil(files.length / pageSize)}</Typography>
        <Button size="small" onClick={() => setPage(p => Math.min(Math.ceil(files.length / pageSize) - 1, p + 1))} disabled={page >= Math.ceil(files.length / pageSize) - 1}>Next</Button>
      </Box>
    </Box>
  );

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => {
          if (currentParentId) {
            setCurrentParentId(null);
          } else {
            setSelectedLibrary(null);
          }
        }}>
          Back
        </Button>
        <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 500, fontSize: '1.1rem', lineHeight: 1.2 }}>{selectedLibrary.name}</Typography>
      </Stack>
      <Box>
        <Grid container spacing={2} mb={2}>
          {folders.map((folder) => (
            <Grid item key={folder.id} xs={6} sm={4} md={2} lg={2} xl={2}>
              <Card sx={{ border: '1px solid #eee', boxShadow: 1, width: 120, height: 120, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <CardActionArea onClick={() => handleItemClick(folder)} sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                    <Tooltip title={folder.name} placement="top">
                      <FolderIcon sx={{ fontSize: 48, color: 'purple', mb: 1, alignSelf: 'center' }} />
                    </Tooltip>
                    <Tooltip title={folder.name} placement="top">
                      <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100, minHeight: 36, alignSelf: 'center' }}>{folder.name}</Typography>
                    </Tooltip>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
        <PaginationControls />
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    Name
                    <IconButton size="small" onClick={() => handleSort('name', 'asc')} sx={{ p: 0, color: fileSort.field === 'name' && fileSort.order === 'asc' ? 'primary.main' : grey[400] }}>
                      <ArrowDropUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleSort('name', 'desc')} sx={{ p: 0, color: fileSort.field === 'name' && fileSort.order === 'desc' ? 'primary.main' : grey[400] }}>
                      <ArrowDropDownIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    Size
                    <IconButton size="small" onClick={() => handleSort('size', 'asc')} sx={{ p: 0, color: fileSort.field === 'size' && fileSort.order === 'asc' ? 'primary.main' : grey[400] }}>
                      <ArrowDropUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleSort('size', 'desc')} sx={{ p: 0, color: fileSort.field === 'size' && fileSort.order === 'desc' ? 'primary.main' : grey[400] }}>
                      <ArrowDropDownIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    Created
                    <IconButton size="small" onClick={() => handleSort('created', 'asc')} sx={{ p: 0, color: fileSort.field === 'created' && fileSort.order === 'asc' ? 'primary.main' : grey[400] }}>
                      <ArrowDropUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleSort('created', 'desc')} sx={{ p: 0, color: fileSort.field === 'created' && fileSort.order === 'desc' ? 'primary.main' : grey[400] }}>
                      <ArrowDropDownIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    Modified
                    <IconButton size="small" onClick={() => handleSort('modified', 'asc')} sx={{ p: 0, color: fileSort.field === 'modified' && fileSort.order === 'asc' ? 'primary.main' : grey[400] }}>
                      <ArrowDropUpIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleSort('modified', 'desc')} sx={{ p: 0, color: fileSort.field === 'modified' && fileSort.order === 'desc' ? 'primary.main' : grey[400] }}>
                      <ArrowDropDownIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created By</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Modified By</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Preview</TableCell>
              </TableRow>
              <TableRow>
                <TableCell />
                <TableCell>
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={e => setFilterQuery(e.target.value)}
                    placeholder="Filter by name..."
                    style={{ fontSize: '1rem', padding: '2px 6px', borderRadius: 4, border: '1px solid #ccc', width: '100%' }}
                  />
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell>
                  <input
                    type="text"
                    value={filterCreatedBy}
                    onChange={e => setFilterCreatedBy(e.target.value)}
                    placeholder="Filter by created by..."
                    style={{ fontSize: '1rem', padding: '2px 6px', borderRadius: 4, border: '1px solid #ccc', width: '100%' }}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="text"
                    value={filterModifiedBy}
                    onChange={e => setFilterModifiedBy(e.target.value)}
                    placeholder="Filter by modified by..."
                    style={{ fontSize: '1rem', padding: '2px 6px', borderRadius: 4, border: '1px solid #ccc', width: '100%' }}
                  />
                </TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ color: 'text.secondary' }}>No files found.</TableCell>
                </TableRow>
              ) : (
                files.map((file, idx) => {
                  const url = `/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${file.id}`;
                  const createdBy = file.createdBy?.displayName || '';
                  const lastModifiedBy = file.lastModifiedBy?.displayName || '';
                  console.log('File row:', file); // Debug log
                  return (
                    <TableRow key={file.id} hover>
                      <TableCell>{idx + 1}.</TableCell>
                      <TableCell>
                        <a
                          href={url}
                          download
                          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {getFileIcon(file.name)}{' '}
                          <span style={{ verticalAlign: 'middle', marginLeft: 4 }}>{file.name}</span>
                        </a>
                      </TableCell>
                      <TableCell>{file.size ? formatFileSize(file.size) : ''}</TableCell>
                      <TableCell>{file.created ? new Date(file.created).toLocaleString() : ''}</TableCell>
                      <TableCell>{file.modified ? new Date(file.modified).toLocaleString() : ''}</TableCell>
                      <TableCell>
                        <Tooltip title={createdBy} placement="top">
                          <span style={{
                            maxWidth: 100,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            verticalAlign: 'middle',
                          }}>{createdBy}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={lastModifiedBy} placement="top">
                          <span style={{
                            maxWidth: 100,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'inline-block',
                            verticalAlign: 'middle',
                          }}>{lastModifiedBy}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={() => { setPreviewFile(file); setDrawerOpen(true); setCsvData(null); setTxtData(null); }} size="small">
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <PaginationControls />
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 600, maxWidth: '100vw' } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
          <Typography variant="h6" noWrap>{previewFile?.name}</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Box sx={{ overflowY: 'auto', height: 'calc(100vh - 64px)' }}>
          {renderFilePreview()}
        </Box>
      </Drawer>
    </Box>
  );
};

const CustomLayout = (props) => (
    <Layout
        {...props}
        appBar={CustomAppBar}
    >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {props.children}
        </Box>
    </Layout>
);

function App() {
  return (
    <Admin theme={christusTheme} layout={CustomLayout}>
      <Resource name="libraries" list={SharePointMUIFileExplorer} icon={LibraryBooksIcon} />
    </Admin>
  );
}

export default App;
