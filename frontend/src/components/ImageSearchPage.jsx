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

const ImageSearchPage = () => {
    // Search state
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalResults, setTotalResults] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [suggestions, setSuggestions] = useState([]);
    
    // UI state
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showFilters, setShowFilters] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    
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
        
        return results.map(result => ({
            ...result,
            highlightedSnippet: result.text_content ? 
                highlightSearchTerms(
                    extractRelevantSnippet(result.text_content, query.split(' '), 300),
                    query.split(' ')
                ) : ''
        }));
    }, [results, query]);

    // Image card component
    const ImageCard = ({ result, isListView = false }) => {
        // Use thumbnail API instead of trying to access temporary image files
        const thumbnailUrl = `/api/thumbnails/thumbnail/${result.file_id}`;
        const imageUrl = getImageUrl(result.pdf_image_path || result.ocr_image_path);
        const hasImage = Boolean(result.file_id); // Always true since we have thumbnail API
        const [imageError, setImageError] = React.useState(false);
        const [thumbnailError, setThumbnailError] = React.useState(false);

        const handleImageError = () => {
            setImageError(true);
        };

        const handleThumbnailError = () => {
            setThumbnailError(true);
        };

        // Extract document name from text content
        const getDocumentName = () => {
            if (result.text_content) {
                // Try to extract a meaningful name from the text
                const lines = result.text_content.split('\n').filter(line => line.trim());
                for (const line of lines.slice(0, 10)) { // Check first 10 lines
                    if (line.includes('INGRESO:') || line.includes('Paciente:') || line.includes('CHRISTUS')) {
                        return line.trim().substring(0, 50) + (line.length > 50 ? '...' : '');
                    }
                }
                // Fallback to first meaningful line
                const firstLine = lines.find(line => line.length > 10 && !line.match(/^\d+$/));
                if (firstLine) {
                    return firstLine.substring(0, 50) + (firstLine.length > 50 ? '...' : '');
                }
            }
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

        return (
            <Card
                sx={{
                    height: isListView ? 'auto' : 'auto',
                    maxHeight: isListView ? 'none' : 500,
                    display: 'flex',
                    flexDirection: isListView ? 'row' : 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                    }
                }}
            >
                {hasImage && !thumbnailError ? (
                    <CardMedia
                        component="img"
                        sx={{
                            height: isListView ? 120 : 200,
                            width: isListView ? 120 : '100%',
                            objectFit: 'contain',
                            backgroundColor: '#f5f5f5'
                        }}
                        image={thumbnailUrl}
                        alt={`Document ${result.file_id}`}
                        loading="lazy"
                        onError={handleThumbnailError}
                    />
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
                
                <CardContent sx={{ flex: 1, p: 2, pb: 1 }}>
                    <Typography variant="h6" component="h3" gutterBottom noWrap>
                        {getDocumentName()}
                    </Typography>
                    
                    {/* Compact Document Information */}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        <strong>ID:</strong> {result.file_id.slice(-12)} | <strong>Dir:</strong> {getDirectoryInfo()} | <strong>Status:</strong> {result.status || 'processed'}
                    </Typography>
                    
                    <Box sx={{ mb: 1 }}>
                        {result.pdf_text && (
                            <Chip
                                label="PDF Text"
                                size="small"
                                sx={{ mr: 0.5 }}
                                variant="outlined"
                            />
                        )}
                        {result.ocr_text && (
                            <Tooltip title={result.text_content || 'No text content available'} arrow>
                                <Chip
                                    label="OCR Text"
                                    size="small"
                                    sx={{ cursor: 'help' }}
                                    variant="outlined"
                                />
                            </Tooltip>
                        )}
                    </Box>
                    
                    {result.highlightedSnippet && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                mb: 1,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}
                            dangerouslySetInnerHTML={{ __html: result.highlightedSnippet }}
                        />
                    )}
                    
                    {result.created_at && (
                        <Typography variant="caption" color="text.secondary">
                            Processed: {new Date(result.created_at).toLocaleDateString()}
                        </Typography>
                    )}
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                    <Tooltip title="View Thumbnail">
                        <IconButton
                            size="small"
                            onClick={() => setSelectedImage(result)}
                            disabled={!hasImage}
                        >
                            <ViewIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="View PDF (if available)">
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
                    <Tooltip title="Copy Document ID">
                        <IconButton
                            size="small"
                            onClick={() => {
                                navigator.clipboard.writeText(result.file_id);
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
                                                <p><strong>Document ID:</strong> ${result.file_id}</p>
                                                <p><strong>Directory:</strong> ${getDirectoryInfo()}</p>
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
                            <ZoomIcon />
                        </IconButton>
                    </Tooltip>
                </CardActions>
            </Card>
        );
    };

    return (
        <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
            {/* Header */}
            <Typography variant="h4" component="h1" gutterBottom>
                Image Search
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
                Search through processed documents to find images by text content
            </Typography>

            {/* Search Form */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Box component="form" onSubmit={handleSubmit}>
                    <Autocomplete
                        freeSolo
                        options={suggestions}
                        value={query}
                        onInputChange={(event, newValue) => setQuery(newValue || '')}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                fullWidth
                                label="Search for images by text content..."
                                variant="outlined"
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
                                                Search
                                            </Button>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        )}
                    />
                </Box>

                {/* Filters */}
                <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Text Type</InputLabel>
                        <Select
                            value={filters.textType}
                            label="Text Type"
                            onChange={(e) => handleFilterChange('textType', e.target.value)}
                        >
                            <MenuItem value="all">All Text</MenuItem>
                            <MenuItem value="pdf">PDF Text Only</MenuItem>
                            <MenuItem value="ocr">OCR Text Only</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Sort By</InputLabel>
                        <Select
                            value={filters.sortBy}
                            label="Sort By"
                            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                        >
                            <MenuItem value="relevance">Relevance</MenuItem>
                            <MenuItem value="date">Date</MenuItem>
                            <MenuItem value="filename">File ID</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                        <Tooltip title="Grid View">
                            <IconButton 
                                onClick={() => setViewMode('grid')}
                                color={viewMode === 'grid' ? 'primary' : 'default'}
                            >
                                <GridViewIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="List View">
                            <IconButton 
                                onClick={() => setViewMode('list')}
                                color={viewMode === 'list' ? 'primary' : 'default'}
                            >
                                <ListViewIcon />
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

            {/* Results Summary */}
            {totalResults > 0 && (
                <Typography variant="h6" sx={{ mb: 2 }}>
                    {totalResults.toLocaleString()} image{totalResults !== 1 ? 's' : ''} found
                    {query && ` for "${query}"`}
                </Typography>
            )}

            {/* Loading State */}
            {loading && (
                <Grid container spacing={2}>
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
                                key={result.file_id}
                            >
                                <ImageCard result={result} isListView={viewMode === 'list'} />
                            </Grid>
                        ))}
                    </Grid>

                    {/* Pagination */}
                    {totalResults > resultsPerPage && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination
                                count={Math.ceil(totalResults / resultsPerPage)}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                                size="large"
                                showFirstButton
                                showLastButton
                            />
                        </Box>
                    )}
                </>
            )}

            {/* No Results */}
            {!loading && query.trim() && searchResultsWithHighlights.length === 0 && totalResults === 0 && !error && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                        No images found
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Try different keywords or check your spelling
                    </Typography>
                </Paper>
            )}

            {/* Empty State */}
            {!loading && !query.trim() && (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                        Search for Images
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Enter keywords to find images based on their text content
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
                        Document Preview - {selectedImage.file_id.slice(-12)}
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ textAlign: 'center', p: 2 }}>
                            <img
                                src={`/api/thumbnails/thumbnail/${selectedImage.file_id}`}
                                alt={`Document ${selectedImage.file_id}`}
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '400px',
                                    objectFit: 'contain'
                                }}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
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
                                    Thumbnail not available
                                </Typography>
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
                            View Full PDF
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