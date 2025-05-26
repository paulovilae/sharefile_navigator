import * as React from "react";
import { List, Datagrid, TextField, useListContext, TopToolbar, CreateButton, ExportButton } from "react-admin";
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import FolderIcon from '@mui/icons-material/Folder';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GetAppIcon from '@mui/icons-material/GetApp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import { useState, useMemo } from 'react';
import TextFieldMUI from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FormHelperText from '@mui/material/FormHelperText';
import { Document, Page, pdfjs } from 'react-pdf';
import Menu from '@mui/material/Menu';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DigitizeFloatingWindow from '../../components/DigitizeFloatingWindow';
import { createPortal } from 'react-dom';
import PDFConverterBlock from '../../blocks/PDFConverterBlock';
import OCRBlock from '../../blocks/OCRBlock';
import { blockTemplate } from '../../theme/blockTemplate';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import DigitizationCanvas from '../../components/DigitizationCanvas';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Full SlimBlockAccordion implementation
const SlimBlockAccordion = ({ expanded, onToggle, title, actions, children, dragHandle, onDelete, status, collapsible = true }) => {
  const theme = useTheme();
  let blockBg;
  if (status === 'current') {
    blockBg = theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light;
  } else if (status === 'done') {
    blockBg = theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.action.selected;
  } else {
    blockBg = theme.palette.background.paper;
  }
  return (
    <Accordion expanded={expanded} onChange={onToggle} sx={{
      mb: 1.5,
      borderRadius: 2,
      boxShadow: expanded ? 8 : 2,
      border: status === 'current' ? `2px solid ${theme.palette.primary.dark}` : `1px solid ${theme.palette.primary.main}`,
      bgcolor: blockBg,
      transition: 'box-shadow 0.2s, border 0.2s, background 0.2s',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <AccordionSummary expandIcon={collapsible ? <ExpandMoreIcon /> : null} sx={{ minHeight: 48, pr: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {dragHandle}
          <Typography sx={{ flexGrow: 1, fontWeight: 700, fontSize: 17, color: theme.palette.text.primary }}>{title}</Typography>
          {actions && onDelete && (
            <IconButton onClick={e => { e.stopPropagation(); onDelete(); }} size="small" title="Delete block"><DeleteIcon fontSize="small" /></IconButton>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
};

// Block library definition
const BLOCK_LIBRARY = [
  {
    type: 'pdfConverter',
    title: 'PDF Converter',
    description: 'Convert PDF to text/images with configurable parameters.',
  },
  {
    type: 'ocr',
    title: 'OCR',
    description: 'Run OCR on images or PDFs if needed.'
  },
  {
    type: 'qualityCheck',
    title: 'Quality Check',
    description: 'Check conversion quality, repeat if below threshold.'
  },
  {
    type: 'saveResults',
    title: 'Save Results',
    description: 'Save the results to the database.'
  },
  {
    type: 'nextFile',
    title: 'Next File',
    description: 'Move to the next file.'
  },
];

const ListActions = ({ toggleView, isGrid, onAddBlock, canAddBlock }) => {
    const [anchorEl, setAnchorEl] = React.useState(null);
    const handleOpen = (e) => setAnchorEl(e.currentTarget);
    const handleClose = () => setAnchorEl(null);
    return (
        <TopToolbar sx={{ alignItems: 'center' }}>
            <Button startIcon={<AddIcon />} onClick={handleOpen} aria-label="Add Block" color="primary" sx={{ alignSelf: 'center' }}>
                Create
            </Button>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
                {BLOCK_LIBRARY.filter(b => b.type !== 'sharepointExplorer').map(b => (
                    <MenuItem key={b.type} onClick={() => { onAddBlock(b.type); handleClose(); }} disabled={!canAddBlock(b.type)}>
                        {b.title}
                    </MenuItem>
                ))}
            </Menu>
        <ExportButton />
        <Tooltip title={isGrid ? "Show as list" : "Show as cards"}>
            <IconButton onClick={toggleView}>
                {isGrid ? <ViewListIcon /> : <ViewModuleIcon />}
            </IconButton>
        </Tooltip>
    </TopToolbar>
);
};

const CardGrid = ({ data, onCardClick, icon, cardHeight = 140, iconSize = 32, fontSize = 'subtitle1', cardWidth = 180 }) => (
    <Grid container spacing={3} sx={{ mt: 1 }}>
        {data.map(record => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={record.id}>
                <Card
                    sx={{
                        width: cardWidth,
                        height: cardHeight,
                        borderRadius: 3,
                        boxShadow: 6,
                        transition: 'box-shadow 0.2s, transform 0.2s',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        '&:hover': {
                            boxShadow: 12,
                            transform: 'scale(1.03)'
                        },
                        bgcolor: 'background.paper',
                    }}
                    onClick={() => onCardClick(record)}
                >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1, flexGrow: 1, width: '100%', minHeight: 0, pb: 0 }}>
                        {React.cloneElement(icon, { sx: { fontSize: iconSize, color: 'primary.main', mb: 0.25 } })}
                        <Typography variant={fontSize} sx={{ fontWeight: 600, mb: 0.1, textAlign: 'center', wordBreak: 'break-word', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: fontSize === 'subtitle2' ? 13 : undefined }}>{record.name}</Typography>
                        {record.description && cardHeight > 100 && (
                            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 0.5, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {record.description}
                            </Typography>
                        )}
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'center', pb: 1, pt: 0 }}>
                        {/* Add action buttons here if needed */}
                    </CardActions>
                </Card>
            </Grid>
        ))}
    </Grid>
);

// Helper to check if a file is previewable
const isPreviewable = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return [
        'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg',
        'txt', 'csv', 'json', 'log', 'md', 'xml', 'html',
        'js', 'ts', 'py', 'java', 'css'
    ].includes(ext);
};

// Helper to check if a file is digitizable (OCR)
const isDigitizable = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return [
        'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff', 'tif'
    ].includes(ext);
};

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

// Date formatter
function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d)) return date;
    return d.toLocaleString();
}

// File icon helper
function getFileIcon(filename, iconColor) {
    const ext = filename.split('.').pop().toLowerCase();
    const colorStyle = iconColor ? { color: iconColor + ' !important' } : {};
    if (["pdf"].includes(ext)) return <PictureAsPdfIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
    if (["doc", "docx"].includes(ext)) return <DescriptionIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
    if (["xls", "xlsx", "csv"].includes(ext)) return <TableChartIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
    if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) return <ImageIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
    if (["folder"].includes(ext)) return <FolderIcon sx={{ ...colorStyle, fontSize: 48, mb: 1 }} />;
    return <InsertDriveFileIcon sx={{ ...colorStyle, fontSize: 20, mr: 1 }} />;
}

// --- Modular FilesTable component ---
const FilesTable = ({ files, isItemSelected, handleSelectItem, fileStatuses, handleSelectAllFiles, allFilesSelected, someFilesSelected, theme, showActions }) => (
  <Box>
    {files.length > 0 && (
      <Box>
        <Divider sx={{ my: 3 }} />
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: theme.palette.mode === 'dark' ? theme.palette.background.paper : '#fafbfc' }}>
              <th style={{ width: 40, textAlign: 'center', color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#212121' }}>
                <Checkbox
                  checked={allFilesSelected}
                  indeterminate={!allFilesSelected && someFilesSelected}
                  onChange={handleSelectAllFiles}
                  inputProps={{ 'aria-label': 'Select all files' }}
                />
              </th>
              <th style={{ width: 40, color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#212121' }}></th>
              <th style={{ textAlign: 'left', color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#212121' }}>Name</th>
              <th style={{ textAlign: 'right', color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#212121' }}>Size</th>
              <th style={{ textAlign: 'left', color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#212121' }}>Created</th>
              <th style={{ textAlign: 'left', color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#212121' }}>Status</th>
              {showActions && <th style={{ textAlign: 'left', color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#212121' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {files.map((file, idx) => {
              const selected = isItemSelected(file, false);
              const rowBg = selected
                ? theme.palette.primary.dark
                : theme.palette.mode === 'dark'
                  ? theme.palette.background.paper
                  : '#fff';
              const rowColor = selected
                ? '#fff'
                : theme.palette.text.primary;
              const hoverBg = selected
                ? theme.palette.primary.main
                : theme.palette.mode === 'dark'
                  ? theme.palette.primary.main
                  : theme.palette.grey[100];
              // Status logic
              const status = fileStatuses[file.id];
              let statusIcon = null;
              let statusText = 'Not processed';
              let statusTooltip = '';
              if (status) {
                if (status.status === 'not_processed') {
                  statusIcon = null;
                  statusText = 'Not processed';
                  statusTooltip = 'No digitization steps completed yet.';
                } else if (status.ocr_text) {
                  statusIcon = <TextSnippetIcon fontSize="small" sx={{ color: selected ? '#fff !important' : theme.palette.primary.main + ' !important', opacity: 1 }} />;
                  statusText = 'OCR done';
                  statusTooltip = `OCR done: ${status.updated_at ? new Date(status.updated_at).toLocaleString() : ''}`;
                } else if (status.pdf_image_path) {
                  statusIcon = <PictureAsPdfIcon fontSize="small" sx={{ color: selected ? '#fff !important' : theme.palette.primary.main + ' !important', opacity: 1 }} />;
                  statusText = 'PDF converted';
                  statusTooltip = `PDF converted: ${status.updated_at ? new Date(status.updated_at).toLocaleString() : ''}`;
                }
              }
              return (
                <tr
                  key={file.id}
                  style={{
                    background: rowBg,
                    color: rowColor,
                    transition: 'background 0.2s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = hoverBg;
                    e.currentTarget.style.color = selected ? '#fff' : theme.palette.text.primary;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = rowBg;
                    e.currentTarget.style.color = rowColor;
                  }}
                >
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <Checkbox
                      checked={selected}
                      onChange={() => handleSelectItem(file, false)}
                      inputProps={{ 'aria-label': `Select file ${file.name}` }}
                      sx={selected ? {
                        color: '#fff',
                        '&.Mui-checked': { color: '#fff' },
                        '& .MuiSvgIcon-root': { color: '#fff' }
                      } : {
                        color: theme.palette.primary.main,
                        '&.Mui-checked': { color: theme.palette.primary.main },
                        '& .MuiSvgIcon-root': { color: theme.palette.primary.main }
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>{getFileIcon(file.name, selected ? '#fff' : undefined)}</td>
                  <td style={{ fontWeight: 500, fontSize: 15, verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</td>
                  <td style={{ textAlign: 'right', fontSize: 14, verticalAlign: 'middle' }}>{formatFileSize(file.size)}</td>
                  <td style={{ fontSize: 13, verticalAlign: 'middle' }}>{formatDate(file.created)}</td>
                  <td style={{ fontSize: 13, verticalAlign: 'middle' }}>
                    <Tooltip title={statusTooltip || statusText}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {statusIcon}
                        {statusText}
                      </span>
                    </Tooltip>
                  </td>
                  {showActions && (
                    <td style={{ textAlign: 'left', padding: 4 }}>
                      <IconButton onClick={e => {
                        e.stopPropagation();
                        const url = `/api/sharepoint/file_content?drive_id=${file.driveId || file.drive_id}&item_id=${file.id}&download=1`;
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', file.name);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }} size="small" title="Download">
                        <GetAppIcon fontSize="small" sx={{ color: selected ? '#fff !important' : theme.palette.primary.main + ' !important', opacity: 1 }} />
                      </IconButton>
                      {isPreviewable(file.name) && (
                        <IconButton onClick={e => {
                          e.stopPropagation();
                          window.open(`/api/sharepoint/file_content?drive_id=${file.driveId || file.drive_id}&item_id=${file.id}&preview=true`, '_blank');
                        }} size="small" title="Preview">
                          <VisibilityIcon fontSize="small" sx={{ color: selected ? '#fff !important' : theme.palette.primary.main + ' !important', opacity: 1 }} />
                        </IconButton>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>
    )}
  </Box>
);

// --- Modular FoldersGrid component ---
const FoldersGrid = ({ folders, isItemSelected, handleSelectItem, handleFolderClick, theme }) => {
  return (
    <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.grey[100] }}>
      {folders.length > 0 && (
        <Grid container spacing={2}>
          {folders.map(folder => {
            const selected = isItemSelected(folder, true);
            const cardBg = selected
              ? (theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.action.selected)
              : (theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.action.selected);
            const cardBorder = selected
              ? (theme.palette.mode === 'dark' ? `2px solid ${theme.palette.primary.light}` : `2px solid ${theme.palette.primary.main}`)
              : `1px solid ${theme.palette.divider}`;
            const iconColor = selected
              ? (theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.main)
              : (theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main);
            const textColor = theme.palette.text.primary;
            const checkboxSx = selected
              ? {
                  color: theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.main,
                  '&.Mui-checked': { color: theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.main },
                  '& .MuiSvgIcon-root': { color: theme.palette.mode === 'dark' ? '#fff' : theme.palette.primary.main }
                }
              : {};
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={folder.id}>
                <Card
                  sx={{
                    width: 160,
                    height: 140,
                    borderRadius: 3,
                    boxShadow: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    p: 1.5,
                    transition: 'box-shadow 0.2s, border 0.2s, background 0.2s',
                    bgcolor: cardBg,
                    border: cardBorder,
                    '&:hover': {
                      boxShadow: 8,
                      border: `2px solid ${theme.palette.primary.main}`,
                    },
                    overflow: 'hidden',
                  }}
                >
                  <Checkbox
                    checked={selected}
                    onChange={() => handleSelectItem(folder, true)}
                    size="small"
                    sx={{
                      position: 'absolute', top: 8, left: 8, zIndex: 2, p: 0.5,
                      color: selected ? '#fff' : theme.palette.primary.main,
                      '&.Mui-checked': { color: selected ? '#fff' : theme.palette.primary.main },
                      '& .MuiSvgIcon-root': { color: selected ? '#fff' : theme.palette.primary.main }
                    }}
                    inputProps={{ 'aria-label': `Select folder ${folder.name}` }}
                  />
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                    <IconButton onClick={() => handleFolderClick(folder)} sx={{ p: 0, bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent' } }} aria-label={`Open folder ${folder.name}`}>
                      <FolderIcon sx={{ fontSize: 48, color: iconColor }} />
                    </IconButton>
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'center', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', fontSize: 18, lineHeight: 1.2, mt: 1, color: textColor }}>
                    {folder.name}
                  </Typography>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

// --- BlockContent: renders the correct block for each workflow step ---
const BlockContent = ({ type, children, ...props }) => {
  // You can expand this switch to support more block types and props as needed
  switch (type) {
    case 'sharepointExplorer':
      return <Box sx={{ px: 2, py: 1 }}>{children}</Box>;
    case 'pdfConverter':
      // PDFConverterBlock is rendered directly in the parent with correct props
      return <Box sx={{ px: 2, py: 1 }}>{children}</Box>;
    case 'ocr':
      // OCRBlock is rendered directly in the parent with correct props
      return <Box sx={{ px: 2, py: 1 }}>{children}</Box>;
    case 'qualityCheck':
      return <Box sx={{ px: 2, py: 1 }}><Typography>Quality check block (to be implemented)</Typography></Box>;
    case 'saveResults':
      return <Box sx={{ px: 2, py: 1 }}><Typography>Save results block (to be implemented)</Typography></Box>;
    case 'nextFile':
      return <Box sx={{ px: 2, py: 1 }}><Typography>Next file block (to be implemented)</Typography></Box>;
    default:
      return <Box sx={{ px: 2, py: 1 }}>{children}</Box>;
  }
};

// --- LibrariesGrid: displays SharePoint libraries as a card grid ---
const LibrariesGrid = ({ onCardClick }) => {
  const [libraries, setLibraries] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    setLoading(true);
    fetch('/api/sharepoint/libraries')
      .then(res => res.json())
      .then(data => {
        setLibraries(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
  if (loading) return <Typography>Loading libraries...</Typography>;
  if (!libraries.length) return <Typography color="text.secondary">No SharePoint libraries found.</Typography>;
  return (
    <CardGrid
      data={libraries}
      onCardClick={onCardClick}
      icon={<LibraryBooksIcon />}
      cardHeight={140}
      iconSize={40}
      fontSize="subtitle1"
      cardWidth={200}
    />
  );
};

// --- DragHandle: draggable handle for sortable blocks ---
const DragHandle = (props) => {
  // Use useSortable if available for drag-and-drop
  // If not, just render the icon
  return (
    <span {...props} style={{ cursor: 'grab', display: 'inline-flex', alignItems: 'center', marginRight: 8 }}>
      <DragHandleIcon fontSize="small" sx={{ color: '#aaa', '&:hover': { color: '#4D216D' } }} />
    </span>
  );
};

// Main explorer component
const SharePointLibrariesExplorer = (props) => {
    const [isGrid, setIsGrid] = React.useState(true);
    const [selectedLibrary, setSelectedLibrary] = React.useState(null);
    const [currentFolder, setCurrentFolder] = React.useState(null);
    const [folderStack, setFolderStack] = React.useState([]); // for back navigation
    const [folders, setFolders] = React.useState([]);
    const [files, setFiles] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [selectedItems, setSelectedItems] = React.useState([]); // file/folder selection
    const [navExpanded, setNavExpanded] = React.useState(true);
    const [ocrExpanded, setOcrExpanded] = React.useState(false);
    const [currentStep, setCurrentStep] = React.useState(0); // 0 = File Explorer
    const [workflowFiles, setWorkflowFiles] = React.useState([]);

    const theme = useTheme();
    const template = blockTemplate(theme);

    // Reset selection and accordions on navigation
    React.useEffect(() => {
        setSelectedItems([]);
        setNavExpanded(true);
        setOcrExpanded(false);
    }, [selectedLibrary, currentFolder]);

    const toggleView = () => setIsGrid(v => !v);

    // Fetch folders and files when a library or folder is selected
    React.useEffect(() => {
        if (!selectedLibrary) return;
        setLoading(true);
        const driveId = selectedLibrary.id;
        const parentId = currentFolder ? currentFolder.id : null;
        Promise.all([
            fetch(`/api/sharepoint/folders?drive_id=${driveId}${parentId ? `&parent_id=${parentId}` : ''}`).then(res => res.json()),
            fetch(`/api/sharepoint/files?drive_id=${driveId}${parentId ? `&parent_id=${parentId}` : ''}`).then(res => res.json())
        ]).then(([foldersData, filesData]) => {
            setFolders(foldersData || []);
            // Add drive_id to each file
            const filesWithDriveId = (filesData || []).map(f => ({ ...f, drive_id: driveId }));
            setFiles(filesWithDriveId);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [selectedLibrary, currentFolder]);

    // Selection logic
    const handleSelectItem = (item, isFolder) => {
        const id = isFolder ? `folder-${item.id}` : `file-${item.id}`;
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };
    const isItemSelected = (item, isFolder) => {
        const id = isFolder ? `folder-${item.id}` : `file-${item.id}`;
        return selectedItems.includes(id);
    };
    const handleOcrClick = () => {
        setNavExpanded(false);
        setOcrExpanded(true);
    };

    // Drill-down for folders
    const handleFolderClick = (folder) => {
        setFolderStack(stack => [...stack, currentFolder]);
        setCurrentFolder(folder);
    };

    // Back button logic
    const handleBack = () => {
        if (currentFolder) {
            setCurrentFolder(folderStack[folderStack.length - 1] || null);
            setFolderStack(stack => stack.slice(0, -1));
        } else {
            setSelectedLibrary(null);
            setFolderStack([]);
        }
    };

    // --- FILE TABLE ---
    const allFilesSelected = files.length > 0 && files.every(file => isItemSelected(file, false));
    const someFilesSelected = files.some(file => isItemSelected(file, false));
    const handleSelectAllFiles = () => {
        if (allFilesSelected) {
            setSelectedItems(selectedItems.filter(id => !id.startsWith('file-')));
        } else {
            const fileIds = files.map(file => `file-${file.id}`);
            setSelectedItems([
                ...selectedItems.filter(id => !id.startsWith('file-')),
                ...fileIds.filter(id => !selectedItems.includes(id)),
            ]);
        }
    };
    // Add status state
    const [fileStatuses, setFileStatuses] = React.useState({});
    React.useEffect(() => {
      if (files.length === 0) return;
      const fileIds = files.map(f => f.id);
      fetchOcrStatuses(fileIds).then(setFileStatuses);
    }, [files]);

    // Block flow state (restore SharePoint Explorer as first block, not removable/movable)
    const [blocks, setBlocks] = React.useState([
        { type: 'sharepointExplorer', id: 'block-sharepoint' },
        { type: 'pdfConverter', id: 'block-1' },
        { type: 'ocr', id: 'block-2' },
        { type: 'qualityCheck', id: 'block-3' },
        { type: 'saveResults', id: 'block-4' },
        { type: 'nextFile', id: 'block-5' },
    ]);
    // Only allow one of each block type except for allowed types (e.g., nextFile)
    const canAddBlock = (type) => {
        if (type === 'nextFile') return true;
        return !blocks.some(b => b.type === type);
    };
    // Add block from library
    const handleAddBlock = (type) => {
        if (!canAddBlock(type)) return;
        setBlocks(blocks => [...blocks, { type, id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
    };
    // Drag-and-drop setup
    const sensors = useSensors(useSensor(PointerSensor));
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIndex = blocks.findIndex(b => b.id === active.id);
        const newIndex = blocks.findIndex(b => b.id === over.id);
        // Don't allow moving the first block
        if (oldIndex === 0 || newIndex === 0) return;
        setBlocks(arrayMove(blocks, oldIndex, newIndex));
    };
    // Delete block
    const handleDeleteBlock = (idx) => {
        if (idx === 0) return; // Don't delete first block
        setBlocks(blocks => blocks.filter((_, i) => i !== idx));
    };
    // Track expanded state for each block
    const [expandedBlocks, setExpandedBlocks] = React.useState(() => [true, ...blocks.slice(1).map(() => false)]);
    React.useEffect(() => {
        // Keep expandedBlocks in sync with blocks
        setExpandedBlocks(expandedBlocks => {
            if (expandedBlocks.length !== blocks.length) {
                return blocks.map((_, i) => expandedBlocks[i] ?? true);
            }
            return expandedBlocks;
        });
    }, [blocks]);
    const handleToggleBlock = idx => (event, isExpanded) => {
        setExpandedBlocks(expandedBlocks => expandedBlocks.map((exp, i) => i === idx ? !exp : false));
        setCurrentStep(idx);
    };
    // Render flow indicator
    const renderFlowIndicator = () => (
      <Box display="flex" alignItems="center" justifyContent="flex-start" gap={0.5} flexWrap="wrap">
        {/* File Explorer always first */}
        <ChevronRightIcon sx={{ color: currentStep === 0 ? (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.dark) : currentStep > 0 ? theme.palette.primary.light : theme.palette.grey[400], fontSize: 22, fontWeight: currentStep === 0 ? 700 : 400 }} />
        <Typography sx={{
          color: currentStep === 0 ? (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.dark) : currentStep > 0 ? theme.palette.primary.light : theme.palette.grey[500],
          fontWeight: currentStep === 0 || currentStep > 0 ? 700 : 400,
          fontSize: 15,
          fontFamily: (currentStep === 0 || currentStep > 0) ? 'Montserrat, Arial, sans-serif' : undefined
        }}>
          File Explorer
        </Typography>
        {/* Then the rest of the blocks */}
        {blocks.slice(1).map((block, idx) => {
          const lib = BLOCK_LIBRARY.find(b => b.type === block.type);
          const isCurrent = currentStep === idx + 1;
          const isDone = currentStep > idx + 1;
          const color = isCurrent
            ? (theme.palette.mode === 'dark' ? theme.palette.primary.contrastText : theme.palette.primary.dark)
            : isDone
            ? theme.palette.primary.light
            : theme.palette.grey[500];
          const isBold = isCurrent || isDone;
          return (
            <React.Fragment key={block.id}>
              <ChevronRightIcon sx={{ color, fontSize: 22, fontWeight: isBold ? 700 : 400 }} />
              <Typography sx={{ color, fontWeight: isBold ? 700 : 400, fontSize: 15, fontFamily: isBold ? 'Montserrat, Arial, sans-serif' : undefined }}>
                {lib?.title || block.type}
              </Typography>
            </React.Fragment>
          );
        })}
      </Box>
    );
    // Render block flow
    const renderBlockFlow = () => (
      <>
        {/* Flow anchor block: not an accordion, just a styled Box */}
        <Box
          sx={{
            width: '100%',
            bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.grey[100],
            borderBottom: `1px solid ${theme.palette.divider}`,
            px: 3,
            py: 2,
            mb: 1,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            minHeight: 48,
          }}
        >
          {renderFlowIndicator()}
        </Box>
        {/* File Explorer and workflow blocks as before */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.slice(1).map(b => b.id)} strategy={verticalListSortingStrategy}>
            <SlimBlockAccordion
              expanded={expandedBlocks[0]}
              onToggle={handleToggleBlock(0)}
              title="File Explorer"
              actions={false}
              collapsible={true}
              status={currentStep === 0 ? 'current' : currentStep > 0 ? 'done' : 'future'}
            >
              <BlockContent type="sharepointExplorer">
                {selectedLibrary ? (
                  <>
                    <Box display="flex" alignItems="center" gap={1} sx={{ width: '100%', mb: 2, mt: 0 }}>
                      <IconButton
                onClick={handleBack}
                        sx={{ color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.primary.main, p: 1, mr: 1 }}
                        aria-label="Back"
                      >
                        <ArrowBackIcon fontSize="medium" />
                      </IconButton>
                      <Typography variant="h5" sx={{ fontWeight: 700, ml: 0, color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.primary.main }}>
                        {currentFolder ? currentFolder.name : selectedLibrary.name}
            </Typography>
                    </Box>
            {loading ? (
                <Typography>Loading folders and files...</Typography>
            ) : (
                <>
                        <FoldersGrid
                          folders={folders}
                          isItemSelected={isItemSelected}
                          handleSelectItem={handleSelectItem}
                          handleFolderClick={handleFolderClick}
                          theme={theme}
                        />
                        <FilesTable
                          files={files}
                          isItemSelected={isItemSelected}
                          handleSelectItem={handleSelectItem}
                          fileStatuses={fileStatuses}
                          handleSelectAllFiles={handleSelectAllFiles}
                          allFilesSelected={allFilesSelected}
                          someFilesSelected={someFilesSelected}
                          theme={theme}
                          showActions={true}
                        />
                        {(folders.length > 0 || files.length > 0) && (
                          <Button
                            variant={template.button.variant}
                            color={template.button.color}
                            sx={{ ...template.button.sx, mt: 2 }}
                            disabled={selectedItems.length === 0}
                            onClick={() => {
                              if (selectedItems.length === 0) {
                                alert('Please select at least one file or folder to start the workflow.');
                              } else {
                                const selectedObjects = selectedItems.map(id => {
                                  if (id.startsWith('file-')) {
                                    return files.find(f => `file-${f.id}` === id);
                                  } else if (id.startsWith('folder-')) {
                                    return folders.find(f => `folder-${f.id}` === id);
                                  }
                                  return null;
                                }).filter(Boolean);
                                setWorkflowFiles(selectedObjects);
                                setExpandedBlocks([false, true, ...expandedBlocks.slice(2)]);
                                setCurrentStep(1);
                              }
                            }}
                          >
                            Next Step
                          </Button>
                    )}
                    {folders.length === 0 && files.length === 0 && (
                        <Typography color="text.secondary">(No folders or files found)</Typography>
                    )}
                </>
            )}
                  </>
            ) : isGrid ? (
                <LibrariesGrid onCardClick={setSelectedLibrary} />
            ) : (
                <Datagrid rowClick={(id, resource) => setSelectedLibrary({ id, name: resource?.name || '' })}>
                    <TextField source="id" />
                    <TextField source="name" />
                    <TextField source="description" />
                </Datagrid>
            )}
              </BlockContent>
            </SlimBlockAccordion>
            {blocks.slice(1).map((block, idx) => {
              let status = 'future';
              if (currentStep === idx + 1) status = 'current';
              else if (currentStep > idx + 1) status = 'done';
              return (
                <SlimBlockAccordion
                  key={block.id}
                  expanded={expandedBlocks[idx + 1]}
                  onToggle={handleToggleBlock(idx + 1)}
                  title={BLOCK_LIBRARY.find(b => b.type === block.type)?.title || block.type}
                  actions={true}
                  onDelete={() => handleDeleteBlock(idx + 1)}
                  dragHandle={<DragHandle />}
                  draggableId={block.id}
                  collapsible={true}
                  status={status}
                >
                  <BlockContent type={block.type} workflowFiles={block.type === 'pdfConverter' ? workflowFiles : undefined}>
                    {block.type === 'pdfConverter' && currentStep === idx + 1 && (
                      <PDFConverterBlock files={workflowFiles} />
                    )}
                    {block.type === 'ocr' && currentStep === idx + 1 && (
                      <OCRBlock images={/* TODO: pass images from PDFConverterBlock output */[]} />
                    )}
                  </BlockContent>
                </SlimBlockAccordion>
              );
            })}
          </SortableContext>
        </DndContext>
      </>
    );

    return (
        <List {...props} actions={<ListActions toggleView={toggleView} isGrid={isGrid} onAddBlock={handleAddBlock} canAddBlock={canAddBlock} />}
            sx={{
                '& .MuiTypography-h5, & .MuiTypography-h6': {
                    color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.primary.main,
                },
                '& .MuiIconButton-root': {
                    color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.primary.main,
                },
                '& .MuiSvgIcon-root': {
                    color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.primary.main,
                },
                position: 'relative',
            }}
        >
            <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? theme.palette.background.default : theme.palette.grey[100], minHeight: '100vh', p: 0 }}>
                {renderBlockFlow()}
            </Box>
        </List>
    );
};

// Add a utility to fetch status for multiple files
const fetchOcrStatuses = async (fileIds) => {
  const results = {};
  await Promise.all(fileIds.map(async (id) => {
    try {
      const res = await fetch(`/api/ocr/status?file_id=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        results[id] = data;
      }
    } catch {}
  }));
  return results;
};

export default SharePointLibrariesExplorer; 