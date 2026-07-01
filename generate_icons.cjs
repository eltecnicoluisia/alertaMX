const sharp = require('sharp');
const fs = require('fs');

async function generate() {
  try {
    const svgBuffer = fs.readFileSync('./public/favicon.svg');
    
    // Create a 512x512 SVG wrapper to scale it properly
    const svgString = `<svg width="512" height="512" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" fill="#0f1115"/>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    await sharp(Buffer.from(svgString))
      .resize(192, 192)
      .png()
      .toFile('./public/pwa-192x192.png');
      
    await sharp(Buffer.from(svgString))
      .resize(512, 512)
      .png()
      .toFile('./public/pwa-512x512.png');
      
    console.log("Icons generated!");
  } catch (err) {
    console.error(err);
  }
}
generate();
