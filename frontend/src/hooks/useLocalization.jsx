import { useState, useEffect, useContext, createContext } from 'react';

// Create a context for localization
const LocalizationContext = createContext();

// Default language
const DEFAULT_LANGUAGE = 'es';

// In-memory cache for translations
let translationsCache = {};
let currentLanguage = DEFAULT_LANGUAGE;

// API function to fetch translations
const fetchTranslations = async (language = DEFAULT_LANGUAGE) => {
  try {
    const response = await fetch('/api/settings/localizations');
    if (!response.ok) {
      throw new Error('Failed to fetch translations');
    }
    
    const allTranslations = await response.json();
    
    // Group translations by language
    const translationsByLanguage = {};
    allTranslations.forEach(item => {
      if (!translationsByLanguage[item.language]) {
        translationsByLanguage[item.language] = {};
      }
      translationsByLanguage[item.language][item.key] = item.value;
    });
    
    // Cache all languages
    translationsCache = translationsByLanguage;
    
    return translationsByLanguage[language] || {};
  } catch (error) {
    console.error('Error fetching translations:', error);
    return {};
  }
};

// Get translation from cache or return key as fallback
const getTranslation = (key, language = currentLanguage, fallbackLanguage = 'en') => {
  // Try current language first
  if (translationsCache[language] && translationsCache[language][key]) {
    return translationsCache[language][key];
  }
  
  // Try fallback language
  if (fallbackLanguage !== language && translationsCache[fallbackLanguage] && translationsCache[fallbackLanguage][key]) {
    return translationsCache[fallbackLanguage][key];
  }
  
  // Return the key itself as last resort
  return key;
};

// Hook for using translations
export const useLocalization = () => {
  const [language, setLanguage] = useState(() => {
    // Get language from localStorage or use default
    return localStorage.getItem('app_language') || DEFAULT_LANGUAGE;
  });
  
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    currentLanguage = language;
    localStorage.setItem('app_language', language);
    
    const loadTranslations = async () => {
      setLoading(true);
      const newTranslations = await fetchTranslations(language);
      setTranslations(newTranslations);
      setLoading(false);
    };

    loadTranslations();
  }, [language]);

  // Translation function
  const t = (key, params = {}) => {
    let translation = getTranslation(key, language);
    
    // Simple parameter replacement
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{${param}}`, params[param]);
    });
    
    return translation;
  };

  // Function to change language
  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
  };

  // Function to refresh translations (useful after adding new ones)
  const refreshTranslations = async () => {
    setLoading(true);
    translationsCache = {}; // Clear cache
    const newTranslations = await fetchTranslations(language);
    setTranslations(newTranslations);
    setLoading(false);
  };

  return {
    t,
    language,
    changeLanguage,
    loading,
    refreshTranslations,
    availableLanguages: Object.keys(translationsCache)
  };
};

// Provider component for localization context
export const LocalizationProvider = ({ children }) => {
  const localization = useLocalization();
  
  return (
    <LocalizationContext.Provider value={localization}>
      {children}
    </LocalizationContext.Provider>
  );
};

// Hook to use localization context
export const useLocalizationContext = () => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalizationContext must be used within a LocalizationProvider');
  }
  return context;
};

// Simple function for quick translations without hooks (useful in non-component contexts)
export const translate = (key, language = currentLanguage) => {
  return getTranslation(key, language);
};

export default useLocalization;