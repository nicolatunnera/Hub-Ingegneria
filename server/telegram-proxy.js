#!/usr/bin/env node

/**
 * Proxy Telegram per le notifiche dell'Engineering Cloud Hub.
 * Nasconde il token del bot al browser: il client chiama questo endpoint,
 * il token resta nel server (variabile d'ambiente).
 *
 * Deploy dove vuoi (il progetto ha già un'app Render con server.js):
 *   npm install express firebase-admin
 *   TELEGRAM_BOT_TOKEN=...  FIREBASE_KEY_JSON=/percorso/chiave.json  PORT=3001 node server/telegram-proxy.js
 *
 * Poi nel client (js/config.js):
 *   window.TELEGRAM_PROXY_URL = "https://<host>/telegram";
 *
 * Il payload accettato è { text, chat_id?, role? }: se non arriva chat_id il
 * messaggio parte agli iscritti Firestore filtrati per role, mai a destinazioni
 * libere decise dal chiamante.
 */

const express = require('express');
const admin = require('firebase-admin');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN non impostata');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(
    process.env.FIREBASE_KEY_JSON ? require(process.env.FIREBASE_KEY_JSON) : require('../firebase-key.json')
  ),
});
const db = admin.firestore();

const WINDOW_MS = 60000;
const MAX_REQUESTS = 10;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

async function resolveChatIds(body) {
  if (body.chat_id) {
    const snapshot = await db.collection('subscribers').where('chatId', '==', String(body.chat_id)).limit(1).get();
    if (snapshot.empty) throw new Error('chat_id non iscritto');
    return [String(body.chat_id)];
  }
  let query = db.collection('subscribers');
  if (body.role) query = query.where('role', '==', body.role);
  const snapshot = await query.get();
  return snapshot.docs.map(doc => doc.data().chatId).filter(Boolean);
}

const app = express();
app.use(express.json({ limit: '8kb' }));

app.post('/telegram', async (req, res) => {
  if (rateLimited(req.ip)) return res.status(429).json({ ok: false, description: 'Troppe richieste' });
  const text = typeof req.body.text === 'string' ? req.body.text.slice(0, 3000) : '';
  if (!text.trim()) return res.status(400).json({ ok: false, description: 'Testo mancante' });
  let chatIds;
  try {
    chatIds = await resolveChatIds(req.body);
  } catch (e) {
    return res.status(400).json({ ok: false, description: e.message });
  }
  if (!chatIds.length) return res.json({ ok: true, sent: 0 });
  const results = await Promise.allSettled(chatIds.map(chatId =>
    fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })
  ));
  const sent = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
  res.json({ ok: sent > 0, sent, total: chatIds.length });
});

app.listen(process.env.PORT || 3001, () => console.log('telegram-proxy in ascolto su ' + (process.env.PORT || 3001)));
