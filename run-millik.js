// Simplified server startup for Millik e-commerce platform
import { exec } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('Starting Millik E-commerce Server...');
console.log(`Database connection: ${process.env.DATABASE_URL ? 'Available' : 'Not available'}`);
console.log(`Razorpay credentials: ${process.env.RAZORPAY_KEY_ID ? 'Available' : 'Not available'}`);

// Run the server using npm
const server = exec('npm run dev', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error starting server: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Server error: ${stderr}`);
    return;
  }
  console.log(`Server output: ${stdout}`);
});

// Pipe output to console
server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);

// Handle server exit
process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.kill('SIGINT');
  process.exit(0);
});