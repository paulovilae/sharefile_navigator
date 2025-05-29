import React from 'react';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { Box } from '@mui/material';

const DragHandle = React.forwardRef(({ sx, ...props }, ref) => {
  return (
    <Box
      ref={ref}
      {...props}
      sx={{ 
        cursor: 'grab', 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '4px', // Add some padding to make it easier to grab
        color: 'text.secondary',
        '&:hover': { 
            color: 'text.primary',
            backgroundColor: 'action.hover',
            borderRadius: '50%',
        },
        ...sx 
      }}
    >
      <DragHandleIcon fontSize="small" />
    </Box>
  );
});

DragHandle.displayName = 'DragHandle';

export default DragHandle;