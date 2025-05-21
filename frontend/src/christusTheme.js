import { createTheme } from '@mui/material/styles';

const christusTheme = createTheme({
  palette: {
    primary: {
      main: '#512698', // CHRISTUS purple
    },
    secondary: {
      main: '#00ADEF', // Light blue
    },
    background: {
      default: '#fff',
    },
    text: {
      primary: '#212121',
      secondary: '#512698',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

export default christusTheme; 