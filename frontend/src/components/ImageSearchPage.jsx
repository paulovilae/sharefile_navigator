import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Grid,
    Card,
    CardMedia,
    CardContent,
    CardActions,
    Paper,
    CircularProgress,
    Alert,
    Chip,
    InputAdornment,
    IconButton,
    Tooltip,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    Skeleton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    FilterList as FilterIcon,
    ViewModule as GridViewIcon,
    ViewList as ListViewIcon,
    Download as DownloadIcon,
    Visibility as ViewIcon,
    ZoomIn as ZoomIcon
} from '@mui/icons-material';
import { searchImages, getImageUrl, getSearchSuggestions, highlightSearchTerms, extractRelevantSnippet } from '../utils/imageSearchUtils';
import { checkBackendStatus, BackendStatusIndicator } from '../utils/backendStatusUtils.jsx';
import { useTranslate } from 'react-admin';
import '../styles/imageHover.css';

// Create a global variable to store the current hover popup element
let currentHoverPopup = null;

// Add a global click handler to close any open hover images when clicking outside
if (typeof window !== 'undefined') {
    // Remove any existing hover popups when clicking outside
    window.addEventListener('click', (e) => {
        // Check if the click is outside any hover container
        if (!e.target.closest('.thumbnail-hover-container') &&
            !e.target.closest('.hover-popup-container')) {
            // Remove any existing hover popup
            if (currentHoverPopup) {
                document.body.removeChild(currentHoverPopup);
                currentHoverPopup = null;
            }
        }
    });
}

const ImageSearchPage = () => {
    const translate = useTranslate();
    // Search state
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalResults, setTotalResults] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [suggestions, setSuggestions] = useState([]);
    
    // UI state
    const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'
    const [showFilters, setShowFilters] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    
    // We'll use a simpler backend status state since most functionality is in the utility
    const [backendStatus, setBackendStatus] = useState({
        isOnline: false
    });
    
    // Filter state
    const [filters, setFilters] = useState({
        textType: 'all', // 'all', 'pdf', 'ocr'
        dateRange: 'all', // 'all', 'week', 'month', 'year'
        sortBy: 'relevance' // 'relevance', 'date', 'filename'
    });
    
    const resultsPerPage = 20;

    // Debounced search suggestions
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                try {
                    const newSuggestions = await getSearchSuggestions(query);
                    setSuggestions(newSuggestions);
                } catch (error) {
                    console.error('Failed to fetch suggestions:', error);
                }
            } else {
                setSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);
    
    // Simplified backend status check using our utility
    const checkBackendStatusFn = useCallback(async () => {
        const result = await checkBackendStatus();
        setBackendStatus({ isOnline: result.isOnline });
        
        // Clear error if backend is back online
        if (result.isOnline && error && error.includes('connection')) {
            setError(null);
        } else if (!result.isOnline) {
            setError(result.message);
        }
        
        return result.isOnline;
    }, [error]);
    
    // Check backend status on component mount
    useEffect(() => {
        checkBackendStatusFn();
    }, [checkBackendStatusFn]);

    // Perform search
    const handleSearch = useCallback(async (newSearch = false, page = 1) => {
        if (!query.trim()) {
            setResults([]);
            setTotalResults(0);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const offset = (page - 1) * resultsPerPage;
            const searchFilters = {
                ...filters,
                include_images: true,
                include_snippets: true
            };

            // Check backend status before search
            const isBackendOnline = await checkBackendStatusFn();
            if (!isBackendOnline) {
                throw new Error("Backend server is not responding. Please check if the server is running.");
            }
            
            const data = await searchImages(query, searchFilters, resultsPerPage, offset);
            
            setResults(data.results || []);
            setTotalResults(data.total || 0);
            
            if (newSearch) {
                setCurrentPage(1);
            }
        } catch (err) {
            console.error("Search failed:", err);
            setError(err.message || "Failed to perform search.");
            setResults([]);
            setTotalResults(0);
        } finally {
            setLoading(false);
        }
    }, [query, filters, resultsPerPage]);

    // Handle form submission
    const handleSubmit = (event) => {
        event.preventDefault();
        handleSearch(true);
    };

    // Handle page change
    const handlePageChange = (event, page) => {
        setCurrentPage(page);
        handleSearch(false, page);
    };

    // Handle filter changes
    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    // Clear search
    const handleClear = () => {
        setQuery('');
        setResults([]);
        setTotalResults(0);
        setError(null);
        setCurrentPage(1);
        setSuggestions([]);
    };

    // Memoized search results
    const searchResultsWithHighlights = useMemo(() => {
        if (!query.trim()) return results;
        
        // Split query into meaningful search terms
        const searchTerms = query.split(' ')
            .filter(term => term.trim().length > 1) // Filter out single characters and empty strings
            .map(term => term.trim());
        
        return results.map(result => ({
            ...result,
            highlightedSnippet: result.text_content ?
                highlightSearchTerms(
                    extractRelevantSnippet(result.text_content, searchTerms, 300),
                    searchTerms
                ) : ''
        }));
    }, [results, query]);

    // Helper function to get the full image path for a result (defined outside components for global access)
    const getFullImagePath = (result) => {
        if (!result) return '';
        
        let fullImagePath = '';
        
        // First try to get the path from the result object
        if (result.pdf_image_path) {
            try {
                // Try to parse as JSON first (it might be a JSON array of paths)
                const paths = JSON.parse(result.pdf_image_path);
                if (Array.isArray(paths) && paths.length > 0) {
                    // Filter for image files (png, jpg, etc.)
                    const imagePaths = paths.filter(path =>
                        /\.(png|jpg|jpeg|gif|bmp)$/i.test(path)
                    );
                    if (imagePaths.length > 0) {
                        fullImagePath = imagePaths[0];
                        console.log("Using PDF image path:", fullImagePath);
                    }
                }
            } catch (e) {
                // If not JSON, use as is if it's an image file
                if (/\.(png|jpg|jpeg|gif|bmp)$/i.test(result.pdf_image_path)) {
                    fullImagePath = result.pdf_image_path;
                    console.log("Using non-JSON PDF image path:", fullImagePath);
                }
            }
        }
        
        // If no valid path found in pdf_image_path, try ocr_image_path
        if (!fullImagePath && result.ocr_image_path) {
            try {
                const paths = JSON.parse(result.ocr_image_path);
                if (Array.isArray(paths) && paths.length > 0) {
                    // Filter for image files
                    const imagePaths = paths.filter(path =>
                        /\.(png|jpg|jpeg|gif|bmp)$/i.test(path)
                    );
                    if (imagePaths.length > 0) {
                        fullImagePath = imagePaths[0];
                        console.log("Using OCR image path:", fullImagePath);
                    }
                }
            } catch (e) {
                // If not JSON, use as is if it's an image file
                if (/\.(png|jpg|jpeg|gif|bmp)$/i.test(result.ocr_image_path)) {
                    fullImagePath = result.ocr_image_path;
                    console.log("Using non-JSON OCR image path:", fullImagePath);
                }
            }
        }
        
        // Try using the processed image API directly if we have a file_id
        // The processed-image endpoint expects a file_id with page information
        if (!fullImagePath && result.file_id) {
            // Add page_1 suffix if not already present to ensure it works with the processed-image endpoint
            const fileId = !result.file_id.includes("_page_")
                ? `${result.file_id}_page_1`
                : result.file_id;
            
            // Return the direct API endpoint URL, not a path to be served through images/serve
            return `/api/thumbnails/processed-image/${fileId}`;
        }
        
        // Fallback to using the file_id to construct a path if we don't have explicit paths
        if (!fullImagePath && result.file_id) {
            fullImagePath = `root/${result.file_id}/${result.file_id}_page_1.png`;
            console.log("Using fallback path:", fullImagePath);
        }
        
        return fullImagePath;
    };

    // Image card component
    const ImageCard = ({ result, isListView = false }) => {
        // Use thumbnail API for thumbnails and images API for full images
        const thumbnailUrl = `/api/thumbnails/thumbnail/${result.file_id}`;
        
        // For full images, we'll use the processed-image endpoint directly for hover functionality
        // This ensures the hover image always loads correctly
        const fileId = result.file_id.includes("_page_")
            ? result.file_id
            : `${result.file_id}_page_1`;
        
        // Use the direct API endpoint for hover images
        const fullImageUrl = `/api/thumbnails/processed-image/${fileId}`;
        
        // For backward compatibility, also calculate the traditional path
        let fullImagePath = '';
        if (result.pdf_image_path) {
            try {
                // Try to parse as JSON first (it might be a JSON array of paths)
                const paths = JSON.parse(result.pdf_image_path);
                if (Array.isArray(paths) && paths.length > 0) {
                    fullImagePath = paths[0];
                }
            } catch (e) {
                // If not JSON, use as is
                fullImagePath = result.pdf_image_path;
            }
        } else if (result.ocr_image_path) {
            try {
                const paths = JSON.parse(result.ocr_image_path);
                if (Array.isArray(paths) && paths.length > 0) {
                    fullImagePath = paths[0];
                }
            } catch (e) {
                fullImagePath = result.ocr_image_path;
            }
        }
        
        // Fallback to using the file_id to construct a path if we don't have explicit paths
        if (!fullImagePath) {
            fullImagePath = `root/${result.file_id}/${result.file_id}_page_1.png`;
        }
        const hasImage = Boolean(result.file_id); // Always true since we have thumbnail API
        const [imageError, setImageError] = React.useState(false);
        const [thumbnailError, setThumbnailError] = React.useState(false);

        const handleImageError = () => {
            setImageError(true);
        };

        const handleThumbnailError = () => {
            setThumbnailError(true);
        };

        // Extract document name from text content with improved uniqueness
        const getDocumentName = () => {
            if (result.text_content) {
                const lines = result.text_content.split('\n').filter(line => line.trim());
                
                // Base title
                let baseTitle = "CHRISTUS SINERGIA SALUD S.A.";
                
                // Look for patient name using more specific patterns
                let patientName = null;
                
                // Try to find patient information in the text content
                for (const line of lines) {
                    // Look for patterns like "DATOS DEL PACIENTE Paciente: CARLOS ALBERTO ALVAREZ"
                    if (line.includes('PACIENTE') && line.includes('Paciente:')) {
                        const match = line.match(/Paciente:\s*([A-Z\s]+)/i);
                        if (match && match[1] && match[1].trim().length > 3) {
                            patientName = match[1].trim();
                            break;
                        }
                    }
                    
                    // Look for highlighted names (from the screenshot)
                    const carlosMatch = line.match(/CARLOS\s+([A-Z]+\s+[A-Z]+)/);
                    if (carlosMatch && carlosMatch[0].length > 10) {
                        patientName = carlosMatch[0];
                        break;
                    }
                    
                    // Look for JUAN CARLOS pattern
                    const juanCarlosMatch = line.match(/JUAN\s+CARLOS\s+([A-Z]+\s+[A-Z]+)/);
                    if (juanCarlosMatch && juanCarlosMatch[0].length > 10) {
                        patientName = juanCarlosMatch[0];
                        break;
                    }
                    
                    // Look for any name after "PACIENTE" or "Paciente:"
                    if (line.includes('PACIENTE') || line.includes('Paciente:')) {
                        // Extract what appears to be a name (sequence of uppercase words)
                        const nameMatch = line.match(/(?:PACIENTE|Paciente:).*?([A-Z]+(?:\s+[A-Z]+){1,4})/);
                        if (nameMatch && nameMatch[1] && nameMatch[1].length > 5) {
                            patientName = nameMatch[1].trim();
                            break;
                        }
                    }
                }
                
                // Look for document type (INGRESO, etc.)
                let documentType = null;
                for (const line of lines.slice(0, 15)) {
                    if (line.includes('INGRESO:') || line.includes('INGRESO ')) {
                        documentType = "INGRESO";
                        break;
                    }
                    if (line.includes('DIAGNOSTICO') || line.includes('Diagnostico')) {
                        documentType = "DIAGNOSTICO";
                        break;
                    }
                    if (line.includes('HISTORIA') || line.includes('Historia')) {
                        documentType = "HISTORIA";
                        break;
                    }
                }
                
                // Construct the title
                if (patientName) {
                    // If we have both document type and patient name
                    if (documentType) {
                        return `${baseTitle} - ${documentType} - ${patientName}`;
                    }
                    // Just patient name
                    return `${baseTitle} - ${patientName}`;
                }
                
                // If we only have document type
                if (documentType) {
                    return `${baseTitle} - ${documentType}`;
                }
                
                // Fallback to first meaningful line if nothing else works
                const firstLine = lines.find(line => line.length > 10 && !line.match(/^\d+$/));
                if (firstLine) {
                    return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
                }
            }
            
            // Last resort fallback
            return `Document ${result.file_id.slice(-8)}`;
        };

        // Get PDF URL from thumbnails API (handles SharePoint automatically)
        const getPdfUrl = () => {
            // This endpoint tries local files first, then falls back to SharePoint
            return `/api/thumbnails/pdf/${result.file_id}`;
        };

        // Get directory info
        const getDirectoryInfo = () => {
            if (result.directory_id) {
                return result.directory_id;
            }
            return 'root';
        };

        // Get SharePoint path
        const getSharePointPath = () => {
            if (result.sharepoint_path) {
                return result.sharepoint_path;
            }
            if (result.directory_id && result.file_id) {
                return `${result.directory_id}/${result.file_id}`;
            }
            return result.file_id;
        };

        // Use the global getFullImagePath function

        return (
            <Card
                sx={{
                    height: isListView ? 'auto' : 'auto',
                    maxHeight: isListView ? 'none' : 450, // Reduced max height
                    display: 'flex',
                    flexDirection: isListView ? 'row' : 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                    },
                    position: 'relative',
                    overflow: 'hidden' // Prevent content overflow
                }}
            >
                {hasImage && !thumbnailError ? (
                    <Box
                        sx={{
                            position: 'relative',
                            height: isListView ? 120 : 180, // Reduced height
                            width: isListView ? 120 : '100%',
                            backgroundColor: '#f5f5f5',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            // Create a new popup element
                            if (currentHoverPopup) {
                                document.body.removeChild(currentHoverPopup);
                            }
                            
                            // Create a new div for the popup
                            const popup = document.createElement('div');
                            popup.className = 'hover-popup-container';
                            popup.style.position = 'fixed';
                            popup.style.top = '50%';
                            popup.style.left = '50%';
                            popup.style.transform = 'translate(-50%, -50%)';
                            popup.style.zIndex = '99999';
                            popup.style.backgroundColor = 'rgba(0,0,0,0.9)';
                            popup.style.padding = '20px';
                            popup.style.borderRadius = '8px';
                            popup.style.boxShadow = '0 0 20px rgba(0,0,0,0.7)';
                            popup.style.maxWidth = '90vw';
                            popup.style.maxHeight = '90vh';
                            popup.style.display = 'flex';
                            popup.style.flexDirection = 'column';
                            popup.style.alignItems = 'center';
                            popup.style.cursor = 'pointer';
                            popup.style.width = 'auto';
                            popup.style.height = 'auto';
                            
                            // Create close button
                            const closeButton = document.createElement('div');
                            closeButton.style.position = 'absolute';
                            closeButton.style.top = '5px';
                            closeButton.style.right = '5px';
                            closeButton.style.color = 'white';
                            closeButton.style.fontSize = '20px';
                            closeButton.style.fontWeight = 'bold';
                            closeButton.style.cursor = 'pointer';
                            closeButton.style.width = '25px';
                            closeButton.style.height = '25px';
                            closeButton.style.display = 'flex';
                            closeButton.style.alignItems = 'center';
                            closeButton.style.justifyContent = 'center';
                            closeButton.style.backgroundColor = 'rgba(0,0,0,0.5)';
                            closeButton.style.borderRadius = '50%';
                            closeButton.textContent = '×';
                            closeButton.onclick = (e) => {
                                e.stopPropagation();
                                document.body.removeChild(popup);
                                currentHoverPopup = null;
                            };
                            popup.appendChild(closeButton);
                            
                            // Create title
                            const title = document.createElement('div');
                            title.style.color = 'white';
                            title.style.marginBottom = '15px';
                            title.style.textAlign = 'center';
                            title.style.fontSize = '16px';
                            title.style.fontWeight = 'bold';
                            title.textContent = 'Click to view full document';
                            popup.appendChild(title);
                            
                            // Create image
                            const img = document.createElement('img');
                            img.src = `/api/thumbnails/processed-image/${fileId}`;
                            img.alt = `Full Document ${result.file_id}`;
                            img.style.maxWidth = '100%';
                            img.style.maxHeight = 'calc(80vh - 60px)';
                            img.style.minWidth = '300px';
                            img.style.minHeight = '200px';
                            img.style.objectFit = 'contain';
                            img.style.borderRadius = '4px';
                            img.style.backgroundColor = '#fff';
                            img.style.boxShadow = '0 0 10px rgba(255,255,255,0.3)';
                            img.onerror = () => {
                                console.error(`Error loading image from URL: ${fullImageUrl}`);
                                img.src = fullImageUrl;
                                img.onerror = () => {
                                    handleImageError();
                                };
                            };
                            popup.appendChild(img);
                            
                            // Add click handler to open full image
                            popup.onclick = () => {
                                setSelectedImage({...result, viewFullImage: true});
                            };
                            
                            // Add the popup to the document body
                            document.body.appendChild(popup);
                            currentHoverPopup = popup;
                        }}
                        onMouseLeave={() => {
                            // Remove the popup after a short delay to allow moving the mouse to the popup
                            setTimeout(() => {
                                if (currentHoverPopup && !currentHoverPopup.matches(':hover')) {
                                    document.body.removeChild(currentHoverPopup);
                                    currentHoverPopup = null;
                                }
                            }, 100);
                        }}
                        title="Hover to see full image"
                        className="thumbnail-hover-container hover-trigger"
                    >
                        {/* OCR Text Badge - Moved from below to image overlay */}
                        {result.ocr_text && (
                            <Tooltip title={result.text_content || 'No text content available'} arrow>
                                <Chip
                                    label="OCR Text"
                                    size="small"
                                    sx={{
                                        position: 'absolute',
                                        top: 5,
                                        right: 5,
                                        zIndex: 2,
                                        opacity: 0.9,
                                        backgroundColor: 'rgba(255,255,255,0.8)'
                                    }}
                                />
                            </Tooltip>
                        )}
                        <CardMedia
                            component="img"
                            sx={{
                                height: '100%',
                                width: '100%',
                                objectFit: 'contain',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: 1
                            }}
                            image={thumbnailUrl}
                            alt={`Document ${result.file_id}`}
                            loading="lazy"
                            onError={handleThumbnailError}
                        />
                    </Box>
                ) : (
                    <Box
                        sx={{
                            height: isListView ? 120 : 200,
                            width: isListView ? 120 : '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#f5f5f5',
                            color: 'text.secondary',
                            border: '2px dashed #ddd'
                        }}
                    >
                        <Box sx={{ fontSize: 48, mb: 1, opacity: 0.5 }}>📄</Box>
                        <Typography variant="body2" sx={{ textAlign: 'center' }}>
                            {imageError ? 'Image Unavailable' : 'Document Preview'}
                        </Typography>
                        <Typography variant="caption" sx={{ textAlign: 'center', mt: 0.5 }}>
                            Text content available
                        </Typography>
                    </Box>
                )}
                
                <CardContent sx={{ flex: 1, p: 1.5, pb: 0.5 }}> {/* Reduced padding */}
                    <Tooltip
                        title={getDocumentName()}
                        arrow
                        placement="top"
                        enterDelay={500}
                        leaveDelay={200}
                    >
                        <Typography
                            variant="h6"
                            component="h3"
                            noWrap
                            sx={{
                                fontSize: '0.95rem',
                                mb: 0.5, // Reduced margin bottom to bring elements closer
                                fontWeight: 'bold',
                                cursor: 'help' // Change cursor to indicate hoverable
                            }}
                        >
                            {getDocumentName()}
                        </Typography>
                    </Tooltip>
                    
                    <Box sx={{ mb: 0.5 }}> {/* Reduced margin */}
                        {result.pdf_text && (
                            <Chip
                                label="PDF Text"
                                size="small"
                                sx={{ mr: 0.5 }}
                                variant="outlined"
                            />
                        )}
                        {/* OCR Text chip moved to image overlay */}
                    </Box>
                    
                    {/* Always show text snippet - either highlighted or plain */}
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                            mb: 0.5, // Reduced margin
                            display: '-webkit-box',
                            WebkitLineClamp: isListView ? 2 : 3, // Show more lines in grid view
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.3, // Reduced line height
                            backgroundColor: '#f5f5f5',
                            p: 0.75, // Reduced padding
                            borderRadius: 1,
                            fontSize: '0.75rem', // Smaller font size
                            minHeight: '2.6rem', // Ensure minimum height for snippet area
                            '& mark': {
                                backgroundColor: '#ffeb3b',
                                padding: '0 2px',
                                borderRadius: '2px',
                                boxShadow: '0 0 2px rgba(0,0,0,0.2)'
                            },
                            '& mark strong': {
                                fontWeight: 'bold',
                                color: '#d32f2f'
                            }
                        }}
                        dangerouslySetInnerHTML={{
                            __html: result.highlightedSnippet ||
                                (result.text_content ?
                                    result.text_content.substring(0, 150) + (result.text_content.length > 150 ? '...' : '')
                                    : 'No text content available')
                        }}
                    />
                    
                    {/* Only show the processed date and path/status in list view mode */}
                    {isListView && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                            sx={{
                                mt: 0.5, // Small top margin to separate from text above
                                mb: 0, // No bottom margin
                                lineHeight: 1.2 // Tighter line height
                            }}
                        >
                            {result.created_at && (
                                <>Processed: {new Date(result.created_at).toLocaleDateString()} </>
                            )}
                            <strong>Path:</strong> {getSharePointPath()} | <strong>Status:</strong> {result.status || 'ocr_processed'}
                        </Typography>
                    )}
                </CardContent>
                
                <CardActions sx={{ p: 1, pt: 0, display: 'flex', justifyContent: 'flex-end' }}> {/* Reduced padding and right-aligned */}
                    {/* Rotated icons to horizontal row at the top right */}
                    <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                        <Tooltip title="View Image">
                            <IconButton
                                size="small"
                                onClick={() => setSelectedImage({...result, viewFullImage: true})}
                                disabled={!hasImage}
                            >
                                <ViewIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="View PDF">
                            <IconButton
                                size="small"
                                component="a"
                                href={getPdfUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                📄
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy SharePoint Path">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    navigator.clipboard.writeText(getSharePointPath());
                                    // You could add a toast notification here
                                }}
                            >
                                📋
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="View Full Text">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    if (result.text_content) {
                                        const newWindow = window.open('', '_blank');
                                        newWindow.document.write(`
                                            <html>
                                                <head><title>Document Text - ${getDocumentName()}</title></head>
                                                <body style="font-family: Arial, sans-serif; padding: 20px; white-space: pre-wrap;">
                                                    <h2>${getDocumentName()}</h2>
                                                    <p><strong>SharePoint Path:</strong> ${getSharePointPath()}</p>
                                                    <hr>
                                                    ${result.text_content}
                                                </body>
                                            </html>
                                        `);
                                        newWindow.document.close();
                                    }
                                }}
                                disabled={!result.text_content}
                            >
                                <ZoomIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </CardActions>
            </Card>
        );
    };

    return (
        <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}> {/* Reduced padding */}
            {/* Use our reusable BackendStatusIndicator component */}
            <BackendStatusIndicator position="top-right" />
            
            {/* Improved Header - Stacked layout to prevent text overlap */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="h5" component="h1" sx={{ mb: 0.5 }}>
                    {translate('search.image_search')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {translate('search.description')}
                </Typography>
            </Box>

            {/* Search Form - More compact */}
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}> {/* Reduced padding and margin */}
                <Box component="form" onSubmit={handleSubmit}>
                    <Autocomplete
                        freeSolo
                        options={suggestions}
                        value={query}
                        onInputChange={(event, newValue) => setQuery(newValue || '')}
                        onChange={(event, newValue) => {
                            if (newValue) {
                                setQuery(newValue);
                                // Trigger search when a suggestion is selected
                                handleSearch(true);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                fullWidth
                                label={translate('search.placeholder')}
                                variant="outlined"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && query.trim()) {
                                        e.preventDefault();
                                        handleSearch(true);
                                    }
                                }}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            {query && (
                                                <IconButton onClick={handleClear} edge="end">
                                                    <ClearIcon />
                                                </IconButton>
                                            )}
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                disabled={loading || !query.trim()}
                                                sx={{ ml: 1 }}
                                                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                                            >
                                                {translate('common.search')}
                                            </Button>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        )}
                    />
                </Box>

                {/* Compact Filters */}
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}> {/* Reduced margin and gap */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap' }}> {/* Group filters together */}
                        <FormControl size="small" sx={{ minWidth: 100 }}> {/* Reduced width */}
                            <InputLabel>{translate('search.text_type')}</InputLabel>
                            <Select
                                value={filters.textType}
                                label={translate('search.text_type')}
                                onChange={(e) => handleFilterChange('textType', e.target.value)}
                            >
                                <MenuItem value="all">{translate('search.all_text')}</MenuItem>
                                <MenuItem value="pdf">{translate('search.pdf_text_only')}</MenuItem>
                                <MenuItem value="ocr">{translate('search.ocr_text_only')}</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 100 }}> {/* Reduced width */}
                            <InputLabel>{translate('search.sort_by')}</InputLabel>
                            <Select
                                value={filters.sortBy}
                                label={translate('search.sort_by')}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                            >
                                <MenuItem value="relevance">{translate('search.relevance')}</MenuItem>
                                <MenuItem value="date">{translate('search.date')}</MenuItem>
                                <MenuItem value="filename">{translate('search.filename')}</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}> {/* Reduced gap */}
                        {/* Grid view button - smaller size */}
                        <Tooltip title={translate('search.grid_view')}>
                            <IconButton
                                size="small"
                                onClick={() => setViewMode('grid')}
                                color={viewMode === 'grid' ? 'primary' : 'default'}
                            >
                                <GridViewIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        {/* List view button - smaller size */}
                        <Tooltip title={translate('search.list_view')}>
                            <IconButton
                                size="small"
                                onClick={() => setViewMode('list')}
                                color={viewMode === 'list' ? 'primary' : 'default'}
                            >
                                <ListViewIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Paper>

            {/* Error Display */}
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Compact Results Summary */}
            {totalResults > 0 && (
                <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}> {/* Reduced size and margin */}
                    {totalResults.toLocaleString()} {totalResults !== 1 ? translate('search.images_found_plural') : translate('search.images_found')} {translate('search.found')}
                    {query && ` ${translate('search.for')} "${query}"`}
                </Typography>
            )}

            {/* Loading State */}
            {loading && (
                <Grid container spacing={1}> {/* Reduced grid spacing */}
                    {Array.from({ length: 8 }).map((_, index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                            <Card sx={{ height: 400 }}>
                                <Skeleton variant="rectangular" height={200} />
                                <CardContent>
                                    <Skeleton variant="text" height={32} />
                                    <Skeleton variant="text" height={20} />
                                    <Skeleton variant="text" height={20} width="60%" />
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Results Grid/List */}
            {!loading && searchResultsWithHighlights.length > 0 && (
                <>
                    <Grid container spacing={2}>
                        {searchResultsWithHighlights.map((result) => (
                            <Grid
                                item
                                xs={12}
                                sm={viewMode === 'list' ? 12 : 6}
                                md={viewMode === 'list' ? 12 : 4}
                                lg={viewMode === 'list' ? 12 : 3}
                                xl={viewMode === 'list' ? 12 : 2} // Added xl breakpoint for more items per row on large screens
                                key={result.file_id}
                            >
                                <ImageCard result={result} isListView={viewMode === 'list'} />
                            </Grid>
                        ))}
                    </Grid>

                    {/* Compact Pagination */}
                    {totalResults > resultsPerPage && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}> {/* Reduced margin */}
                            <Pagination
                                count={Math.ceil(totalResults / resultsPerPage)}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                                size="medium"
                                showFirstButton
                                showLastButton
                                siblingCount={1}
                            />
                        </Box>
                    )}
                </>
            )}

            {/* No Results */}
            {!loading && query.trim() && searchResultsWithHighlights.length === 0 && totalResults === 0 && !error && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                        {translate('search.no_images_found')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {translate('search.try_different_keywords')}
                    </Typography>
                </Paper>
            )}

            {/* Empty State */}
            {!loading && !query.trim() && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        {translate('search.search_for_images')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {translate('search.enter_keywords')}
                    </Typography>
                </Paper>
            )}

            {/* Image Modal Dialog */}
            {selectedImage && (
                <Dialog
                    open={Boolean(selectedImage)}
                    onClose={() => setSelectedImage(null)}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>
                        Document Image - {selectedImage.sharepoint_path ||
                            (selectedImage.directory_id && selectedImage.file_id ?
                                `${selectedImage.directory_id}/${selectedImage.file_id}` :
                                selectedImage.file_id)}
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                            <img
                                src={getFullImagePath(selectedImage)}
                                alt={`Document ${selectedImage.file_id}`}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '500px',
                                    objectFit: 'contain'
                                }}
                                onError={(e) => {
                                    console.error(`Error loading image from path: ${getFullImagePath(selectedImage)}`);
                                    
                                    // Try direct processed image endpoint with page information
                                    const fileId = selectedImage.file_id.includes("_page_")
                                        ? selectedImage.file_id
                                        : `${selectedImage.file_id}_page_1`;
                                    const processedImageUrl = `/api/thumbnails/processed-image/${fileId}`;
                                    console.log(`Attempting to load processed image: ${processedImageUrl}`);
                                    
                                    // Try loading the processed image directly
                                    e.target.src = processedImageUrl;
                                    e.target.onerror = (e2) => {
                                        console.error(`Error loading processed image for ${selectedImage.file_id}`);
                                        e2.target.style.display = 'none';
                                        e2.target.nextSibling.style.display = 'block';
                                        
                                        // As a last resort, try the PDF
                                        const pdfUrl = `/api/thumbnails/pdf/${selectedImage.file_id}`;
                                        console.log(`Attempting to load PDF as last resort: ${pdfUrl}`);
                                        
                                        // Create an iframe to display the PDF
                                        const container = e2.target.parentNode;
                                        const iframe = document.createElement('iframe');
                                        iframe.src = pdfUrl;
                                        iframe.style.width = '100%';
                                        iframe.style.height = '500px';
                                        iframe.style.border = 'none';
                                        container.appendChild(iframe);
                                    };
                                }}
                            />
                            <Box
                                sx={{
                                    display: 'none',
                                    p: 4,
                                    border: '2px dashed #ddd',
                                    borderRadius: 1,
                                    backgroundColor: '#f5f5f5'
                                }}
                            >
                                <Typography variant="h6" color="text.secondary">
                                    📄 Document Preview
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Image loading failed. Trying alternative sources...
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'center' }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            // Try the direct image URL with a different approach
                                            const fileId = selectedImage.file_id.includes("_page_")
                                                ? selectedImage.file_id
                                                : `${selectedImage.file_id}_page_1`;
                                            const directImageUrl = `/api/thumbnails/processed-image/${fileId}`;
                                            window.open(directImageUrl, '_blank');
                                        }}
                                    >
                                        View Full Image
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            window.open(`/api/thumbnails/pdf/${selectedImage.file_id}`, '_blank');
                                        }}
                                    >
                                        View PDF
                                    </Button>
                                </Box>
                                <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />
                            </Box>
                        </Box>
                        
                        {selectedImage.text_content && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" gutterBottom>
                                    Document Text Content:
                                </Typography>
                                <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto', backgroundColor: '#f9f9f9' }}>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {selectedImage.text_content.substring(0, 1000)}
                                        {selectedImage.text_content.length > 1000 && '...'}
                                    </Typography>
                                </Paper>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button
                            component="a"
                            href={`/api/thumbnails/pdf/${selectedImage.file_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                        >
                            View PDF
                        </Button>
                        <Button
                            component="a"
                            href={getFullImagePath(selectedImage)}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="outlined"
                            onClick={(e) => {
                                // If it's an API endpoint, prevent default and open in a new window
                                const path = getFullImagePath(selectedImage);
                                if (path.startsWith('/api/thumbnails/processed-image/')) {
                                    e.preventDefault();
                                    window.open(path, '_blank');
                                }
                            }}
                        >
                            View Original Image
                        </Button>
                        <Button onClick={() => setSelectedImage(null)} variant="contained">
                            Close
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
};

export default ImageSearchPage;