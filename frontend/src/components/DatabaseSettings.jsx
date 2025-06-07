import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress,
  Paper,
  Grid
} from '@mui/material';
import { useTranslate } from 'react-admin';

const DatabaseSettings = () => {
  const translate = useTranslate();
  const [dbType, setDbType] = useState('sqlite');
  const [pgSettings, setPgSettings] = useState({
    host: 'postgres',
    port: '5432',
    user: 'ocr_user',
    password: 'ocr_password',
    database: 'ocr_db'
  });
  const [mssqlSettings, setMssqlSettings] = useState({
    host: 'mssql',
    port: '1433',
    user: 'sa',
    password: 'OcrPassword123!',
    database: 'ocr_db',
    pid: 'Express'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentDbType, setCurrentDbType] = useState('');

  useEffect(() => {
    // Fetch current database settings
    const fetchDbSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/settings/database');
        if (response.ok) {
          const data = await response.json();
          setCurrentDbType(data.db_type || 'sqlite');
          setDbType(data.db_type || 'sqlite');
          
          if (data.postgres) {
            setPgSettings({
              host: data.postgres.host || 'postgres',
              port: data.postgres.port || '5432',
              user: data.postgres.user || 'ocr_user',
              password: data.postgres.password || 'ocr_password',
              database: data.postgres.database || 'ocr_db'
            });
          }
          
          if (data.mssql) {
            setMssqlSettings({
              host: data.mssql.host || 'mssql',
              port: data.mssql.port || '1433',
              user: data.mssql.user || 'sa',
              password: data.mssql.password || 'OcrPassword123!',
              database: data.mssql.database || 'ocr_db',
              pid: data.mssql.pid || 'Express'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching database settings:', error);
        setMessage({
          type: 'error',
          text: translate('database.error_fetching_settings', { error: error.message })
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDbSettings();
  }, [translate]);

  const handleDbTypeChange = (event) => {
    setDbType(event.target.value);
  };

  const handlePgSettingChange = (field) => (event) => {
    setPgSettings({
      ...pgSettings,
      [field]: event.target.value
    });
  };

  const handleMssqlSettingChange = (field) => (event) => {
    setMssqlSettings({
      ...mssqlSettings,
      [field]: event.target.value
    });
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const payload = {
        db_type: dbType,
        postgres: dbType === 'postgres' ? pgSettings : null,
        mssql: dbType === 'mssql' ? mssqlSettings : null
      };

      const response = await fetch('/api/settings/database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: translate('database.settings_saved') 
        });
        setCurrentDbType(dbType);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Unknown error');
      }
    } catch (error) {
      console.error('Error saving database settings:', error);
      setMessage({ 
        type: 'error', 
        text: translate('database.error_saving_settings', { error: error.message }) 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMigrateData = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      let source, target, settings;

      // Determine source, target, and settings based on current and selected database types
      if (currentDbType === 'sqlite' && (dbType === 'postgres' || dbType === 'mssql')) {
        // Migrating from SQLite to PostgreSQL or MSSQL
        source = 'sqlite';
        target = dbType;
        settings = dbType === 'postgres' ? pgSettings : mssqlSettings;
      } else if ((currentDbType === 'postgres' || currentDbType === 'mssql') && dbType === 'sqlite') {
        // Migrating from PostgreSQL or MSSQL to SQLite
        source = currentDbType;
        target = 'sqlite';
        settings = currentDbType === 'postgres' ? pgSettings : mssqlSettings;
      } else if (currentDbType === 'postgres' && dbType === 'mssql') {
        // Migrating from PostgreSQL to MSSQL
        source = 'postgres';
        target = 'mssql';
        settings = mssqlSettings;
      } else if (currentDbType === 'mssql' && dbType === 'postgres') {
        // Migrating from MSSQL to PostgreSQL
        source = 'mssql';
        target = 'postgres';
        settings = pgSettings;
      } else {
        setMessage({
          type: 'error',
          text: translate('database.migration_not_supported')
        });
        setLoading(false);
        return;
      }

      const response = await fetch('/api/settings/migrate-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source,
          target,
          settings
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ 
          type: 'success', 
          text: translate('database.migration_success', { tables: data.tables_migrated }) 
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Unknown error');
      }
    } catch (error) {
      console.error('Error migrating database:', error);
      setMessage({ 
        type: 'error', 
        text: translate('database.error_migrating', { error: error.message }) 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {translate('settings.database_settings')}
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {translate('database.current_database')}: <strong>{currentDbType}</strong>
        </Typography>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="db-type-select-label">
            {translate('database.type')}
          </InputLabel>
          <Select
            labelId="db-type-select-label"
            value={dbType}
            label={translate('database.type')}
            onChange={handleDbTypeChange}
            disabled={loading}
          >
            <MenuItem value="sqlite">SQLite</MenuItem>
            <MenuItem value="postgres">PostgreSQL</MenuItem>
            <MenuItem value="mssql">Microsoft SQL Server</MenuItem>
          </Select>
        </FormControl>

        {dbType === 'postgres' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.host')}
                value={pgSettings.host}
                onChange={handlePgSettingChange('host')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.port')}
                value={pgSettings.port}
                onChange={handlePgSettingChange('port')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.user')}
                value={pgSettings.user}
                onChange={handlePgSettingChange('user')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.password')}
                type="password"
                value={pgSettings.password}
                onChange={handlePgSettingChange('password')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={translate('database.database')}
                value={pgSettings.database}
                onChange={handlePgSettingChange('database')}
                disabled={loading}
              />
            </Grid>
          </Grid>
        )}

        {dbType === 'mssql' && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.host')}
                value={mssqlSettings.host}
                onChange={handleMssqlSettingChange('host')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.port')}
                value={mssqlSettings.port}
                onChange={handleMssqlSettingChange('port')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.user')}
                value={mssqlSettings.user}
                onChange={handleMssqlSettingChange('user')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.password')}
                type="password"
                value={mssqlSettings.password}
                onChange={handleMssqlSettingChange('password')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.database')}
                value={mssqlSettings.database}
                onChange={handleMssqlSettingChange('database')}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={translate('database.pid')}
                value={mssqlSettings.pid}
                onChange={handleMssqlSettingChange('pid')}
                disabled={loading}
                helperText={translate('database.pid_help')}
              />
            </Grid>
          </Grid>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : translate('button.save_settings')}
          </Button>
          
          {/* Migration button - show when changing database types */}
          {dbType !== currentDbType && !(dbType === '' || currentDbType === '') ? (
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleMigrateData}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : translate('database.migrate_data')}
            </Button>
          ) : null}
        </Box>
      </Paper>

      {message.text && (
        <Alert severity={message.type || 'info'} sx={{ mt: 2 }}>
          {message.text}
        </Alert>
      )}

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {translate('database.settings_description')}
      </Typography>
    </Box>
  );
};

export default DatabaseSettings;