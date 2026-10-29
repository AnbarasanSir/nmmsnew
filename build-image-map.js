const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'assets');

const imageMap = {};

function scanImages(dir, relPrefix = '') {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanImages(fullPath, relPrefix ? relPrefix + '/' + file : file);
        } else if (/\.(png|jpe?g|svg|webp|gif)$/i.test(file)) {
            const relPath = (relPrefix ? relPrefix + '/' + file : file).replace(/\\/g, '/');
            // Store under multiple keys for resilient lookup:
            // 1. Full relative path from assets
            imageMap[relPath.toLowerCase()] = 'assets/' + relPath;
            
            // 2. Path without section name (e.g. "image/unit11/q1.png" instead of "matquiz/image/unit11/q1.png")
            const parts = relPath.split('/');
            if (parts.length > 1) {
                const withoutSec = parts.slice(1).join('/');
                imageMap[withoutSec.toLowerCase()] = 'assets/' + relPath;
                // With images/ instead of image/
                imageMap[withoutSec.toLowerCase().replace(/^image\//, 'images/')] = 'assets/' + relPath;
                // With hyphens instead of underscores
                imageMap[withoutSec.toLowerCase().replace(/_/g, '-')] = 'assets/' + relPath;
                // With underscores instead of hyphens
                imageMap[withoutSec.toLowerCase().replace(/-/g, '_')] = 'assets/' + relPath;
            }
        }
    }
}

scanImages(base);
console.log('Indexed image keys:', Object.keys(imageMap).length);

const outContent = '// Auto-generated image resolution dictionary\nwindow.NMMS_IMAGE_MAP = ' + JSON.stringify(imageMap, null, 2) + ';\n';
fs.writeFileSync(path.join(__dirname, 'js', 'image-map.js'), outContent);
console.log('Wrote js/image-map.js successfully!');
