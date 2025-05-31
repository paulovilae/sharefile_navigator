import React, { useState, useCallback, useEffect } from 'react';
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
    LinearProgress
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Settings as SettingsIcon,
    Assessment as AssessmentIcon,
    FolderOpen as FolderOpenIcon,
    PictureAsPdf as PictureAsPdfIcon,
    TextFields as TextFieldsIcon,
    CheckCircle as CheckCircleIcon,
    Save as SaveIcon,
    NavigateNext as NavigateNextIcon
} from '@mui/icons-material';

import SharePointExplorer from '../__archive__/explorers/SharePointExplorer'; // Updated import
// import SharePointExplorerBlock from '../__archive__/SharePointExplorerBlock'; // Old import
import OcrProcessingBlock from './blocks/OcrProcessingBlock'; // New import
import { blockTemplate } from '../theme/blockTemplate';

const OcrWorkflow = () => {
    const theme = useTheme();
    const blockStyles = blockTemplate(theme);
    
    // State for workflow steps
    const [currentStep, setCurrentStep] = useState(0);
    const [expandedSteps, setExpandedSteps] = useState([]);
    
    // State for SharePoint selection
    const [selectedFiles, setSelectedFiles] = useState([]);

    useEffect(() => {
        const fetchBlockTemplates = async () => {
            try {
                const response = await axios.get('/api/block_templates');
                setBlockTemplates(response.data);
                setExpandedSteps(Array(response.data.length).fill(false));
            } catch (error) {
                console.error("Error fetching block templates:", error);
            }
        };

        fetchBlockTemplates();
    }, []);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    // const [metricsExpanded, setMetricsExpanded] = useState(false); // Already commented out, ensuring it stays this way or is removed
    
    // State for block executions
    const [sharePointExecution, setSharePointExecution] = useState(null);
    const [ocrExecution, setOcrExecution] = useState(null);

    // Handle SharePoint block execution updates
    const handleSharePointUpdate = useCallback((update) => {
        console.log('Workflow: SharePoint block update:', update);
        setSharePointExecution(prev => ({ ...prev, ...update }));
    }, []);

    // Handle OCR block execution updates
    const handleOcrUpdate = useCallback((update) => {
        console.log('Workflow: OCR block update:', update);
        setOcrExecution(prev => ({ ...prev, ...update }));
    }, []);
    
    // Workflow step definitions
    const workflowSteps = [
        {
            id: 'sharepoint-selection',
            title: 'SharePoint File Selection',
            icon: <FolderOpenIcon />,
            description: 'Select PDF files or directories from SharePoint',
            component: 'sharepoint'
        }
    ];

    const [selectedBlock, setSelectedBlock] = useState(null);
    const [blockTemplates, setBlockTemplates] = useState([]);

    useEffect(() => {
        const fetchBlockTemplates = async () => {
            try {
                const response = await axios.get('/api/block_templates');
                setBlockTemplates(response.data);
            } catch (error) {
                console.error("Error fetching block templates:", error);
            }
        };

        fetchBlockTemplates();
    }, []);

    const [blocks, setBlocks] = useState([]);

    useEffect(() => {
        setBlocks(blockTemplates);
    }, [blockTemplates]);

    const handleSelectionChange = useCallback((selectedItems) => {
        console.log('SharePoint selection changed:', selectedItems);
        setSelectedFiles(selectedItems);
    }, []);

    const handleNextStep = () => {
        if (currentStep < blocks.length - 1) {
            // Collapse current step and expand next step
            const newExpandedSteps = Array(blocks.length).fill(false);
            newExpandedSteps[currentStep] = false;
            newExpandedSteps[currentStep + 1] = true;
            setExpandedSteps(newExpandedSteps);
            setCurrentStep(currentStep + 1);
        }
    };

    const handleStepClick = (stepIndex) => {
        const newExpandedSteps = Array(blocks.length).fill(false);
        newExpandedSteps[stepIndex] = !newExpandedSteps[stepIndex];
        setExpandedSteps(newExpandedSteps);
        setCurrentStep(stepIndex);
    };

    const renderStepContent = (step) => {
        switch (step.component) {
            case 'sharepoint':
                return (
                    <Box>
                        <SharePointExplorer
                            onSelectionChange={handleSelectionChange}
                            multiSelect={true}
                        />
                        {/* Selection Summary */}
                        {selectedFiles.length > 0 && (
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                    Selected Items ({selectedFiles.length}):
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {selectedFiles.map((file, index) => (
                                        <Chip
                                            key={index}
                                            label={`${file.name} (${file.itemType})`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </Box>
                );
            case 'pdf-conversion':
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {/* <PictureAsPdfIcon />
                            PDF Conversion Settings */}
                        </Typography>
                        
                        <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                Preprocessing settings and metrics will go here.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                This section will include:
                            </Typography>
                            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    PDF quality settings
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Page range selection
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Image preprocessing options
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Conversion progress metrics
                                </Typography>
                            </Box>
                        </Box>

                        {/* Placeholder for conversion metrics */}
                        <Box sx={{ p: 2, border: '1px dashed', borderColor: 'grey.300', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Conversion Metrics (Placeholder)
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Files to Process: {selectedFiles.length}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Estimated Time: --
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Quality Setting: High
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Output Format: Optimized PDF
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                );
            case 'ocr':
                return (
                    <Box>
                        <OcrProcessingBlock
                            config={{}} // Add any specific config if needed
                            onExecutionUpdate={handleOcrUpdate}
                            // Pass selectedFiles as input if OcrProcessingBlock expects it
                            // inputFiles={selectedFiles}
                        />
                    </Box>
                );
            case 'quality':
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <AssessmentIcon />
                            Quality Test Settings
                        </Typography>
                        
                        <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                Quality test settings and metrics will go here.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                This section will include:
                            </Typography>
                            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    OCR accuracy validation thresholds
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Text confidence score analysis
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Character recognition error detection
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Quality metrics and reporting
                                </Typography>
                            </Box>
                        </Box>

                        {/* Placeholder for quality test metrics */}
                        <Box sx={{ p: 2, border: '1px dashed', borderColor: 'grey.300', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Quality Test Metrics (Placeholder)
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Accuracy Threshold: 90%
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Confidence Score: 85%
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Error Rate: &lt; 5%
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Test Status: Pending
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                );
            case 'save':
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SaveIcon />
                            Save Results Settings
                        </Typography>
                        
                        <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                Save results settings and metrics will go here.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                This section will include:
                            </Typography>
                            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Database storage configuration
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    File export format options
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Metadata and indexing settings
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Save operation progress and status
                                </Typography>
                            </Box>
                        </Box>

                        {/* Placeholder for save results metrics */}
                        <Box sx={{ p: 2, border: '1px dashed', borderColor: 'grey.300', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Save Results Metrics (Placeholder)
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Storage Location: Database
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Export Format: JSON + Text
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Indexing: Full-text search
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Save Status: Ready
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                );
            case 'next':
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NavigateNextIcon />
                            Next PDF Processing
                        </Typography>
                        
                        <Box sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                Options for processing the next PDF will go here.
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                This section will include:
                            </Typography>
                            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Queue management for remaining PDFs
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Batch processing options
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Processing priority settings
                                </Typography>
                                <Typography component="li" variant="body2" color="text.secondary">
                                    Workflow completion summary
                                </Typography>
                            </Box>
                        </Box>

                        {/* Placeholder for next PDF options */}
                        <Box sx={{ p: 2, border: '1px dashed', borderColor: 'grey.300', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Next PDF Options (Placeholder)
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Remaining Files: 0
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Processing Mode: Sequential
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Auto-continue: Disabled
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Workflow Status: Complete
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
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
                    <Typography variant="subtitle2">Settings</Typography>
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="body2" color="text.secondary">
                    OCR processing settings will be configured here.
                </Typography>
                {/* TODO: Add actual settings controls */}
            </AccordionDetails>
        </Accordion>
    );

    // const renderMetricsPanel = () => ( ... ); // Entire function removed

    return (
        <Box sx={{ p: 2, maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                OCR Processing Workflow
            </Typography>
            
            {/* Progress indicator */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Step {currentStep + 1} of {blocks.length}
                </Typography>
                <LinearProgress
                    variant="determinate"
                    value={(currentStep + 1) / blocks.length * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                />
            </Box>

            {/* Workflow Steps */}
            {blocks.map((step, index) => (
                <Card
                    key={step.id}
                    sx={{
                        ...blockStyles.block,
                        mb: 2,
                        opacity: expandedSteps[index] ? 1 : 0.7,
                        transform: expandedSteps[index] ? 'scale(1)' : 'scale(0.98)',
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
                                bgcolor: expandedSteps[index] ? 'primary.main' : 'grey.100',
                                color: expandedSteps[index] ? 'primary.contrastText' : 'text.primary',
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
                                    transform: expandedSteps[index] ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s ease-in-out',
                                }}
                            >
                                <ExpandMoreIcon />
                            </IconButton>
                        </Box>

                        {/* Step Content */}
                        <Collapse in={expandedSteps[index]} timeout={300}>
                            <Box sx={{ p: 2 }}>
                                {/* Settings Panel (only for first step) */}
                                {index === 0 && renderSettingsPanel()}
                                
                                {/* Main Content */}
                                {renderStepContent(step)}
                                
                                {/* Metrics Panel (only for first step) - REMOVED */}
                                {/* {index === 0 && renderMetricsPanel()} */}
                                
                                {/* Next Step Button */}
                                {index === currentStep && index < workflowSteps.length - 1 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                        <Button
                                            variant="contained"
                                            endIcon={<NavigateNextIcon />}
                                            onClick={handleNextStep}
                                            disabled={index === 0 && selectedFiles.length === 0}
                                            sx={blockStyles.button.sx}
                                        >
                                            {index === workflowSteps.length - 2 ? 'Finish' : 'Next Step'}
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        </Collapse>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );
};

export default OcrWorkflow;