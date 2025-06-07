import React, { useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Switch,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    TextField,
    MenuItem,
    Slider,
    Divider,
    Chip,
    Alert,
    Tooltip,
    IconButton
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Settings as SettingsIcon,
    Speed as SpeedIcon,
    Memory as MemoryIcon,
    Timer as TimerIcon,
    FilterList as FilterListIcon,
    Info as InfoIcon,
    Tune as TuneIcon
} from '@mui/icons-material';
import { useTranslate } from 'react-admin';

const UnifiedProcessingSettings = ({
    usePaginatedProcessor,
    onPaginatedProcessorChange,
    onSettingsChange
}) => {
    const translate = useTranslate();
    const [expanded, setExpanded] = useState(false);
    const [paginationSettings, setPaginationSettings] = useState({
        chunkSize: 200,
        skipProcessed: true,
        pauseBetweenChunks: false,
        pauseDuration: 5000 // 5 seconds
    });

    const [ocrSettings, setOcrSettings] = useState({
        dpi: 300,
        imageFormat: 'PNG',
        colorMode: 'RGB',
        pageRange: 'all',
        ocrEngine: 'easyocr',
        language: 'spa',
        confidenceThreshold: 0.7,
        enableGpuAcceleration: true,
        preferredGpu: 'auto',  // "auto", "0", "1", "2", etc.
        batchSize: 5,
        autoSave: true,
        reprocess: true  // Add reprocess flag to enable reprocessing of already processed files
    });
    
    // State for available GPUs
    const [gpuInfo, setGpuInfo] = useState({
        isAvailable: false,
        deviceCount: 0,
        devices: []
    });
    
    // Fetch GPU information on component mount
    React.useEffect(() => {
        const fetchGpuInfo = async () => {
            try {
                const response = await fetch('/api/ocr/gpu-info');
                if (response.ok) {
                    const data = await response.json();
                    setGpuInfo(data);
                }
            } catch (error) {
                console.error('Error fetching GPU information:', error);
            }
        };
        
        fetchGpuInfo();
    }, []);

    const handlePaginationSettingChange = (key, value) => {
        setPaginationSettings(prev => {
            const newSettings = {
                ...prev,
                [key]: value
            };
            // Notify parent of settings change
            if (onSettingsChange) {
                onSettingsChange({
                    paginationSettings: newSettings,
                    ocrSettings
                });
            }
            return newSettings;
        });
    };

    const handleOcrSettingChange = (key, value) => {
        setOcrSettings(prev => {
            const newSettings = {
                ...prev,
                [key]: value
            };
            // Notify parent of settings change
            if (onSettingsChange) {
                onSettingsChange({
                    paginationSettings,
                    ocrSettings: newSettings
                });
            }
            return newSettings;
        });
    };

    // Notify parent of initial settings
    React.useEffect(() => {
        if (onSettingsChange) {
            onSettingsChange({
                paginationSettings,
                ocrSettings
            });
        }
    }, []); // Only run once on mount

    const formatPauseDuration = (value) => {
        if (value < 1000) return `${value}ms`;
        return `${(value / 1000).toFixed(1)}s`;
    };

    return (
        <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
                {/* Advanced Settings Accordion */}
                <Accordion
                    expanded={expanded}
                    onChange={() => setExpanded(!expanded)}
                    sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TuneIcon fontSize="small" />
                            {translate('processing.advanced_settings')}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            {/* OCR Processing Settings */}
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FilterListIcon fontSize="small" />
                                    OCR Processing Settings
                                </Typography>
                                <Divider sx={{ mb: 2 }} />

                                {/* PDF Preprocessing & OCR Settings - Main Processing Mode Toggle */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <SettingsIcon fontSize="small" />
                                        {translate('workflow.pdf_preprocessing')}
                                    </Typography>
                                    
                                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={usePaginatedProcessor}
                                                    onChange={(e) => onPaginatedProcessorChange(e.target.checked)}
                                                />
                                            }
                                            label={
                                                <Box>
                                                    <Typography variant="subtitle2">
                                                        {translate('processing.use_paginated_processing')}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {usePaginatedProcessor
                                                            ? translate('processing.paginated_processing_desc')
                                                            : translate('processing.standard_processing_desc')
                                                        }
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </Box>
                                </Box>

                                {/* Pagination Settings - Only show when paginated processing is enabled */}
                                {usePaginatedProcessor && (
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <SpeedIcon fontSize="small" />
                                            Pagination Settings
                                        </Typography>
                                        <Divider sx={{ mb: 2 }} />
                                        
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    fullWidth
                                                    label={translate('processing.chunk_size')}
                                                    type="number"
                                                    value={paginationSettings.chunkSize}
                                                    onChange={(e) => handlePaginationSettingChange('chunkSize', parseInt(e.target.value))}
                                                    inputProps={{ min: 50, max: 500, step: 50 }}
                                                    helperText={translate('processing.chunk_size_desc')}
                                                />
                                            </Grid>
                                            
                                            <Grid item xs={12} sm={6}>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={paginationSettings.skipProcessed}
                                                            onChange={(e) => handlePaginationSettingChange('skipProcessed', e.target.checked)}
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body2">{translate('processing.skip_processed_files')}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {translate('processing.skip_processed_files_desc')}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </Grid>
                                            
                                            <Grid item xs={12} sm={6}>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={paginationSettings.pauseBetweenChunks}
                                                            onChange={(e) => handlePaginationSettingChange('pauseBetweenChunks', e.target.checked)}
                                                        />
                                                    }
                                                    label={
                                                        <Box>
                                                            <Typography variant="body2">{translate('processing.pause_between_chunks')}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {translate('processing.pause_between_chunks_desc')}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                />
                                            </Grid>
                                            
                                            {paginationSettings.pauseBetweenChunks && (
                                                <Grid item xs={12} sm={6}>
                                                    <Typography variant="body2" gutterBottom>
                                                        Pause Duration: {formatPauseDuration(paginationSettings.pauseDuration)}
                                                    </Typography>
                                                    <Slider
                                                        value={paginationSettings.pauseDuration}
                                                        onChange={(e, value) => handlePaginationSettingChange('pauseDuration', value)}
                                                        min={1000}
                                                        max={30000}
                                                        step={1000}
                                                        marks={[
                                                            { value: 1000, label: '1s' },
                                                            { value: 5000, label: '5s' },
                                                            { value: 10000, label: '10s' },
                                                            { value: 30000, label: '30s' }
                                                        ]}
                                                        valueLabelDisplay="auto"
                                                        valueLabelFormat={formatPauseDuration}
                                                    />
                                                </Grid>
                                            )}
                                        </Grid>
                                    </Box>
                                )}

                                {/* OCR Engine and Processing Settings */}
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        {translate('processing.ocr_engine_settings')}
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextField
                                                fullWidth
                                                select
                                                label="OCR Engine"
                                                value={ocrSettings.ocrEngine}
                                                onChange={(e) => handleOcrSettingChange('ocrEngine', e.target.value)}
                                            >
                                                <MenuItem value="easyocr">{translate('ocr_engine.easyocr')}</MenuItem>
                                                <MenuItem value="tesseract">{translate('ocr_engine.tesseract')}</MenuItem>
                                                <MenuItem value="paddleocr">{translate('ocr_engine.paddleocr')}</MenuItem>
                                            </TextField>
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextField
                                                fullWidth
                                                select
                                                label={translate('processing.language')}
                                                value={ocrSettings.language}
                                                onChange={(e) => handleOcrSettingChange('language', e.target.value)}
                                            >
                                                <MenuItem value="spa">{translate('language.spa')}</MenuItem>
                                                <MenuItem value="eng">{translate('language.eng')}</MenuItem>
                                                <MenuItem value="fra">{translate('language.fra')}</MenuItem>
                                                <MenuItem value="deu">{translate('language.deu')}</MenuItem>
                                                <MenuItem value="ita">{translate('language.ita')}</MenuItem>
                                                <MenuItem value="por">{translate('language.por')}</MenuItem>
                                            </TextField>
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextField
                                                fullWidth
                                                label={translate('processing.dpi')}
                                                type="number"
                                                value={ocrSettings.dpi}
                                                onChange={(e) => handleOcrSettingChange('dpi', parseInt(e.target.value))}
                                                inputProps={{ min: 150, max: 600, step: 50 }}
                                                helperText={translate('processing.dpi_desc')}
                                            />
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextField
                                                fullWidth
                                                select
                                                label="Image Format"
                                                value={ocrSettings.imageFormat}
                                                onChange={(e) => handleOcrSettingChange('imageFormat', e.target.value)}
                                            >
                                                <MenuItem value="PNG">{translate('image_format.png')}</MenuItem>
                                                <MenuItem value="JPEG">{translate('image_format.jpeg')}</MenuItem>
                                                <MenuItem value="TIFF">{translate('image_format.tiff')}</MenuItem>
                                            </TextField>
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextField
                                                fullWidth
                                                select
                                                label="Color Mode"
                                                value={ocrSettings.colorMode}
                                                onChange={(e) => handleOcrSettingChange('colorMode', e.target.value)}
                                            >
                                                <MenuItem value="RGB">{translate('color_mode.rgb')}</MenuItem>
                                                <MenuItem value="L">{translate('color_mode.grayscale')}</MenuItem>
                                                <MenuItem value="1">{translate('color_mode.bw')}</MenuItem>
                                            </TextField>
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6} md={4}>
                                            <TextField
                                                fullWidth
                                                label={translate('processing.batch_size')}
                                                type="number"
                                                value={ocrSettings.batchSize}
                                                onChange={(e) => handleOcrSettingChange('batchSize', parseInt(e.target.value))}
                                                inputProps={{ min: 1, max: 20, step: 1 }}
                                                helperText={translate('processing.batch_size_desc')}
                                            />
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6}>
                                            <Typography variant="body2" gutterBottom>
                                                Confidence Threshold: {(ocrSettings.confidenceThreshold * 100).toFixed(0)}%
                                            </Typography>
                                            <Slider
                                                value={ocrSettings.confidenceThreshold}
                                                onChange={(e, value) => handleOcrSettingChange('confidenceThreshold', value)}
                                                min={0.1}
                                                max={1.0}
                                                step={0.1}
                                                marks={[
                                                    { value: 0.1, label: '10%' },
                                                    { value: 0.5, label: '50%' },
                                                    { value: 0.7, label: '70%' },
                                                    { value: 1.0, label: '100%' }
                                                ]}
                                                valueLabelDisplay="auto"
                                                valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                                            />
                                        </Grid>
                                        
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={ocrSettings.enableGpuAcceleration}
                                                            onChange={(e) => handleOcrSettingChange('enableGpuAcceleration', e.target.checked)}
                                                        />
                                                    }
                                                    label={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <MemoryIcon fontSize="small" />
                                                            <Typography variant="body2">{translate('processing.gpu_acceleration')}</Typography>
                                                            <Tooltip title="Uses GPU for faster OCR processing when available">
                                                                <IconButton size="small">
                                                                    <InfoIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    }
                                                />
                                                
                                                {/* GPU Selection Dropdown - Only show when GPU acceleration is enabled */}
                                                {ocrSettings.enableGpuAcceleration && (
                                                    <Box sx={{ ml: 4, mt: 1 }}>
                                                        <TextField
                                                            fullWidth
                                                            select
                                                            size="small"
                                                            label="GPU Selection"
                                                            value={ocrSettings.preferredGpu}
                                                            onChange={(e) => handleOcrSettingChange('preferredGpu', e.target.value)}
                                                            helperText={
                                                                gpuInfo.isAvailable
                                                                    ? `${gpuInfo.deviceCount} GPU(s) available`
                                                                    : "No GPUs detected"
                                                            }
                                                        >
                                                            <MenuItem value="auto">Auto (Round-Robin)</MenuItem>
                                                            {gpuInfo.devices.map((device) => (
                                                                <MenuItem key={device.id} value={device.id.toString()}>
                                                                    GPU {device.id}: {device.name}
                                                                </MenuItem>
                                                            ))}
                                                        </TextField>
                                                    </Box>
                                                )}
                                                
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={ocrSettings.autoSave}
                                                            onChange={(e) => handleOcrSettingChange('autoSave', e.target.checked)}
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="body2">Auto-save results</Typography>
                                                    }
                                                />
                                                
                                                <FormControlLabel
                                                    control={
                                                        <Switch
                                                            checked={ocrSettings.reprocess}
                                                            onChange={(e) => handleOcrSettingChange('reprocess', e.target.checked)}
                                                        />
                                                    }
                                                    label={
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Typography variant="body2">Reprocess existing files</Typography>
                                                            <Tooltip title="When enabled, files will be reprocessed even if they were processed before">
                                                                <IconButton size="small">
                                                                    <InfoIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    }
                                                />
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Settings Summary */}
                        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                {translate('processing.current_config_summary')}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Chip 
                                    label={usePaginatedProcessor ? "Paginated Processing" : "Standard Processing"} 
                                    color="primary" 
                                    size="small" 
                                />
                                {usePaginatedProcessor && (
                                    <>
                                        <Chip 
                                            label={`${translate('processing.chunk_size_label')}: ${paginationSettings.chunkSize}`}
                                            variant="outlined" 
                                            size="small" 
                                        />
                                        {paginationSettings.skipProcessed && (
                                            <Chip 
                                                label="Skip Processed" 
                                                color="success" 
                                                size="small" 
                                            />
                                        )}
                                        {paginationSettings.pauseBetweenChunks && (
                                            <Chip 
                                                label={`Pause: ${formatPauseDuration(paginationSettings.pauseDuration)}`} 
                                                color="warning" 
                                                size="small" 
                                            />
                                        )}
                                    </>
                                )}
                                <Chip 
                                    label={`${ocrSettings.ocrEngine.toUpperCase()}`} 
                                    variant="outlined" 
                                    size="small" 
                                />
                                <Chip 
                                    label={`${ocrSettings.dpi} DPI`} 
                                    variant="outlined" 
                                    size="small" 
                                />
                                <Chip 
                                    label={`Batch: ${ocrSettings.batchSize}`} 
                                    variant="outlined" 
                                    size="small" 
                                />
                                {ocrSettings.enableGpuAcceleration && (
                                    <Chip
                                        label={
                                            ocrSettings.preferredGpu === 'auto'
                                                ? `${translate('processing.gpu_enabled')} (Auto)`
                                                : `${translate('processing.gpu_enabled')} (GPU ${ocrSettings.preferredGpu})`
                                        }
                                        color="success"
                                        size="small"
                                    />
                                )}
                                {ocrSettings.reprocess && (
                                    <Chip
                                        label="Reprocessing Enabled"
                                        color="warning"
                                        size="small"
                                    />
                                )}
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </CardContent>
        </Card>
    );
};

export default UnifiedProcessingSettings;