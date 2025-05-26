import React, { useState } from 'react';
import { Box, Typography, Button, Accordion, AccordionSummary, AccordionDetails, Tooltip, Grid, CircularProgress, Divider, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import { useTheme } from '@mui/material/styles';
import { blockTemplate } from '../theme/blockTemplate';

function arrayify(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [val];
}

const PDFConverterBlock = ({ files = [], onNext, onRerun, previousResult, loading: loadingProp }) => {
  const [paramsOpen, setParamsOpen] = useState(false);
  const [params, setParams] = useState({
    engine: 'pymupdf',
    lang: 'en',
    dpi: 200,
    width: 0,
    height: 0,
    scale: 1.0,
    colorspace: 'rgb',
    alpha: false,
    rotation: 0,
    image_format: 'png',
    page_range: '',
    grayscale: false,
    transparent: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(previousResult || null);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const template = blockTemplate(theme);

  // Helper: fetch PDF as base64
  const fetchPdfAsBase64 = async (file) => {
    const url = `/api/sharepoint/file_content?drive_id=${file.driveId || file.drive_id}&item_id=${file.id}&download=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch PDF');
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handler: run PDF conversion
  const handleConvert = async () => {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    try {
      const file = files[0]; // For now, just the first file
      const pdf_data = await fetchPdfAsBase64(file);
      const payload = {
        file_id: file.id,
        directory_id: file.parentReference?.id || file.parent_id || 'root',
        pdf_data,
        engine: params.engine,
        lang: params.lang,
        dpi: params.dpi,
        width: params.width,
        height: params.height,
        scale: params.scale,
        colorspace: params.colorspace,
        alpha: params.alpha,
        rotation: params.rotation,
        image_format: params.image_format,
        page_range: params.page_range,
        grayscale: params.grayscale,
        transparent: params.transparent,
      };
      const res = await fetch('/api/ocr/preprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('PDF conversion failed');
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Handler: re-run
  const handleRerun = () => {
    setResult(null);
    handleConvert();
  };

  // Show previousResult if provided
  React.useEffect(() => {
    if (previousResult) setResult(previousResult);
  }, [previousResult]);

  const hasResults = result && (result.image_urls?.length || result.page_texts?.length);

  return (
    <Box sx={template.block}>
      {(loadingProp || loading) && <CircularProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {hasResults && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Previous PDF conversion found. You can proceed or re-run with new parameters.
        </Alert>
      )}
      <Accordion expanded={paramsOpen} onChange={() => setParamsOpen(o => !o)} sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>PDF Conversion Parameters</AccordionSummary>
        <AccordionDetails>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="body2">Engine</Typography>
              <select value={params.engine} onChange={e => setParams(p => ({ ...p, engine: e.target.value }))}>
                <option value="pymupdf">PyMuPDF</option>
                <option value="pdf2image">pdf2image</option>
              </select>
            </Box>
            <Box>
              <Typography variant="body2">Language</Typography>
              <select value={params.lang} onChange={e => setParams(p => ({ ...p, lang: e.target.value }))}>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </Box>
            <Box>
              <Typography variant="body2">DPI</Typography>
              <input type="number" min={72} max={600} value={params.dpi} onChange={e => setParams(p => ({ ...p, dpi: Number(e.target.value) }))} style={{ width: 60 }} />
            </Box>
            <Box>
              <Typography variant="body2">Width</Typography>
              <input type="number" min={0} value={params.width} onChange={e => setParams(p => ({ ...p, width: Number(e.target.value) }))} style={{ width: 60 }} />
            </Box>
            <Box>
              <Typography variant="body2">Height</Typography>
              <input type="number" min={0} value={params.height} onChange={e => setParams(p => ({ ...p, height: Number(e.target.value) }))} style={{ width: 60 }} />
            </Box>
            <Box>
              <Typography variant="body2">Scale</Typography>
              <input type="number" step={0.01} min={0.1} max={10} value={params.scale} onChange={e => setParams(p => ({ ...p, scale: Number(e.target.value) }))} style={{ width: 60 }} />
            </Box>
            <Box>
              <Typography variant="body2">Colorspace</Typography>
              <select value={params.colorspace} onChange={e => setParams(p => ({ ...p, colorspace: e.target.value }))}>
                <option value="rgb">RGB</option>
                <option value="gray">Gray</option>
                <option value="cmyk">CMYK</option>
              </select>
            </Box>
            <Box>
              <Typography variant="body2">Alpha</Typography>
              <input type="checkbox" checked={params.alpha} onChange={e => setParams(p => ({ ...p, alpha: e.target.checked }))} />
            </Box>
            <Box>
              <Typography variant="body2">Rotation (deg)</Typography>
              <input type="number" min={0} max={360} value={params.rotation} onChange={e => setParams(p => ({ ...p, rotation: Number(e.target.value) }))} style={{ width: 60 }} />
            </Box>
            <Box>
              <Typography variant="body2">Image Format</Typography>
              <select value={params.image_format} onChange={e => setParams(p => ({ ...p, image_format: e.target.value }))}>
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="tiff">TIFF</option>
              </select>
            </Box>
            <Box>
              <Typography variant="body2">Page Range</Typography>
              <input type="text" value={params.page_range} onChange={e => setParams(p => ({ ...p, page_range: e.target.value }))} style={{ width: 80 }} placeholder="e.g. 1-3,5" />
            </Box>
            <Box>
              <Typography variant="body2">Grayscale</Typography>
              <input type="checkbox" checked={params.grayscale} onChange={e => setParams(p => ({ ...p, grayscale: e.target.checked }))} />
            </Box>
            <Box>
              <Typography variant="body2">Transparent</Typography>
              <input type="checkbox" checked={params.transparent} onChange={e => setParams(p => ({ ...p, transparent: e.target.checked }))} />
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
      {hasResults && (
        <Box mb={2}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Converted Images:</Typography>
          <Grid container spacing={1}>
            {arrayify(result.image_urls).map((img, idx) => (
              <Grid item key={idx}>
                <Tooltip title={result.page_texts?.[idx] || ''} placement="top" arrow>
                  <img src={img} alt={`PDF page ${idx + 1}`} style={{ maxWidth: 120, maxHeight: 160, borderRadius: 4, boxShadow: '0 2px 8px #0001' }} />
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      {hasResults && result.metrics && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">Metrics: {JSON.stringify(result.metrics)}</Typography>
        </Box>
      )}
      <Box display="flex" gap={2}>
        {hasResults && (
          <Button variant="outlined" color="secondary" onClick={handleRerun} startIcon={<TextSnippetIcon />}>Re-run</Button>
        )}
        <Button
          variant={template.button.variant}
          color={template.button.color}
          sx={template.button.sx}
          onClick={onNext || handleConvert}
          startIcon={<PictureAsPdfIcon />}
        >
          {hasResults ? 'Next Step' : 'Convert PDF'}
        </Button>
      </Box>
    </Box>
  );
};

export default PDFConverterBlock; 