const express = require('express');
const path = require('path');

const app = express();
const PORT = 3060;

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Markdown viewer running at http://localhost:${PORT}`);
});
