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
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListIcon from '@mui/icons-material/List';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const iconComponentMap = {
    Folder: FolderIcon,
    Category: CategoryIcon,
    Settings: SettingsIcon,
    Home: HomeIcon,
    Dashboard: DashboardIcon,
    List: ListIcon,
    Edit: EditIcon,
    Delete: DeleteIcon,
    Add: AddIcon,
};

const api = async (url, method = 'GET', body) => {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  return res.json();
};

const MyMenu = (props) => {
    const theme = useTheme();
    const getIconColor = () => theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main;
    const [menuItems, setMenuItems] = useState([]);
    const [menuCategories, setMenuCategories] = useState([]);

    useEffect(() => {
        const load = async () => {
            let menusResp = [];
            try {
                menusResp = await api('/api/blocks/sidebar_menus');
            } catch (e) {
                console.error("Failed to load sidebar menus:", e);
                // Provide a default empty array in case of error
                menusResp = [];
            }
            const catsResp = await api('/api/blocks/sidebar_menu_categories');
            setMenuItems(menusResp || []);
            if (Array.isArray(catsResp)) {
                setMenuCategories(catsResp);
            } else {
                console.error("Failed to load sidebar menu categories, or response was not an array:", catsResp);
                setMenuCategories([]);
            }
        };
        load();
    }, []);

    const renderMenuItems = () => {
        const items = [];
        menuItems.forEach(item => {
            const IconComponent = iconComponentMap[item.icon] || null;
            items.push({
                type: 'link',
                label: item.label,
                to: item.page_ref,
                icon: IconComponent ? <IconComponent style={{ width: 20, height: 20, color: getIconColor() }} /> : null,
            });
        });
        return items;
    };

    return <MultiLevelMenu items={renderMenuItems()} onMenuClick={props.onMenuClick} />;
};

export default MyMenu;