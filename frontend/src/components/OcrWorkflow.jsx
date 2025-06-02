import React, { useState, useCallback, useEffect } from 'react';
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
    LinearProgress
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Settings as SettingsIcon,
    FolderOpen as FolderOpenIcon,
    PictureAsPdf as PictureAsPdfIcon,
    NavigateNext as NavigateNextIcon
} from '@mui/icons-material';

import SharePointExplorerBlock from './blocks/SharePointExplorer/SharePointExplorerBlock';
import OCRBlock from './blocks/OCRBlock'; // Unified OCR Block import
import { blockTemplate } from '../theme/blockTemplate';

const OcrWorkflow = () => {
    const theme = useTheme();
    const blockStyles = blockTemplate(theme);
    
    // State for workflow steps
    const [currentStep, setCurrentStep] = useState(0);
    const [expandedSteps, setExpandedSteps] = useState([0]); // Start with first step expanded
    
    // State for SharePoint selection
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [settingsExpanded, setSettingsExpanded] = useState(false);
    
    // State for block executions
    const [sharePointExecution, setSharePointExecution] = useState(null);
    const [pdfOcrExecution, setPdfOcrExecution] = useState(null);

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
    
    // Simplified workflow with only essential blocks
    const workflowSteps = [
        {
            id: 'sharepoint-selection',
            title: 'SharePoint File Selection',
            icon: <FolderOpenIcon />,
            description: 'Select PDF files or directories from SharePoint',
            component: 'sharepoint'
        },
        {
            id: 'pdf-preprocessing',
            title: 'PDF Preprocessing & OCR',
            icon: <PictureAsPdfIcon />,
            description: 'Convert, preprocess, and extract text from PDF files with quality assessment',
            component: 'pdf-preprocessing'
        }
    ];

    // Use workflowSteps as blocks
    const blocks = workflowSteps;

    const handleSelectionChange = useCallback((selectedItems) => {
        console.log('SharePoint selection changed:', selectedItems);
        setSelectedFiles(selectedItems);
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
            setCurrentStep(currentStep + 1);
        }
    };

    const handleStepClick = (stepIndex) => {
        const isCurrentlyExpanded = expandedSteps.includes(stepIndex);
        if (isCurrentlyExpanded) {
            setExpandedSteps(expandedSteps.filter(index => index !== stepIndex));
        } else {
            setExpandedSteps([...expandedSteps, stepIndex]);
        }
        setCurrentStep(stepIndex);
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
            case 'pdf-preprocessing':
                return (
                    <Box>
                        <OCRBlock
                            config={{}} // Add any specific config if needed
                            onExecutionUpdate={handlePdfOcrUpdate}
                            selectedFiles={selectedFiles}
                        />
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
                                                {index === blocks.length - 2 ? 'Finish' : 'Next Step'}
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