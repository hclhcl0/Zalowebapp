const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  "src/app/api/followers/import-excel/route.js",
  "src/app/api/followers/register/route.js",
  "src/app/api/followers/staff-links/[id]/route.js",
  "src/app/api/salary-email/send/route.js",
  "src/app/api/salary-email/send-custom/route.js",
  "src/app/api/salary-email/send-tax/route.js",
  "src/app/salary-email/page.js"
];

const targetPattern1 = /\.normalize\("NFD"\)\n\s*\.replace\(\/\[\\u0300-\\u036f\]\/g, ""\)\n\s*\.replace\(\/d\/g, "d"\)/g;
const targetPattern2 = /\.normalize\("NFD"\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ""\)\.replace\(\/đ\/g, "d"\)/g;
const targetPattern3 = /\.normalize\("NFD"\)\n\s*\.replace\(\/\[\\u0300-\\u036f\]\/g, ""\)\n\s*\.replace\(\/đ\/g, "d"\)/g;
const targetPattern4 = /\.normalize\('NFD'\)\.replace\(\/\[\\u0300-\\u036f\]\/g, ""\)\.replace\(\/đ\/g, "d"\)/g;
const targetPattern5 = /\.normalize\("NFD"\)\s*\n\s*\.replace\(\/\[\\u0300-\\u036f\]\/g, ""\)\s*\n\s*\.replace\(\/đ\/g, "d"\)/g;


for (const file of filesToUpdate) {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf-8');
    
    // Replace all occurrences of the normalization regex
    // We want to replace the `.normalize...` with just `.replace(/\s+/g, ' ')`
    const newStr = `.replace(/\\s+/g, ' ')`;
    
    content = content.replace(targetPattern1, newStr);
    content = content.replace(targetPattern2, newStr);
    content = content.replace(targetPattern3, newStr);
    content = content.replace(targetPattern4, newStr);
    content = content.replace(targetPattern5, newStr);
    
    // Just in case it's in a single line or something:
    content = content.replace(/\.normalize\("NFD"\)\s*\.replace\(\/\[\\u0300-\\u036f\]\/g,\s*""\)\s*\.replace\(\/đ\/g,\s*"d"\)/g, newStr);
    content = content.replace(/\.normalize\("NFD"\)\s*\.replace\(\/\[\\u0300-\\u036f\]\/g,\s*""\)\s*\.replace\(\/d\/g,\s*"d"\)/g, newStr);

    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}
