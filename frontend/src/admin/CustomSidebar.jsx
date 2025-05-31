import React from 'react';
import { Sidebar } from 'react-admin';
import { styled } from '@mui/material/styles';

const StyledSidebar = styled(Sidebar)(({ theme }) => ({
  '& .RaSidebar-paper': {
    width: 140,
  },
  width: 140,
}));

const CustomSidebar = (props) => {
  return <StyledSidebar {...props} />;
};

export default CustomSidebar;