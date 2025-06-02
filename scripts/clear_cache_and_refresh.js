// Script to clear frontend cache and refresh OCR status
// Run this in the browser console to force a refresh of the status

console.log('🔄 Clearing frontend cache and refreshing OCR status...');

// Clear localStorage cache
const cacheKeys = Object.keys(localStorage).filter(key => 
  key.includes('cache') || key.includes('status') || key.includes('ocr')
);

cacheKeys.forEach(key => {
  localStorage.removeItem(key);
  console.log(`🗑️ Cleared cache key: ${key}`);
});

// Clear sessionStorage cache
const sessionKeys = Object.keys(sessionStorage).filter(key => 
  key.includes('cache') || key.includes('status') || key.includes('ocr')
);

sessionKeys.forEach(key => {
  sessionStorage.removeItem(key);
  console.log(`🗑️ Cleared session key: ${key}`);
});

// Force refresh the page
console.log('🔄 Refreshing page to reload status...');
setTimeout(() => {
  window.location.reload();
}, 1000);