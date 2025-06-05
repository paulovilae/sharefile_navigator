import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PhotoLibrary as GalleryIcon
} from '@mui/icons-material';
import ThumbnailViewer from './ThumbnailViewer';

/**
 * ThumbnailDemo Component - Demonstrates the new thumbnail system
 */
const ThumbnailDemo = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      // Use a broad search query to get records with thumbnails
      const response = await fetch('http://localhost:8000/api/search/images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'a',  // Use a simple query that should match many records
          limit: 10,
          offset: 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data.results || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to load records:', response.status, errorText);
        setError(`Failed to load records: ${response.status}`);
      }
    } catch (err) {
      console.error('Error loading records:', err);
      setError('Error loading records');
    } finally {
      setLoading(false);
    }
  };

  const generateThumbnails = async () => {
    try {
      setGenerating(true);
      const response = await fetch('http://localhost:8000/api/thumbnails/generate-thumbnails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Generated thumbnails for ${result.updated_count} records`);
        loadRecords(); // Reload to see new thumbnails
      } else {
        setError('Failed to generate thumbnails');
      }
    } catch (err) {
      console.error('Error generating thumbnails:', err);
      setError('Error generating thumbnails');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GalleryIcon />
          Thumbnail System Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This demonstrates the new secure thumbnail system. Small preview images are stored in the database,
          while full PDFs can be viewed on demand without storing sensitive full images permanently.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            onClick={generateThumbnails}
            disabled={generating}
            startIcon={generating ? <CircularProgress size={20} /> : <RefreshIcon />}
          >
            {generating ? 'Generating...' : 'Generate Thumbnails'}
          </Button>
          <Button
            variant="outlined"
            onClick={loadRecords}
            disabled={loading}
          >
            Refresh Records
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {records.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">
                No records found. Try generating thumbnails first.
              </Alert>
            </Grid>
          ) : (
            records.map((record) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={record.file_id}>
                <Card>
                  <ThumbnailViewer
                    fileId={record.file_id}
                    title={record.filename || record.file_id}
                    showInfo={true}
                  />
                  <CardContent>
                    <Typography variant="body2" noWrap>
                      {record.filename || record.file_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Status: {record.status}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          How it works:
        </Typography>
        <Typography variant="body2" component="div">
          <ul>
            <li><strong>Security:</strong> Only small thumbnail previews (150x200px, ~3KB) are stored in the database</li>
            <li><strong>Performance:</strong> Thumbnails load instantly from the database</li>
            <li><strong>On-demand viewing:</strong> Click the zoom icon to view the full PDF in a popup</li>
            <li><strong>Download option:</strong> Click the download icon to save the original PDF</li>
            <li><strong>No permanent storage:</strong> Full images/PDFs are served directly when needed</li>
          </ul>
        </Typography>
      </Box>
    </Container>
  );
};

export default ThumbnailDemo;