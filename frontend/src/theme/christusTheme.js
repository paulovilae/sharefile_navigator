import { createTheme } from '@mui/material/styles';

/*
CHRISTUS Theme Palette for React-Admin/MUI (Brand Guide 2023)
-------------------------------------------------------------

Main Colors:
- Morado CHRISTUS (PANTONE 2613 CP):    #6D247A (primary)
- Violeta CHRISTUS (PANTONE 2617 CP):   #4D216D (primary.dark)
- Lila CHRISTUS (PANTONE 522 CP):       #B598C1 (primary.light, hover, backgrounds)
- Gris CHRISTUS (PANTONE COOL GRAY 10): #636A6B (borders, subtle)
- Azul Integridad (PANTONE 647 CP):     #3F6A98 (secondary)

Updates:
- Morado and Lila are now used for selected, hover, and active states, as well as for buttons and checkboxes.
- The UI remains light and clean, but with more color presence.

Text:
- Light:   text.primary: #212121, text.secondary: #6D247A
- Dark:    text.primary: #fff,     text.secondary: #B598C1

Background:
- Light:   background.default: #fff, background.paper: #fff
- Dark:    background.default: #23234a, background.paper: #28285a

How to use: See previous doc block.
*/

/*
Option 1 Layout:
- Sidebar, topbar, and table headers: Lila (#F3E6F6)
- Main content background and cards: Very light gray (#F5F4F8)
- Cards: White or #F5F4F8
*/

const christusTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6D247A', // Morado CHRISTUS
      dark: '#4D216D', // Violeta CHRISTUS
      light: '#B598C1', // Lila CHRISTUS
      contrastText: '#fff',
    },
    secondary: {
      main: '#3F6A98', // Azul Integridad
      contrastText: '#fff',
    },
    background: {
      default: '#F5F4F8', // Main content background
      paper: '#fff',      // Cards and surfaces
      nav: '#F3E6F6',     // Sidebar, topbar, table headers
      selected: '#E3CFEA',
      hover: '#E3CFEA',
    },
    divider: '#B598C1',
    grey: {
      100: '#F5F4F8',
      200: '#E5E3EA',
      300: '#D1CEDB',
      700: '#636A6B',
    },
    text: {
      primary: '#212121',
      secondary: '#636A6B',
      accent: '#6D247A',
      buttonText: '#fff',
    },
    action: {
      active: '#6D247A',
      selected: '#F3E6F6',
      hover: '#EDE0F2',
      focus: '#B598C1',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          backgroundColor: '#6D247A',
          '&:hover': {
            backgroundColor: '#4D216D',
          },
        },
        outlinedPrimary: {
          borderColor: '#6D247A',
          color: '#6D247A',
          '&:hover': {
            backgroundColor: '#F3E6F6',
            borderColor: '#4D216D',
            color: '#4D216D',
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#B598C1',
          '&.Mui-checked': {
            color: '#6D247A',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#6D247A',
          '&:hover': {
            backgroundColor: '#F3E6F6',
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#F3E6F6',
            color: '#6D247A',
            '&:hover': {
              backgroundColor: '#EDE0F2',
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#B598C1',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff', // White for cards
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.Mui-selected, &[aria-selected="true"]': {
            backgroundColor: '#fff', // Light background for selected in dark mode
            color: '#212121', // Dark text for contrast
            '&:hover': {
              backgroundColor: '#F3E6F6', // Lila on hover
            },
          },
          '&:hover': {
            backgroundColor: '#E3CFEA', // Stronger Lila on hover (light mode)
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#28285a', // Use dark theme paper in dark mode
          color: '#fff', // Use primary text in dark mode
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#F3E6F6', // Lila for topbar
          color: '#6D247A',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#F3E6F6', // Lila for sidebar
          color: '#6D247A',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#F3E6F6', // Lila for table headers
          color: '#6D247A',
        },
      },
    },
  },
  typography: {
    fontFamily: 'Barlow, Arial, sans-serif', // Body
    h1: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h2: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h3: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h4: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h5: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h6: { fontFamily: 'Montserrat, Arial, sans-serif' },
  },
  logo: '/LogoCSS_Intranet.png',
});

/*
CHRISTUS Dark Theme Palette for React-Admin/MUI
-----------------------------------------------

This is the dark mode variant of the CHRISTUS palette. Use with the <Admin darkTheme={christusDarkTheme} /> prop.

Palette keys:
- primary.main:    #512698   // CHRISTUS purple (main brand color)
- secondary.main:  #00ADEF   // Light blue (accent)
- background.default: #181828 // Very dark background
- background.paper:   #23234a // Card/paper background
- text.primary:    #fff      // Main text color (white)
- text.secondary:  #A7A1C7   // Light purple for secondary text
*/

export const christusDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6D247A', // Morado CHRISTUS
      dark: '#4D216D', // Violeta CHRISTUS
      light: '#B598C1', // Lila CHRISTUS
      contrastText: '#fff',
    },
    secondary: {
      main: '#3F6A98', // Azul Integridad
      contrastText: '#fff',
    },
    background: {
      default: '#23234a', // Deep blue-violet
      paper: '#28285a',   // Slightly lighter for cards
    },
    divider: '#B598C1', // Lila for dividers
    grey: {
      100: '#393366', // dark lila for subtle backgrounds
      200: '#393366',
      300: '#393366',
      700: '#636A6B', // Gris CHRISTUS
    },
    text: {
      primary: '#fff',
      secondary: '#B598C1', // Lila for secondary text
      buttonText: '#212121',
    },
  },
  typography: {
    fontFamily: 'Barlow, Arial, sans-serif',
    h1: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h2: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h3: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h4: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h5: { fontFamily: 'Montserrat, Arial, sans-serif' },
    h6: { fontFamily: 'Montserrat, Arial, sans-serif' },
  },
});

export default christusTheme; 