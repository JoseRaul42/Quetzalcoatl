const { spawn } = require('child_process');

// Start the backend server
const backend = spawn('node', ['./src/routes/kraken-test.js'], {
  stdio: 'inherit',
  shell: true,
});

// Start the frontend (npm run dev)
const frontend = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

backend.on('close', (code) => {
  console.log(`Backend server process exited with code ${code}`);
});

frontend.on('close', (code) => {
  console.log(`Frontend dev server exited with code ${code}`);
});
