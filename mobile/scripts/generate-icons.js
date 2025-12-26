#!/usr/bin/env node
/**
 * App Icon Generator for Shield AI
 * Generates all required icon sizes for iOS and Android from a source image
 *
 * Usage: node scripts/generate-icons.js [source-image.png]
 *
 * Requirements:
 * - npm install sharp
 * - Source image should be at least 1024x1024 PNG
 */

const fs = require('fs');
const path = require('path');

// Icon sizes required for each platform
const IOS_SIZES = [
  { size: 20, scale: 1, name: 'icon-20.png' },
  { size: 20, scale: 2, name: 'icon-20@2x.png' },
  { size: 20, scale: 3, name: 'icon-20@3x.png' },
  { size: 29, scale: 1, name: 'icon-29.png' },
  { size: 29, scale: 2, name: 'icon-29@2x.png' },
  { size: 29, scale: 3, name: 'icon-29@3x.png' },
  { size: 40, scale: 1, name: 'icon-40.png' },
  { size: 40, scale: 2, name: 'icon-40@2x.png' },
  { size: 40, scale: 3, name: 'icon-40@3x.png' },
  { size: 60, scale: 2, name: 'icon-60@2x.png' },
  { size: 60, scale: 3, name: 'icon-60@3x.png' },
  { size: 76, scale: 1, name: 'icon-76.png' },
  { size: 76, scale: 2, name: 'icon-76@2x.png' },
  { size: 83.5, scale: 2, name: 'icon-83.5@2x.png' },
  { size: 1024, scale: 1, name: 'icon-1024.png' }, // App Store
];

const ANDROID_SIZES = [
  { size: 48, folder: 'mipmap-mdpi', name: 'ic_launcher.png' },
  { size: 72, folder: 'mipmap-hdpi', name: 'ic_launcher.png' },
  { size: 96, folder: 'mipmap-xhdpi', name: 'ic_launcher.png' },
  { size: 144, folder: 'mipmap-xxhdpi', name: 'ic_launcher.png' },
  { size: 192, folder: 'mipmap-xxxhdpi', name: 'ic_launcher.png' },
  { size: 512, folder: '', name: 'playstore-icon.png' }, // Play Store
];

// Adaptive icon foreground (Android)
const ANDROID_ADAPTIVE_SIZES = [
  { size: 108, folder: 'mipmap-mdpi', name: 'ic_launcher_foreground.png' },
  { size: 162, folder: 'mipmap-hdpi', name: 'ic_launcher_foreground.png' },
  { size: 216, folder: 'mipmap-xhdpi', name: 'ic_launcher_foreground.png' },
  { size: 324, folder: 'mipmap-xxhdpi', name: 'ic_launcher_foreground.png' },
  { size: 432, folder: 'mipmap-xxxhdpi', name: 'ic_launcher_foreground.png' },
];

async function generateIcons(sourcePath) {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('Installing sharp...');
    require('child_process').execSync('npm install sharp', { stdio: 'inherit' });
    sharp = require('sharp');
  }

  const assetsDir = path.join(__dirname, '..', 'assets');
  const iosOutputDir = path.join(assetsDir, 'ios-icons');
  const androidOutputDir = path.join(assetsDir, 'android-icons');

  // Create output directories
  fs.mkdirSync(iosOutputDir, { recursive: true });
  fs.mkdirSync(androidOutputDir, { recursive: true });

  console.log('Generating iOS icons...');
  for (const icon of IOS_SIZES) {
    const size = Math.round(icon.size * icon.scale);
    const outputPath = path.join(iosOutputDir, icon.name);

    await sharp(sourcePath)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  ✓ ${icon.name} (${size}x${size})`);
  }

  console.log('\nGenerating Android icons...');
  for (const icon of ANDROID_SIZES) {
    const folderPath = icon.folder
      ? path.join(androidOutputDir, icon.folder)
      : androidOutputDir;
    fs.mkdirSync(folderPath, { recursive: true });

    const outputPath = path.join(folderPath, icon.name);
    await sharp(sourcePath)
      .resize(icon.size, icon.size)
      .png()
      .toFile(outputPath);

    console.log(`  ✓ ${icon.folder}/${icon.name} (${icon.size}x${icon.size})`);
  }

  console.log('\nGenerating Android adaptive icons...');
  for (const icon of ANDROID_ADAPTIVE_SIZES) {
    const folderPath = path.join(androidOutputDir, icon.folder);
    fs.mkdirSync(folderPath, { recursive: true });

    const outputPath = path.join(folderPath, icon.name);

    // For adaptive icons, we need padding (the visible area is ~66% of the image)
    const padding = Math.round(icon.size * 0.17); // 17% padding on each side
    const innerSize = icon.size - padding * 2;

    await sharp(sourcePath)
      .resize(innerSize, innerSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);

    console.log(`  ✓ ${icon.folder}/${icon.name} (${icon.size}x${icon.size})`);
  }

  console.log('\n✅ Icon generation complete!');
  console.log(`\niOS icons: ${iosOutputDir}`);
  console.log(`Android icons: ${androidOutputDir}`);
  console.log('\nNext steps:');
  console.log('1. Copy iOS icons to your Xcode project');
  console.log('2. Copy Android icons to android/app/src/main/res/');
  console.log('3. Update app.json to point to the new icons');
}

// Main
const sourceImage = process.argv[2] || path.join(__dirname, '..', 'assets', 'icon.png');

if (!fs.existsSync(sourceImage)) {
  console.error(`Source image not found: ${sourceImage}`);
  console.log('\nUsage: node scripts/generate-icons.js [source-image.png]');
  console.log('\nCreate a 1024x1024 PNG icon and save it as assets/icon.png');
  process.exit(1);
}

generateIcons(sourceImage).catch(console.error);
