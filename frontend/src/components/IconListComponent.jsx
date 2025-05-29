import React, { useState } from 'react';
import { MenuItem, ListItemIcon, ListItemText, TextField } from '@mui/material';
import { HelpOutline as HelpOutlineIcon } from '@mui/icons-material';
import iconList from '../constants/iconList';

const IconListComponent = ({ onIconSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIcons = iconList.filter(iconName =>
    iconName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <TextField
        label="Search Icons"
        variant="outlined"
        size="small"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2 }}
      />
      {filteredIcons.map(iconName => {
        const IconComponent = React.lazy(() => import(`@mui/icons-material/${iconName}`));

        return (
          <MenuItem key={iconName} onClick={() => onIconSelect(iconName)}>
            <ListItemIcon>
              <React.Suspense fallback={<HelpOutlineIcon />}>
                <IconComponent />
              </React.Suspense>
            </ListItemIcon>
            <ListItemText primary={iconName} />
          </MenuItem>
        );
      })}
    </div>
  );
};

export default IconListComponent;