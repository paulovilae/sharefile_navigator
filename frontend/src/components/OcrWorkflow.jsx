import React, { useState, useCallback, useEffect, Fragment } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Card,
    CardContent,
    Collapse,
    IconButton,
    Divider,
    useTheme,
    Chip,
    LinearProgress,
    Paper,
    Stack,
    Tooltip,
    Switch,
    FormControlLabel
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Settings as SettingsIcon,
    FolderOpen as FolderOpenIcon,
    PictureAsPdf as PictureAsPdfIcon,
    NavigateNext as NavigateNextIcon,
    ArrowBack as ArrowBackIcon,
    Home as HomeIcon
} from '@mui/icons-material';

import SharePointExplorerBlock from './blocks/SharePointExplorer/SharePointExplorerBlock';
import OCRBlock from './blocks/OCRBlock'; // Unified OCR Block import
import BatchOcrProcessor from './BatchOcrProcessor';
import PaginatedBatchProcessor from './PaginatedBatchProcessor';
import SharePointFilterSettings from './SharePointFilterSettings';
import UnifiedProcessingSettings from './UnifiedProcessingSettings';
import { blockTemplate } from '../theme/blockTemplate';
import useBrowserHistory from '../hooks/useBrowserHistory';
import { useTranslate } from 'react-admin';

const OcrWorkflow = () => {
    const translate = useTranslate();
    const theme = useTheme();
    const blockStyles = blockTemplate(theme);
    
    // Simplified workflow with only essential blocks
    const workflowSteps = [
        {
            id: 'sharepoint-selection',
            title: translate('sharepoint.file_selection'),
            icon: <FolderOpenIcon />,
            description: translate('sharepoint.file_selection_desc'),
            component: 'sharepoint'
        },
        {
            id: 'pdf-preprocessing',
            title: translate('workflow.pdf_preprocessing'),
            icon: <PictureAsPdfIcon />,
            description: translate('workflow.pdf_preprocessing_desc'),
            component: 'pdf-preprocessing'
        }
    ];
    
    // State for workflow steps
    const [currentStep, setCurrentStep] = useState(0);
    const [expandedSteps, setExpandedSteps] = useState([0]); // Start with first step expanded
    
    // State for SharePoint selection
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    const [usePaginatedProcessor, setUsePaginatedProcessor] = useState(true);
    const [processingSettings, setProcessingSettings] = useState(null);
    
    // State for block executions
    const [sharePointExecution, setSharePointExecution] = useState(null);
    const [pdfOcrExecution, setPdfOcrExecution] = useState(null);
    
    // Browser history management
    const { navigateToStep, goBack } = useBrowserHistory(currentStep, setCurrentStep, workflowSteps);

    // Check for active batches on component mount
    useEffect(() => {
        const checkActiveBatches = async () => {
            try {
                console.log('[OcrWorkflow] Checking for active batches...');
                const response = await axios.get('/api/ocr/batch/list');
                const activeBatches = response.data?.jobs || {};
                
                if (Object.keys(activeBatches).length > 0) {
                    console.log('[OcrWorkflow] Found active batches:', Object.keys(activeBatches));
                    console.log('[OcrWorkflow] Auto-navigating to Step 2 to show active batch status');
                    
                    // Auto-navigate to Step 2 (PDF Preprocessing & OCR)
                    setCurrentStep(1);
                    setExpandedSteps([1]);
                    
                    // Enable paginated processor to show the active batch
                    setUsePaginatedProcessor(true);
                } else {
                    console.log('[OcrWorkflow] No active batches found');
                }
            } catch (error) {
                console.error('[OcrWorkflow] Error checking active batches:', error);
            }
        };
        
        checkActiveBatches();
    }, []);

    // Handle SharePoint block execution updates
    const handleSharePointUpdate = useCallback((update) => {
        console.log('Workflow: SharePoint block update:', update);
        setSharePointExecution(prev => ({ ...prev, ...update }));
    }, []);

    // Handle PDF OCR block execution updates
    const handlePdfOcrUpdate = useCallback((update) => {
        console.log('Workflow: PDF OCR block update:', update);
        setPdfOcrExecution(prev => ({ ...prev, ...update }));
    }, []);
    
    // Use workflowSteps as blocks
    const blocks = workflowSteps;

    const handleSelectionChange = useCallback((selectedItems) => {
        console.log('SharePoint selection changed:', selectedItems);
        setSelectedFiles(selectedItems);
    }, []);

    const handleSettingsChange = useCallback((settings) => {
        console.log('Processing settings changed:', settings);
        setProcessingSettings(settings);
    }, []);

    const handleNextStep = () => {
        if (currentStep < blocks.length - 1) {
            // Collapse current step and expand next step
            const newExpandedSteps = [...expandedSteps];
            const currentIndex = newExpandedSteps.indexOf(currentStep);
            if (currentIndex !== -1) {
                newExpandedSteps[currentIndex] = currentStep + 1;
            } else {
                newExpandedSteps.push(currentStep + 1);
            }
            setExpandedSteps(newExpandedSteps);
            // Use browser history navigation
            navigateToStep(currentStep + 1);
        }
    };

    const handleStepClick = (stepIndex) => {
        const isCurrentlyExpanded = expandedSteps.includes(stepIndex);
        if (isCurrentlyExpanded) {
            setExpandedSteps(expandedSteps.filter(index => index !== stepIndex));
        } else {
            setExpandedSteps([...expandedSteps, stepIndex]);
        }
        // Use browser history navigation
        navigateToStep(stepIndex);
    };

    const renderStepContent = (step) => {
        switch (step.component) {
            case 'sharepoint':
                return (
                    <Box>
                        <SharePointExplorerBlock
                            config={{}}
                            onSelectionChange={handleSelectionChange}
                            multiSelect={true}
                        />
                    </Box>
                );
            case 'pdf-preprocessing':
                return (
                    <Box>
                        {/* Unified Settings Panel */}
                        <UnifiedProcessingSettings
                            usePaginatedProcessor={usePaginatedProcessor}
                            onPaginatedProcessorChange={setUsePaginatedProcessor}
                            onSettingsChange={handleSettingsChange}
                        />
                        
                        {usePaginatedProcessor ? (
                            <PaginatedBatchProcessor
                                selectedFiles={selectedFiles}
                                onProcessingUpdate={handlePdfOcrUpdate}
                                settings={processingSettings}
                            />
                        ) : (
                            <BatchOcrProcessor
                                selectedFiles={selectedFiles}
                                onProcessingUpdate={handlePdfOcrUpdate}
                                settings={processingSettings}
                            />
                        )}
                    </Box>
                );
            default:
                return (
                    <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="body1">
                            {step.description}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            This step will be implemented in future iterations.
                        </Typography>
                    </Box>
                );
        }
    };

    const renderSettingsPanel = () => (
        <Accordion 
            expanded={settingsExpanded} 
            onChange={() => setSettingsExpanded(!settingsExpanded)}
            sx={{ ...blockStyles.accordion, mb: 1 }}
        >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SettingsIcon fontSize="small" />
                    <Typography variant="subtitle2">{translate('block.settings')}</Typography>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Configurar ajustes predeterminados para el explorador de archivos de SharePoint y procesamiento OCR.
                </Typography>
                <SharePointFilterSettings
                    onClose={() => setSettingsExpanded(false)}
                    onReload={() => {
                        // Force reload of SharePoint explorer
                        if (sharePointExecution?.onReload) {
                            sharePointExecution.onReload();
                        }
                    }}
                />
            </AccordionDetails>
        </Accordion>
    );

    // const renderMetricsPanel = () => ( ... ); // Entire function removed

    return (
        <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                {translate('workflow.ocr_processing')}
            </Typography>
            
            {/* Back Navigation Header */}
            {currentStep > 0 && (
                <Paper elevation={1} sx={{ p: 1, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Tooltip title="Back to Previous Step">
                            <IconButton size="small" onClick={goBack}>
                                <ArrowBackIcon />
                            </IconButton>
                        </Tooltip>
                        {workflowSteps.slice(0, currentStep + 1).map((step, index) => (
                            <React.Fragment key={step.id}>
                                {index > 0 && <Typography variant="body2" sx={{ mx: 0.5 }}>/</Typography>}
                                <Chip
                                    label={step.title}
                                    size="small"
                                    variant={index === currentStep ? "filled" : "outlined"}
                                    color={index === currentStep ? "primary" : "default"}
                                    onClick={() => navigateToStep(index)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            </React.Fragment>
                        ))}
                    </Stack>
                    <Tooltip title="Go to Dashboard">
                        <IconButton size="small" onClick={() => window.history.back()}>
                            <HomeIcon />
                        </IconButton>
                    </Tooltip>
                </Paper>
            )}
            
            {/* Progress indicator */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {translate('workflow.step_of', { current: currentStep + 1, total: blocks.length })}
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={(currentStep + 1) / blocks.length * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                />
            </Box>

            {/* Workflow Steps */}
            {blocks.map((step, index) => {
                const isExpanded = expandedSteps.includes(index);
                return (
                    <Card
                        key={step.id}
                        sx={{
                            ...blockStyles.block,
                            mb: 2,
                            opacity: isExpanded ? 1 : 0.7,
                            transform: isExpanded ? 'scale(1)' : 'scale(0.98)',
                            transition: 'all 0.3s ease-in-out',
                        }}
                    >
                        <CardContent sx={{ p: 0 }}>
                            {/* Step Header */}
                            <Box
                                sx={{
                                    p: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                    bgcolor: isExpanded ? 'primary.main' : 'grey.100',
                                    color: isExpanded ? 'primary.contrastText' : 'text.primary',
                                    borderRadius: '12px 12px 0 0',
                                }}
                                onClick={() => handleStepClick(index)}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    {step.icon}
                                    <Box>
                                        <Typography variant="h6" component="div">
                                            {step.title}
                                        </Typography>
                                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                            {step.description}
                                        </Typography>
                                    </Box>
                                </Box>
                                <IconButton
                                    sx={{
                                        color: 'inherit',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease-in-out',
                                    }}
                                >
                                    <ExpandMoreIcon />
                                </IconButton>
                            </Box>

                            {/* Step Content */}
                            <Collapse in={isExpanded} timeout={300}>
                                <Box sx={{ p: 2 }}>
                                    {/* Settings Panel (only for first step) */}
                                    {index === 0 && renderSettingsPanel()}
                                    
                                    {/* Main Content */}
                                    {renderStepContent(step)}
                                    
                                    {/* Next Step Button */}
                                    {index === currentStep && index < blocks.length - 1 && (
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                            <Button
                                                variant="contained"
                                                endIcon={<NavigateNextIcon />}
                                                onClick={handleNextStep}
                                                disabled={index === 0 && selectedFiles.length === 0}
                                                sx={blockStyles.button?.sx || {}}
                                            >
                                                {index === blocks.length - 2 ? translate('button.finish') : translate('button.next_step')}
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            </Collapse>
                        </CardContent>
                    </Card>
                );
            })}
        </Box>
    );
};

export default OcrWorkflow;