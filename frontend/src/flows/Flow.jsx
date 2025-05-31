import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Button, Typography, IconButton, useTheme, Paper, Menu, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import SharePointExplorer from '../__archive__/explorers/SharePointExplorer';
import SlimBlockAccordion from '../components/SlimBlockAccordion';
import DragHandle from '../components/DragHandle';
import { BLOCK_LIBRARY } from '../constants/blockLibrary'; // Import BLOCK_LIBRARY

const initialSharePointBlock = {
    id: 'sharepointExplorer-fixed', // This ID should not be part of the sortable items
    type: 'sharepointExplorer',
    title: BLOCK_LIBRARY.find(b => b.type === 'sharepointExplorer')?.title || 'SharePoint Explorer',
    config: {},
};

// Helper to create a comparable string for activeBlocks (IDs, types, and stringified configs)
const getActiveBlocksComparable = (blocks) => {
    if (!blocks) return 'null';
    try {
        return JSON.stringify(blocks.map(b => ({ id: b.id, type: b.type, config: b.config })));
    } catch (e) {
        // Fallback if config is not stringifiable, though it should be
        console.error("Error stringifying activeBlocks config:", e);
        return JSON.stringify(blocks.map(b => ({ id: b.id, type: b.type })));
    }
};

// Helper for explorerOutput (IDs)
const getExplorerOutputComparable = (items) => {
    if (!items) return 'null';
    // Ensure IDs are consistently handled, map to string if necessary before sort
    return JSON.stringify(items.map(item => String(item.id)).sort());
};

const Flow = ({
    initialActiveBlocks,
    initialExplorerOutput,
    initialExpandedBlocks,
    initialCurrentStep,
    onConfigurationChange
}) => {
    const theme = useTheme();
    const [explorerOutput, setExplorerOutput] = useState(initialExplorerOutput || []);
    const [activeBlocks, setActiveBlocks] = useState(() => {
        if (initialActiveBlocks && initialActiveBlocks.length > 0) {
            return initialActiveBlocks;
        }
        return [initialSharePointBlock]; // Default if nothing is passed
    });
    const [expandedBlocks, setExpandedBlocks] = useState(() => {
        if (initialExpandedBlocks && initialExpandedBlocks.length > 0) {
            return initialExpandedBlocks;
        }
        return [true]; // Default: SharePoint explorer expanded
    });
    const [currentProcessingStep, setCurrentProcessingStep] = useState(initialCurrentStep ?? 0);
    const [addBlockMenuAnchorEl, setAddBlockMenuAnchorEl] = useState(null);

    const prevInitialActiveBlocksComparableRef = useRef();
    const prevInitialExplorerOutputComparableRef = useRef();
    const prevInitialExpandedBlocksComparableRef = useRef();
    const prevInitialCurrentStepRef = useRef();

    // Refs for comparing current state before calling onConfigurationChange
    const prevConfigChangeExplorerOutputComparableRef = useRef();
    const prevConfigChangeActiveBlocksComparableRef = useRef();
    const prevConfigChangeExpandedBlocksComparableRef = useRef();
    const prevConfigChangeCurrentStepRef = useRef();

    // Initialize refs on first render with the actual initial values
    useEffect(() => {
        prevInitialActiveBlocksComparableRef.current = getActiveBlocksComparable(initialActiveBlocks || [initialSharePointBlock]);
        prevInitialExplorerOutputComparableRef.current = getExplorerOutputComparable(initialExplorerOutput || []);
        prevInitialExpandedBlocksComparableRef.current = JSON.stringify(initialExpandedBlocks || [true]);
        prevInitialCurrentStepRef.current = initialCurrentStep ?? 0;
    }, []); // Empty dependency array: run only once on mount

    useEffect(() => {
        // This effect responds to changes in the initial props from the parent.
        // It compares new prop values against previously stored comparable versions
        // to avoid unnecessary state updates if only references changed but content is the same.

        const newActiveBlocksComparable = getActiveBlocksComparable(initialActiveBlocks);
        if (initialActiveBlocks && prevInitialActiveBlocksComparableRef.current !== newActiveBlocksComparable) {
            setActiveBlocks(initialActiveBlocks);
            prevInitialActiveBlocksComparableRef.current = newActiveBlocksComparable;
        } else if (!initialActiveBlocks && prevInitialActiveBlocksComparableRef.current !== getActiveBlocksComparable([initialSharePointBlock])) {
            // Handle case where initialActiveBlocks becomes null/undefined
            setActiveBlocks([initialSharePointBlock]);
            prevInitialActiveBlocksComparableRef.current = getActiveBlocksComparable([initialSharePointBlock]);
        }

        const newExplorerOutputComparable = getExplorerOutputComparable(initialExplorerOutput);
        if (initialExplorerOutput && prevInitialExplorerOutputComparableRef.current !== newExplorerOutputComparable) {
            setExplorerOutput(initialExplorerOutput);
            prevInitialExplorerOutputComparableRef.current = newExplorerOutputComparable;
        } else if (!initialExplorerOutput && prevInitialExplorerOutputComparableRef.current !== getExplorerOutputComparable([])) {
             // Handle case where initialExplorerOutput becomes null/undefined
            setExplorerOutput([]);
            prevInitialExplorerOutputComparableRef.current = getExplorerOutputComparable([]);
        }

        const newExpandedBlocksComparable = JSON.stringify(initialExpandedBlocks);
        if (initialExpandedBlocks && prevInitialExpandedBlocksComparableRef.current !== newExpandedBlocksComparable) {
            setExpandedBlocks(initialExpandedBlocks);
            prevInitialExpandedBlocksComparableRef.current = newExpandedBlocksComparable;
        } else if (!initialExpandedBlocks && prevInitialExpandedBlocksComparableRef.current !== JSON.stringify([true])) {
            // Handle case where initialExpandedBlocks becomes null/undefined
            setExpandedBlocks([true]);
            prevInitialExpandedBlocksComparableRef.current = JSON.stringify([true]);
        }

        if (initialCurrentStep !== undefined && prevInitialCurrentStepRef.current !== initialCurrentStep) {
            setCurrentProcessingStep(initialCurrentStep);
            prevInitialCurrentStepRef.current = initialCurrentStep;
        } else if (initialCurrentStep === undefined && prevInitialCurrentStepRef.current !== 0) {
            // Handle case where initialCurrentStep becomes undefined
            setCurrentProcessingStep(0);
            prevInitialCurrentStepRef.current = 0;
        }
    }, [initialActiveBlocks, initialExplorerOutput, initialExpandedBlocks, initialCurrentStep]);
    // Dependencies remain the initial props to trigger the effect when they change.
    // The logic inside then determines if a state update is truly needed.

    useEffect(() => {
        if (onConfigurationChange) {
            const currentExplorerOutputComparable = getExplorerOutputComparable(explorerOutput);
            const currentActiveBlocksComparable = getActiveBlocksComparable(activeBlocks);
            const currentExpandedBlocksComparable = JSON.stringify(expandedBlocks);
            const currentStepComparable = currentProcessingStep; // Simple value, direct comparison

            const hasExplorerOutputChanged = prevConfigChangeExplorerOutputComparableRef.current !== currentExplorerOutputComparable;
            const hasActiveBlocksChanged = prevConfigChangeActiveBlocksComparableRef.current !== currentActiveBlocksComparable;
            const hasExpandedBlocksChanged = prevConfigChangeExpandedBlocksComparableRef.current !== currentExpandedBlocksComparable;
            const hasCurrentStepChanged = prevConfigChangeCurrentStepRef.current !== currentStepComparable;

            if (hasExplorerOutputChanged || hasActiveBlocksChanged || hasExpandedBlocksChanged || hasCurrentStepChanged) {
                const processingBlocksToPersist = activeBlocks.slice(1).map(block => {
                    const { outputData, ...rest } = block;
                    return rest;
                });
                const outputsToPersist = activeBlocks.slice(1).reduce((acc, block) => {
                    if (block.outputData !== null && block.outputData !== undefined) {
                        acc[block.id] = block.outputData;
                    }
                    return acc;
                }, {});

                onConfigurationChange({
                    explorerOutput,
                    processingBlocks: processingBlocksToPersist,
                    blockOutputs: outputsToPersist,
                    expandedState: expandedBlocks,
                    currentStep: currentProcessingStep,
                });

                // Update refs with the latest sent values
                prevConfigChangeExplorerOutputComparableRef.current = currentExplorerOutputComparable;
                prevConfigChangeActiveBlocksComparableRef.current = currentActiveBlocksComparable;
                prevConfigChangeExpandedBlocksComparableRef.current = currentExpandedBlocksComparable;
                prevConfigChangeCurrentStepRef.current = currentStepComparable;
            }
        }
    }, [explorerOutput, activeBlocks, expandedBlocks, currentProcessingStep, onConfigurationChange]);
    // onConfigurationChange is memoized in Space.jsx, so it's stable.
    
    const handleExplorerOutputChange = useCallback((selectedItems) => { // Renamed from handleExplorerSelectionComplete
        console.log('Explorer output changed:', selectedItems);
        setExplorerOutput(selectedItems); // Renamed from setExplorerSelection
        if (activeBlocks.length > 1) { // If there are processing blocks
            setCurrentProcessingStep(1);
            setExpandedBlocks(prev => [false, true, ...prev.slice(2).map(() => false)]);
        }
    }, [activeBlocks]); // setExplorerOutput, setCurrentProcessingStep, setExpandedBlocks are stable setters

    const handleBlockOutputChange = useCallback((blockId, output) => {
        setActiveBlocks(prevBlocks =>
            prevBlocks.map(block =>
                block.id === blockId ? { ...block, outputData: output } : block
            )
        );
    }, []); // setActiveBlocks is stable
 
    const handleOpenAddBlockMenu = (event) => {
        setAddBlockMenuAnchorEl(event.currentTarget);
    };

    const handleCloseAddBlockMenu = () => {
        setAddBlockMenuAnchorEl(null);
    };

    const handleAddProcessingBlock = (blockType) => {
        const blockDefinition = BLOCK_LIBRARY.find(b => b.type === blockType);
        if (!blockDefinition || blockType === 'sharepointExplorer') return; // Don't add another SharePoint Explorer

        const newBlock = {
            id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            type: blockDefinition.type,
            title: blockDefinition.title,
            config: {},
            outputData: null, // Initialize outputData for new blocks
        };
        setActiveBlocks(prev => [...prev, newBlock]);
        
        // Expand the newly added block and set it as current
        setExpandedBlocks(prev => [...prev.map(() => false), true]); // Collapse others, expand new
        setCurrentProcessingStep(activeBlocks.length); // New block is at the end of current activeBlocks
        handleCloseAddBlockMenu();
    };

    const handleDeleteProcessingBlock = (blockIdToDelete) => {
        // Prevent deleting the SharePoint Explorer block
        if (blockIdToDelete === initialSharePointBlock.id) return;

        const blockIndex = activeBlocks.findIndex(b => b.id === blockIdToDelete);
        if (blockIndex === -1 || blockIndex === 0) return; // Should not happen for index 0 due to above check

        setActiveBlocks(prev => prev.filter(block => block.id !== blockIdToDelete));
        // setBlockOutputs is removed, onConfigurationChange effect will handle persisting correct outputs
        setExpandedBlocks(prev => {
            const newExpanded = [...prev];
            newExpanded.splice(blockIndex, 1);
            return newExpanded;
        });
        
        if (currentProcessingStep >= blockIndex) {
            setCurrentProcessingStep(prev => Math.max(0, prev - 1));
        }
    };

    const handleProcessingBlockConfigChange = (blockId, newConfig) => {
        setActiveBlocks(prevBlocks =>
            prevBlocks.map(block => block.id === blockId ? { ...block, config: newConfig } : block)
        );
    };

    const handleProcessingBlockComplete = (blockId, result) => {
        if (result.success && result.data !== undefined) {
            // Store the successful output data for this block
            handleBlockOutputChange(blockId, result.data);

            const currentIndex = activeBlocks.findIndex(b => b.id === blockId);
            if (currentIndex !== -1 && currentIndex < activeBlocks.length - 1) {
                // Optionally auto-advance (currently commented out):
                // setCurrentProcessingStep(currentIndex + 1);
                // setExpandedBlocks(prev => prev.map((exp, i) => i === (currentIndex + 1) ? true : false));
            }
        }
        // If !result.success, error is handled within the block, and no output is propagated by default.
        // If result.data is explicitly null or undefined for a successful operation, it's also handled.
    };
    
    const sensors = useSensors(useSensor(PointerSensor, {
        activationConstraint: { distance: 8 },
    }));

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            // Ensure SharePoint explorer is not part of drag-and-drop reordering of items
            if (active.id === initialSharePointBlock.id || over.id === initialSharePointBlock.id) {
                return;
            }

            const oldIndexInDraggable = activeBlocks.slice(1).findIndex(b => b.id === active.id);
            const newIndexInDraggable = activeBlocks.slice(1).findIndex(b => b.id === over.id);

            if (oldIndexInDraggable !== -1 && newIndexInDraggable !== -1) {
                const reorderedProcessingBlocks = arrayMove(activeBlocks.slice(1), oldIndexInDraggable, newIndexInDraggable);
                setActiveBlocks([initialSharePointBlock, ...reorderedProcessingBlocks]);

                const reorderedExpandedStates = arrayMove(expandedBlocks.slice(1), oldIndexInDraggable, newIndexInDraggable);
                setExpandedBlocks([expandedBlocks[0], ...reorderedExpandedStates]);
            }
        }
    };

    const handleToggleBlock = (index) => {
        // const multiSelect = false; // Or from a prop/config
        setExpandedBlocks(prev => prev.map((exp, i) => i === index ? !exp : false )); // Only one expanded at a time
        setCurrentProcessingStep(index);
    };
    
    // draggableBlockIndex is the index in draggableBlocks (activeBlocks.slice(1))
    const renderProcessingBlockContent = (block, draggableBlockIndex) => {
        let inputItemsToPass = explorerOutput; // Default input

        // Determine input for the current block
        // actualCurrentBlockIndexInActiveBlocks is draggableBlockIndex + 1
        // The previous block in activeBlocks is activeBlocks[draggableBlockIndex]
        const previousBlockInFullList = activeBlocks[draggableBlockIndex];

        if (previousBlockInFullList) {
            if (previousBlockInFullList.type === 'sharepointExplorer') {
                // First processing block, input is always explorerOutput
                inputItemsToPass = explorerOutput;
            } else if (previousBlockInFullList.outputData && previousBlockInFullList.outputData.length > 0) {
                // Previous block is another processing block with output
                inputItemsToPass = previousBlockInFullList.outputData;
            }
            // If previous block is a processing block with no/empty output, inputItemsToPass remains explorerOutput (default)
        }

        switch (block.type) {
            case 'pdfConverter':
                return <PDFConverterBlock
                            blockId={block.id}
                            config={block.config}
                            inputData={inputItemsToPass}
                            onConfigChange={(newConfig) => handleProcessingBlockConfigChange(block.id, newConfig)}
                            onProcessComplete={(result) => handleProcessingBlockComplete(block.id, result)}
                        />;
            case 'ocr':
                return <OCRBlock
                            blockId={block.id}
                            config={block.config}
                            inputData={inputItemsToPass} // Changed from inputItems
                            onConfigChange={(newConfig) => handleProcessingBlockConfigChange(block.id, newConfig)}
                            onProcessComplete={(result) => handleProcessingBlockComplete(block.id, result)}
                            // onOutputChange is no longer used by the new OCRBlock, onProcessComplete handles it
                        />;
            // Add cases for other block types from BLOCK_LIBRARY
            // case 'qualityCheck':
            // case 'saveResults':
            // case 'nextFile':
            //     return <Typography>Placeholder for {block.title}</Typography>;
            default:
                return <Typography>Configuration for {block.title || block.type} (ID: {block.id})</Typography>;
        }
    };

    // Filtered list for DndContext - excluding SharePointExplorer
    const draggableBlocks = activeBlocks.slice(1);

    return (
        <Box sx={{ p: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 1, backgroundColor: theme.palette.background.paper }}>
            {/* Render SharePoint Explorer (Fixed First Block) */}
            {activeBlocks.length > 0 && activeBlocks[0].type === 'sharepointExplorer' && (
                <SlimBlockAccordion
                    title={`1. ${activeBlocks[0].title}`}
                    expanded={expandedBlocks[0]}
                    onToggle={() => handleToggleBlock(0)}
                    status={currentProcessingStep === 0 ? 'current' : (explorerOutput.length > 0 ? 'done' : 'future')} // Renamed from explorerSelection
                    collapsible={true} // SharePoint explorer can be collapsed
                    // No dragHandle, no onDelete for the first block
                >
                    <SharePointExplorer
                        onSelectionChange={handleExplorerOutputChange} // Changed from onSelectionComplete, passing renamed handler
                        multiSelect={true} // Or from config
                    />
                </SlimBlockAccordion>
            )}

            {/* Render Draggable Processing Blocks */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={draggableBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {draggableBlocks.map((block, index) => {
                        // SlimBlockAccordion is now the sortable item itself.
                        // We pass its id to useSortable within SlimBlockAccordion.
                        return (
                            <SlimBlockAccordion
                                key={block.id}
                                id={block.id} // Pass id for useSortable
                                title={`${index + 2}. ${block.title || block.type}`} // Numbering starts from 2
                                expanded={expandedBlocks[index + 1] === undefined ? false : expandedBlocks[index + 1]}
                                onToggle={() => handleToggleBlock(index + 1)}
                                dragHandle={<DragHandle />} // DragHandle will receive attributes and listeners from SlimBlockAccordion
                                onDelete={() => handleDeleteProcessingBlock(block.id)}
                                status={
                                    currentProcessingStep === (index + 1) ? 'current' :
                                    (block.outputData !== null ? 'done' : 'future') // Check block.outputData
                                }
                                collapsible={true}
                            >
                                {renderProcessingBlockContent(block, index)} {/* Pass processingBlockIndex */}
                            </SlimBlockAccordion>
                        );
                    })}
                </SortableContext>
            </DndContext>

            <Paper elevation={0} sx={{p:1, mt:1, display: 'flex', justifyContent:'center'}}>
                <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleOpenAddBlockMenu}
                    // disabled={explorerSelection.length === 0} // Enable adding blocks even before selection
                >
                    Add Processing Step
                </Button>
                <Menu
                    anchorEl={addBlockMenuAnchorEl}
                    open={Boolean(addBlockMenuAnchorEl)}
                    onClose={handleCloseAddBlockMenu}
                >
                    {BLOCK_LIBRARY.filter(libItem => libItem.type !== 'sharepointExplorer').map((libItem) => (
                        <MenuItem key={libItem.type} onClick={() => handleAddProcessingBlock(libItem.type)}>
                            {libItem.title}
                        </MenuItem>
                    ))}
                    {BLOCK_LIBRARY.filter(libItem => libItem.type !== 'sharepointExplorer').length === 0 &&
                        <MenuItem disabled>No addable blocks in library</MenuItem>
                    }
                </Menu>
            </Paper>
        </Box>
    );
};

export default Flow;