// Icon Generation Script for PWA
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Create SVG template for FLT KPI icon
const createSvg = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="url(#bg)"/>
  <text x="${size/2}" y="${size * 0.42}" font-family="Arial, sans-serif" font-size="${size * 0.25}" font-weight="bold" fill="white" text-anchor="middle">FLT</text>
  <text x="${size/2}" y="${size * 0.72}" font-family="Arial, sans-serif" font-size="${size * 0.18}" font-weight="600" fill="white" text-anchor="middle">KPI</text>
</svg>`;

// Generate SVG icons for each size
sizes.forEach((size) => {
  const svgContent = createSvg(size);
  const filePath = path.join(iconDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filePath, svgContent);
  console.log(`Created: icon-${size}x${size}.svg`);
});

// Create a main icon.svg
fs.writeFileSync(path.join(iconDir, 'icon.svg'), createSvg(512));
console.log('Created: icon.svg');

console.log('\\nSVG icons created successfully!');
console.log('\\nTo convert to PNG, you can use:');
console.log('1. Online converter: https://svgtopng.com/');
console.log('2. Or install sharp: npm install sharp');
console.log('   Then modify this script to use sharp for PNG conversion');
