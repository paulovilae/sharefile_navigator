import React, { useState } from 'react';
import { Box, Typography, Button, Accordion, AccordionSummary, AccordionDetails, Tooltip, Grid, CircularProgress, Divider, Alert } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import { useTheme } from '@mui/material/styles';
import { blockTemplate } from '../theme/blockTemplate';

const OCRBlock = ({ images = [], onNext, onRerun, previousResult, loading }) => {
  const [paramsOpen, setParamsOpen] = useState(false);
  // Example params state (customize as needed)
  const [params, setParams] = useState({ engine: 'easyocr', lang: 'en' });
  const theme = useTheme();
  const template = blockTemplate(theme);

  const hasResults = previousResult && previousResult.ocr_text;

  return (
    <Box sx={template.block}>
      {loading && <CircularProgress sx={{ mb: 2 }} />}
      {hasResults && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Previous OCR result found. You can proceed or re-run with new parameters.
        </Alert>
      )}
      <Accordion expanded={paramsOpen} onChange={() => setParamsOpen(o => !o)} sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>OCR Parameters</AccordionSummary>
        <AccordionDetails>
          {/* Example parameter form (customize as needed) */}
          <Box display="flex" gap={2}>
            <Box>
              <Typography variant="body2">Engine</Typography>
              <select value={params.engine} onChange={e => setParams(p => ({ ...p, engine: e.target.value }))}>
                <option value="easyocr">EasyOCR</option>
                <option value="tesseract">Tesseract</option>
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
          </Box>
        </AccordionDetails>
      </Accordion>
      {hasResults && (
        <Box mb={2}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>OCR Text:</Typography>
          <Box sx={{ bgcolor: '#f9f9f9', borderRadius: 2, p: 1, maxHeight: 120, overflow: 'auto', fontSize: 14 }}>
            {previousResult.ocr_text}
          </Box>
        </Box>
      )}
      {hasResults && previousResult.metrics && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary">Metrics: {JSON.stringify(previousResult.metrics)}</Typography>
        </Box>
      )}
      <Box display="flex" gap={2}>
        {hasResults && (
          <Button variant="outlined" color="secondary" onClick={onRerun} startIcon={<TextSnippetIcon />}>Re-run</Button>
        )}
        <Button
          variant={template.button.variant}
          color={template.button.color}
          sx={template.button.sx}
          onClick={onNext}
          startIcon={<TextSnippetIcon />}
        >
          {hasResults ? 'Next Step' : 'Run OCR'}
        </Button>
      </Box>
    </Box>
  );
};

export default OCRBlock; 