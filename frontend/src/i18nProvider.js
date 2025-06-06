// React-admin i18nProvider that works with our existing backend API
let translationsCache = {};
let availableLocales = [];
let translationsLoaded = false;

// Fetch translations from our backend API
const fetchTranslations = async () => {
  try {
    const response = await fetch('/api/settings/localizations');
    if (!response.ok) {
      throw new Error('Failed to fetch translations');
    }
    
    const allTranslations = await response.json();
    
    // Group translations by language
    const translationsByLanguage = {};
    const locales = new Set();
    
    allTranslations.forEach(item => {
      if (!translationsByLanguage[item.language]) {
        translationsByLanguage[item.language] = {};
      }
      translationsByLanguage[item.language][item.key] = item.value;
      locales.add(item.language);
    });
    
    // Cache all languages
    translationsCache = translationsByLanguage;
    availableLocales = Array.from(locales).map(locale => ({
      locale,
      name: locale === 'en' ? 'English' : locale === 'es' ? 'Español' : locale
    }));
    
    translationsLoaded = true;
    console.log('Translations loaded successfully:', Object.keys(translationsByLanguage));
    
    return translationsByLanguage;
  } catch (error) {
    console.error('Error fetching translations:', error);
    // Set fallback translations to prevent showing keys
    const currentLocale = localStorage.getItem('app_language') || 'es';
    translationsCache = {
      [currentLocale]: {
        'app.title': currentLocale === 'es' ? 'Navegador de Archivos CHRISTUS Health' : 'CHRISTUS Health File Navigator'
      }
    };
    translationsLoaded = true;
    return translationsCache;
  }
};

// Initialize translations cache
fetchTranslations();

const i18nProvider = {
  translate: (key, options = {}) => {
    const currentLocale = localStorage.getItem('app_language') || 'es';
    const fallbackLocale = 'en';
    
    // If translations aren't loaded yet, return fallback for app.title
    if (!translationsLoaded && key === 'app.title') {
      return currentLocale === 'es' ? 'Navegador de Archivos CHRISTUS Health' : 'CHRISTUS Health File Navigator';
    }
    
    // Try current locale first
    if (translationsCache[currentLocale] && translationsCache[currentLocale][key]) {
      let translation = translationsCache[currentLocale][key];
      
      // Handle parameters (react-admin style)
      if (options && typeof options === 'object') {
        Object.keys(options).forEach(param => {
          translation = translation.replace(`{${param}}`, options[param]);
        });
      }
      
      return translation;
    }
    
    // Try fallback locale
    if (fallbackLocale !== currentLocale && translationsCache[fallbackLocale] && translationsCache[fallbackLocale][key]) {
      let translation = translationsCache[fallbackLocale][key];
      
      if (options && typeof options === 'object') {
        Object.keys(options).forEach(param => {
          translation = translation.replace(`{${param}}`, options[param]);
        });
      }
      
      return translation;
    }
    
    // For app.title, provide hardcoded fallback instead of returning the key
    if (key === 'app.title') {
      return currentLocale === 'es' ? 'Navegador de Archivos CHRISTUS Health' : 'CHRISTUS Health File Navigator';
    }
    
    // Return the key itself as last resort for other keys
    return key;
  },
  
  changeLocale: async (locale) => {
    try {
      // Set the new locale first
      localStorage.setItem('app_language', locale);
      
      // Fetch fresh translations and wait for completion
      const newTranslations = await fetchTranslations();
      
      // Verify translations were loaded for the new locale
      if (!newTranslations[locale] || Object.keys(newTranslations[locale]).length === 0) {
        console.warn(`No translations found for locale: ${locale}`);
      }
      
      // Force a longer delay to ensure translations are fully cached
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload the page to apply new language
      window.location.reload();
      
    } catch (error) {
      console.error('Error changing locale:', error);
      // Still reload even if there's an error, but with a longer delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    
    return Promise.resolve();
  },
  
  getLocale: () => {
    return localStorage.getItem('app_language') || 'es';
  },
  
  getLocales: () => {
    // Ensure we always return at least English and Spanish
    const defaultLocales = [
      { locale: 'en', name: 'English' },
      { locale: 'es', name: 'Español' }
    ];
    
    return availableLocales.length > 0 ? availableLocales : defaultLocales;
  }
};

export default i18nProvider;