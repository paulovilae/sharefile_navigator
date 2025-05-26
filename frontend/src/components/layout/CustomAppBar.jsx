import * as React from 'react';
import { AppBar as RaAppBar } from 'react-admin';
import { Toolbar, Typography, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTheme } from '@mui/material/styles';

const CustomAppBar = (props) => {
    const { sidebarOpen, toggleSidebar, ...rest } = props;
    const theme = useTheme();
    const logoUrl = theme.logo;
    return (
        <RaAppBar
            {...rest}
            color="default"
            sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                minHeight: '44px !important',
                height: '46px !important',
                boxShadow: 'none',
                '& .MuiSvgIcon-root, & .MuiIconButton-root svg': {
                    color: theme.palette.primary.contrastText,
                    fill: theme.palette.primary.contrastText,
                },
            }}
        >
            <Toolbar disableGutters sx={{ minHeight: '35px !important', height: '35px !important', px: 2, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <img src={logoUrl} alt="Logo" style={{ height: 24, marginRight: 10 }} />
                    <Typography variant="h6" sx={{ color: theme.palette.primary.contrastText, fontWeight: 600, fontSize: 16, lineHeight: '35px', letterSpacing: 1 }}>
                        CHRISTUS Health File Navigator
                    </Typography>
                </Box>
                <Box sx={{ marginLeft: 'auto' }}>
                  <Tooltip title="AppBar Settings (cache control)">
                    <IconButton color="inherit" size="large">
                      <SettingsIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
            </Toolbar>
        </RaAppBar>
    );
};

export default CustomAppBar; 