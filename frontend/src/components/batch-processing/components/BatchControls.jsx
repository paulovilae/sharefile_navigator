/**
 * Reusable batch control buttons component
 */
import React from 'react';
import { Box, Button, IconButton, Tooltip } from '@mui/material';
import {
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    Stop as StopIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { canPauseBatch, canResumeBatch, canStopBatch } from '../utils/batchUtils';

const BatchControls = ({
    // State
    isProcessing,
    batchStatus,
    batchId,
    disabled = false,
    
    // Actions
    onStart,
    onPause,
    onResume,
    onStop,
    onRefresh,
    
    // UI customization
    variant = 'outlined',
    size = 'medium',
    showRefresh = true,
    showLabels = true,
    orientation = 'horizontal', // 'horizontal' or 'vertical'
    spacing = 2
}) => {
    const isPaused = batchStatus?.is_paused || batchStatus?.status === 'paused';
    const status = batchStatus?.status;

    const buttonProps = {
        variant,
        size,
        disabled: disabled || !batchId
    };

    const controls = [
        // Start button
        onStart && !isProcessing && (
            <Button
                key="start"
                {...buttonProps}
                onClick={onStart}
                startIcon={<PlayIcon />}
                color="primary"
                disabled={disabled}
            >
                {showLabels ? 'Start Processing' : ''}
            </Button>
        ),

        // Pause button
        onPause && canPauseBatch(status, isPaused) && (
            <Button
                key="pause"
                {...buttonProps}
                onClick={onPause}
                startIcon={<PauseIcon />}
                color="warning"
            >
                {showLabels ? 'Pause' : ''}
            </Button>
        ),

        // Resume button
        onResume && canResumeBatch(status, isPaused) && (
            <Button
                key="resume"
                {...buttonProps}
                onClick={onResume}
                startIcon={<PlayIcon />}
                color="success"
            >
                {showLabels ? 'Resume' : ''}
            </Button>
        ),

        // Stop button
        onStop && canStopBatch(status) && (
            <Button
                key="stop"
                {...buttonProps}
                onClick={onStop}
                startIcon={<StopIcon />}
                color="error"
            >
                {showLabels ? 'Stop' : ''}
            </Button>
        ),

        // Refresh button
        onRefresh && showRefresh && batchStatus && (
            showLabels ? (
                <Button
                    key="refresh"
                    {...buttonProps}
                    onClick={onRefresh}
                    startIcon={<RefreshIcon />}
                    color="primary"
                >
                    Refresh
                </Button>
            ) : (
                <Tooltip key="refresh" title="Refresh Status">
                    <IconButton
                        onClick={onRefresh}
                        color="primary"
                        size={size}
                        disabled={disabled}
                    >
                        <RefreshIcon />
                    </IconButton>
                </Tooltip>
            )
        )
    ].filter(Boolean);

    if (controls.length === 0) {
        return null;
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: orientation === 'vertical' ? 'column' : 'row',
                gap: spacing,
                alignItems: 'center',
                flexWrap: orientation === 'horizontal' ? 'wrap' : 'nowrap'
            }}
        >
            {controls}
        </Box>
    );
};

export default BatchControls;