// Force refresh of OCR status data
// Run this in the browser console

console.log('🔄 Forcing OCR status refresh...');

// Clear the specific cache that stores OCR statuses
const cacheKeys = [
    'statuses|parent:01YZ3KRSCUSUSP5E7QIRELBVZJLIPKDKAM,01YZ3KRSF7KLMNBBPHGRBJ4IDUK5H2KYBS,01YZ3KRSFQKHPW4RFWRNA3BAVIXKBLLIT2,01YZ3KRSG3AI3YMNEGFJH3JMGAOMAU6CNU,01YZ3KRSGFLJVNS5FGSFF2ADWJQPM4YDPI,01YZ3KRSGN4P7FIQUEORFLUCSKETMV2QGT,01YZ3KRSHCQULXOFGVKREYNVOBURDAPGYU'
];

// Clear from localStorage
cacheKeys.forEach(key => {
    if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`✅ Cleared cache: ${key}`);
    }
});

// Clear all status-related cache entries
let clearedCount = 0;
Object.keys(localStorage).forEach(key => {
    if (key.includes('status') || key.includes('statuses')) {
        localStorage.removeItem(key);
        clearedCount++;
        console.log(`🗑️ Cleared: ${key}`);
    }
});

console.log(`📊 Total cache entries cleared: ${clearedCount}`);

// Trigger a global refresh event
console.log('📡 Triggering global refresh...');
window.dispatchEvent(new Event('globalRefresh'));

console.log('✅ Cache cleared and refresh triggered!');
console.log('🔄 The page should now reload with fresh status data.');