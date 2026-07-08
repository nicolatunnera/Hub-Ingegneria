const express = require('express');
const path = require('path');
const Datastore = require('nedb-promises');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const fs = require('fs');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbs = {};
const COLLECTIONS = [
  'excelHub', 'textHub', 'historyHub', 'subscribers',
  'teamHub', 'notesHub', 'newsHub', 'archiveFolders'
];
COLLECTIONS.forEach(name => {
  dbs[name] = Datastore.create({ filename: path.join(DATA_DIR, name + '.db'), autoload: true });
});

function asPlainObj(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest;
}

function now() { return new Date().toISOString(); }

app.get('/health', (req, res) => res.json({ status: 'ok', time: now() }));
app.get('/api/now', (req, res) => res.json({ now: now() }));

// Route specifiche (devono stare PRIMA delle route generiche /api/:collection)
app.get('/api/config', (req, res) => {
  res.json({
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || ''
  });
});
app.post('/api/chat', async (req, res) => {
  try {
    const body = { messages: req.body.messages || [], model: req.body.model || 'openai' };
    const apiRes = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await apiRes.text();
    res.json({ choices: [{ message: { content: text } }] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/:collection', async (req, res) => {
  const db = dbs[req.params.collection];
  if (!db) return res.status(404).json({ error: 'Collection not found' });
  const docs = await db.find({});
  const result = docs.map(d => ({ id: d._id, ...asPlainObj(d) }));
  if (req.query.sort) {
    const [field, dir] = req.query.sort.split(':');
    result.sort((a, b) => {
      const va = a[field] || '', vb = b[field] || '';
      return dir === 'desc' ? String(vb).localeCompare(String(va)) : String(va).localeCompare(String(vb));
    });
  }
  res.json(result);
});

app.get('/api/:collection/:id', async (req, res) => {
  const db = dbs[req.params.collection];
  if (!db) return res.status(404).json({ error: 'Collection not found' });
  const doc = await db.findOne({ _id: req.params.id });
  if (!doc) return res.status(404).json(null);
  res.json({ id: doc._id, ...asPlainObj(doc) });
});

app.post('/api/:collection', async (req, res) => {
  const db = dbs[req.params.collection];
  if (!db) return res.status(404).json({ error: 'Collection not found' });
  const data = { ...req.body, createdAt: req.body.createdAt || now() };
  const doc = await db.insert(data);
  res.json({ id: doc._id });
});

app.patch('/api/:collection/:id', async (req, res) => {
  const db = dbs[req.params.collection];
  if (!db) return res.status(404).json({ error: 'Collection not found' });
  await db.update({ _id: req.params.id }, { $set: req.body });
  res.json({ ok: true });
});

app.delete('/api/:collection/:id', async (req, res) => {
  const db = dbs[req.params.collection];
  if (!db) return res.status(404).json({ error: 'Collection not found' });
  await db.remove({ _id: req.params.id });
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname, '..', 'client')));

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`┌────────────────────────────────────────────┐`);
  console.log(`│  Engineering Cloud Hub - Server            │`);
  console.log(`│  🌐 http://localhost:${PORT}                 │`);
  console.log(`│  📁 Dati salvati in: server/data/          │`);
  console.log(`└────────────────────────────────────────────┘`);
});
