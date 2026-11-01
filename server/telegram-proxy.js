#!/usr/bin/env node

/**
 * Proxy Telegram per le notifiche dell'Engineering Cloud Hub.
 * Nasconde il token del bot al browser: il client chiama questo endpoint,
 * il token resta nel server (variabile d'ambiente).
 *
 * Deploy: nuovo Web Service su Render, Root directory = server,
 * build `npm install`, start `npm start`.
 * Unica variabile d'ambiente obbligatoria: TELEGRAM_BOT_TOKEN.
 *
 * Gli iscritti alla newsletter si leggono in due modi:
 *   - ADMIN  : service account (FIREBASE_KEY / FIREBASE_KEY_JSON), necessario
 *              quando le regole Firestore diventeranno private;
 *   - REST   : API pubblica di Firestore con l'apiKey del client, usata quando
 *              il service account non c'è. Funziona finché le regole in vigore
 *              lasciano leggere la collezione `subscribers`.
 * Il proxy parte comunque: sceglie il modo disponibile e lo dice su /health.
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

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN non impostata');
  process.exit(1);
}

const PROJECT = process.env.FIRESTORE_PROJECT || 'hub-ingegneria';
// apiKey già pubblica in js/config.js: serve solo come credenziale di lettura
// REST, non è un segreto e non lo diventa qui.
const API_KEY = process.env.FIRESTORE_API_KEY || 'AIzaSyA5nEN5QiDwSxIShJdwmpbEoHKkEkNLIxM';

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

// firebase-admin si carica solo se il service account esiste: senza, il
// modulo resterebbe una dipendenza da installare e inizializzare per niente.
let db = null;
let mode = 'rest';

function tryAdmin() {
  let account;
  try {
    account = serviceAccount();
  } catch (e) {
    return { reason: 'service account non configurato o file non leggibile: ' + e.message };
  }
  let admin;
  try {
    admin = require('firebase-admin');
  } catch (e) {
    return { reason: 'pacchetto firebase-admin non installato: npm install firebase-admin' };
  }
  try {
    admin.initializeApp({ credential: admin.credential.cert(account) });
    return { db: admin.firestore() };
  } catch (e) {
    return { reason: 'inizializzazione Admin SDK fallita: ' + e.message };
  }
}

const adminSetup = tryAdmin();
if (adminSetup.db) {
  db = adminSetup.db;
  mode = 'admin';
  console.log('Lettura iscritti: service account (modo admin).');
} else {
  console.log('Lettura iscritti: API REST pubblica di Firestore. Motivo: ' + adminSetup.reason);
  console.log('Funziona finché le regole in vigore fanno leggere la collezione `subscribers`.');
}

// Solo nomi e lunghezze: il contenuto della chiave non deve finire nei log.
function envSummary() {
  const inline = process.env.FIREBASE_KEY;
  const keyPath = process.env.FIREBASE_KEY_JSON;
  return 'FIREBASE_KEY ' + (inline && inline.trim() ? 'impostata (' + inline.trim().length + ' caratteri)' : 'vuota') +
    ' · FIREBASE_KEY_JSON ' + (keyPath ? '= ' + keyPath : 'vuota');
}

function restValue(v) {
  if (!v) return '';
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v || 'doubleValue' in v) return String(v.integerValue ?? v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue ? 'true' : '';
  return '';
}

async function subscribersFromRest() {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/subscribers`;
  const rows = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({ key: API_KEY, pageSize: '300' });
    if (pageToken) params.set('pageToken', pageToken);
    const res = await fetch(base + '?' + params);
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 160);
      throw new Error('Firestore REST ' + res.status + ': ' + detail +
        ' (regole troppo strette? imposta FIREBASE_KEY per usare il service account)');
    }
    const json = await res.json();
    for (const doc of json.documents || []) {
      const f = doc.fields || {};
      rows.push({ chatId: String(restValue(f.chatId)), role: String(restValue(f.role)) });
    }
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return rows;
}

async function subscribersFromAdmin() {
  const snapshot = await db.collection('subscribers').get();
  return snapshot.docs.map(d => {
    const f = d.data();
    return { chatId: String(f.chatId || ''), role: String(f.role || '') };
  });
}

// Breve cache: la lista iscritti cambia di rado e il REST paga un giro di rete
// per ogni notifica. Un errore non viene messo in cache.
const CACHE_MS = 30000;
let cache = { at: 0, rows: null };

async function subscribers() {
  if (cache.rows && Date.now() - cache.at < CACHE_MS) return cache.rows;
  const rows = await (db ? subscribersFromAdmin() : subscribersFromRest());
  cache = { at: Date.now(), rows };
  return rows;
}

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
  const rows = await subscribers();
  if (body.chat_id) {
    const wanted = String(body.chat_id);
    if (!rows.some(r => r.chatId === wanted)) throw new Error('chat_id non iscritto');
    return [wanted];
  }
  const role = body.role ? String(body.role) : '';
  return rows.filter(r => r.chatId && (!role || r.role === role)).map(r => r.chatId);
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

// Controllo rapido dal browser: apri https://<host>/health e guarda "mode" e
// "subscribers". Se mode dice "rest" e subscribers dà un errore, le regole
// Firestore non permettono la lettura della lista iscritti.
app.get('/health', async (req, res) => {
  const out = { ok: true, service: 'telegram-proxy', mode };
  try {
    out.subscribers = (await subscribers()).length;
  } catch (e) {
    out.subscribers = 0;
    out.readError = e.message;
  }
  res.json(out);
});

app.use(express.json({ limit: '8kb' }));

app.post('/telegram', async (req, res) => {
  if (rateLimited(req.ip)) return res.status(429).json({ ok: false, description: 'Troppe richieste' });
  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.slice(0, 3000) : '';
  if (!text.trim()) return res.status(400).json({ ok: false, description: 'Testo mancante' });
  try {
    const chatIds = await resolveChatIds(body);
    if (!chatIds.length) return res.json({ ok: true, sent: 0, total: 0 });
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

console.log('Variabili lette: ' + envSummary());
app.listen(process.env.PORT || 3001, () => console.log('telegram-proxy in ascolto su ' + (process.env.PORT || 3001)));
