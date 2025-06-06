// SharePoint Filter Settings Utility
// Manages persistent settings for SharePoint file table filters and sorting

const API_BASE = '/api/settings/settings';

/**
 * Fetch all SharePoint filter settings from the backend
 * @returns {Promise<Object>} Settings object with key-value pairs
 */
export const fetchSharePointFilterSettings = async () => {
  try {
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const allSettings = await response.json();
    const sharepointSettings = {};
    
    // Filter settings for sharepoint_filters category
    allSettings
      .filter(setting => setting.category === 'sharepoint_filters')
      .forEach(setting => {
        sharepointSettings[setting.key] = setting.value;
      });
    
    return sharepointSettings;
  } catch (error) {
    console.error('Error fetching SharePoint filter settings:', error);
    return getDefaultSettings();
  }
};

/**
 * Update a specific SharePoint filter setting
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 * @returns {Promise<boolean>} Success status
 */
export const updateSharePointFilterSetting = async (key, value) => {
  try {
    // First, get all settings to find the ID
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.status}`);
    }
    
    const allSettings = await response.json();
    const setting = allSettings.find(s => s.key === key && s.category === 'sharepoint_filters');
    
    if (!setting) {
      throw new Error(`Setting ${key} not found`);
    }
    
    // Update the setting
    const updateResponse = await fetch(`${API_BASE}/${setting.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...setting,
        value: value
      }),
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update setting: ${updateResponse.status}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating SharePoint filter setting ${key}:`, error);
    return false;
  }
};

/**
 * Update multiple SharePoint filter settings at once
 * @param {Object} settings - Object containing setting key-value pairs
 * @returns {Promise<boolean>} Success status
 */
export const updateMultipleSharePointFilterSettings = async (settings) => {
  try {
    // Get all settings to find the IDs
    const response = await fetch(API_BASE);
    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.status}`);
    }
    
    const allSettings = await response.json();
    const updates = [];
    
    // Create update promises for each setting
    for (const [key, value] of Object.entries(settings)) {
      const setting = allSettings.find(s => s.key === key && s.category === 'sharepoint_filters');
      if (setting) {
        updates.push(
          fetch(`${API_BASE}/${setting.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...setting,
              value: value
            }),
          })
        );
      }
    }
    
    // Execute all updates
    const results = await Promise.all(updates);
    return results.every(res => res.ok);
  } catch (error) {
    console.error('Error updating multiple SharePoint filter settings:', error);
    return false;
  }
};

/**
 * Get default SharePoint filter settings
 * @returns {Object} Default settings
 */
export const getDefaultSettings = () => ({
  sharepoint_default_file_type: 'all',
  sharepoint_default_status: 'all',
  sharepoint_default_size_order: 'asc',
  sharepoint_default_created_order: 'desc',
  sharepoint_default_modified_order: 'desc',
  sharepoint_default_sort_field: 'name',
  sharepoint_default_rows_per_page: '10'
});

/**
 * Get SharePoint filter settings with fallback to defaults
 * @returns {Promise<Object>} Settings object
 */
export const getSharePointFilterSettings = async () => {
  const settings = await fetchSharePointFilterSettings();
  const defaults = getDefaultSettings();
  
  // Merge with defaults to ensure all required settings exist
  return { ...defaults, ...settings };
};

/**
 * Apply settings to SharePoint file table state
 * @param {Object} settings - Settings object
 * @returns {Object} State object for SharePoint file table
 */
export const applySettingsToTableState = (settings) => {
  return {
    fileTypeFilter: settings.sharepoint_default_file_type || 'all',
    statusFilter: settings.sharepoint_default_status || 'all',
    sortField: settings.sharepoint_default_sort_field || 'name',
    sortOrder: getSortOrderForField(settings, settings.sharepoint_default_sort_field || 'name'),
    rowsPerPage: parseInt(settings.sharepoint_default_rows_per_page || '10', 10)
  };
};

/**
 * Get sort order for a specific field based on settings
 * @param {Object} settings - Settings object
 * @param {string} field - Field name
 * @returns {string} Sort order ('asc' or 'desc')
 */
export const getSortOrderForField = (settings, field) => {
  switch (field) {
    case 'size':
      return settings.sharepoint_default_size_order || 'asc';
    case 'created':
      return settings.sharepoint_default_created_order || 'desc';
    case 'modified':
      return settings.sharepoint_default_modified_order || 'desc';
    default:
      return 'asc'; // Default for name, createdBy, lastModifiedBy
  }
};

/**
 * Setting definitions for UI rendering
 */
export const SHAREPOINT_FILTER_SETTING_DEFINITIONS = [
  {
    key: 'sharepoint_default_file_type',
    labelKey: 'settings.default_file_type_filter',
    type: 'select',
    options: [
      { value: 'all', labelKey: 'filter.all_files' },
      { value: 'pdf', labelKey: 'filter.pdf_only' }
    ],
    descriptionKey: 'settings.default_file_type_filter_desc'
  },
  {
    key: 'sharepoint_default_status',
    labelKey: 'settings.default_status_filter',
    type: 'select',
    options: [
      { value: 'all', labelKey: 'filter.all_status' },
      { value: 'processed', labelKey: 'filter.processed' },
      { value: 'processing', labelKey: 'filter.processing' },
      { value: 'error', labelKey: 'filter.error' },
      { value: 'not_processed', labelKey: 'filter.not_processed' },
      { value: 'needs_review', labelKey: 'filter.needs_review' }
    ],
    descriptionKey: 'settings.default_status_filter_desc'
  },
  {
    key: 'sharepoint_default_sort_field',
    labelKey: 'settings.default_sort_field',
    type: 'select',
    options: [
      { value: 'name', labelKey: 'sort.name' },
      { value: 'size', labelKey: 'sort.size' },
      { value: 'created', labelKey: 'sort.created' },
      { value: 'modified', labelKey: 'sort.modified' },
      { value: 'createdBy', labelKey: 'sort.created_by' },
      { value: 'lastModifiedBy', labelKey: 'sort.modified_by' }
    ],
    descriptionKey: 'settings.default_sort_field_desc'
  },
  {
    key: 'sharepoint_default_size_order',
    labelKey: 'settings.file_size_sort_order',
    type: 'select',
    options: [
      { value: 'asc', labelKey: 'sort.size_asc' },
      { value: 'desc', labelKey: 'sort.size_desc' }
    ],
    descriptionKey: 'settings.file_size_sort_order_desc'
  },
  {
    key: 'sharepoint_default_created_order',
    labelKey: 'settings.creation_date_sort_order',
    type: 'select',
    options: [
      { value: 'asc', labelKey: 'sort.date_asc' },
      { value: 'desc', labelKey: 'sort.date_desc' }
    ],
    descriptionKey: 'settings.creation_date_sort_order_desc'
  },
  {
    key: 'sharepoint_default_modified_order',
    labelKey: 'settings.modified_date_sort_order',
    type: 'select',
    options: [
      { value: 'asc', labelKey: 'sort.date_asc' },
      { value: 'desc', labelKey: 'sort.date_desc' }
    ],
    descriptionKey: 'settings.modified_date_sort_order_desc'
  },
  {
    key: 'sharepoint_default_rows_per_page',
    labelKey: 'settings.default_rows_per_page',
    type: 'select',
    options: [
      { value: '10', labelKey: 'pagination.rows_10' },
      { value: '25', labelKey: 'pagination.rows_25' },
      { value: '50', labelKey: 'pagination.rows_50' },
      { value: '100', labelKey: 'pagination.rows_100' }
    ],
    descriptionKey: 'settings.default_rows_per_page_desc'
  }
];