#!/usr/bin/env node

/**
 * Proxy Telegram per le notifiche dell'Engineering Cloud Hub.
 * Nasconde il token del bot al browser: il client chiama questo endpoint,
 * il token resta nel server (variabile d'ambiente).
 *
 * Deploy: nuovo Web Service su Render con Root directory = server (build `npm install`,
 * start `npm start`), oppure copia questo file nell'app Render già esistente
 * (Engineering-Hub) aggiungendo express e firebase-admin.
 *   npm install
 *   TELEGRAM_BOT_TOKEN=...  FIREBASE_KEY=<contenuto della chiave.json>  node telegram-proxy.js
 *
 * Poi nel client (js/config.js):
 *   window.TELEGRAM_PROXY_URL = "https://<host>/telegram";
 *
 * Il payload accettato è { text, chat_id?, role? }: se non arriva chat_id il
 * messaggio parte agli iscritti Firestore filtrati per role, mai a destinazioni
 * libere decise dal chiamante.
 */

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const admin = require('firebase-admin');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN non impostata');
  process.exit(1);
}

// La chiave service account arriva o come JSON incollato nella variabile
// FIREBASE_KEY, o come path del file in FIREBASE_KEY_JSON (su Render:
// env di tipo "Secret File"). Lettura manuale: un path senza estensione
// finirebbe interpretato come JavaScript da require().
function serviceAccount() {
  const inline = process.env.FIREBASE_KEY;
  if (inline && inline.trim()) return JSON.parse(inline);
  const keyPath = process.env.FIREBASE_KEY_JSON;
  if (keyPath) return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-key.json'), 'utf8'));
}

// Solo nomi e lunghezze: il contenuto della chiave non deve finire nei log.
function envSummary() {
  const inline = process.env.FIREBASE_KEY;
  const keyPath = process.env.FIREBASE_KEY_JSON;
  return 'FIREBASE_KEY ' + (inline && inline.trim() ? 'impostata (' + inline.trim().length + ' caratteri)' : 'vuota') +
    ' · FIREBASE_KEY_JSON ' + (keyPath ? '= ' + keyPath : 'vuota');
}

console.log('Cerco la chiave service account: ' + envSummary());

try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount()) });
} catch (e) {
  console.error('Chiave service account mancante o non leggibile (' + e.message + ').');
  console.error('Cosa ho visto: ' + envSummary());
  console.error('Metti il contenuto del file JSON nella variabile FIREBASE_KEY,');
  console.error('oppure il path del file in FIREBASE_KEY_JSON (su Render: "Add Secret File").');
  process.exit(1);
}
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
// Render mette un proxy davanti: senza questo req.ip è sempre il suo IP e
// il rate limit diventerebbe un ban globale.
app.set('trust proxy', 1);

// Il sito è su un altro dominio (github.io), quindi il browser chiede il
// permesso con un OPTIONS prima del POST: senza questi header la chiamata
// viene bloccata e le notifiche non partono.
// TELEGRAM_ALLOWED_ORIGINS, se impostato, sostituisce la lista di default.
const DEFAULT_ORIGIN = /^https?:\/\/([\w-]+\.)*(github\.io|onrender\.com|localhost(:\d+)?|127\.0\.0\.1(:\d+)?)(\/|$)/;
const EXACT_ORIGINS = (process.env.TELEGRAM_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function originAllowed(origin) {
  if (!origin) return false;
  return EXACT_ORIGINS.length ? EXACT_ORIGINS.includes(origin) : DEFAULT_ORIGIN.test(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Un altro sito non deve poter usare il proxy per spedire messaggi.
  if (origin && !originAllowed(origin)) return res.status(403).json({ ok: false, description: 'Origine non autorizzata' });
  if (originAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
    return res.sendStatus(204);
  }
  next();
});

// Controllo rapido dal browser: deve rispondere {"ok":true,"service":"telegram-proxy"}.
app.get('/health', (req, res) => res.json({ ok: true, service: 'telegram-proxy' }));

app.use(express.json({ limit: '8kb' }));

app.post('/telegram', async (req, res) => {
  if (rateLimited(req.ip)) return res.status(429).json({ ok: false, description: 'Troppe richieste' });
  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.slice(0, 3000) : '';
  if (!text.trim()) return res.status(400).json({ ok: false, description: 'Testo mancante' });
  try {
    const chatIds = await resolveChatIds(body);
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
  } catch (e) {
    // Risposta sempre JSON: il client legge res.json() e non una pagina di errore.
    res.status(502).json({ ok: false, description: e.message });
  }
});

app.listen(process.env.PORT || 3001, () => console.log('telegram-proxy in ascolto su ' + (process.env.PORT || 3001)));
