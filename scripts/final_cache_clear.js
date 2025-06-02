// Final cache clear to show updated status for both files
// Run this in the browser console

console.log('🧹 Final cache clear for updated status...');

// Clear all status-related cache
Object.keys(localStorage).forEach(key => {
    if (key.includes('status') || key.includes('statuses')) {
        localStorage.removeItem(key);
        console.log(`🗑️ Cleared: ${key}`);
    }
});

Object.keys(sessionStorage).forEach(key => {
    if (key.includes('status') || key.includes('statuses')) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Cleared: ${key}`);
    }
});

// Trigger global refresh
console.log('📡 Triggering global refresh...');
window.dispatchEvent(new Event('globalRefresh'));

console.log('✅ Cache cleared! Both files should now show correct status:');
console.log('   📄 First file (28052025_INGRESO): OCR Processed');
console.log('   📄 Second file (FDE.PDF): Text Extracted');