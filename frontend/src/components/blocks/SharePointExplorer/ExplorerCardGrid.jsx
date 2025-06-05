import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  useTheme
} from '@mui/material';
import Checkbox from '@mui/material/Checkbox';

const ExplorerCardGrid = ({
    data,
    onCardClick,
    icon,
    cardHeight = 120,
    iconSize = 30,
    fontSize = 'caption',
    cardWidth = 160,
    isItemSelected,
    handleSelectItem,
    itemType = "item",
    selectionMode = false
}) => {
    const theme = useTheme();
    
    // Helper function to check if a file is digitizable (PDF)
    const isDigitizable = (record) => {
        if (itemType === 'folder') return true; // Folders are always selectable
        const ext = record.name?.split('.').pop()?.toLowerCase();
        return ['pdf'].includes(ext);
    };
    
    return (
        <Grid container spacing={1} sx={{ mt: 0.25, p: 0.5 }}>
            {data.map(record => {
                const selected = isItemSelected(record, itemType === 'folder');
                const isFileDigitizable = isDigitizable(record);
                const isDisabled = selectionMode && !isFileDigitizable;
                
                return (
                    <Grid item key={record.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Card
                            sx={{
                                width: cardWidth,
                                height: cardHeight,
                                borderRadius: 1,
                                boxShadow: selected ? 4 : 2,
                                border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                                transition: 'box-shadow 0.2s, transform 0.2s, border 0.2s',
                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                // display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                position: 'relative',
                                opacity: isDisabled ? 0.5 : 1,
                                '&:hover': {
                                    boxShadow: isDisabled ? 2 : 4,
                                    transform: isDisabled ? 'none' : 'scale(1.01)'
                                },
                                bgcolor: selected ? theme.palette.action.selected : 'background.paper',
                            }}
                        >
                          <Box sx={{ position: 'absolute', top: 2, right: 2, zIndex: 1 }}>
                            {itemType === 'folder' && selectionMode && (
                              <Checkbox
                                checked={selected}
                                disabled={isDisabled}
                                onChange={(e) => {
 
                                  handleSelectItem(record, true);
                                  e.stopPropagation(); // Prevent card click
                                }}
                                color="primary"
                                size="small"
                              />
                            )}
                          </Box>
                            <CardContent
                                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, flexGrow: 1, width: '100%', cursor: isDisabled ? 'not-allowed' : 'pointer'}}
                                onClick={() => !isDisabled && onCardClick(record)}
                            >
                                {React.cloneElement(icon, {
                                    sx: {
                                        fontSize: iconSize,
                                        color: isDisabled ? '#BDBDBD' : (selected ? theme.palette.primary.main : 'primary.main'),
                                        mb: 1
                                    }
                                })}
                                <Typography
                                    variant={fontSize}
                                    sx={{
                                        fontWeight: 500,
                                        textAlign: 'center',
                                        wordBreak: 'break-word',
                                        width: '100%',
                                        color: isDisabled ? 'text.disabled' : 'inherit'
                                    }}
                                >
                                    {record.name}
                                </Typography>
                                {record.description && cardHeight > 100 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 0.5, fontSize: '0.75rem' }}>
                                        {record.description}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default ExplorerCardGrid;