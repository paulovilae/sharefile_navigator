import * as React from "react";
import { useState, useEffect } from 'react';
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import LanguageIcon from '@mui/icons-material/Language';
import CategoryIcon from '@mui/icons-material/Category';
import MultiLevelMenu from '../components/MultiLevelMenu';
import { useTheme } from '@mui/material/styles';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import MenuIcon from '@mui/icons-material/Menu';
import PaletteIcon from '@mui/icons-material/Palette';

const api = async (url, method = 'GET', body) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
};

const MyMenu = (props) => {
    const theme = useTheme();
    const getIconColor = () => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main;
    const [menuItems, setMenuItems] = useState([]);
    const [menuCategories, setMenuCategories] = useState([]);

    useEffect(() => {
        const load = async () => {
            const menusResp = await api('/api/blocks/sidebar_menus');
            const catsResp = await api('/api/blocks/sidebar_menu_categories');
            setMenuItems(menusResp);
            setMenuCategories(catsResp);
        };
        load();
    }, []);

    const renderMenuItems = () => {
        const items = [];
        menuItems.forEach(item => {
            items.push({
                type: 'link',
                label: item.label,
                to: item.page_ref,
                //icon: item.icon ? <img src={item.icon} alt={item.label} style={{ width: 20, height: 20, color: getIconColor() }} /> : null,
            });
        });
        return items;
    };

    return <MultiLevelMenu items={renderMenuItems()} onMenuClick={props.onMenuClick} />;
};

export default MyMenu;