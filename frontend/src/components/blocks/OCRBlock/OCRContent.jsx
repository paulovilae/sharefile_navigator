import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  TextField,
  Divider,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PictureAsPdf as PdfIcon,
  TextSnippet as TextIcon,
  Download as DownloadIcon,
  Copy as CopyIcon,
} from '@mui/icons-material';

import OCRImagePreview from './OCRImagePreview';

const OCRContent = ({
  files,
  ocrResults,
  processing,
  error,
  progress,
  currentFile,
  onFileProcess,
  onCancelProcessing,
  isEngineReady,
}) => {
  const [expandedResults, setExpandedResults] = useState({});
  const [previewFile, setPreviewFile] = useState(null);

  const toggleResultExpansion = (fileId) => {
    setExpandedResults(prev => ({
      ...prev,
      [fileId]: !prev[fileId]
    }));
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const handleDownloadText = (text, filename) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.replace('.pdf', '')}_ocr.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileStatus = (file) => {
    if (currentFile && currentFile.id === file.id && processing) {
      return 'processing';
    }
    if (ocrResults[file.id]) {
      return 'completed';
    }
    return 'pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'processing': return 'warning';
      case 'completed': return 'success';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing': return <StopIcon />;
      case 'completed': return <TextIcon />;
      case 'pending': return <PlayIcon />;
      default: return <PlayIcon />;
    }
  };

  if (!isEngineReady) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Initializing OCR Engine...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we load the OCR processing engine.
        </Typography>
      </Paper>
    );
  }

  if (files.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <PdfIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No PDF Files to Process
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select PDF files from the SharePoint Navigator to begin OCR processing.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Files Grid */}
      <Grid container spacing={2}>
        {files.map((file) => {
          const status = getFileStatus(file);
          const result = ocrResults[file.id];
          const isExpanded = expandedResults[file.id];

          return (
            <Grid item xs={12} key={file.id}>
              <Card sx={{ 
                border: status === 'processing' ? 2 : 1,
                borderColor: status === 'processing' ? 'warning.main' : 'divider'
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PdfIcon sx={{ mr: 1, color: 'error.main' }} />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {file.name}
                    </Typography>
                    <Chip
                      label={status}
                      color={getStatusColor(status)}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Box>

                  {/* File Info */}
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Size: {file.size ? `${Math.round(file.size / 1024)} KB` : 'Unknown'}
                  </Typography>

                  {/* Processing Progress */}
                  {status === 'processing' && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Processing... {Math.round(progress)}%
                      </Typography>
                    </Box>
                  )}

                  {/* OCR Results */}
                  {result && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                          OCR Results ({result.text.length} characters)
                        </Typography>
                        <Tooltip title="Copy text">
                          <IconButton 
                            size="small" 
                            onClick={() => handleCopyText(result.text)}
                          >
                            <CopyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Download text">
                          <IconButton 
                            size="small" 
                            onClick={() => handleDownloadText(result.text, file.name)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <IconButton 
                          size="small" 
                          onClick={() => toggleResultExpansion(file.id)}
                        >
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Box>

                      <Collapse in={isExpanded}>
                        <TextField
                          multiline
                          rows={8}
                          fullWidth
                          value={result.text}
                          variant="outlined"
                          InputProps={{
                            readOnly: true,
                            sx: { fontSize: '0.875rem' }
                          }}
                          sx={{ mb: 2 }}
                        />
                        
                        {/* Processing Stats */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Chip 
                            label={`Confidence: ${Math.round(result.confidence)}%`}
                            size="small"
                            color={result.confidence > 80 ? 'success' : 'warning'}
                          />
                          <Chip 
                            label={`Processing Time: ${result.processingTime}ms`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip 
                            label={`Pages: ${result.pages || 1}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Collapse>
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  {status === 'pending' && (
                    <Button
                      startIcon={<PlayIcon />}
                      onClick={() => onFileProcess(file)}
                      disabled={processing}
                      variant="contained"
                      size="small"
                    >
                      Process OCR
                    </Button>
                  )}
                  
                  {status === 'processing' && (
                    <Button
                      startIcon={<StopIcon />}
                      onClick={onCancelProcessing}
                      color="warning"
                      variant="outlined"
                      size="small"
                    >
                      Cancel
                    </Button>
                  )}

                  {status === 'completed' && (
                    <Button
                      startIcon={<PlayIcon />}
                      onClick={() => onFileProcess(file)}
                      disabled={processing}
                      variant="outlined"
                      size="small"
                    >
                      Reprocess
                    </Button>
                  )}

                  <Button
                    startIcon={<ViewIcon />}
                    onClick={() => setPreviewFile(file)}
                    variant="outlined"
                    size="small"
                  >
                    Preview
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Image Preview Modal */}
      {previewFile && (
        <OCRImagePreview
          file={previewFile}
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          ocrResult={ocrResults[previewFile.id]}
        />
      )}
    </Box>
  );
};

export default OCRContent;