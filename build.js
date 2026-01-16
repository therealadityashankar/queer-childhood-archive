#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Check if ImageMagick is installed
function checkImageMagick() {
  try {
    execSync('convert -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Compress an image using ImageMagick
function compressImage(inputPath, outputPath) {
  try {
    execSync(`convert "${inputPath}" -resize 500x700 "${outputPath}"`, {
      stdio: 'pipe'
    });
    return true;
  } catch (error) {
    console.error(`Failed to compress ${inputPath}:`, error.message);
    return false;
  }
}

// Process and compress images in a directory
function processImagesInDirectory(dirPath, files) {
  const imageFiles = files
    .filter(f => /^image\d+\.(jpg|jpeg|png|gif|webp)$/i.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0], 10);
      const numB = parseInt(b.match(/\d+/)[0], 10);
      return numA - numB;
    });

  for (const imageFile of imageFiles) {
    const inputPath = path.join(dirPath, imageFile);
    const compressedFileName = `compressed-${imageFile.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '.jpg')}`;
    const outputPath = path.join(dirPath, compressedFileName);

    // Only compress if the compressed version doesn't already exist
    if (!fs.existsSync(outputPath)) {
      compressImage(inputPath, outputPath);
    }
  }
}

async function build() {
  // Check if ImageMagick is installed
  if (!checkImageMagick()) {
    console.error('Error: ImageMagick is not installed.');
    console.error('Please install ImageMagick:');
    console.error('  macOS: brew install imagemagick');
    console.error('  Ubuntu/Debian: sudo apt-get install imagemagick');
    console.error('  Windows: choco install imagemagick');
    process.exit(1);
  }

  // Dynamic import of ESM module
  const { escapeHtml, renderFeedCard, renderResponses, renderIndexHtml } = await import('./worker/src/render.js');

  const templatePath = path.join(__dirname, 'pre-index.html');
  const outputPath = path.join(__dirname, 'index.html');

  if (!fs.existsSync(templatePath)) {
    console.error('Error: pre-index.html not found');
    process.exit(1);
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const responses = getLocalResponses();
  let output = renderIndexHtml(template, responses);
  
  // Check for --cdn flag
  const useCdn = process.argv.includes('--cdn');
  const imageUrl = useCdn ? 'https://cdn.jsdelivr.net/gh/therealadityashankar/trans-project@main' : '';
  output = output.replace(/__IMAGE_URL__/g, imageUrl);
  
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`Built index.html with ${responses.length} responses${useCdn ? ' (using CDN)' : ' (local)'}`);
}

function getLocalResponses() {
  const responsesDir = path.join(__dirname, 'responses');
  if (!fs.existsSync(responsesDir)) {
    return [];
  }

  const dirs = fs.readdirSync(responsesDir)
    .filter(name => {
      const stat = fs.statSync(path.join(responsesDir, name));
      return stat.isDirectory() && /^\d+$/.test(name);
    })
    .sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

  const responses = [];
  for (const timestamp of dirs) {
    const dirPath = path.join(responsesDir, timestamp);
    const mdPath = path.join(dirPath, 'response.md');
    
    let message = '';
    if (fs.existsSync(mdPath)) {
      message = fs.readFileSync(mdPath, 'utf8').trim();
    }

    const files = fs.readdirSync(dirPath);
    
    // Process and compress images
    processImagesInDirectory(dirPath, files);

    const images = files
      .filter(f => /^image\d+\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
      });

    responses.push({
      id: timestamp,
      message,
      images,
      createdAt: new Date(parseInt(timestamp, 10) * 1000).toISOString(),
    });
  }

  return responses;
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
