import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Typography, Paper, Grid, IconButton } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

import Flow from './flows/Flow';
import { BLOCK_LIBRARY } from './constants/blockLibrary'; // Assuming this path is correct

// Define the initial SharePoint block structure, similar to Flow.jsx
const initialSharePointBlock = {
    id: 'sharepointExplorer-fixed', // Fixed ID to ensure it's treated as non-draggable/non-deletable in Flow.jsx
    type: 'sharepointExplorer',
    title: BLOCK_LIBRARY.find(b => b.type === 'sharepointExplorer')?.title || 'SharePoint Explorer',
    config: {},
};
const Space = ({ spaceId = null }) => {
    const [spaceName, setSpaceName] = useState('My Space');
    const [spaceDescription, setSpaceDescription] = useState('A collection of flows and resources.');
    const [flowInstances, setFlowInstances] = useState([]); // Array of flow configurations

    // Effect for loading initial space data if spaceId is provided
    useEffect(() => {
        if (spaceId) {
            // TODO: Implement loading logic for a specific space
            console.log(`Loading space with ID: ${spaceId}`);
            // Example:
            // const loadedSpaceData = await fetchSpaceData(spaceId);
            // setSpaceName(loadedSpaceData.name);
            // setSpaceDescription(loadedSpaceData.description);
            // setFlowInstances(loadedSpaceData.flows);
        } else {
            // For a new space, start with one default flow instance or an empty array
            // For now, let's start with one for demonstration
            if (flowInstances.length === 0) {
                 addNewFlow();
            }
        }
    }, [spaceId]);

    const addNewFlow = () => {
        const newFlowConfig = {
            id: `flow-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            name: `New Flow ${flowInstances.length + 1}`,
            activeBlocks: [initialSharePointBlock], // Start with SharePoint Explorer
            explorerOutput: [],
            expandedBlocks: [true], // SharePoint Explorer expanded by default
            currentStep: 0,
        };
        setFlowInstances(prevFlows => [...prevFlows, newFlowConfig]);
    };

    const handleFlowConfigurationChange = useCallback((flowId, newConfig) => {
        setFlowInstances(prevFlows =>
            prevFlows.map(flow => {
                if (flow.id === flowId) {
                    // The first block in flow.activeBlocks is assumed to be the SharePoint explorer
                    const currentSharePointBlock = flow.activeBlocks && flow.activeBlocks.length > 0
                                                 ? flow.activeBlocks[0]
                                                 : initialSharePointBlock; // Fallback if somehow missing

                    const updatedProcessingBlocks = newConfig.processingBlocks.map(pb => ({
                        ...pb,
                        outputData: newConfig.blockOutputs[pb.id] || null,
                    }));
                    const updatedActiveBlocks = [currentSharePointBlock, ...updatedProcessingBlocks];

                    return {
                        ...flow,
                        activeBlocks: updatedActiveBlocks,
                        explorerOutput: newConfig.explorerOutput,
                        expandedBlocks: newConfig.expandedState,
                        currentStep: newConfig.currentStep,
                    };
                }
                return flow;
            })
        );
        // TODO: Mark space as dirty/unsaved, e.g., setSpaceIsDirty(true);
    }, []);

    const handleSaveSpace = () => {
        // TODO: Implement logic to save the entire space configuration
        // This would include spaceName, spaceDescription, and all flowInstances configs
        const spaceDataToSave = {
            name: spaceName,
            description: spaceDescription,
            flows: flowInstances,
        };
        console.log('Saving space data:', spaceDataToSave);
        // Example: await saveSpaceDataAPI(spaceId, spaceDataToSave);
        alert('Space saved (simulated)!');
    };
    
    const handleLoadSpace = () => {
        // TODO: Implement logic to load a space configuration
        // This might involve a dialog to select a space or a predefined one
        console.log('Load space functionality to be implemented.');
        alert('Load space (simulated)!');
    };

    const handleSaveFlow = () => {
        // TODO: Implement logic to save the active flow configuration
        // This would likely involve selecting which flow if multiple exist, or saving the single one.
        console.log('Saving active flow data (placeholder):', flowInstances.length > 0 ? flowInstances[0] : 'No active flow');
        alert('Flow saved (simulated)!');
    };

    const handleLoadFlow = () => {
        // TODO: Implement logic to load a flow configuration
        console.log('Load flow functionality to be implemented (placeholder).');
        alert('Load flow (simulated)!');
    };

    const removeFlowInstance = (flowIdToRemove) => {
        setFlowInstances(prevFlows => prevFlows.filter(flow => flow.id !== flowIdToRemove));
    };


    return (
        <Box sx={{ flexGrow: 1, p: 2, backgroundColor: 'grey.100', minHeight: '100vh' }}>
            <Paper elevation={2} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" component="h1" gutterBottom>
                        {spaceName} 
                        {/* TODO: Add inline edit for spaceName */}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        {spaceDescription}
                        {/* TODO: Add inline edit for spaceDescription */}
                    </Typography>
                </Box>
                <Box>
                    <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={handleLoadSpace} sx={{mr:1}}>
                        Load Space
                    </Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveSpace}>
                        Save Space
                    </Button>
                    {/* Placeholder buttons for Save/Load Flow */}
                    <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={handleLoadFlow} sx={{ ml: 1, mr: 1 }}>
                        Load Flow
                    </Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveFlow}>
                        Save Flow
                    </Button>
                </Box>
            </Paper>

            <Grid container spacing={2}>
                {flowInstances.map((flowConfig, index) => (
                    <Grid item xs={12} md={6} lg={4} key={flowConfig.id}> {/* Adjust grid sizing as needed */}
                        <Paper elevation={3} sx={{ p: 1.5, position: 'relative' }}>
                             <IconButton
                                size="small"
                                onClick={() => removeFlowInstance(flowConfig.id)}
                                sx={{position: 'absolute', top: 8, right: 8, zIndex:10}}
                                title="Remove Flow"
                            >
                                <Typography variant="caption" sx={{mr:0.5, color: 'error.main'}}>X</Typography> {/* Simple X for now */}
                            </IconButton>
                            <Flow
                                initialActiveBlocks={flowConfig.activeBlocks}
                                initialExplorerOutput={flowConfig.explorerOutput}
                                initialExpandedBlocks={flowConfig.expandedBlocks}
                                initialCurrentStep={flowConfig.currentStep}
                                onConfigurationChange={(newConfig) => handleFlowConfigurationChange(flowConfig.id, newConfig)}
                            />
                        </Paper>
                    </Grid>
                ))}
                 <Grid item xs={12} md={6} lg={4} >
                     <Button 
                        variant="outlined" 
                        onClick={addNewFlow} 
                        sx={{ 
                            width: '100%', 
                            minHeight: 200, // Make it visually distinct as an add button
                            borderStyle: 'dashed',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <AddCircleOutlineIcon sx={{ fontSize: 40, mb:1 }} />
                        Add New Flow
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Space;