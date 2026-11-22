#!/usr/bin/env node
'use strict';

const path = require('path');
const { execSync } = require('child_process');
const express = require('express');

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: mdview [options]

Options:
  -p, --port <number>   Port to listen on (default: 3060)
  --no-open             Do not open the browser automatically
  -h, --help            Show this help message
`);
  process.exit(0);
}

let port = 3060;
let autoOpen = true;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '-p' || args[i] === '--port') && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--no-open') {
    autoOpen = false;
  }
}

const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(port, () => {
  const url = `http://localhost:${port}`;
  console.log(`Markdown viewer running at ${url}`);
  if (autoOpen) {
    try {
      const cmd = process.platform === 'darwin' ? 'open'
        : process.platform === 'win32' ? 'start'
        : 'xdg-open';
      execSync(`${cmd} ${url}`);
    } catch {
      // silently skip if open fails
    }
  }
});
