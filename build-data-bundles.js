/**
 * Data bundle generation is permanently disabled for security.
 * Questions and answers are served exclusively through the secure Backend API.
 */
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'js', 'data');
if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
}

console.log('[Security] Data bundles are disabled. Questions are protected on backend.');
