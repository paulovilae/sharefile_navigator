import * as React from 'react';
import { AppBar as RaAppBar } from 'react-admin';
import { Box, Typography } from '@mui/material';

// Logo URL
const logoUrl = 'https://christussinergia.com/info/Colaboradores/LogoCSS_Intranet.png';

// Custom AppBar that extends the default and adds logo/title, and forces icons to white
const CustomAppBar = (props) => (
  <RaAppBar
    {...props}
    sx={{
      backgroundColor: '#512698',
      minHeight: 51,
      boxShadow: 'none',
      '& .MuiSvgIcon-root, & .MuiIconButton-root svg': {
        color: '#fff',
        fill: '#fff',
      },
    }}
  >
    <Box display="flex" alignItems="center" pl={2} pr={2} style={{ minHeight: 51, height: 51 }}>
      <img src={logoUrl} alt="CHRISTUS Health" style={{ height: 40, padding: 0, borderRadius: 0, marginRight: 16 }} />
      <Typography variant="h6" sx={{ flexGrow: 1, fontSize: 22, color: '#fff' }}>
        CHRISTUS Health File Navigator
      </Typography>
    </Box>
    {props.children}
  </RaAppBar>
);

export default CustomAppBar;