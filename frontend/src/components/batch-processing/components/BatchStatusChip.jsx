/**
 * Enhanced status chip component for batch processing
 */
import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    PlayArrow as PlayIcon,
    Schedule as ScheduleIcon,
    Pause as PauseIcon,
    Error as ErrorIcon
} from '@mui/icons-material';
import { getStatusColor, getStatusMessage } from '../utils/batchUtils';
import { formatDuration } from '../utils/timeUtils';

const BatchStatusChip = ({ 
    status, 
    batchStatus = {}, 
    showTooltip = true,
    variant = 'filled',
    size = 'small',
    sx = {}
}) => {
    // Get status icon
    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircleIcon />;
            case 'processing': return <PlayIcon />;
            case 'queued': return <ScheduleIcon />;
            case 'paused': return <PauseIcon />;
            case 'error':
            case 'cancelled': return <ErrorIcon />;
            default: return <ScheduleIcon />;
        }
    };

    // Get enhanced tooltip content
    const getTooltipContent = () => {
        const baseMessage = getStatusMessage(status, batchStatus);
        
        if (status === 'queued') {
            const details = [];
            
            if (batchStatus.queue_position) {
                details.push(`Position: ${batchStatus.queue_position}`);
            }
            
            if (batchStatus.estimated_start_time) {
                const startTime = new Date(batchStatus.estimated_start_time * 1000);
                const now = new Date();
                const waitTime = Math.max(0, (startTime - now) / 1000);
                details.push(`Est. start in ${formatDuration(waitTime)}`);
            }
            
            if (details.length > 0) {
                return `${baseMessage}\n${details.join('\n')}`;
            }
        }
        
        return baseMessage;
    };

    const chipElement = (
        <Chip
            label={getStatusMessage(status, batchStatus)}
            color={getStatusColor(status)}
            icon={getStatusIcon(status)}
            variant={variant}
            size={size}
            sx={{
                maxWidth: '300px',
                '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                },
                ...sx
            }}
        />
    );

    if (showTooltip) {
        return (
            <Tooltip 
                title={getTooltipContent()}
                placement="top"
                arrow
            >
                {chipElement}
            </Tooltip>
        );
    }

    return chipElement;
};

export default BatchStatusChip;