import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Popper,
  Paper,
  Fade
} from '@mui/material';
import {
  ZoomIn as ZoomIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Download as DownloadIcon,
  Info as InfoIcon
} from '@mui/icons-material';

/**
 * ThumbnailViewer Component - Shows thumbnail previews with PDF viewing capability
 */
const ThumbnailViewer = ({ fileId, title, showInfo = true, showPdfActions = true, documentFileId = null }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Hover preview state
  const [hoverPreviewOpen, setHoverPreviewOpen] = useState(false);
  const [hoverPreviewLoading, setHoverPreviewLoading] = useState(false);
  const [hoverPreviewUrl, setHoverPreviewUrl] = useState(null);
  const [hoverPreviewError, setHoverPreviewError] = useState(null);
  const thumbnailRef = useRef(null);
  const hoverTimerRef = useRef(null);

  // Load thumbnail on component mount
  useEffect(() => {
    if (fileId) {
      loadThumbnail();
      if (showInfo) {
        loadPdfInfo();
      }
    }
  }, [fileId, showInfo]);

  const loadThumbnail = async () => {
    try {
      setLoading(true);
      // Use fileId directly for page-specific thumbnails
      // Only use documentFileId if fileId is not available
      const thumbnailFileId = fileId || documentFileId;
      // Add cache-busting parameter to force reload of thumbnails
      const cacheBuster = Date.now();
      const response = await fetch(`http://localhost:8000/api/thumbnails/thumbnail/${thumbnailFileId}?cb=${cacheBuster}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setThumbnailUrl(url);
      } else if (response.status === 404) {
        setError('Thumbnail not available');
      } else {
        setError('Failed to load thumbnail');
      }
    } catch (err) {
      console.error('Error loading thumbnail:', err);
      setError('Error loading thumbnail');
    } finally {
      setLoading(false);
    }
  };

  const loadPdfInfo = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/thumbnails/pdf-info/${fileId}`);
      if (response.ok) {
        const info = await response.json();
        setPdfInfo(info);
      }
    } catch (err) {
      console.error('Error loading PDF info:', err);
    }
  };

  const handleViewPdf = async () => {
    try {
      // Create a URL that will open the PDF in a new tab
      const pdfViewUrl = `http://localhost:8000/api/thumbnails/pdf/${fileId}`;
      setPdfUrl(pdfViewUrl);
      setPdfDialogOpen(true);
    } catch (err) {
      console.error('Error opening PDF:', err);
      setError('Error opening PDF');
    }
  };

  const handleDownloadPdf = () => {
    const downloadUrl = `http://localhost:8000/api/thumbnails/pdf/${fileId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${title || fileId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    setPdfUrl(null);
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [thumbnailUrl]);
  
  // Handle hover preview
  const handleThumbnailMouseEnter = () => {
    // Use a small delay to prevent flickering on quick mouse movements
    hoverTimerRef.current = setTimeout(() => {
      if (!hoverPreviewUrl && !hoverPreviewLoading) {
        setHoverPreviewLoading(true);
        setHoverPreviewError(null);
        
        // Determine the ID to use for the processed image
        const processedImageId = fileId;
        
        // Fetch the processed image
        fetch(`http://localhost:8000/api/thumbnails/processed-image/${processedImageId}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to load processed image: ${response.status}`);
            }
            return response.blob();
          })
          .then(blob => {
            const url = URL.createObjectURL(blob);
            setHoverPreviewUrl(url);
            setHoverPreviewOpen(true);
          })
          .catch(err => {
            console.error('Error loading processed image:', err);
            setHoverPreviewError(err.message);
          })
          .finally(() => {
            setHoverPreviewLoading(false);
          });
      } else if (hoverPreviewUrl) {
        // If we already have the URL, just show the preview
        setHoverPreviewOpen(true);
      }
    }, 300); // 300ms delay
  };
  
  const handleThumbnailMouseLeave = () => {
    // Clear the timer to prevent unnecessary loading
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverPreviewOpen(false);
  };
  
  // Cleanup hover preview URL on unmount
  useEffect(() => {
    return () => {
      if (hoverPreviewUrl) {
        URL.revokeObjectURL(hoverPreviewUrl);
      }
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, [hoverPreviewUrl]);

  return (
    <>
      <Card sx={{ maxWidth: 200, m: 1 }}>
        <Box
          sx={{ position: 'relative' }}
          ref={thumbnailRef}
          onMouseEnter={handleThumbnailMouseEnter}
          onMouseLeave={handleThumbnailMouseLeave}
        >
          {loading ? (
            <Box
              sx={{
                height: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100'
              }}
            >
              <CircularProgress size={24} />
            </Box>
          ) : error || !thumbnailUrl ? (
            <Box
              sx={{
                height: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                bgcolor: 'grey.100',
                gap: 1
              }}
            >
              <ImageIcon sx={{ fontSize: 40, color: 'grey.500' }} />
              <Typography variant="caption" color="text.secondary" align="center">
                {error || 'No thumbnail'}
              </Typography>
            </Box>
          ) : (
            <CardMedia
              component="img"
              height="150"
              image={thumbnailUrl}
              alt={title || `Thumbnail for ${fileId}`}
              sx={{ objectFit: 'cover' }}
            />
          )}
          
          {/* Action buttons overlay */}
          {showPdfActions && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 0.5
              }}
            >
              <Tooltip title="View PDF">
                <IconButton
                  size="small"
                  onClick={handleViewPdf}
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                  }}
                >
                  <ZoomIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download PDF">
                <IconButton
                  size="small"
                  onClick={handleDownloadPdf}
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                  }}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        <CardContent sx={{ p: 1 }}>
          <Typography variant="body2" noWrap title={title}>
            {title || fileId}
          </Typography>
          
          {showInfo && pdfInfo && (
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {pdfInfo.page_count && (
                <Chip
                  size="small"
                  label={`${pdfInfo.page_count} pages`}
                  variant="outlined"
                />
              )}
              {pdfInfo.available && (
                <Chip
                  size="small"
                  label="PDF Available"
                  color="success"
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* PDF Viewer Dialog */}
      <Dialog
        open={pdfDialogOpen}
        onClose={handleClosePdfDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PdfIcon />
          {title || `Document ${fileId}`}
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                flexGrow: 1
              }}
              title={`PDF Viewer - ${title || fileId}`}
            />
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 200
              }}
            >
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleDownloadPdf} startIcon={<DownloadIcon />}>
            Download
          </Button>
          <Button onClick={handleClosePdfDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Hover Preview Popper */}
      <Popper
        open={hoverPreviewOpen}
        anchorEl={thumbnailRef.current}
        placement="right-start"
        transition
        sx={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={300}>
            <Paper
              elevation={8}
              sx={{
                p: 1,
                maxWidth: 500,
                maxHeight: 600,
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              {hoverPreviewLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : hoverPreviewError ? (
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="error">
                    {hoverPreviewError}
                  </Typography>
                </Box>
              ) : hoverPreviewUrl ? (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}>
                  <img
                    src={hoverPreviewUrl}
                    alt={title || `Full image for ${fileId}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 550,
                      objectFit: 'contain'
                    }}
                  />
                  <Typography variant="caption" sx={{ mt: 1 }}>
                    {title || fileId}
                  </Typography>
                </Box>
              ) : null}
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
};

export default ThumbnailViewer;