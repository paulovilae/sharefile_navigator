import React from 'react';
import { Sidebar, useSidebarState } from 'react-admin';
import { styled } from '@mui/material/styles';

const StyledSidebar = styled(Sidebar)(({ theme, open }) => ({
  '& .RaSidebar-paper': {
    width: open ? 240 : 64, // Increased width for full text visibility
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    overflow: 'hidden',
  },
  width: open ? 240 : 64,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  // When collapsed, ensure proper layout for icon-only display
  ...(!open && {
    overflow: 'hidden',
    
    // Center menu items when collapsed
    '& .MuiListItem-root': {
      justifyContent: 'center',
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
    
    '& .MuiButtonBase-root': {
      justifyContent: 'center',
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
    
    // Ensure icons are properly centered
    '& .MuiListItemIcon-root': {
      minWidth: 'auto',
      marginRight: 0,
      justifyContent: 'center',
    },
  }),
}));

const CustomSidebar = (props) => {
  const [open] = useSidebarState();
  return <StyledSidebar {...props} open={open} />;
};

export default CustomSidebar;