import * as React from 'react';
import {
    AppBar as RaAppBar,
    TitlePortal,
    LoadingIndicator,
    ToggleThemeButton,
    LocalesMenuButton,
    UserMenu,
    useTranslate
} from 'react-admin';
import { Typography, Box, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { AccountCircle, Person, Settings, ExitToApp } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const CustomAppBar = React.memo((props) => {
    const translate = useTranslate();
    const theme = useTheme();
    const logoUrl = theme.logo;
    const [userMenuAnchor, setUserMenuAnchor] = React.useState(null);
    
    const handleUserMenuClick = (event) => {
        setUserMenuAnchor(event.currentTarget);
    };
    
    const handleUserMenuClose = () => {
        setUserMenuAnchor(null);
    };
    
    const handleProfileClick = () => {
        console.log('Profile clicked');
        // Navigate to profile page or open profile dialog
        handleUserMenuClose();
    };
    
    const handleSettingsClick = () => {
        console.log('User settings clicked');
        // Navigate to user settings
        window.location.hash = '#/settings';
        handleUserMenuClose();
    };
    
    const handleLogoutClick = () => {
        console.log('Logout clicked');
        // Implement logout functionality
        handleUserMenuClose();
    };
    
    
    return (
        <RaAppBar
            {...props}
            toolbar={
                <>
                    <LoadingIndicator />
                    <ToggleThemeButton />
                    <LocalesMenuButton />
                </>
            }
            userMenu={
                <UserMenu>
                    <MenuItem onClick={handleProfileClick}>
                        <ListItemIcon>
                            <Person fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Profile</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleSettingsClick}>
                        <ListItemIcon>
                            <Settings fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Settings</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleLogoutClick}>
                        <ListItemIcon>
                            <ExitToApp fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Logout</ListItemText>
                    </MenuItem>
                </UserMenu>
            }
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
                '& .MuiToolbar-root': {
                    minHeight: '35px !important',
                    height: '35px !important',
                    paddingLeft: 2,
                    paddingRight: 2,
                },
            }}
        >
            <TitlePortal>
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                    <img src={logoUrl} alt="Logo" style={{ height: 24, marginRight: 10, marginLeft: 8 }} />
                    <Typography variant="h6" sx={{ color: theme.palette.primary.contrastText, fontWeight: 600, fontSize: 16, lineHeight: '35px', letterSpacing: 1 }}>
                        {translate('app.title')}
                    </Typography>
                </Box>
            </TitlePortal>
        </RaAppBar>
    );
});

// Add display name for debugging
CustomAppBar.displayName = 'CustomAppBar';

export default CustomAppBar;