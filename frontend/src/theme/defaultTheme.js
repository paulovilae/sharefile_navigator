import { createTheme } from '@mui/material/styles';

const defaultTheme = createTheme({
  palette: {
    mode: 'light',
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
      default: '#f5f5f5',
      paper: '#fff',
    },
    text: {
      primary: '#222',
      secondary: '#1976d2',
    },
    divider: '#E0E0E0',
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
  logo: 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg',
});

export default defaultTheme; 