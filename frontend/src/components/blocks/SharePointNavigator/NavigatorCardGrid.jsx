import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  useTheme
} from '@mui/material';

const NavigatorCardGrid = ({
    data,
    onCardClick,
    icon,
    cardHeight = 120,
    iconSize = 30,
    fontSize = 'caption',
    cardWidth = 160,
    isItemSelected,
    handleSelectItem,
    itemType = "item"
}) => {
    const theme = useTheme();
    return (
        <Grid container spacing={1} sx={{ mt: 0.25, p: 0.5 }}>
            {data.map(record => {
                const selected = isItemSelected(record, itemType === 'folder');
                return (
                    <Grid item key={record.id}>
                        <Card
                            sx={{
                                width: cardWidth,
                                height: cardHeight,
                                borderRadius: 1,
                                boxShadow: selected ? 4 : 2,
                                border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                                transition: 'box-shadow 0.2s, transform 0.2s, border 0.2s',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                position: 'relative',
                                '&:hover': {
                                    boxShadow: 4,
                                    transform: 'scale(1.01)'
                                },
                                bgcolor: selected ? theme.palette.action.selected : 'background.paper',
                            }}
                        >
                            <CardContent
                                sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 1, flexGrow: 1, width: '100%', cursor:'pointer'}}
                                onClick={() => onCardClick(record)}
                            >
                                {React.cloneElement(icon, { sx: { fontSize: iconSize, color: selected ? theme.palette.primary.main : 'primary.main', mb: 1 } })}
                                <Typography variant={fontSize} sx={{ fontWeight: 500, textAlign: 'center', wordBreak: 'break-word', width: '100%' }}>
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

export default NavigatorCardGrid;