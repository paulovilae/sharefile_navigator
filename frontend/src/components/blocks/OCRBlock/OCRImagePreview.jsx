import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  Grid,
} from '@mui/material';
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const OCRImagePreview = ({ file, open, onClose, ocrResult }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (open && file) {
      loadPdfPreview();
    }
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [open, file]);

  const loadPdfPreview = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // This would typically use pdf.js to render the first page as an image
      // For now, we'll create a placeholder implementation
      
      if (file.url) {
        // If we have a direct URL to the file, we can try to load it
        const response = await fetch(file.url);
        const blob = await response.blob();
        
        // Here we would use pdf.js to convert the first page to an image
        // For demonstration, we'll create a placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        
        // Draw a placeholder
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PDF Preview', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(file.name, canvas.width / 2, canvas.height / 2 + 20);
        
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
          setLoading(false);
        });
      } else {
        throw new Error('No file URL available for preview');
      }
    } catch (err) {
      console.error('Error loading PDF preview:', err);
      setError('Failed to load PDF preview');
      setLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            PDF Preview: {file?.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut} disabled={zoom <= 0.25}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn} disabled={zoom >= 3}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset Zoom">
              <IconButton onClick={handleZoomReset}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading PDF preview...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {imageUrl && !loading && (
          <Grid container sx={{ height: '100%' }}>
            {/* PDF Preview */}
            <Grid item xs={ocrResult ? 8 : 12}>
              <Box
                sx={{
                  height: '100%',
                  overflow: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  p: 2,
                  bgcolor: '#f5f5f5',
                }}
              >
                <img
                  src={imageUrl}
                  alt="PDF Preview"
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top center',
                    border: '1px solid #ddd',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  }}
                />
              </Box>
            </Grid>

            {/* OCR Results Panel */}
            {ocrResult && (
              <Grid item xs={4}>
                <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6" gutterBottom>
                      OCR Results
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confidence: {Math.round(ocrResult.confidence)}%
                    </Typography>
                  </Box>
                  <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {ocrResult.text}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OCRImagePreview;