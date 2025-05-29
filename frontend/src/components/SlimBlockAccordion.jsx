import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, IconButton, useTheme } from '@mui/material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';

const SlimBlockAccordion = ({
    id, // Added id for useSortable
    expanded,
    onToggle,
    title,
    actions = true, // Default to true if actions (like delete) are possible
    children,
    dragHandle,
    onDelete,
    status, // 'current', 'done', 'future', or undefined
    collapsible = true
}) => {
  const theme = useTheme();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging, // Optionally use isDragging for styling
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1, // Example: reduce opacity when dragging
    zIndex: isDragging ? 100 : 'auto', // Ensure dragging item is on top
  };

  let blockBg;
  let borderColor = theme.palette.divider; // Default border
  let titleColor = theme.palette.text.primary;

  if (status === 'current') {
    blockBg = theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.light;
    borderColor = theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main;
    titleColor = theme.palette.mode === 'dark' ? theme.palette.getContrastText(theme.palette.primary.dark) : theme.palette.primary.dark;
  } else if (status === 'done') {
    blockBg = theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[200];
    borderColor = theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400];
    titleColor = theme.palette.text.secondary;
  } else { // future or undefined
    blockBg = theme.palette.background.paper;
  }

  return (
    <Accordion
        ref={setNodeRef} // Apply setNodeRef here
        style={style} // Apply transform and transition styles here
        expanded={expanded}
        onChange={onToggle}
        disableGutters
        elevation={expanded ? 3 : 1}
        sx={{
            mb: 1.5,
            borderRadius: 1, // Standard border radius
            border: `1px solid ${borderColor}`,
            bgcolor: blockBg,
            // transition: 'box-shadow 0.2s, border-color 0.2s, background-color 0.2s', // dnd-kit handles transition
            position: 'relative',
            overflow: 'hidden',
            '&:before': { // Remove the default top border line of Accordion
                display: 'none',
            },
            '&.Mui-expanded': {
                 boxShadow: theme.shadows[4], // Slightly more shadow when expanded
            }
        }}
    >
      <AccordionSummary
        expandIcon={collapsible ? <ExpandMoreIcon /> : null}
        sx={{
            minHeight: 48,
            px: 1.5, // Reduced padding
            py: 0,
            '&.Mui-expanded': {
                minHeight: 48, // Keep height consistent
            },
            '& .MuiAccordionSummary-content': { // Ensure content aligns well
                margin: '10px 0', // Adjust vertical margin for content
                alignItems: 'center',
            }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {dragHandle && (
            // Apply dnd attributes and listeners to the drag handle's wrapper
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, cursor: 'grab', touchAction: 'none' }} {...attributes} {...listeners}>
              {dragHandle}
            </Box>
          )}
          <Typography sx={{ flexGrow: 1, fontWeight: 600, fontSize: '1rem', color: titleColor }}>
            {title}
          </Typography>
          {actions && onDelete && (
           <IconButton 
                size="small" 
                title="Delete block" 
                onClick={(e) => { 
                    e.stopPropagation(); // Prevent accordion toggle
                    onDelete(); 
                }}
                sx={{ ml: 1 }}
            >
                <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1.5, px: 1.5 }}> 
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

export default SlimBlockAccordion;