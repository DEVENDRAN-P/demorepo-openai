require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'GST Buddy API is running' });
});

app.get('/api/ai', (req, res) => {
  res.json({ status: 'AI Gateway Running', gemini: process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'NOT CONFIGURED' });
});

app.get('/api/agent', (req, res) => {
  res.json({ status: 'Agent Orchestrator Running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`GST Buddy API running on http://localhost:${PORT}`);
});
