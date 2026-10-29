const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'assets');
const outDir = path.join(__dirname, 'js', 'data');

fs.mkdirSync(outDir, { recursive: true });

const subjects = ['matquiz', 'satmaths', 'satscience', 'satsocial', 'pyq'];

for (const sec of subjects) {
    const dataDir = path.join(base, sec, 'data');
    if (!fs.existsSync(dataDir)) continue;

    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    console.log(`Packaging ${sec}: ${files.length} files...`);

    let jsContent = `// Auto-generated offline data bundle for ${sec}\nwindow.NMMS_DATA = window.NMMS_DATA || {};\n`;

    for (const f of files) {
        const key = `assets/${sec}/data/${f}`;
        const jsonStr = fs.readFileSync(path.join(dataDir, f), 'utf8');
        jsContent += `window.NMMS_DATA['${key}'] = ${jsonStr.trim()};\n`;
    }

    const outFile = path.join(outDir, `${sec}.js`);
    fs.writeFileSync(outFile, jsContent);
    console.log(`Saved ${outFile} (${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} MB)`);
}

console.log('All subject data bundles generated successfully!');

