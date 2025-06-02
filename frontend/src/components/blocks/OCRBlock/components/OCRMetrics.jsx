import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Assessment as MetricsIcon,
  ExpandMore as ExpandMoreIcon,
  Speed as SpeedIcon,
  Description as WordCountIcon,
  PhotoLibrary as ImageCountIcon,
  Memory as ProcessingIcon,
  Timer as TimerIcon
} from '@mui/icons-material';

/**
 * OCR Metrics Component - Displays comprehensive OCR processing metrics
 */
const OCRMetrics = ({ metrics, title = "OCR Metrics" }) => {
  const [expanded, setExpanded] = useState(false);

  // Calculate derived metrics
  const getSessionDuration = () => {
    return Math.round((Date.now() - metrics.sessionStartTime) / 1000);
  };

  const getSuccessRate = () => {
    const total = metrics.successfulProcesses + metrics.failedProcesses;
    return total > 0 ? Math.round((metrics.successfulProcesses / total) * 100) : 0;
  };

  const getAverageProcessingTime = () => {
    return metrics.totalFiles > 0 ? Math.round(metrics.totalProcessingTime / metrics.totalFiles) : 0;
  };

  const getAverageWordsPerPage = () => {
    return metrics.totalPages > 0 ? Math.round(metrics.totalWords / metrics.totalPages) : 0;
  };

  return (
    <Accordion 
      expanded={expanded} 
      onChange={() => setExpanded(!expanded)}
      sx={{ mb: 2 }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <MetricsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
            <Chip 
              icon={<ImageCountIcon />} 
              label={`${metrics.totalFiles} files`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
            <Chip 
              icon={<WordCountIcon />} 
              label={`${metrics.totalWords} words`} 
              size="small" 
              color="secondary" 
              variant="outlined"
            />
            <Chip 
              icon={<SpeedIcon />} 
              label={`${getAverageProcessingTime()}ms avg`} 
              size="small" 
              color={getAverageProcessingTime() < 2000 ? 'success' : 'warning'} 
              variant="outlined"
            />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={2}>
          {/* Processing Stats */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ProcessingIcon sx={{ mr: 1, fontSize: 16 }} />
              Processing Stats
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box textAlign="center" sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h5" color="primary.contrastText">
                    {metrics.totalFiles}
                  </Typography>
                  <Typography variant="caption" color="primary.contrastText">Files Processed</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center" sx={{ p: 1, bgcolor: 'secondary.light', borderRadius: 1 }}>
                  <Typography variant="h5" color="secondary.contrastText">
                    {getSuccessRate()}%
                  </Typography>
                  <Typography variant="caption" color="secondary.contrastText">Success Rate</Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Content Stats */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <WordCountIcon sx={{ mr: 1, fontSize: 16 }} />
              Content Extraction
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box textAlign="center" sx={{ p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="success.contrastText">
                    {metrics.totalWords}
                  </Typography>
                  <Typography variant="caption" color="success.contrastText">Total Words</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center" sx={{ p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                  <Typography variant="h6" color="info.contrastText">
                    {getAverageWordsPerPage()}
                  </Typography>
                  <Typography variant="caption" color="info.contrastText">Avg Words/Page</Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Performance Stats */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <TimerIcon sx={{ mr: 1, fontSize: 16 }} />
              Performance Metrics
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="h6">{getAverageProcessingTime()}ms</Typography>
                  <Typography variant="caption">Avg Processing</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="h6">{getSessionDuration()}s</Typography>
                  <Typography variant="caption">Session Time</Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
          
          {/* Detailed Stats */}
          <Grid item xs={12}>
            <Grid container spacing={1}>
              <Grid item xs={3}>
                <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="h6">{metrics.totalPages}</Typography>
                  <Typography variant="caption">Pages Processed</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="h6">{Math.round(metrics.totalProcessingTime / 1000)}s</Typography>
                  <Typography variant="caption">Total Processing</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="h6">{metrics.totalCharacters}</Typography>
                  <Typography variant="caption">Characters</Typography>
                </Box>
              </Grid>
              <Grid item xs={3}>
                <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="h6">{metrics.successfulProcesses}</Typography>
                  <Typography variant="caption">Successful</Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default OCRMetrics;