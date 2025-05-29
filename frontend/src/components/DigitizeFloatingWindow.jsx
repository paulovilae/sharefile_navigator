import React, { useState } from 'react';
import { Rnd } from 'react-rnd';
import { IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';


export default function DigitizeFloatingWindow({ open, onClose, file }) {
  const [isFull, setIsFull] = useState(false);

  if (!open) return null;

  return (
    <Rnd
      default={{ x: 100, y: 100, width: 800, height: 600 }}
      minWidth={400}
      minHeight={300}
      bounds="window"
      enableResizing
      dragHandleClassName="floating-header"
      style={{
        zIndex: 1300,
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        overflow: 'hidden'
      }}
      disableDragging={isFull}
      {...(isFull ? { size: { width: '100vw', height: '100vh' }, position: { x: 0, y: 0 } } : {})}
    >
      <div style={{ display: 'flex', alignItems: 'center', background: '#51247A', color: '#fff', padding: 8, cursor: 'move' }} className="floating-header">
        <span style={{ flex: 1 }}>Digitization Workflow: {file?.name}</span>
        <IconButton onClick={() => setIsFull(f => !f)} size="small" sx={{ color: '#fff' }}>
          <FullscreenIcon />
        </IconButton>
        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)', background: '#fafafa', flex: 1 }}>
        {/* Add template controls, run button, result panel here */}
      </div>
    </Rnd>
  );
} 