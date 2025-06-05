import React, { useState, useEffect } from 'react';
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
  Alert
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

  return (
    <>
      <Card sx={{ maxWidth: 200, m: 1 }}>
        <Box sx={{ position: 'relative' }}>
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
    </>
  );
};

export default ThumbnailViewer;