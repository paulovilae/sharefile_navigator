import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
  Button,
  Stack,
  Paper,
  IconButton,
  Grid,
  Alert,
  FormHelperText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import FolderIcon from '@mui/icons-material/Folder';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import TextField from '@mui/material/TextField';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';
import GetAppIcon from '@mui/icons-material/GetApp';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import CloseIcon from '@mui/icons-material/Close';
import { Document, Page, pdfjs } from 'react-pdf';
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
import 'react-pdf/dist/esm/Page/TextLayer.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import DialogActions from '@mui/material/DialogActions';
import SettingsIcon from '@mui/icons-material/Settings';

const FILE_CACHE_KEY = 'fileCache';
const FOLDER_CACHE_KEY = 'folderCache';
const FILE_CONTENT_CACHE_KEY = 'fileContentCache';

function getCache(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function setCache(key, cache) {
  localStorage.setItem(key, JSON.stringify(cache));
}

function getContentCache() {
  try {
    return JSON.parse(localStorage.getItem(FILE_CONTENT_CACHE_KEY)) || {};
  } catch {
    return {};
  }
}

function setContentCache(cache) {
  localStorage.setItem(FILE_CONTENT_CACHE_KEY, JSON.stringify(cache));
}

function saveBlobToCache(key, blob) {
  // Convert blob to base64 for storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function blobFromBase64(base64) {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

function isOlderThanOneDay(dateString) {
  if (!dateString) return false;
  const fileDate = new Date(dateString);
  const now = new Date();
  return (now - fileDate) > 24 * 60 * 60 * 1000;
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return <PictureAsPdfIcon sx={{ color: '#A7A9AC', fontSize: 20, mr: 1 }} />;
  if (['doc', 'docx'].includes(ext)) return <DescriptionIcon sx={{ color: '#512698', fontSize: 20, mr: 1 }} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <TableChartIcon sx={{ color: '#00ADEF', fontSize: 20, mr: 1 }} />;
  if (['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) return <ImageIcon sx={{ color: '#C1272D', fontSize: 20, mr: 1 }} />;
  return <InsertDriveFileIcon sx={{ color: '#A7A9AC', fontSize: 20, mr: 1 }} />;
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

const SharePointMUIFileExplorer = () => {
  const [libraries, setLibraries] = React.useState([]);
  const [selectedLibrary, setSelectedLibrary] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [treeData, setTreeData] = React.useState([]); // [{ id, name, isFolder, children }]
  const [currentParentId, setCurrentParentId] = React.useState(null); // null = root
  const [sortField, setSortField] = React.useState('name');
  const [sortOrder, setSortOrder] = React.useState('asc');
  const [nameFilter, setNameFilter] = React.useState('');
  const [createdByFilter, setCreatedByFilter] = React.useState('');
  const [modifiedByFilter, setModifiedByFilter] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [allFolders, setAllFolders] = React.useState([]);
  const [allFiles, setAllFiles] = React.useState([]);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState(null);
  const [previewContent, setPreviewContent] = React.useState(null);
  const [previewError, setPreviewError] = React.useState(null);
  const previewBlobUrl = React.useRef(null);
  const [fullScreen, setFullScreen] = React.useState(false);
  const [dialogSize, setDialogSize] = React.useState({ width: 900, height: 600 });
  const filePreviewCache = React.useRef(new Map());
  const [ocrText, setOcrText] = React.useState(null);
  const [ocrLoading, setOcrLoading] = React.useState(false);
  const [ocrError, setOcrError] = React.useState(null);
  const [tab, setTab] = React.useState(0);
  const [activeStep, setActiveStep] = React.useState(0);
  const [expandedSteps, setExpandedSteps] = React.useState([true, false, false]);
  const steps = ['PDF Conversion', 'OCR', 'Postprocessing'];
  const [preprocessingDone, setPreprocessingDone] = React.useState(false);
  const [ocrDone, setOcrDone] = React.useState(false);
  const [extractedTexts, setExtractedTexts] = React.useState([]); // array of text per page
  const [pdfConverted, setPdfConverted] = React.useState(false);
  const [ocrEnabled, setOcrEnabled] = React.useState(false);
  const [postprocessingEnabled, setPostprocessingEnabled] = React.useState(false);
  const [pdfEngine, setPdfEngine] = React.useState('pymupdf');
  const [pdfLang, setPdfLang] = React.useState('es');
  const [pdfImages, setPdfImages] = React.useState([]); // array of image URLs or paths
  const [pdfImagePaths, setPdfImagePaths] = React.useState([]); // real file paths for backend OCR
  const [importLoading, setImportLoading] = React.useState(false);
  const [importError, setImportError] = React.useState(null);
  const [pdfDpi, setPdfDpi] = React.useState(300); // default DPI
  const supportedDpis = [72, 96, 150, 200, 300, 400, 600, 1200];
  const [pdfScale, setPdfScale] = React.useState(1.0); // default scale
  const scaleOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
  const [pdfImgWidth, setPdfImgWidth] = React.useState(595); // default A4 width at 72dpi
  const [pdfImgHeight, setPdfImgHeight] = React.useState(842); // default A4 height at 72dpi
  const [pdfPageRange, setPdfPageRange] = React.useState(''); // e.g., '1-3' or '' for all
  const [pdfImgFormat, setPdfImgFormat] = React.useState('png'); // default format
  const [pdfColorspace, setPdfColorspace] = React.useState('rgb');
  const [pdfAlpha, setPdfAlpha] = React.useState(false);
  const [pdfRotation, setPdfRotation] = React.useState(0);
  const [pdfGrayscale, setPdfGrayscale] = React.useState(false);
  const [pdfTransparent, setPdfTransparent] = React.useState(false);
  const [colorMode, setColorMode] = React.useState('color'); // 'color', 'grayscale', 'bw'
  const [pdfNumPages, setPdfNumPages] = React.useState(null);
  const [pageRangeMode, setPageRangeMode] = React.useState('all'); // 'all', 'single', 'custom'
  const [pageRangeSingle, setPageRangeSingle] = React.useState(1);
  const [ocrParagraph, setOcrParagraph] = React.useState(true); // EasyOCR
  const [ocrHandwriting, setOcrHandwriting] = React.useState(false); // Example for future engines
  const [ocrEngine, setOcrEngine] = React.useState('easyocr');
  const [confirmImportOpen, setConfirmImportOpen] = React.useState(false);
  const [confirmOcrOpen, setConfirmOcrOpen] = React.useState(false);
  const [pendingImport, setPendingImport] = React.useState(false);
  const [pendingOcr, setPendingOcr] = React.useState(false);
  const [preprocessMetrics, setPreprocessMetrics] = React.useState(null);
  const [ocrMetrics, setOcrMetrics] = React.useState(null);
  const [previewKey, setPreviewKey] = React.useState(null);

  // When scale changes, prefill width/height
  React.useEffect(() => {
    // A4 size in points at 72dpi: 595x842
    // At other dpis, width/height = (points * dpi / 72) * scale
    const baseWidth = 595;
    const baseHeight = 842;
    const width = Math.round(baseWidth * (pdfDpi / 72) * pdfScale);
    const height = Math.round(baseHeight * (pdfDpi / 72) * pdfScale);
    setPdfImgWidth(width);
    setPdfImgHeight(height);
  }, [pdfScale, pdfDpi]);

  // Fetch libraries on mount
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

  // Fetch folders and files for the current parent (root or folder)
  React.useEffect(() => {
    if (!selectedLibrary) return;
    setLoading(true);
    const driveId = selectedLibrary.id;
    const folderUrl = currentParentId
      ? `/api/sharepoint/folders?drive_id=${driveId}&parent_id=${currentParentId}`
      : `/api/sharepoint/folders?drive_id=${driveId}`;
    const fileUrl = currentParentId
      ? `/api/sharepoint/files?drive_id=${driveId}&parent_id=${currentParentId}`
      : `/api/sharepoint/files?drive_id=${driveId}`;

    // Load caches
    const folderCache = getCache(FOLDER_CACHE_KEY);
    const fileCache = getCache(FILE_CACHE_KEY);
    const folderCacheKey = `${driveId}:${currentParentId ?? 'root'}`;
    const fileCacheKey = `${driveId}:${currentParentId ?? 'root'}`;

    Promise.all([
      fetch(folderUrl).then((res) => res.ok ? res.json() : []),
      fetch(fileUrl).then((res) => res.ok ? res.json() : []),
    ]).then(([folders, files]) => {
      // Folders
      const cachedFolders = folderCache[folderCacheKey] || [];
      const foldersToCache = [];
      const foldersToShow = folders.map(folder => {
        // If folder has no modified date, don't cache
        if (isOlderThanOneDay(folder.modified)) {
          foldersToCache.push(folder);
          // Use cached if available
          const cached = cachedFolders.find(f => f.id === folder.id);
          return cached || folder;
        }
        return folder;
      });
      folderCache[folderCacheKey] = foldersToCache;
      setCache(FOLDER_CACHE_KEY, folderCache);
      setAllFolders(foldersToShow);
      // Files
      const cachedFiles = fileCache[fileCacheKey] || [];
      const filesToCache = [];
      const filesToShow = files.map(file => {
        if (isOlderThanOneDay(file.modified)) {
          filesToCache.push(file);
          const cached = cachedFiles.find(f => f.id === file.id);
          return cached || file;
        }
        return file;
      });
      fileCache[fileCacheKey] = filesToCache;
      setCache(FILE_CACHE_KEY, fileCache);
      setAllFiles(filesToShow);
      setLoading(false);
    }).catch((err) => {
      setLoading(false);
    });
  }, [selectedLibrary, currentParentId]);

  // Update sort logic for nested fields
  const getSortValue = (file, field) => {
    if (field === 'createdBy') return file.createdBy?.displayName || file.createdBy?.email || '';
    if (field === 'lastModifiedBy') return file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '';
    if (field === 'size') return file.size || 0;
    if (field === 'created' || field === 'modified') return file[field] || '';
    return file[field] ?? '';
  };

  // 1. Sort and filter folders
  const sortedFolders = React.useMemo(() => {
    const sorted = [...allFolders];
    sorted.sort((a, b) => {
      const aValue = a.name.toLowerCase();
      const bValue = b.name.toLowerCase();
      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    });
    return sorted;
  }, [allFolders]);
  const filteredFolders = React.useMemo(() => {
    return sortedFolders.filter(folder => {
      const nameMatch = folder.name.toLowerCase().includes(nameFilter.toLowerCase());
      const createdBy = folder.createdBy?.displayName || folder.createdBy?.email || '';
      const createdByMatch = createdBy.toLowerCase().includes(createdByFilter.toLowerCase());
      const modifiedBy = folder.lastModifiedBy?.displayName || folder.lastModifiedBy?.email || '';
      const modifiedByMatch = modifiedBy.toLowerCase().includes(modifiedByFilter.toLowerCase());
      return nameMatch && createdByMatch && modifiedByMatch;
    });
  }, [sortedFolders, nameFilter, createdByFilter, modifiedByFilter]);
  // 2. Sort and filter files
  const sortedFiles = React.useMemo(() => {
    const sorted = [...allFiles];
    sorted.sort((a, b) => {
      const aValue = getSortValue(a, sortField);
      const bValue = getSortValue(b, sortField);
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [allFiles, sortField, sortOrder]);
  const filteredFiles = React.useMemo(() => {
    return sortedFiles.filter(file => {
      const nameMatch = file.name.toLowerCase().includes(nameFilter.toLowerCase());
      const createdBy = file.createdBy?.displayName || file.createdBy?.email || '';
      const createdByMatch = createdBy.toLowerCase().includes(createdByFilter.toLowerCase());
      const modifiedBy = file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '';
      const modifiedByMatch = modifiedBy.toLowerCase().includes(modifiedByFilter.toLowerCase());
      return nameMatch && createdByMatch && modifiedByMatch;
    });
  }, [sortedFiles, nameFilter, createdByFilter, modifiedByFilter]);
  // 3. Pagination for files only
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

  // Helper to check previewable type
  function getPreviewType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (["pdf"].includes(ext)) return "pdf";
    if (["png", "jpg", "jpeg", "gif", "bmp", "webp"].includes(ext)) return "image";
    if (["txt", "csv", "log", "md", "json"].includes(ext)) return "text";
    return null;
  }

  const handlePreview = async (file) => {
    const type = getPreviewType(file.name);
    if (!type) return;
    const key = `${file.id}:${type}`;
    setPreviewKey(key);
    setPreviewFile({ ...file, type });
    setPreviewError(null);
    setPreviewOpen(true);

    console.log('Previewing file:', file, 'type:', type);

    const cacheKey = `${selectedLibrary.id}:${currentParentId ?? 'root'}:${file.id}:${type}`;
    const fileCacheKey = `${selectedLibrary.id}:${currentParentId ?? 'root'}:${file.id}`;
    const fileCache = getCache(FILE_CACHE_KEY);
    const fileContentCache = getContentCache();
    const fileMeta = fileCache[fileCacheKey]?.find(f => f.id === file.id) || allFiles.find(f => f.id === file.id);
    const modifiedDate = fileMeta?.modified;
    const shouldUseContentCache = isOlderThanOneDay(modifiedDate);
    if (shouldUseContentCache && fileContentCache[cacheKey]) {
      const base64 = fileContentCache[cacheKey];
      const blob = blobFromBase64(base64);
      if (previewBlobUrl.current) URL.revokeObjectURL(previewBlobUrl.current);
      const url = URL.createObjectURL(blob);
      previewBlobUrl.current = url;
      if (previewKey === key) setPreviewContent({ url });
      console.log('Loaded from cache, set preview content:', url);
      return;
    }
    setPreviewContent('loading');
    if (type === 'pdf' || type === 'image') {
      try {
        const res = await fetch(`/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${file.id}`);
        console.log('Fetch response:', res);
        if (!res.ok) throw new Error('Failed to fetch file');
        const blob = await res.blob();
        console.log('Blob:', blob);
        if (blob.size === 0) throw new Error('Empty file');
        if (shouldUseContentCache) {
          saveBlobToCache(cacheKey, blob).then(base64 => {
            const fileContentCache = getContentCache();
            fileContentCache[cacheKey] = base64;
            setContentCache(fileContentCache);
          });
        }
        if (previewBlobUrl.current) URL.revokeObjectURL(previewBlobUrl.current);
        const url = URL.createObjectURL(blob);
        previewBlobUrl.current = url;
        if (previewKey === key) setPreviewContent({ url });
        console.log('Set preview content:', url);
      } catch (e) {
        if (previewKey === key) {
          setPreviewError('Failed to load preview. ' + (e.message || ''));
          setPreviewContent(null);
        }
        console.error('Preview error:', e);
      }
    } else if (type === 'text') {
      try {
        const res = await fetch(`/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${file.id}`);
        if (!res.ok) throw new Error('Failed to fetch text');
        const text = await res.text();
        if (shouldUseContentCache) {
          const fileContentCache = getContentCache();
          fileContentCache[cacheKey] = text;
          setContentCache(fileContentCache);
        }
        if (previewKey === key) setPreviewContent(text);
      } catch (e) {
        if (previewKey === key) {
          setPreviewError('Failed to load text preview. ' + (e.message || ''));
          setPreviewContent(null);
        }
        console.error('Text preview error:', e);
      }
    }
  };

  const handleItemClick = (item) => {
    if (item.isFolder) {
      setCurrentParentId(item.id);
    } else {
      handlePreview(item);
    }
  };

  const handleBackClick = () => {
    if (currentParentId) {
      setCurrentParentId(null);
    } else {
      setSelectedLibrary(null);
    }
  };

  React.useEffect(() => {
    if (!previewOpen && previewBlobUrl.current) {
      URL.revokeObjectURL(previewBlobUrl.current);
      previewBlobUrl.current = null;
    }
  }, [previewOpen]);

  React.useEffect(() => {
    setOcrText(null);
    setOcrError(null);
    setOcrLoading(false);
  }, [previewFile]);

  const handleImportPdf = async () => {
    // If images or extracted text already exist, confirm before proceeding
    if ((pdfImages && pdfImages.length > 0) || (extractedTexts && extractedTexts.some(t => t && t.trim()))) {
      setConfirmImportOpen(true);
      setPendingImport(true);
      return;
    }
    await doImportPdf();
  };

  const doImportPdf = async () => {
    setImportLoading(true);
    setImportError(null);
    setPdfConverted(false);
    setPdfImages([]);
    setPdfImagePaths([]);
    setExtractedTexts([]);
    try {
      // Fetch the PDF from the backend using the current file's ID
      const resFile = await fetch(`/api/sharepoint/file_content?drive_id=${selectedLibrary.id}&item_id=${previewFile?.id}`);
      if (!resFile.ok) throw new Error('Failed to fetch PDF from backend');
      const blob = await resFile.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        // Set color/grayscale param based on engine and colorMode
        let colorspace = pdfColorspace;
        let grayscaleFlag = false;
        if (colorMode === 'color') {
          colorspace = 'rgb';
          grayscaleFlag = false;
        } else if (colorMode === 'grayscale') {
          if (pdfEngine === 'pymupdf') {
            colorspace = 'gray';
            grayscaleFlag = false;
          } else if (pdfEngine === 'pdf2image') {
            colorspace = 'rgb';
            grayscaleFlag = true;
          }
        } else if (colorMode === 'bw') {
          // For B&W, use grayscale for backend, and set bwPostProcess for Step 2
          if (pdfEngine === 'pymupdf') {
            colorspace = 'gray';
            grayscaleFlag = false;
          } else if (pdfEngine === 'pdf2image') {
            colorspace = 'rgb';
            grayscaleFlag = true;
          }
        }
        // Determine page_range
        let page_range = '';
        if (pageRangeMode === 'all') {
          page_range = '';
        } else if (pageRangeMode.startsWith('single')) {
          page_range = pageRangeMode.split('-')[1];
        } else if (pageRangeMode === 'custom') {
          page_range = pdfPageRange;
        }
        const res = await fetch('/api/ocr/preprocess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_id: previewFile?.id,
            directory_id: currentParentId ?? 'root',
            pdf_data: base64,
            engine: pdfEngine,
            lang: pdfLang,
            dpi: pdfDpi,
            scale: pdfScale,
            width: pdfImgWidth,
            height: pdfImgHeight,
            colorspace: colorspace,
            alpha: pdfAlpha,
            rotation: pdfRotation,
            image_format: pdfImgFormat,
            page_range: page_range,
            grayscale: grayscaleFlag,
            transparent: pdfTransparent,
          }),
        });
        if (!res.ok) throw new Error('Failed to preprocess PDF');
        const data = await res.json();
        setPdfImages(data.image_urls || data.image_ids || []);
        setPdfImagePaths(data.image_ids || []);
        setExtractedTexts(data.page_texts || []);
        setPdfConverted(true);
        setPreprocessMetrics(data.metrics || null);
        // CONDITIONAL WORKFLOW LOGIC
        if (data.page_texts && data.page_texts.length > 0 && data.page_texts.some(t => t && t.trim())) {
          // Embedded text found: skip to postprocessing, disable OCR
          setOcrEnabled(false);
          setPostprocessingEnabled(true);
          setActiveStep(2);
        } else {
          // No embedded text: enable OCR, advance to OCR
          setOcrEnabled(true);
          setPostprocessingEnabled(false);
          setActiveStep(1);
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      setImportError(e.message || 'Import failed');
    } finally {
      setImportLoading(false);
    }
  };

  const handleRunOcr = async () => {
    // If OCR text already exists, confirm before proceeding
    if (ocrText && ocrText.trim()) {
      setConfirmOcrOpen(true);
      setPendingOcr(true);
      return;
    }
    await doRunOcr();
  };

  const doRunOcr = async () => {
    setOcrLoading(true);
    setOcrError(null);
    setOcrText(null);
    try {
      // Use the images generated in Step 1
      const res = await fetch('/api/ocr/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_paths: pdfImagePaths,
          engine: ocrEngine,
          lang: pdfLang,
          paragraph: ocrParagraph,
          // Add other OCR-specific options here
        }),
      });
      if (!res.ok) throw new Error('Failed to run OCR');
      const data = await res.json();
      console.log('OCR images response:', data);
      // Combine all OCR results into a single string for display
      const ocrResultText = (data.results || []).map((r, idx) => r.text ? `Page ${idx + 1}:
${r.text}` : `Page ${idx + 1}: [Error: ${r.error || 'No text'}]`).join('\n\n');
      setOcrText(ocrResultText);
      setOcrDone(true);
      setPostprocessingEnabled(true);
      setActiveStep(2);
      setOcrMetrics(data.metrics || null);
    } catch (e) {
      setOcrError(e.message || 'OCR failed');
    } finally {
      setOcrLoading(false);
    }
  };

  // When activeStep changes, auto-expand it (but don't collapse others)
  React.useEffect(() => {
    setExpandedSteps(prev => {
      const arr = [...prev];
      arr[activeStep] = true;
      return arr;
    });
  }, [activeStep]);

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Typography color="error">{error}</Typography></Box>;

  if (!selectedLibrary) {
    return (
      <Box p={2}>
        <Typography variant="subtitle1" color="primary" gutterBottom sx={{ fontWeight: 500, fontSize: '1.1rem', lineHeight: 1.2 }}>
          SharePoint Libraries
        </Typography>
        <Grid container spacing={2}>
          {libraries.map((lib) => (
            <Grid item xs={12} sm={6} md={4} key={lib.id}>
              <Paper elevation={2} sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.7)', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 6 } }} onClick={() => { setSelectedLibrary(lib); setCurrentParentId(null); }}>
                <LibraryBooksIcon sx={{ color: '#51247A', fontSize: 32, mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 500 }}>{lib.name}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBackClick}>
          Back
        </Button>
        <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 500, fontSize: '1.1rem', lineHeight: 1.2 }}>{selectedLibrary.name}</Typography>
      </Stack>
      {/* Folders grid */}
      {filteredFolders.length > 0 && (
        <Grid container spacing={2} mb={2}>
          {filteredFolders.map((folder) => (
            <Grid item xs={12} sm={6} md={4} key={folder.id}>
              <Paper
                elevation={2}
                sx={{
                  width: 180,
                  height: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border 0.2s',
                  '&:hover': { boxShadow: 6, border: '1px solid #7c3aed' }
                }}
                onClick={() => handleItemClick({ ...folder, isFolder: true })}
              >
                <FolderIcon htmlColor="#51247A" sx={{ fontSize: 48, mb: 1 }} />
                <Typography
                  variant="body2"
                  align="center"
                  sx={{
                    fontWeight: 500,
                    fontSize: '1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%'
                  }}
                  title={folder.name}
                >
                  {folder.name}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
      {filteredFolders.length === 0 && filteredFiles.length === 0 && (
        <Grid item xs={12}>
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No files or folders found
          </Typography>
        </Grid>
      )}
      {/* Files table */}
      {filteredFiles.length > 0 && (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
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
                <TableCell sortDirection={sortField === 'modifiedBy' ? sortOrder : false}>
                  <TableSortLabel
                    active={sortField === 'modifiedBy'}
                    direction={sortField === 'modifiedBy' ? sortOrder : 'asc'}
                    onClick={() => handleSort('modifiedBy')}
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
              {/* Only render paginated files as table rows */}
              {paginatedFiles.map((file, idx) => (
                <TableRow key={file.id} hover sx={{ height: 28 }}>
                  <TableCell sx={{ width: 32, fontWeight: 500, color: '#512698' }}>{page * rowsPerPage + idx + 1}</TableCell>
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
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                      title={file.created ? new Date(file.created).toLocaleString() : '-'}
                    >
                      {file.created ? new Date(file.created).toLocaleString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                      title={file.createdBy?.displayName || file.createdBy?.email || '-'}
                    >
                      {file.createdBy?.displayName || file.createdBy?.email || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        maxWidth: 140,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                      title={file.modified ? new Date(file.modified).toLocaleString() : '-'}
                    >
                      {file.modified ? new Date(file.modified).toLocaleString() : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                      title={file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '-'}
                    >
                      {file.lastModifiedBy?.displayName || file.lastModifiedBy?.email || '-'}
                    </Typography>
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
                        <IconButton onClick={() => handlePreview(file)} size="small" title="Preview">
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
      )}
      {/* Preview Dialog */}
      {previewOpen && (
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth={false}
          fullWidth={false}
          fullScreen={fullScreen}
          PaperProps={{
            sx: !fullScreen ? {
              width: dialogSize.width,
              height: dialogSize.height,
              maxWidth: '95vw',
              maxHeight: '95vh',
              margin: 'auto'
            } : {}
          }}
        >
          <DialogTitle sx={{ pr: 10 }}>
            File Preview: {previewFile?.name}
            <IconButton
              sx={{ position: 'absolute', right: 88, top: 8 }}
              size="large"
              title="Preview Dialog Settings (cache control)"
            >
              <SettingsIcon />
            </IconButton>
            <IconButton
              onClick={() => setFullScreen(f => !f)}
              sx={{ position: 'absolute', right: 48, top: 8 }}
              size="large"
              title={fullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {fullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
            <IconButton onClick={() => setPreviewOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              height: fullScreen ? '100%' : dialogSize.height - 64
            }}
          >
            {/* Debug Info Accordion at the top */}
            {previewFile && (
              <Accordion sx={{ width: '100%', mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  Debug Info
                </AccordionSummary>
                <AccordionDetails>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Drive ID: <code>{selectedLibrary?.id}</code>
                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(selectedLibrary?.id)} title="Copy Drive ID"><ContentCopyIcon fontSize="small" /></IconButton>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Parent ID: <code>{currentParentId ?? 'root'}</code>
                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(currentParentId ?? 'root')} title="Copy Parent ID"><ContentCopyIcon fontSize="small" /></IconButton>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    File ID: <code>{previewFile?.id}</code>
                    <IconButton size="small" onClick={() => navigator.clipboard.writeText(previewFile?.id)} title="Copy File ID"><ContentCopyIcon fontSize="small" /></IconButton>
                  </div>
                </AccordionDetails>
              </Accordion>
            )}
            {/* File Preview (PDF/Image/Text) */}
            {previewContent === 'loading' && <CircularProgress />}
            {previewError && <Alert severity="error">{previewError}</Alert>}
            {previewContent && previewFile?.type === 'pdf' && previewContent.url && (
              <Box mb={2} width="100%" display="flex" justifyContent="center">
                <Document file={previewContent.url} onLoadSuccess={({ numPages }) => setPdfNumPages(numPages)}>
                  <Page pageNumber={1} width={600} />
                </Document>
              </Box>
            )}
            {previewContent && previewFile?.type === 'image' && previewContent.url && (
              <Box mb={2} width="100%" display="flex" justifyContent="center">
                <img src={previewContent.url} alt="Preview" style={{ maxWidth: 600, maxHeight: 400 }} />
              </Box>
            )}
            {previewContent && previewFile?.type === 'text' && typeof previewContent === 'string' && (
              <Box mb={2} width="100%" bgcolor="#f5f5f5" p={2} borderRadius={1}>
                <pre style={{ margin: 0, fontSize: 14 }}>{previewContent}</pre>
              </Box>
            )}
            {/* Stepper at the top */}
            <Stepper activeStep={activeStep} alternativeLabel sx={{ width: '100%', mb: 2 }}>
              {steps.map((label, idx) => (
                <Step key={label} completed={idx < activeStep}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {/* Step 1: PDF Conversion (always enabled) */}
            <Accordion expanded={expandedSteps[0]} onChange={() => setExpandedSteps(prev => { const arr = [...prev]; arr[0] = !arr[0]; return arr; })} disabled={false} sx={{ width: '100%', mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>Step 1: PDF Conversion</AccordionSummary>
              <AccordionDetails>
                {preprocessMetrics && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <b>Step 1 Metrics:</b><br />
                    Engine: {preprocessMetrics.engine} | Time: {preprocessMetrics.time_seconds?.toFixed(2)}s | Pages: {preprocessMetrics.pages}
                    {extractedTexts && extractedTexts.length > 0 && extractedTexts.some(t => t && t.trim()) && (
                      <> | Words: {extractedTexts.reduce((acc, t) => acc + (t ? t.split(/\s+/).filter(Boolean).length : 0), 0)}</>
                    )}
                  </Alert>
                )}
                <Alert severity="info" sx={{ mb: 2 }}>
                  <b>PDF-to-image conversion options:</b> These settings control how the PDF is converted to images on the backend. Adjust them for best OCR results.
                </Alert>
                {/* Nested Accordion for PDF Engine Configuration */}
                <Accordion defaultExpanded={false} sx={{ width: '100%', mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>PDF Engine Configuration</AccordionSummary>
                  <AccordionDetails>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Engine</InputLabel>
                      <Select label="Engine" value={pdfEngine} onChange={e => setPdfEngine(e.target.value)}>
                        <MenuItem value="pymupdf">PyMuPDF (extracts text)</MenuItem>
                        <MenuItem value="pdf2image">pdf2image (images only)</MenuItem>
                      </Select>
                      <FormHelperText>
                        PyMuPDF can extract embedded text. pdf2image only generates images.
                      </FormHelperText>
                    </FormControl>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Language</InputLabel>
                      <Select label="Language" value={pdfLang} onChange={e => setPdfLang(e.target.value)}>
                        <MenuItem value="es">Spanish</MenuItem>
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="fr">French</MenuItem>
                      </Select>
                    </FormControl>
                    {/* PDF-to-image conversion options */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>DPI</InputLabel>
                          <Select label="DPI" value={pdfDpi} onChange={e => setPdfDpi(Number(e.target.value))}>
                            {supportedDpis.map(dpi => (
                              <MenuItem key={dpi} value={dpi}>{dpi}</MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>
                            Higher DPI = higher quality and larger files. 200–300 is recommended for OCR. 1200 is rarely needed and may be slow.
                          </FormHelperText>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Scale</InputLabel>
                          <Select label="Scale" value={pdfScale} onChange={e => setPdfScale(Number(e.target.value))}>
                            {scaleOptions.map(scale => (
                              <MenuItem key={scale} value={scale}>{scale}x</MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>
                            1x = original size at selected DPI. Changing scale will prefill width/height below.
                          </FormHelperText>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <TextField label="Image Width (px)" type="number" value={pdfImgWidth} onChange={e => setPdfImgWidth(Number(e.target.value))} fullWidth size="small" inputProps={{ min: 1, max: 10000 }} helperText="Width in pixels. Prefilled by scale, editable." />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <TextField label="Image Height (px)" type="number" value={pdfImgHeight} onChange={e => setPdfImgHeight(Number(e.target.value))} fullWidth size="small" inputProps={{ min: 1, max: 10000 }} helperText="Height in pixels. Prefilled by scale, editable." />
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Page Range</InputLabel>
                          <Select
                            label="Page Range"
                            value={pageRangeMode}
                            onChange={e => setPageRangeMode(e.target.value)}
                          >
                            <MenuItem value="all">All pages{pdfNumPages ? ` (1-${pdfNumPages})` : ''}</MenuItem>
                            {pdfNumPages && Array.from({ length: pdfNumPages }, (_, i) => (
                              <MenuItem key={i + 1} value={`single-${i + 1}`}>Page {i + 1}</MenuItem>
                            ))}
                            <MenuItem value="custom">Custom range...</MenuItem>
                          </Select>
                          <FormHelperText>
                            {pdfNumPages ? `PDF has ${pdfNumPages} pages.` : 'Select which pages to process.'}
                          </FormHelperText>
                        </FormControl>
                        {pageRangeMode.startsWith('single') && (
                          <Box mt={1}>
                            <Typography variant="caption">Selected page: {pageRangeMode.split('-')[1]}</Typography>
                          </Box>
                        )}
                        {pageRangeMode === 'custom' && (
                          <TextField
                            label="Custom Range"
                            value={pdfPageRange}
                            onChange={e => setPdfPageRange(e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="e.g. 1-3,5"
                            helperText={pdfNumPages ? `Enter page numbers/ranges (max: ${pdfNumPages})` : 'Enter page numbers/ranges'}
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Image Format</InputLabel>
                          <Select label="Image Format" value={pdfImgFormat} onChange={e => setPdfImgFormat(e.target.value)}>
                            <MenuItem value="png">PNG</MenuItem>
                            <MenuItem value="jpeg">JPEG</MenuItem>
                            <MenuItem value="tiff">TIFF</MenuItem>
                          </Select>
                          <FormHelperText>Output image format</FormHelperText>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Color Mode</InputLabel>
                          <Select
                            label="Color Mode"
                            value={colorMode}
                            onChange={e => {
                              setColorMode(e.target.value);
                            }}
                          >
                            <MenuItem value="color">Color (RGB)</MenuItem>
                            <MenuItem value="grayscale">Grayscale</MenuItem>
                            <MenuItem value="bw">Black & White (B&W, 1-bit)</MenuItem>
                          </Select>
                          <FormHelperText>
                            Color: full color. Grayscale: 8-bit gray. B&W: 1-bit, applied in Step 2 (Image Manipulation).
                          </FormHelperText>
                        </FormControl>
                      </Grid>
                      {pdfEngine === 'pymupdf' && (pdfImgFormat === 'png' || pdfImgFormat === 'tiff') && (
                        <Grid item xs={6} md={3}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={pdfAlpha}
                                onChange={e => setPdfAlpha(e.target.checked)}
                              />
                            }
                            label={
                              <span>
                                Alpha (transparency)
                                <Tooltip title="If enabled, output images will include an alpha (transparency) channel. Only applies to PyMuPDF and PNG/TIFF output.">
                                  <HelpOutlineIcon fontSize="small" />
                                </Tooltip>
                              </span>
                            }
                          />
                          <FormHelperText>
                            Preserve transparency from PDF (output PNG/TIFF with alpha channel).
                          </FormHelperText>
                        </Grid>
                      )}
                      {pdfEngine === 'pdf2image' && pdfImgFormat === 'png' && (
                        <Grid item xs={6} md={3}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={pdfTransparent}
                                onChange={e => setPdfTransparent(e.target.checked)}
                              />
                            }
                            label={
                              <span>
                                Transparent
                                <Tooltip title="If enabled, output PNG images will have a transparent background (pdf2image only). Only applies to PNG format.">
                                  <HelpOutlineIcon fontSize="small" />
                                </Tooltip>
                              </span>
                            }
                          />
                          <FormHelperText>
                            Output PNG with transparent background (removes white background if possible).
                          </FormHelperText>
                        </Grid>
                      )}
                      <Grid item xs={6} md={3}>
                        <TextField label="Rotation" type="number" value={pdfRotation} onChange={e => setPdfRotation(Number(e.target.value))} fullWidth size="small" inputProps={{ min: 0, max: 359 }} helperText="Rotate page (degrees)" />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
                {/* Always show existing images and extracted text if present */}
                {pdfImages && pdfImages.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Existing Images</Typography>
                    <Box display="flex" flexWrap="wrap" gap={2}>
                      {pdfImages.map((img, idx) => (
                        <img key={idx} src={img} alt={`PDF page ${idx + 1}`} style={{ maxWidth: 120, maxHeight: 160, border: '1px solid #ccc', borderRadius: 4 }} />
                      ))}
                    </Box>
                  </Box>
                )}
                {extractedTexts && extractedTexts.some(t => t && t.trim()) && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Existing Extracted Text</Typography>
                    {extractedTexts.map((text, idx) => (
                      text && text.trim() && (
                        <Box key={idx} mt={1} p={2} bgcolor="#f5f5f5" borderRadius={1}>
                          <b>Page {idx + 1} Text:</b>
                          <pre style={{ margin: 0, fontSize: 14 }}>{text}</pre>
                        </Box>
                      )
                    ))}
                  </Box>
                )}
                <Button variant="contained" onClick={handleImportPdf} disabled={importLoading} sx={{ mb: 2 }}>
                  {importLoading ? 'Importing...' : 'Import PDF'}
                </Button>
                {/* Confirm Import Dialog */}
                <Dialog open={confirmImportOpen} onClose={() => { setConfirmImportOpen(false); setPendingImport(false); }}>
                  <DialogTitle>Overwrite Existing Images and Text?</DialogTitle>
                  <DialogContent>
                    <Typography>
                      Images and/or extracted text already exist for this file.<br />
                      Are you sure you want to import and overwrite them?
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => { setConfirmImportOpen(false); setPendingImport(false); }}>No</Button>
                    <Button onClick={async () => { setConfirmImportOpen(false); setPendingImport(false); await doImportPdf(); }} color="primary" variant="contained">Yes, Overwrite</Button>
                  </DialogActions>
                </Dialog>
                {importError && <Alert severity="error">{importError}</Alert>}
                {pdfConverted && (
                  <>
                    {extractedTexts.length > 0 && extractedTexts.some(t => t && t.trim()) ? (
                      <Box mb={2}>
                        <Alert severity="info">Embedded text found in PDF. You can use this text for postprocessing, or proceed to OCR for further improvement.</Alert>
                        {extractedTexts.map((text, idx) => (
                          <Box key={idx} mt={1} p={2} bgcolor="#f5f5f5" borderRadius={1}>
                            <b>Page {idx + 1} Text:</b>
                            <pre style={{ margin: 0, fontSize: 14 }}>{text}</pre>
                          </Box>
                        ))}
                        {/* Force OCR button if user wants to override */}
                        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => {
                          setOcrEnabled(true);
                          setPostprocessingEnabled(false);
                          setActiveStep(1);
                        }}>
                          Force OCR (process images even though text was found)
                        </Button>
                      </Box>
                    ) : (
                      <Alert severity="warning">No embedded text found in PDF. Please proceed to OCR.</Alert>
                    )}
                  </>
                )}
              </AccordionDetails>
            </Accordion>
            {/* Step 2: OCR */}
            <Accordion expanded={expandedSteps[1]} onChange={() => setExpandedSteps(prev => { const arr = [...prev]; arr[1] = !arr[1]; return arr; })} disabled={!ocrEnabled} sx={{ width: '100%' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>Step 2: OCR</AccordionSummary>
              <AccordionDetails>
                {ocrMetrics && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <b>Step 2 Metrics:</b><br />
                    Engine: {ocrMetrics.engine} | Time: {ocrMetrics.time_seconds?.toFixed(2)}s | Images: {ocrMetrics.images} | Words: {ocrMetrics.words}
                  </Alert>
                )}
                {/* Nested Accordion for OCR Engine Configuration */}
                <Accordion defaultExpanded={false} sx={{ width: '100%', mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>OCR Engine Configuration</AccordionSummary>
                  <AccordionDetails>
                    {/* OCR Engine Selection */}
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>OCR Engine</InputLabel>
                      <Select value={ocrEngine} onChange={e => setOcrEngine(e.target.value)}>
                        <MenuItem value="easyocr">EasyOCR</MenuItem>
                        <MenuItem value="tesseract">Tesseract</MenuItem>
                        <MenuItem value="torch">Torch (custom/PyTorch-based)</MenuItem>
                      </Select>
                    </FormControl>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      OCR will use the engine, language, DPI, and format as selected. Below you can set additional OCR-specific options.
                    </Alert>
                    {/* Example: EasyOCR paragraph mode */}
                    {ocrEngine === 'easyocr' && (
                      <Tooltip title="If enabled, EasyOCR will try to merge detected lines into paragraphs. Recommended for most documents. Disable for forms or tables.">
                        <FormControlLabel
                          control={<Checkbox checked={ocrParagraph} onChange={e => setOcrParagraph(e.target.checked)} />}
                          label="Paragraph Mode (EasyOCR)"
                        />
                      </Tooltip>
                    )}
                  </AccordionDetails>
                </Accordion>
                <Button variant="contained" sx={{ mt: 2 }} onClick={handleRunOcr} disabled={ocrLoading}>
                  {ocrLoading ? 'Running OCR...' : 'Run OCR & Next'}
                </Button>
                {/* Confirm OCR Dialog */}
                <Dialog open={confirmOcrOpen} onClose={() => { setConfirmOcrOpen(false); setPendingOcr(false); }}>
                  <DialogTitle>Overwrite Existing OCR Result?</DialogTitle>
                  <DialogContent>
                    <Typography>
                      OCR text already exists for these images.<br />
                      Are you sure you want to run OCR again and overwrite the result?
                    </Typography>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => { setConfirmOcrOpen(false); setPendingOcr(false); }}>No</Button>
                    <Button onClick={async () => { setConfirmOcrOpen(false); setPendingOcr(false); await doRunOcr(); }} color="primary" variant="contained">Yes, Overwrite</Button>
                  </DialogActions>
                </Dialog>
                {ocrError && <Alert severity="error" sx={{ mt: 2 }}>{ocrError}</Alert>}
                {ocrText && (
                  <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1} maxHeight={200} overflow="auto">
                    <pre style={{ margin: 0, fontSize: 14 }}>{ocrText}</pre>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
            {/* Step 3: Postprocessing */}
            <Accordion expanded={expandedSteps[2]} onChange={() => setExpandedSteps(prev => { const arr = [...prev]; arr[2] = !arr[2]; return arr; })} disabled={!postprocessingEnabled} sx={{ width: '100%' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>Step 3: Postprocessing</AccordionSummary>
              <AccordionDetails>
                {/* Results Controls, field extraction, etc. */}
                <Tabs value={0}>
                  <Tab label="OCR" />
                  <Tab label="HWR" />
                  <Tab label="Mixed" />
                </Tabs>
                <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1} maxHeight={200} overflow="auto">
                  <pre style={{ margin: 0, fontSize: 14 }}>{ocrText}</pre>
                </Box>
                <Button sx={{ mt: 2, mr: 2 }}>Copy</Button>
                <Button sx={{ mt: 2 }}>Save as Default</Button>
              </AccordionDetails>
            </Accordion>
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default SharePointMUIFileExplorer; 