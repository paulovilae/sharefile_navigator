import React, { useState } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { MenuItemLink } from 'react-admin';

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
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;

    if (item.type === 'link') {
        return (
            <MenuItemLink
                to={item.to}
                primaryText={item.label}
                leftIcon={item.icon}
                onClick={onMenuClick}
                style={{ paddingLeft: 16 + level * 16 }}
            />
        );
    }
    // Section with children
    return (
        <>
            <ListItem button onClick={() => setOpen((o) => !o)} style={{ paddingLeft: 16 + level * 16 }}>
                {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
                <ListItemText primary={item.label} />
                {open ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <MultiLevelMenu items={item.children} level={level + 1} onMenuClick={onMenuClick} />
            </Collapse>
        </>
    );
};

export default MultiLevelMenu; 