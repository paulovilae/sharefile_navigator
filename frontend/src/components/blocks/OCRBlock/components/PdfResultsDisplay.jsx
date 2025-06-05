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
  History as HistoryIcon,
  PictureAsPdf as PdfIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import ThumbnailViewer from '../../../ThumbnailViewer';

/**
 * PDF Results Display Component - Shows processed PDF results with image previews
 */
const PdfResultsDisplay = ({ results = [] }) => {
  const [selectedImageDialog, setSelectedImageDialog] = useState(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState(null);
  const [currentPdfTitle, setCurrentPdfTitle] = useState('');

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

  // Handle PDF viewing at document level
  const handleViewPdf = (result) => {
    // Use the first page's fileId to access the PDF (they all reference the same document)
    const fileId = result.pages && result.pages.length > 0 ?
      (result.pages[0].fileId || result.pages[0].id) : result.id;
    const pdfViewUrl = `http://localhost:8000/api/thumbnails/pdf/${fileId}`;
    setCurrentPdfUrl(pdfViewUrl);
    setCurrentPdfTitle(result.filename);
    setPdfDialogOpen(true);
  };

  // Handle PDF download at document level
  const handleDownloadPdf = (result) => {
    const fileId = result.pages && result.pages.length > 0 ?
      (result.pages[0].fileId || result.pages[0].id) : result.id;
    const downloadUrl = `http://localhost:8000/api/thumbnails/pdf/${fileId}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = result.filename || `document_${fileId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle closing PDF dialog
  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    setCurrentPdfUrl(null);
    setCurrentPdfTitle('');
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
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip size="small" label={`${result.pageCount} pages`} />
                <Chip size="small" label={`${result.totalWords} words`} />
                <Chip size="small" label={`${result.processingTime}ms`} />
                <Chip
                  size="small"
                  label={result.hasEmbeddedText ? 'Text Extracted' : 'OCR Processed'}
                  color={result.hasEmbeddedText ? 'success' : 'warning'}
                />
                {/* Document-level PDF actions */}
                <Tooltip title="View PDF">
                  <IconButton
                    size="small"
                    onClick={() => handleViewPdf(result)}
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <PdfIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download PDF">
                  <IconButton
                    size="small"
                    onClick={() => handleDownloadPdf(result)}
                    sx={{
                      bgcolor: 'secondary.main',
                      color: 'white',
                      '&:hover': { bgcolor: 'secondary.dark' }
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            {/* Page Thumbnails Grid */}
            <Typography variant="subtitle2" gutterBottom>
              Pages ({result.pages.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 300, overflow: 'auto' }}>
              {result.pages.map((page) => (
                <Box key={page.id} sx={{ position: 'relative' }}>
                  <ThumbnailViewer
                    fileId={`${page.fileId || page.id}_page_${page.pageNumber}`}
                    title={`Page ${page.pageNumber}`}
                    showInfo={false}
                    showPdfActions={false}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      right: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="caption" sx={{
                      bgcolor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      px: 0.5,
                      borderRadius: 0.5,
                      fontSize: '0.6rem'
                    }}>
                      {page.wordCount} words
                    </Typography>
                    <Chip
                      size="small"
                      label={page.status.replace('_', ' ')}
                      color={getStatusColor(page.status)}
                      sx={{ height: 16, fontSize: '0.6rem' }}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setSelectedImageDialog(page)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                    }}
                  >
                    <ZoomIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
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
          {currentPdfTitle || 'PDF Document'}
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {currentPdfUrl ? (
            <iframe
              src={currentPdfUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                flexGrow: 1
              }}
              title={`PDF Viewer - ${currentPdfTitle}`}
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
              <Typography>Loading PDF...</Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClosePdfDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdfResultsDisplay;