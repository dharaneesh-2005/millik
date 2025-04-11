// This script will start the server application
import { spawn } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config();

console.log('Starting Millik application server...');
console.log('Environment loaded, database connection:', process.env.DATABASE_URL?.substring(0, 15) + '...');

// Start the server
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit'
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.kill('SIGINT');
  process.exit(0);
});