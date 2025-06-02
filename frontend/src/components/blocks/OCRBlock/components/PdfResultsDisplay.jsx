import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper
} from '@mui/material';
import {
  Image as ImageIcon,
  ZoomIn as ZoomIcon,
  Save as SaveIcon,
  History as HistoryIcon
} from '@mui/icons-material';

/**
 * PDF Results Display Component - Shows processed PDF results with image previews
 */
const PdfResultsDisplay = ({ results = [] }) => {
  const [selectedImageDialog, setSelectedImageDialog] = useState(null);

  // Get processing status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'converted': return 'info';
      case 'text_extracted': return 'success';
      case 'ocr_processed': return 'warning';
      case 'completed': return 'success';
      case 'preloaded': return 'info';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        PDF Processing Results ({results.length})
      </Typography>
      
      {results.map((result) => (
        <Card key={result.id} elevation={1} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {result.filename}
                </Typography>
                {result.isPreloaded && (
                  <Chip
                    icon={<HistoryIcon />}
                    size="small"
                    label="Previously Processed"
                    color="info"
                    variant="outlined"
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip size="small" label={`${result.pageCount} pages`} />
                <Chip size="small" label={`${result.totalWords} words`} />
                <Chip size="small" label={`${result.processingTime}ms`} />
                <Chip
                  size="small"
                  label={result.hasEmbeddedText ? 'Text Extracted' : 'OCR Processed'}
                  color={result.hasEmbeddedText ? 'success' : 'warning'}
                />
              </Box>
            </Box>
            
            {/* Page Images Grid */}
            <Typography variant="subtitle2" gutterBottom>
              Pages ({result.pages.length})
            </Typography>
            <ImageList cols={4} gap={8} sx={{ maxHeight: 300 }}>
              {result.pages.map((page) => (
                <ImageListItem 
                  key={page.id}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8 }
                  }}
                  onClick={() => setSelectedImageDialog(page)}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: 120,
                      bgcolor: 'grey.200',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }}
                  >
                    {page.imageUrl && page.imageUrl.trim() !== "" ? (
                      <img
                        src={page.imageUrl}
                        alt={`Page ${page.pageNumber}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          console.error('Image failed to load:', page.imageUrl);
                          console.log('Page data:', page);
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', page.imageUrl);
                        }}
                      />
                    ) : null}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        width: '100%',
                        height: '100%',
                        gap: 0.5
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 32, color: 'grey.500' }} />
                      {page.status === 'preloaded' && (
                        <Typography variant="caption" color="text.secondary" align="center" sx={{ fontSize: '0.6rem' }}>
                          Text Available
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <ImageListItemBar
                    title={`Page ${page.pageNumber}`}
                    subtitle={
                      <Box>
                        <Typography variant="caption" display="block">
                          {page.wordCount} words
                        </Typography>
                        <Chip 
                          size="small" 
                          label={page.status.replace('_', ' ')} 
                          color={getStatusColor(page.status)}
                          sx={{ mt: 0.5, height: 16, fontSize: '0.6rem' }}
                        />
                      </Box>
                    }
                    actionIcon={
                      <Tooltip title="View details">
                        <IconButton sx={{ color: 'rgba(255, 255, 255, 0.54)' }}>
                          <ZoomIcon />
                        </IconButton>
                      </Tooltip>
                    }
                  />
                </ImageListItem>
              ))}
            </ImageList>
          </CardContent>
        </Card>
      ))}

      {/* Image Detail Dialog */}
      <Dialog 
        open={!!selectedImageDialog} 
        onClose={() => setSelectedImageDialog(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedImageDialog && (
          <>
            <DialogTitle>
              Page {selectedImageDialog.pageNumber} - {selectedImageDialog.id}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Page Image
                  </Typography>
                  <Box
                    sx={{
                      width: '100%',
                      height: 300,
                      bgcolor: 'grey.100',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      mb: 2
                    }}
                  >
                    {selectedImageDialog.imageUrl && selectedImageDialog.imageUrl.trim() !== "" ? (
                      <img
                        src={selectedImageDialog.imageUrl}
                        alt={`Page ${selectedImageDialog.pageNumber}`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', selectedImageDialog.imageUrl);
                        }}
                        onError={(e) => {
                          console.error('Image failed to load:', selectedImageDialog.imageUrl);
                          e.target.style.display = 'none';
                          const fallback = e.target.parentNode.querySelector('.fallback-message');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <Box
                        className="fallback-message"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'column',
                          gap: 1
                        }}
                      >
                        <ImageIcon sx={{ fontSize: 60, color: 'grey.500' }} />
                        <Typography variant="body2" color="text.secondary" align="center">
                          {selectedImageDialog.status === 'preloaded'
                            ? 'Image no longer available\n(Previously processed data - text extracted successfully)'
                            : 'No image URL provided'}
                        </Typography>
                      </Box>
                    )}
                    <Box
                      className="fallback-message"
                      sx={{
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 1
                      }}
                    >
                      <ImageIcon sx={{ fontSize: 60, color: 'grey.500' }} />
                      <Typography variant="body2" color="text.secondary">
                        Image failed to load
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Chip
                      size="small"
                      label={`${selectedImageDialog.wordCount} words`}
                    />
                    <Chip
                      size="small"
                      label={`${Math.round(selectedImageDialog.confidence * 100)}% confidence`}
                    />
                    <Chip
                      size="small"
                      label={selectedImageDialog.hasEmbeddedText ? 'Embedded Text' : 'OCR Text'}
                      color={selectedImageDialog.hasEmbeddedText ? 'success' : 'warning'}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Extracted Text
                  </Typography>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      maxHeight: 300,
                      overflow: 'auto',
                      bgcolor: 'grey.50'
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedImageDialog.extractedText}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedImageDialog(null)}>
                Close
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />}>
                Save Text
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default PdfResultsDisplay;