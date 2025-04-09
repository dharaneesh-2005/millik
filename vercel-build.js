// Simple build script for Vercel deployment
console.log('Starting Vercel build process...');

// Run the frontend build first
const { execSync } = require('child_process');
try {
  console.log('Building frontend with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('Frontend build completed successfully.');

  // Create a .vercel/output/static directory if it doesn't exist
  const fs = require('fs');
  const path = require('path');
  const outputDir = path.join(process.cwd(), '.vercel', 'output', 'static');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }

  // Copy the dist directory to .vercel/output/static
  console.log('Copying build files to output directory...');
  execSync(`cp -r dist/* ${outputDir}/`, { stdio: 'inherit' });
  console.log('Build files copied successfully.');

  console.log('Vercel build completed successfully!');
} catch (error) {
  console.error('Build error:', error);
  process.exit(1);
}