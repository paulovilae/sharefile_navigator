import * as React from "react";
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import LanguageIcon from '@mui/icons-material/Language';
import MultiLevelMenu from '../components/MultiLevelMenu';
import { useTheme } from '@mui/material/styles';

const MyMenu = (props) => {
    const theme = useTheme();
    const getIconColor = () => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main;
    const menuItems = [
        {
            type: 'link',
            name: 'sharepoint-libraries',
            label: 'SharePoint Libraries',
            to: '/sharepoint/libraries',
            icon: <FolderIcon sx={{ color: getIconColor() }} />,
        },
        {
            type: 'link',
            label: 'Settings',
            to: '/settings/settings',
            icon: <SettingsIcon sx={{ color: getIconColor() }} />,
        },
        // Add more sections/resources as needed
    ];
    return <MultiLevelMenu items={menuItems} onMenuClick={props.onMenuClick} />;
};

export default MyMenu; 