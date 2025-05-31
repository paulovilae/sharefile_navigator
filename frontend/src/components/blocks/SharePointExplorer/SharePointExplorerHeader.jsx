import React from 'react';
import {
  Typography,
  Paper,
  Stack,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const SharePointExplorerHeader = ({ currentPath, handleNavigateBack }) => {
  return (
    currentPath.length > 0 && (
      <Paper elevation={1} sx={{ p: 1, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Back">
            <IconButton size="small" onClick={handleNavigateBack}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          {currentPath.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <Typography variant="body2" sx={{ mx: 0.5 }}>/</Typography>}
              <Chip
                label={item.name}
                size="small"
                variant={index === currentPath.length - 1 ? "filled" : "outlined"}
                color={index === currentPath.length - 1 ? "primary" : "default"}
              />
            </React.Fragment>
          ))}
        </Stack>
      </Paper>
    )
  );
};

export default SharePointExplorerHeader;