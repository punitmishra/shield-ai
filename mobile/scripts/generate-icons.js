/**
 * Shield AI Icon Generator
 * Generates app icons as SVG files and optionally converts to PNG
 *
 * Usage:
 *   node scripts/generate-icons.js         # Generate SVGs only
 *   node scripts/generate-icons.js --png   # Generate SVGs + PNGs (requires sharp)
 *
 * To install sharp for PNG generation:
 *   npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

const colors = {
  primary: '#22c55e',
  background: '#0f172a',
  backgroundLight: '#1e293b',
};

// Icon sizes for different platforms
const iconSizes = {
  'icon.png': 1024,           // App icon
  'adaptive-icon.png': 1024,  // Android adaptive icon
  'splash-icon.png': 512,     // Splash screen
  'favicon.png': 48,          // Web favicon
  'notification-icon.png': 96, // Notification icon
};

// App Icon SVG
const appIconSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.background}"/>
      <stop offset="100%" style="stop-color:${colors.backgroundLight}"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:#16a34a"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="224" fill="url(#bgGrad)"/>
  <circle cx="512" cy="480" r="320" fill="none" stroke="${colors.primary}" stroke-width="4" opacity="0.3"/>
  <path d="M512 180 L720 260 C720 260 740 480 720 600 C700 720 512 820 512 820 C512 820 324 720 304 600 C284 480 304 260 304 260 Z" fill="url(#shieldGrad)" opacity="0.95"/>
  <path d="M420 480 L480 540 L600 400" fill="none" stroke="white" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="512" y="920" text-anchor="middle" font-family="sans-serif" font-size="80" font-weight="700" fill="white" opacity="0.9">SHIELD AI</text>
</svg>`;

// Adaptive Icon
const adaptiveIconSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:#16a34a"/>
    </linearGradient>
  </defs>
  <path d="M512 160 L740 250 C740 250 760 500 740 640 C720 780 512 880 512 880 C512 880 304 780 284 640 C264 500 284 250 284 250 Z" fill="url(#shieldGrad)"/>
  <path d="M400 500 L475 575 L624 400" fill="none" stroke="white" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Splash Icon
const splashIconSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:#16a34a"/>
    </linearGradient>
  </defs>
  <circle cx="256" cy="256" r="240" fill="none" stroke="${colors.primary}" stroke-width="2" opacity="0.2"/>
  <path d="M256 60 L400 110 C400 110 420 256 400 340 C380 424 256 480 256 480 C256 480 132 424 112 340 C92 256 112 110 112 110 Z" fill="url(#shieldGrad)"/>
  <path d="M190 260 L235 305 L330 200" fill="none" stroke="white" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const faviconSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="${colors.background}"/>
  <path d="M24 6 L40 12 C40 12 42 24 40 32 C38 40 24 46 24 46 C24 46 10 40 8 32 C6 24 8 12 8 12 Z" fill="${colors.primary}"/>
  <path d="M17 24 L22 29 L31 19" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const assetsDir = path.join(__dirname, '..', 'assets');
const svgDir = path.join(assetsDir, 'svg');

if (!fs.existsSync(svgDir)) {
  fs.mkdirSync(svgDir, { recursive: true });
}

const icons = [
  { name: 'icon.svg', content: appIconSVG },
  { name: 'adaptive-icon.svg', content: adaptiveIconSVG },
  { name: 'splash-icon.svg', content: splashIconSVG },
  { name: 'favicon.svg', content: faviconSVG },
];

icons.forEach(({ name, content }) => {
  fs.writeFileSync(path.join(svgDir, name), content);
  console.log('Created:', name);
});

console.log('\nSVGs created in assets/svg/');

// Convert to PNG if --png flag is provided
const generatePng = process.argv.includes('--png');

if (generatePng) {
  try {
    const sharp = require('sharp');
    console.log('\nGenerating PNGs...');

    const pngPromises = Object.entries(iconSizes).map(async ([pngName, size]) => {
      const svgName = pngName.replace('.png', '.svg');
      const svgPath = path.join(svgDir, svgName);
      const pngPath = path.join(assetsDir, pngName);

      if (fs.existsSync(svgPath)) {
        await sharp(svgPath)
          .resize(size, size)
          .png()
          .toFile(pngPath);
        console.log(`Created: ${pngName} (${size}x${size})`);
      }
    });

    Promise.all(pngPromises).then(() => {
      console.log('\nPNGs created in assets/');
      console.log('✅ Icons ready for app store submission!');
    });
  } catch (e) {
    console.log('\nTo generate PNGs, install sharp:');
    console.log('  npm install sharp --save-dev');
    console.log('Then run: node scripts/generate-icons.js --png');
    console.log('\nOr convert manually at: https://svgtopng.com/');
  }
} else {
  console.log('\nTo generate PNGs, run:');
  console.log('  node scripts/generate-icons.js --png');
  console.log('\nOr convert manually at: https://svgtopng.com/');
}
