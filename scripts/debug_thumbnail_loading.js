// Debug script to check thumbnail loading in browser console
// Run this in the browser developer console on the PDF results page

console.log('🔍 Debugging Thumbnail Loading...');

// Find all ThumbnailViewer components
const thumbnailCards = document.querySelectorAll('[alt*="Thumbnail"]');
console.log(`Found ${thumbnailCards.length} thumbnail elements`);

// Check what URLs are being requested
const images = document.querySelectorAll('img[src*="thumbnail"]');
console.log('Thumbnail URLs being requested:');
images.forEach((img, index) => {
    console.log(`${index + 1}. ${img.src}`);
    console.log(`   Alt: ${img.alt}`);
    console.log(`   Status: ${img.complete ? 'Loaded' : 'Loading/Failed'}`);
});

// Check network requests
if (window.performance && window.performance.getEntriesByType) {
    const networkEntries = window.performance.getEntriesByType('resource');
    const thumbnailRequests = networkEntries.filter(entry => 
        entry.name.includes('thumbnail')
    );
    
    console.log('\n📡 Network requests for thumbnails:');
    thumbnailRequests.forEach((request, index) => {
        console.log(`${index + 1}. ${request.name}`);
        console.log(`   Status: ${request.responseStatus || 'Unknown'}`);
        console.log(`   Duration: ${request.duration}ms`);
    });
}

// Check for any error messages in console
console.log('\n🚨 Check for any thumbnail-related errors above this message');

// Test a direct API call
const testFileId = '01YZ3KRSGACNJGN6ILFJB3KJVOEBF3USSD';
fetch(`http://localhost:8000/api/thumbnails/thumbnail/${testFileId}`)
    .then(response => {
        console.log(`\n🧪 Direct API test for ${testFileId}:`);
        console.log(`Status: ${response.status}`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);
        return response.blob();
    })
    .then(blob => {
        console.log(`Blob size: ${blob.size} bytes`);
        if (blob.size > 0) {
            const url = URL.createObjectURL(blob);
            console.log(`✅ Thumbnail loaded successfully: ${url}`);
            
            // Create a test image to verify
            const testImg = document.createElement('img');
            testImg.src = url;
            testImg.style.position = 'fixed';
            testImg.style.top = '10px';
            testImg.style.right = '10px';
            testImg.style.zIndex = '9999';
            testImg.style.border = '2px solid red';
            testImg.style.maxWidth = '200px';
            testImg.title = 'Test thumbnail - should be visible';
            document.body.appendChild(testImg);
            
            console.log('🖼️ Added test thumbnail to top-right corner of page');
        }
    })
    .catch(error => {
        console.error(`❌ Direct API test failed:`, error);
    });