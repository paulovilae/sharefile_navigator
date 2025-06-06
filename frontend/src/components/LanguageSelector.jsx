import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Language as LanguageIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useTranslate, useLocaleState } from 'react-admin';
import i18nProvider from '../i18nProvider';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

const LanguageSelector = React.memo(({ variant = 'icon' }) => {
  const translate = useTranslate();
  const [locale, setLocale] = useLocaleState();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (languageCode) => {
    i18nProvider.changeLocale(languageCode);
    handleClose();
  };

  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === locale) || languages[0];
  };

  const currentLang = getCurrentLanguage();

  if (variant === 'chip') {
    return (
      <>
        <Tooltip title={translate('common.change_language', 'Change Language')}>
          <Chip
            icon={<LanguageIcon />}
            label={`${currentLang.flag} ${currentLang.name}`}
            onClick={handleClick}
            variant="outlined"
            size="small"
            sx={{ cursor: 'pointer' }}
          />
        </Tooltip>
        
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
        >
          {languages.map((lang) => (
            <MenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              selected={lang.code === locale}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Typography variant="body2">{lang.flag}</Typography>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {lang.name}
                </Typography>
                {lang.code === locale && (
                  <CheckIcon fontSize="small" color="primary" />
                )}
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </>
    );
  }

  // Default icon variant
  return (
    <>
      <Tooltip title={translate('common.change_language', 'Change Language')}>
        <IconButton
          color="inherit"
          onClick={handleClick}
          size="large"
          sx={{
            position: 'relative',
            '&::after': {
              content: `"${currentLang.flag}"`,
              position: 'absolute',
              bottom: 2,
              right: 2,
              fontSize: '10px',
              lineHeight: 1
            }
          }}
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {languages.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            selected={lang.code === locale}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Typography variant="body2">{lang.flag}</Typography>
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {lang.name}
              </Typography>
              {lang.code === locale && (
                <CheckIcon fontSize="small" color="primary" />
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
});

export default LanguageSelector;