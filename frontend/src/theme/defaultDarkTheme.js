import { createTheme } from '@mui/material/styles';

const defaultDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2', // Blue
      light: '#63a4ff',
      dark: '#004ba0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ff9800', // Orange
      contrastText: '#fff',
    },
    background: {
      default: '#181c25', // Very dark blue
      paper: '#232b3a',   // Slightly lighter for cards
    },
    text: {
      primary: '#fff',
      secondary: '#90caf9', // Light blue for secondary text
    },
    divider: '#1976d2',
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h1: { fontFamily: 'Roboto, Arial, sans-serif' },
    h2: { fontFamily: 'Roboto, Arial, sans-serif' },
    h3: { fontFamily: 'Roboto, Arial, sans-serif' },
    h4: { fontFamily: 'Roboto, Arial, sans-serif' },
    h5: { fontFamily: 'Roboto, Arial, sans-serif' },
    h6: { fontFamily: 'Roboto, Arial, sans-serif' },
    button: { fontFamily: 'Roboto, Arial, sans-serif', fontWeight: 600 },
  },
  shape: {
    borderRadius: 6,
  },
  logo: '/src/logo.svg',
});

export default defaultDarkTheme; 