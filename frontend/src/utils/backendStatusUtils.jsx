/**
 * Utility functions for checking backend server status
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';

/**
 * Check if the backend server is online
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<{isOnline: boolean, message: string, timestamp: Date}>}
 */
export const checkBackendStatus = async (timeout = 3000) => {
  try {
    // Use the health endpoint we created in the backend
    const response = await fetch('/api/health', {
      method: 'GET',
      // Set a timeout to avoid long waits
      signal: AbortSignal.timeout(timeout)
    });

    if (response.ok) {
      const data = await response.json();
      return {
        isOnline: true,
        message: 'Backend server is online',
        timestamp: new Date(),
        serverTime: data.timestamp ? new Date(data.timestamp) : null,
        details: data
      };
    } else {
      return {
        isOnline: false,
        message: `Backend server returned error: ${response.status} ${response.statusText}`,
        timestamp: new Date()
      };
    }
  } catch (err) {
    console.error("Backend status check failed:", err);
    
    // Provide more specific error messages based on the error type
    let message = "Backend server is not responding";
    
    if (err.name === 'AbortError') {
      message = `Backend server request timed out after ${timeout}ms`;
    } else if (err.message.includes('Failed to fetch')) {
      message = "Connection to backend server failed. Server may be down.";
    } else {
      message = `Backend connection error: ${err.message}`;
    }
    
    return {
      isOnline: false,
      message,
      timestamp: new Date(),
      error: err
    };
  }
};

/**
 * Create a reusable backend status hook
 * @param {Object} options - Configuration options
 * @param {number} options.interval - Check interval in milliseconds (default: 30000)
 * @param {number} options.timeout - Request timeout in milliseconds (default: 3000)
 * @param {boolean} options.checkImmediately - Whether to check immediately on mount (default: true)
 * @returns {Object} Status object and control functions
 */
export const useBackendStatus = (options = {}) => {
  const { 
    interval = 30000, 
    timeout = 3000,
    checkImmediately = true 
  } = options;
  
  const [status, setStatus] = useState({
    isChecking: true,
    isOnline: false,
    lastChecked: null,
    message: 'Checking backend status...'
  });
  
  const checkStatus = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));
    const result = await checkBackendStatus(timeout);
    
    setStatus({
      isChecking: false,
      isOnline: result.isOnline,
      lastChecked: result.timestamp,
      message: result.message,
      details: result.details
    });
    
    return result.isOnline;
  }, [timeout]);
  
  useEffect(() => {
    // Initial check if requested
    if (checkImmediately) {
      checkStatus();
    }
    
    // Set up periodic checking
    const intervalId = setInterval(() => {
      checkStatus();
    }, interval);
    
    return () => clearInterval(intervalId);
  }, [checkStatus, interval, checkImmediately]);
  
  return {
    ...status,
    checkNow: checkStatus
  };
};

/**
 * BackendStatusIndicator component for displaying backend status
 * This can be imported and used in any component
 */
export const BackendStatusIndicator = ({ position = 'top-right', showRefresh = true }) => {
  const { isChecking, isOnline, message, checkNow } = useBackendStatus();
  
  // Position styles
  const positionStyles = {
    'top-right': { top: 60, right: 20 },
    'top-left': { top: 60, left: 20 },
    'bottom-right': { bottom: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 }
  };
  
  return (
    <Box 
      sx={{ 
        position: 'fixed', 
        ...positionStyles[position],
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        backgroundColor: isOnline ? 'rgba(46, 125, 50, 0.9)' : 'rgba(211, 47, 47, 0.9)',
        color: 'white',
        py: 0.5,
        px: 1.5,
        borderRadius: 2,
        boxShadow: 2,
        transition: 'background-color 0.3s ease'
      }}
    >
      <Box 
        sx={{ 
          width: 12, 
          height: 12, 
          borderRadius: '50%',
          backgroundColor: isOnline ? '#4caf50' : '#f44336',
          boxShadow: '0 0 8px rgba(255, 255, 255, 0.5)',
          animation: isChecking ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 0.6 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.6 }
          }
        }} 
      />
      <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
        {isChecking 
          ? 'Checking connection...' 
          : (isOnline 
              ? 'Backend: Connected' 
              : 'Backend: Disconnected')}
      </Typography>
      {showRefresh && !isChecking && (
        <Tooltip title="Check connection now">
          <IconButton 
            size="small" 
            onClick={checkNow}
            sx={{ color: 'white', p: 0.5 }}
          >
            <Box component="span" sx={{ fontSize: '1rem' }}>⟳</Box>
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};