// Clear specific status cache that's preventing updates
// Run this in the browser console

console.log('🧹 Clearing OCR status cache...');

// Clear the specific cache key that was shown in the console logs
const cacheKey = 'statuses|parent:01YZ3KRSCUSUSP5E7QIRELBVZJLIPKDKAM,01YZ3KRSF7KLMNBBPHGRBJ4IDUK5H2KYBS,01YZ3KRSFQKHPW4RFWRNA3BAVIXKBLLIT2,01YZ3KRSG3AI3YMNEGFJH3JMGAOMAU6CNU,01YZ3KRSGFLJVNS5FGSFF2ADWJQPM4YDPI,01YZ3KRSGN4P7FIQUEORFLUCSKETMV2QGT,01YZ3KRSHCQULXOFGVKREYNVOBURDAPGYU';

// Clear from localStorage
if (localStorage.getItem(cacheKey)) {
    localStorage.removeItem(cacheKey);
    console.log('✅ Cleared status cache from localStorage');
} else {
    console.log('ℹ️ No status cache found in localStorage');
}

// Clear from sessionStorage
if (sessionStorage.getItem(cacheKey)) {
    sessionStorage.removeItem(cacheKey);
    console.log('✅ Cleared status cache from sessionStorage');
} else {
    console.log('ℹ️ No status cache found in sessionStorage');
}

// Clear all cache keys that contain 'status'
let clearedCount = 0;
Object.keys(localStorage).forEach(key => {
    if (key.includes('status') || key.includes('statuses')) {
        localStorage.removeItem(key);
        clearedCount++;
        console.log(`🗑️ Cleared: ${key}`);
    }
});

Object.keys(sessionStorage).forEach(key => {
    if (key.includes('status') || key.includes('statuses')) {
        sessionStorage.removeItem(key);
        clearedCount++;
        console.log(`🗑️ Cleared: ${key}`);
    }
});

console.log(`📊 Total cache entries cleared: ${clearedCount}`);

// Force a page reload to refresh the data
console.log('🔄 Reloading page to fetch fresh data...');
setTimeout(() => {
    window.location.reload();
}, 1000);