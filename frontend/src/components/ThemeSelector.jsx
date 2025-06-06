import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { Brightness4, Brightness7, Palette, DarkMode, LightMode } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const themeOptions = [
  { value: 'christus', label: 'CHRISTUS Health', icon: <Palette /> },
  { value: 'default', label: 'Default (Blue/Orange)', icon: <Palette /> },
];

const ThemeSelector = React.memo(() => {
  const theme = useTheme();
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'christus');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    const handleThemeChange = () => {
      setCurrentTheme(localStorage.getItem('theme') || 'christus');
      setDarkMode(localStorage.getItem('darkMode') === 'true');
    };
    
    window.addEventListener('themechange', handleThemeChange);
    return () => window.removeEventListener('themechange', handleThemeChange);
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleThemeSelect = (themeValue) => {
    localStorage.setItem('theme', themeValue);
    window.dispatchEvent(new Event('themechange'));
    setCurrentTheme(themeValue);
    handleClose();
  };

  const handleDarkModeToggle = () => {
    const newDarkMode = !darkMode;
    localStorage.setItem('darkMode', newDarkMode.toString());
    window.dispatchEvent(new Event('themechange'));
    setDarkMode(newDarkMode);
    handleClose();
  };

  const getCurrentThemeIcon = () => {
    // Use a simple theme toggle icon based on current theme
    return theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />;
  };

  return (
    <>
      <Tooltip title="Theme & Dark Mode">
        <IconButton
          color="inherit"
          size="large"
          onClick={handleClick}
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          {getCurrentThemeIcon()}
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
        }}
      >
        {themeOptions.map((option) => (
          <MenuItem
            key={option.value}
            onClick={() => handleThemeSelect(option.value)}
            selected={currentTheme === option.value}
          >
            <ListItemIcon>
              {option.icon}
            </ListItemIcon>
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleDarkModeToggle}>
          <ListItemIcon>
            {darkMode ? <LightMode /> : <DarkMode />}
          </ListItemIcon>
          <ListItemText>
            {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
});

export default ThemeSelector;