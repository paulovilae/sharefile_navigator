import React, { useState } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { MenuItemLink, useSidebarState } from 'react-admin';

/**
 * Recursive MultiLevelMenu component for React-admin (Community Edition)
 * @param {Array} items - Array of menu item objects
 * @param {number} level - Current nesting level (for padding)
 */
const MultiLevelMenu = ({ items = [], level = 0, onMenuClick }) => {
    return (
        <List component="nav" disablePadding>
            {items.map((item, idx) => (
                <MultiLevelMenuItem key={item.name || idx} item={item} level={level} onMenuClick={onMenuClick} />
            ))}
        </List>
    );
};

const MultiLevelMenuItem = ({ item, level, onMenuClick }) => {
    const [open, setOpen] = useState(false);
    const [sidebarOpen] = useSidebarState();
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;

    if (item.type === 'link') {
        return (
            <MenuItemLink
                to={item.to}
                primaryText={sidebarOpen ? item.label : ''} // Hide text when sidebar is collapsed
                leftIcon={item.icon}
                onClick={onMenuClick}
                style={{
                    paddingLeft: sidebarOpen ? 4 + level * 8 : 8,
                    paddingTop: 4,
                    paddingBottom: 4,
                    paddingRight: 4,
                    minHeight: 32,
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    minWidth: sidebarOpen ? 'auto' : '48px',
                    maxWidth: sidebarOpen ? 'auto' : '48px',
                }}
            />
        );
    }
    // Section with children
    return (
        <>
            <ListItem
                button
                onClick={() => setOpen((o) => !o)}
                style={{
                    paddingLeft: sidebarOpen ? 8 + level * 12 : 8,
                    paddingTop: 6,
                    paddingBottom: 6,
                    minHeight: 36,
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                }}
            >
                {item.icon && <ListItemIcon sx={{ minWidth: sidebarOpen ? 32 : 'auto', marginRight: sidebarOpen ? 1 : 0 }}>{item.icon}</ListItemIcon>}
                {sidebarOpen && (
                    <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                    />
                )}
                {sidebarOpen && (open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
            </ListItem>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <MultiLevelMenu items={item.children} level={level + 1} onMenuClick={onMenuClick} />
            </Collapse>
        </>
    );
};

export default MultiLevelMenu; 