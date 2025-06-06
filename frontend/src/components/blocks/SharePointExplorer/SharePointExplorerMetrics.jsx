import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  useTheme
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Speed as SpeedIcon,
  Storage as CacheIcon,
  FolderOpen as FolderOpenIcon,
  Description as FileCountIcon,
  Assessment as MetricsIcon,
  Assessment,
} from '@mui/icons-material';
import { useTranslate } from 'react-admin';

const SharePointExplorerMetrics = ({
  metrics,
  metricsExpanded,
  setMetricsExpanded,
  getSessionDuration,
  getCacheHitRate
}) => {
  const translate = useTranslate();
  const theme = useTheme();
  
  return (
    <Box>
      {/* Collapsible Block Metrics */}
      <Accordion
        expanded={metricsExpanded}
        onChange={() => setMetricsExpanded(!metricsExpanded)}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <MetricsIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {translate('block.metrics')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                icon={<FolderOpenIcon />}
                label={`${metrics.currentFolderCount} ${translate('metrics.folders')}`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<FileCountIcon />}
                label={`${metrics.pdfFilesCount} ${translate('metrics.pdfs')}`}
                size="small"
                color="error"
                variant="outlined"
              />
              <Chip
                icon={<FileCountIcon />}
                label={`${metrics.otherFilesCount} ${translate('metrics.other')}`}
                size="small"
                color="secondary"
                variant="outlined"
              />
              <Chip
                icon={<SpeedIcon />}
                label={`${Math.round(metrics.averageResponseTime)}ms ${translate('metrics.avg')}`}
                size="small"
                color={metrics.averageResponseTime < 500 ? 'success' : 'warning'}
                variant="outlined"
              />
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Current View */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <FolderOpenIcon sx={{ mr: 1, fontSize: 16 }} />
                Current View
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                    <Typography variant="h5" color="primary.contrastText">
                      {metrics.currentFolderCount}
                    </Typography>
                    <Typography variant="caption" color="primary.contrastText">Folders</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography variant="h5" color="error.contrastText">
                      {metrics.pdfFilesCount}
                    </Typography>
                    <Typography variant="caption" color="error.contrastText">PDFs</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'secondary.light', borderRadius: 1 }}>
                    <Typography variant="h5" color="secondary.contrastText">
                      {metrics.otherFilesCount}
                    </Typography>
                    <Typography variant="caption" color="secondary.contrastText">Other Files</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
            
            {/* Performance */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SpeedIcon sx={{ mr: 1, fontSize: 16 }} />
                Performance
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="success.contrastText">
                      {Math.round(metrics.averageResponseTime)}ms
                    </Typography>
                    <Typography variant="caption" color="success.contrastText">Avg Response</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" sx={{ p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                    <Typography variant="h6" color="info.contrastText">
                      {Math.round((metrics.totalDataTransferred / 1024) * 100) / 100}KB
                    </Typography>
                    <Typography variant="caption" color="info.contrastText">Data Loaded</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
            
            {/* User Activity */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Assessment sx={{ mr: 1, fontSize: 16 }} />
                User Activity
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">{metrics.totalInteractions}</Typography>
                    <Typography variant="caption">Interactions</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">{metrics.downloadCount}</Typography>
                    <Typography variant="caption">Downloads</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">{metrics.previewCount}</Typography>
                    <Typography variant="caption">Previews</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
            
            {/* Cache & Session */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <CacheIcon sx={{ mr: 1, fontSize: 16 }} />
                Cache & Session
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">
                      {getCacheHitRate ? Math.round(getCacheHitRate()) : 0}%
                    </Typography>
                    <Typography variant="caption">Cache Hit Rate</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">{metrics.librariesExplored.size}</Typography>
                    <Typography variant="caption">Libraries</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6">{getSessionDuration()}</Typography>
                    <Typography variant="caption">Session Time</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Keep the existing response time progress bar when expanded */}
      {metricsExpanded && metrics.averageResponseTime > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            Response Time: {Math.round(metrics.averageResponseTime)}ms
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (1000 - metrics.averageResponseTime) / 10)}
            color={metrics.averageResponseTime < 500 ? 'success' : 'warning'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}
    </Box>
  );
};

export default SharePointExplorerMetrics;