import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, Grid, Card, CardContent, IconButton, Button, Checkbox, CircularProgress, useTheme, Divider, Tooltip } from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import GetAppIcon from '@mui/icons-material/GetApp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TextSnippetIcon from '@mui/icons-material/TextSnippet'; 
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

import { fetchOcrStatuses } from '../utils/apiUtils'; 
import { formatDate, formatFileSize } from '../utils/formattingUtils';
import { getFileIcon, isPreviewable } from '../utils/fileUtils.jsx';
import GenericFileEditor from '../components/GenericFileEditor';

// Helper function to get a comparable string representation of selected items
const getComparableSelection = (items) => {
    if (!items || items.length === 0) return '[]'; // Consistent representation for empty
    // Ensure IDs are strings for consistent sorting if they can be numbers
    return JSON.stringify(items.map(item => String(item.id)).sort());
};

// --- ExplorerCardGrid (used by LibrariesGrid, FoldersGrid) ---
const ExplorerCardGrid = ({ 
    data, 
    onCardClick, 
    icon, 
    cardHeight = 120, 
    iconSize = 30,   
    fontSize = 'caption', 
    cardWidth = 160,  
    isItemSelected, 
    handleSelectItem, 
    itemType = "item" 
}) => {
    const theme = useTheme();
    return (
        <Grid container spacing={2} sx={{ mt: 0.5, p: 1 }}>
            {data.map(record => {
                const selected = itemType === "folder" ? isItemSelected(record, true) : false;
                return (
                    <Grid item key={record.id}>
                        <Card
                            sx={{
                                width: cardWidth,
                                height: cardHeight,
                                borderRadius: 2,
                                boxShadow: selected ? 6 : 3,
                                border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                                transition: 'box-shadow 0.2s, transform 0.2s, border 0.2s',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                position: 'relative',
                                '&:hover': {
                                    boxShadow: 6,
                                    transform: 'scale(1.02)'
                                },
                                bgcolor: selected ? theme.palette.action.selected : 'background.paper',
                            }}
                        >
                            {itemType === "folder" && (
                                <Checkbox
                                    checked={selected}
                                    onChange={() => handleSelectItem(record, true)}
                                    onClick={(e) => e.stopPropagation()} 
                                    size="small"
                                    sx={{ position: 'absolute', top: 4, left: 4, zIndex: 2 }}
                                    inputProps={{ 'aria-label': `Select folder ${record.name}` }}
                                />
                            )}
                            <CardContent 
                                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, flexGrow: 1, width: '100%', cursor:'pointer'}}
                                onClick={() => onCardClick(record)} 
                            >
                                {React.cloneElement(icon, { sx: { fontSize: iconSize, color: 'primary.main', mb: 1 } })}
                                <Typography variant={fontSize} sx={{ fontWeight: 500, textAlign: 'center', wordBreak: 'break-word', width: '100%' }}>
                                    {record.name}
                                </Typography>
                                {record.description && cardHeight > 100 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 0.5, fontSize: '0.75rem' }}>
                                        {record.description}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
};

// --- LibrariesGrid: displays SharePoint libraries ---
const LibrariesGrid = ({ onLibraryClick }) => {
    const [libraries, setLibraries] = useState([]);
    const [loadingLibraries, setLoadingLibraries] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLibraries = async () => {
            setLoadingLibraries(true);
            setError(null);
            try {
                // TODO: Replace with call to fetchSharePointLibraries from apiUtils.js
                const response = await fetch('/api/sharepoint/libraries');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setLibraries(data || []);
            } catch (e) {
                console.error("Failed to fetch libraries:", e);
                setError(e.message);
                setLibraries([]);
            } finally {
                setLoadingLibraries(false);
            }
        };
        fetchLibraries();
    }, []); // This effect should run only once on mount

    if (loadingLibraries) return <Box sx={{display: 'flex', justifyContent: 'center', p:2}}><CircularProgress /></Box>;
    if (error) return <Typography color="error" sx={{p:2}}>Error loading libraries: {error}</Typography>;
    if (!libraries.length) return <Typography color="text.secondary" sx={{p:2}}>No SharePoint libraries found.</Typography>;

    return (
        <ExplorerCardGrid
            data={libraries}
            onCardClick={onLibraryClick}
            icon={<LibraryBooksIcon />}
        />
    );
};

const SharePointExplorer = ({ onSelectionChange, multiSelect = true, initialPath = null }) => { // Renamed onSelectionComplete to onSelectionChange
    const theme = useTheme();
    const [selectedLibrary, setSelectedLibrary] = useState(null);
    const [currentFolder, setCurrentFolder] = useState(null);
    const [folderStack, setFolderStack] = useState([]);
    
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [fileStatuses, setFileStatuses] = useState({});
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const [selectedItems, setSelectedItems] = useState([]); // Stores "type-id", e.g., "file-item.id" or "folder-item.id"
    const prevDetailedSelectionComparableRef = useRef(getComparableSelection([]));

    const fetchSharePointFoldersAPI = useCallback(async (driveId, parentId) => {
        const response = await fetch(`/api/sharepoint/folders?drive_id=${driveId}${parentId ? `&parent_id=${parentId}` : ''}`);
        if (!response.ok) throw new Error(`Failed to fetch folders: ${response.status}`);
        return response.json();
    }, []);

    const fetchSharePointFilesAPI = useCallback(async (driveId, parentId) => {
        const response = await fetch(`/api/sharepoint/files?drive_id=${driveId}${parentId ? `&parent_id=${parentId}` : ''}`);
        if (!response.ok) throw new Error(`Failed to fetch files: ${response.status}`);
        return response.json();
    }, []);

    useEffect(() => {
        if (!selectedLibrary) {
            setFolders([]);
            setFiles([]);
            setFileStatuses({});
            return;
        }
        
        const loadFolderContents = async () => {
            setLoading(true);
            setError(null);
            const driveId = selectedLibrary.id;
            const parentId = currentFolder ? currentFolder.id : null;

            try {
                const [foldersData, filesData] = await Promise.all([
                    fetchSharePointFoldersAPI(driveId, parentId),
                    fetchSharePointFilesAPI(driveId, parentId)
                ]);
                setFolders(foldersData || []);
                const filesWithDriveId = (filesData || []).map(f => ({ ...f, drive_id: driveId, id: String(f.id) }));
                setFiles(filesWithDriveId);

                if (filesWithDriveId.length > 0) {
                    const statuses = await fetchOcrStatuses(filesWithDriveId.map(f => f.id));
                    setFileStatuses(statuses);
                } else {
                    setFileStatuses({});
                }
            } catch (e) {
                console.error("Failed to load folder contents:", e);
                setError(e.message);
                setFolders([]);
                setFiles([]);
                setFileStatuses({});
            } finally {
                setLoading(false);
            }
        };

        loadFolderContents();
    }, [selectedLibrary, currentFolder, fetchSharePointFilesAPI, fetchSharePointFoldersAPI]);

    useEffect(() => {
        setSelectedItems([]);
    }, [selectedLibrary, currentFolder]);

    const handleLibraryClick = (library) => {
        setSelectedLibrary(library);
        setCurrentFolder(null);
        setFolderStack([]);
    };

    const handleFolderClick = (folder) => {
        if (currentFolder) {
            setFolderStack(prevStack => [...prevStack, currentFolder]);
        }
        setCurrentFolder(folder);
    };
    
    const handleBack = () => {
        setError(null); 
        if (folderStack.length > 0) {
            const previousFolder = folderStack[folderStack.length - 1];
            setCurrentFolder(previousFolder);
            setFolderStack(prevStack => prevStack.slice(0, -1));
        } else {
            setCurrentFolder(null); 
            if (!currentFolder) { 
                 setSelectedLibrary(null);
                 setFolderStack([]); 
            }
        }
    };

    const handleSelectItem = (item, isFolder) => {
        const itemId = isFolder ? `folder-${item.id}` : `file-${item.id}`;
        setSelectedItems(prev => {
            let newSelection;
            if (prev.includes(itemId)) {
                newSelection = prev.filter(id => id !== itemId);
            } else {
                if (multiSelect) {
                    newSelection = [...prev, itemId];
                } else {
                    // If not multiSelect, clear previous selections of the same type, or all if mixed selection isn't desired
                    // For now, allow mixed single selection: one folder OR one file
                    if (isFolder) {
                        const otherSelectedFiles = prev.filter(id => id.startsWith('file-'));
                        newSelection = [...otherSelectedFiles, itemId];
                    } else {
                        const otherSelectedFolders = prev.filter(id => id.startsWith('folder-'));
                        newSelection = [...otherSelectedFolders, itemId];
                    }
                    // If strictly one item overall: newSelection = [itemId];
                }
            }
            // If not multiSelect and newSelection has more than one item, take the last one.
            if (!multiSelect && newSelection.length > 1) {
                 return [newSelection[newSelection.length - 1]];
            }
            return newSelection;
        });
    };
    
    const isItemSelected = (item, isFolder) => {
        const itemId = isFolder ? `folder-${item.id}` : `file-${item.id}`;
        return selectedItems.includes(itemId);
    };

    const handleFileSelectionChange = (selectedFileIds) => {
        // Combines folder selections with file selections from GenericFileEditor
        const folderSelections = selectedItems.filter(id => id.startsWith('folder-'));
        const newFileSelections = selectedFileIds.map(id => `file-${id}`);
        
        if (multiSelect) {
            setSelectedItems([...folderSelections, ...newFileSelections]);
        } else {
            if (newFileSelections.length > 0) {
                setSelectedItems([newFileSelections[0]]); // Prioritize file if single select and files are chosen
            } else if (folderSelections.length > 0) {
                setSelectedItems([folderSelections[0]]);
            } else {
                setSelectedItems([]);
            }
        }
    };

    // useEffect to call onSelectionChange when selectedItems changes
    useEffect(() => {
        if (onSelectionChange) {
            const detailedSelectedItems = selectedItems.map(idString => {
                const [type, id] = idString.split(/-(.+)/); // Split only on the first hyphen
                if (type === 'folder') {
                    const folder = folders.find(f => String(f.id) === id);
                    return folder ? { ...folder, itemType: 'folder' } : null;
                }
                if (type === 'file') {
                    const file = files.find(f => String(f.id) === id);
                    return file ? { ...file, itemType: 'file' } : null;
                }
                return null;
            }).filter(Boolean);

            const currentComparableSelection = getComparableSelection(detailedSelectedItems);

            if (prevDetailedSelectionComparableRef.current !== currentComparableSelection) {
                onSelectionChange(detailedSelectedItems);
                prevDetailedSelectionComparableRef.current = currentComparableSelection;
            }
        }
    }, [selectedItems, folders, files, onSelectionChange]); // onSelectionChange is stable due to useCallback in Flow.jsx

    const fileTableColumns = [
        // Checkbox column is now handled by GenericFileEditor itself if `externallySelectedIds` is used
        { field: 'name', title: 'Name', render: (row) => (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {getFileIcon(row.name)}
                {row.name}
            </Box>
        )},
        { field: 'size', title: 'Size', render: (row) => formatFileSize(row.size) },
        { field: 'createdDateTime', title: 'Created', render: (row) => formatDate(row.createdDateTime || row.created) },
        { field: 'status', title: 'Status', render: (row) => {
            const status = fileStatuses[row.id];
            let statusIcon = null;
            let statusText = 'Not Processed';
            let statusTooltip = 'No digitization steps completed yet.';
            if (status) {
                if (status.ocr_text) {
                    statusIcon = <TextSnippetIcon fontSize="small" color="success"/>;
                    statusText = 'OCR Done';
                    statusTooltip = `OCR done: ${status.updated_at ? formatDate(status.updated_at) : ''}`;
                } else if (status.pdf_image_path) {
                    statusIcon = <PictureAsPdfIcon fontSize="small" color="primary"/>;
                    statusText = 'PDF Converted';
                    statusTooltip = `PDF converted: ${status.updated_at ? formatDate(status.updated_at) : ''}`;
                } else if (status.status === 'error') {
                    statusText = 'Error';
                    statusTooltip = status.message || 'An error occurred during processing.';
                }
            }
            return (
                <Tooltip title={statusTooltip}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {statusIcon}
                        <Typography variant="body2">{statusText}</Typography>
                    </Box>
                </Tooltip>
            );
        }},
        { field: 'actions', title: 'Actions', render: (row) => (
            <Box>
                <Tooltip title="Download">
                    <IconButton size="small" onClick={(e) => {
                        e.stopPropagation(); 
                        const url = `/api/sharepoint/file_content?drive_id=${row.drive_id}&item_id=${row.id}&download=1`;
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', row.name);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}>
                        <GetAppIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                {isPreviewable(row.name) && (
                    <Tooltip title="Preview">
                        <IconButton size="small" onClick={(e) => {
                             e.stopPropagation();
                            window.open(`/api/sharepoint/file_content?drive_id=${row.drive_id}&item_id=${row.id}&preview=true`, '_blank');
                        }}>
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>
        ), dialogVisible: false },
    ];

    const currentPathName = currentFolder ? currentFolder.name : (selectedLibrary ? selectedLibrary.name : "Libraries");
    const externallySelectedFileIds = selectedItems.filter(id => id.startsWith('file-')).map(id => id.replace('file-', ''));


    return (
        <Box sx={{ p: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, p:1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center'}}>
                    {(selectedLibrary) && (
                        <IconButton onClick={handleBack} aria-label="back" sx={{ mr: 1 }}>
                            <ArrowBackIcon />
                        </IconButton>
                    )}
                    <Typography variant="h6" component="div">
                        {currentPathName}
                    </Typography>
                </Box>
                {/* Confirm selection button removed as selection is now live */}
            </Box>
            <Divider sx={{mb:1}}/>

            {loading && <Box sx={{display: 'flex', justifyContent: 'center', p:2}}><CircularProgress /></Box>}
            {error && <Typography color="error" sx={{p:2}}>Error: {error}</Typography>}

            {!loading && !error && (
                <>
                    {!selectedLibrary ? (
                        <LibrariesGrid onLibraryClick={handleLibraryClick} />
                    ) : (
                        <Box>
                            {folders.length > 0 && (
                                <Box mb={1}>
                                    <Typography variant="subtitle2" gutterBottom sx={{pl:1, fontWeight: 'bold'}}>Folders</Typography>
                                    <ExplorerCardGrid
                                        data={folders}
                                        onCardClick={handleFolderClick}
                                        icon={<FolderIcon />}
                                        isItemSelected={isItemSelected}
                                        handleSelectItem={handleSelectItem}
                                        itemType="folder"
                                    />
                                    <Divider sx={{mt:1}} />
                                </Box>
                            )}
                            {files.length > 0 && (
                                <Box mt={1}>
                                     <Typography variant="subtitle2" gutterBottom sx={{pl:1, fontWeight: 'bold'}}>Files</Typography>
                                    <GenericFileEditor
                                        data={files}
                                        columns={fileTableColumns}
                                        externallySelectedIds={externallySelectedFileIds}
                                        onExternalSelectionChange={handleFileSelectionChange}
                                        // Disable internal add/edit/delete for browsing
                                        onAddRow={null} 
                                        onRemoveRow={null}
                                        onUpdateRow={null}
                                    />
                                </Box>
                            )}
                            {folders.length === 0 && files.length === 0 && !loading && (
                                <Typography color="text.secondary" sx={{p:2, textAlign:'center'}}>No items in this location.</Typography>
                            )}
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
};

export default SharePointExplorer;