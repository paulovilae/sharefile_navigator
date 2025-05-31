import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
  Chip,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cached as ProcessingIcon,
  TextSnippet as OcrIcon,
} from '@mui/icons-material';

const OCRHeader = ({
  isEngineReady,
  engineError,
  processing,
  currentFile,
  progress,
}) => {
  const getEngineStatus = () => {
    if (engineError) return 'error';
    if (!isEngineReady) return 'loading';
    return 'ready';
  };

  const getEngineStatusColor = () => {
    switch (getEngineStatus()) {
      case 'error': return 'error';
      case 'loading': return 'warning';
      case 'ready': return 'success';
      default: return 'default';
    }
  };

  const getEngineStatusText = () => {
    switch (getEngineStatus()) {
      case 'error': return 'Engine Error';
      case 'loading': return 'Loading Engine';
      case 'ready': return 'Engine Ready';
      default: return 'Unknown';
    }
  };

  const getEngineStatusIcon = () => {
    switch (getEngineStatus()) {
      case 'error': return <ErrorIcon />;
      case 'loading': return <ProcessingIcon />;
      case 'ready': return <CheckCircleIcon />;
      default: return <OcrIcon />;
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <OcrIcon sx={{ color: 'primary.main', fontSize: 32 }} />
        
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 500, color: 'primary.main' }}>
            OCR Processing Block
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Client-side PDF to text conversion using Tesseract.js
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={getEngineStatusIcon()}
            label={getEngineStatusText()}
            color={getEngineStatusColor()}
            variant="outlined"
            size="small"
          />
          
          {processing && (
            <Chip
              icon={<ProcessingIcon />}
              label="Processing"
              color="warning"
              size="small"
            />
          )}
        </Stack>
      </Stack>

      {/* Engine Error Alert */}
      {engineError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            OCR Engine Error
          </Typography>
          <Typography variant="body2">
            {engineError}
          </Typography>
        </Alert>
      )}

      {/* Engine Loading Alert */}
      {!isEngineReady && !engineError && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Initializing OCR Engine
          </Typography>
          <Typography variant="body2" gutterBottom>
            Loading Tesseract.js OCR engine. This may take a moment on first use.
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      )}

      {/* Current Processing Status */}
      {processing && currentFile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Currently Processing: {currentFile.name}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 6, borderRadius: 3 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {Math.round(progress)}% complete
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default OCRHeader;