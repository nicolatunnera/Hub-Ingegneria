// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────
window.onerror = function(msg, url, line) { try { if (window.showToast) window.showToast('JS: ' + msg + ' (riga ' + line + ')', 'error'); } catch(e) {} console.error(msg, url, line); };
console.log('Engineering Cloud Hub v3.5.0');

// ─── TOAST (override) ────────────────────────────────────────────────
window.alert = window.showToast || function(msg) { console.warn('[Alert fallback]', msg); };

// ─── FIREBASE INIT (compat SDK — loaded via <script> in index.html) ────
let db = null, auth = null;
try {
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    auth.signInAnonymously().catch(function(e) { console.warn('Auth anonimo fallito:', e); });
  } else {
    console.warn('Firebase SDK non caricato. Modalità offline.');
  }
} catch (e) {
  console.warn('Firebase init fallito:', e);
}

function escapeHtml(t) { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
window.currentLang = 'it';
function locale() { return window.currentLang === 'en' ? 'en-US' : 'it-IT'; }
function cap(s) { return s.replace(/(^|\s)([a-z])/g, function(m){ return m.toUpperCase(); }); }

// ─── LOGIN ────────────────────────────────────────────────────────────
function DJB2(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; } return h.toString(36); }
function showWelcomeSplash() {
  const splash = document.getElementById('welcomeSplash');
  if (!splash) return;
  const greeting = document.getElementById('welcomeGreeting');
  if (greeting) greeting.textContent = window.username && window.username !== 'Ing' ? `Benvenuto, ${window.username}` : 'Benvenuto';
  splash.style.opacity = '1';
  splash.style.pointerEvents = 'auto';
  splash.onclick = () => {
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => splash.remove(), 700);
  };
}
window.verifyHubLogin = () => {
  const btn = document.getElementById('loginBtn');
  const spinner = document.getElementById('loginSpinner');
  const btnText = document.getElementById('loginBtnText');
  btn.disabled = true; spinner.classList.remove('hidden'); btnText.textContent = 'Verifica...';
  setTimeout(() => {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    function fail() { const err = document.getElementById('loginError'); err.classList.remove('hidden'); setTimeout(() => err.classList.add('hidden'), 4000); btn.disabled = false; spinner.classList.add('hidden'); btnText.textContent = 'Accedi'; }
    function login(role) {
      window.userRole = role; window.username = u;
      showWelcomeSplash();
      if (document.getElementById('rememberMe')?.checked) {
        localStorage.setItem('hub-user', u);
        localStorage.setItem('hub-pass', role === 'owner' ? p : '__acct__');
      } else { localStorage.removeItem('hub-user'); localStorage.removeItem('hub-pass'); }
      const lb = document.getElementById('loginBlocker'); lb.style.opacity = '0';
      setTimeout(() => { lb.remove(); document.getElementById('hubMainContent').classList.remove('hidden'); document.getElementById('hubFooter')?.classList.remove('hidden'); }, 400);
      btn.disabled = false; spinner.classList.add('hidden'); btnText.textContent = 'Accedi';
      setupPermissions();
    }
    if (u === 'Ing' && p === 'Ing') { login('owner'); return; }
    if (!u || !p) { fail(); return; }
    if (!db) { fail(); return; }
    db.collection('accountsHub').where('username', '==', u).get().then(snap => {
      if (!snap.empty) {
        const d = snap.docs[0].data();
        if (d.password === DJB2(p)) { login(d.role || 'user'); return; }
      }
      fail();
    }).catch(() => {
      const err = document.getElementById('loginError'); err.textContent = '⚠️ Errore di connessione.'; err.classList.remove('hidden');
      btn.disabled = false; spinner.classList.add('hidden'); btnText.textContent = 'Accedi';
    });
  }, 600);
};
(function autoLogin() {
  const u = localStorage.getItem('hub-user');
  const p = localStorage.getItem('hub-pass');
  if (u && p) {
    if (u === 'Ing' && p === 'Ing') {
      window.userRole = 'owner'; window.username = 'Ing';
      showWelcomeSplash();
      const lb = document.getElementById('loginBlocker'); if (lb) lb.style.opacity = '0';
      setTimeout(() => { if (lb) lb.remove(); document.getElementById('hubMainContent').classList.remove('hidden'); document.getElementById('hubFooter')?.classList.remove('hidden'); setupPermissions(); }, 400);
    }
  }
})();
document.getElementById('loginUser')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.verifyHubLogin(); });
document.getElementById('loginPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.verifyHubLogin(); });

// ─── PERMISSIONS ──────────────────────────────────────────────────────
function setupPermissions() {
  const role = window.userRole || 'guest';
  const isOwner = role === 'owner';
  const canWrite = role !== 'guest';
  document.querySelectorAll('.requires-owner').forEach(el => el.classList.toggle('hidden', !isOwner));
  document.querySelectorAll('.requires-write').forEach(el => el.classList.toggle('hidden', !canWrite));
  document.querySelectorAll('.requires-guest').forEach(el => el.classList.toggle('hidden', role !== 'guest'));
  if (role === 'guest') {
    document.querySelectorAll('.delete-btn, .delete-cloud-btn, .delete-note-btn, .delete-history-btn').forEach(el => el.remove());
    document.querySelectorAll('#btnSendNews, #btnUploadExcel, #btnUploadDoc, #btnSubscribeTelegram, #btnUnsubscribeTelegram, #testTelegramNotification').forEach(el => el.disabled = true);
  }
  setTimeout(checkPrivateAccess, 500);
  refreshNotesRender();
  refreshAccountsRender();
  refreshSubscribersRender();
  refreshNewsRender();
}

// ─── TOGGLE UTILITY ───────────────────────────────────────────────────
window.closeCalc = () => document.getElementById('calcModal')?.classList.add('hidden');
window.closeNews = () => document.getElementById('newsModal')?.classList.add('hidden');

window.closeUserModal = () => document.getElementById('userModal')?.classList.add('hidden');
window.closeAccountModal = () => document.getElementById('teamModal')?.classList.add('hidden');
window.closeMtbfModal = () => document.getElementById('mtbfModal')?.classList.add('hidden');
window.closeSubscribersModal = () => document.getElementById('subscribersModal')?.classList.add('hidden');
window.closeNewsHistoryModal = () => document.getElementById('newsHistoryModal')?.classList.add('hidden');
window.closeStatsModal = () => document.getElementById('statsModal')?.classList.add('hidden');
window.openUserModal = () => document.getElementById('userModal')?.classList.remove('hidden');
window.openAccountModal = () => {
  document.getElementById('teamModal')?.classList.remove('hidden');
  const uInput = document.getElementById('myAccountUsername');
  const nInput = document.getElementById('myAccountName');
  const pwdSection = document.getElementById('myAccountPwdSection');
  if (uInput) uInput.value = window.username || '';
  if (nInput) nInput.value = window.username || '';
  if (pwdSection) pwdSection.classList.toggle('hidden', window.userRole === 'owner');
  if (window.username && db && window.userRole !== 'owner') {
    db.collection('accountsHub').where('username', '==', window.username).get().then(snap => {
      if (!snap.empty && nInput) nInput.value = snap.docs[0].data().name || window.username;
    }).catch(() => {});
  }
};
window.openMtbfModal = () => document.getElementById('mtbfModal')?.classList.remove('hidden');
window.openSubscribersModal = () => document.getElementById('subscribersModal')?.classList.remove('hidden');
window.openNewsHistoryModal = () => document.getElementById('newsHistoryModal')?.classList.remove('hidden');
window.openStatsModal = () => document.getElementById('statsModal')?.classList.remove('hidden');
window.toggleCalcModal = () => document.getElementById('calcModal')?.classList.toggle('hidden');
window.toggleHubInfo = () => {
  const p = document.getElementById('hubInfoPanel');
  p?.classList.toggle('hidden');
  if (!p?.classList.contains('hidden')) updateHubInfoClock();
};
window.openSidebar = () => document.getElementById('sidebar')?.classList.remove('hidden');
window.closeSidebar = () => document.getElementById('sidebar')?.classList.add('hidden');
window.toggleSidebar = () => document.getElementById('sidebar')?.classList.toggle('hidden');
document.getElementById('sidebarContent')?.addEventListener('click', e => {
  const btn = e.target.closest('.sidebar-btn');
  if (btn && btn.id !== 'hubInfoToggle') {
    window.closeSidebar();
  }
});
window.toggleNewsSidebar = () => document.getElementById('newsModal')?.classList.toggle('hidden');
document.getElementById('newsBtn')?.addEventListener('click', () => window.toggleNewsSidebar());
window.toggleTheme = () => document.documentElement.classList.toggle('dark');
document.getElementById('themeToggle')?.addEventListener('click', () => window.toggleTheme());
let isChatCollapsed = true;
window.toggleChatCollapse = () => {
  isChatCollapsed = !isChatCollapsed;
  document.getElementById('chat-expanded').classList.toggle('hidden', isChatCollapsed);
  document.getElementById('chat-fab').classList.toggle('hidden', !isChatCollapsed);
};

window.toggleExcelModal = () => {
  if (window.userRole === 'guest') { showToast('Accesso non consentito agli ospiti.', 'error'); return; }
  document.getElementById('excelModal')?.classList.toggle('hidden');
};
window.toggleDocModal = () => {
  if (window.userRole === 'guest') { showToast('Accesso non consentito agli ospiti.', 'error'); return; }
  document.getElementById('docModal')?.classList.toggle('hidden');
};
window.toggleNotesModal = () => document.getElementById('notesModal')?.classList.toggle('hidden');
window.toggleArchiveModal = () => {
  if (window.userRole === 'guest') { showToast('Archivio non disponibile per gli ospiti.', 'error'); return; }
  document.getElementById('archiveModal')?.classList.toggle('hidden'); combineAndRenderArchive();
};
window.toggleHistoryModal = () => document.getElementById('historyModal')?.classList.toggle('hidden');

// ─── HUB INFO ─────────────────────────────────────────────────────────
(function populateHubInfo() {
  const uptime = document.getElementById('hubInfoUptime');
  const update = document.getElementById('hubInfoUpdate');
  const ver = document.getElementById('hubInfoVersion');
  if (uptime) uptime.textContent = '01/02/2025';
  if (update) update.textContent = new Date().toLocaleDateString(locale(), { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  if (ver) ver.textContent = '3.5.0';
})();

// ─── HUB INFO CLOCK ──────────────────────────────────────────────────
function updateHubInfoClock() {
  const el = document.getElementById('hubInfoTimeDisplay');
  const panel = document.getElementById('hubInfoPanel');
  if (!el || !panel || panel.classList.contains('hidden')) return;
  const now = new Date();
  el.textContent = `${cap(now.toLocaleDateString(locale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))} — ${now.toLocaleTimeString(locale())}`;
  setTimeout(updateHubInfoClock, 1000);
}

// ─── CALCOLATORE PESO ─────────────────────────────────────────────────
window.updateCalcFields = () => {
  const shape = document.getElementById('calcShape').value;
  const labelDim1 = document.getElementById('labelDim1');
  const divDim2 = document.getElementById('divDim2');
  const lang = window.currentLang || 'it';
  if (shape === 'tondo') { labelDim1.textContent = lang === 'en' ? 'Diameter (mm)' : 'Diametro (mm)'; divDim2.classList.add('hidden'); }
  else if (shape === 'quadro') { labelDim1.textContent = lang === 'en' ? 'Side (mm)' : 'Lato (mm)'; divDim2.classList.add('hidden'); }
  else if (shape === 'piatto') { labelDim1.textContent = lang === 'en' ? 'Width (mm)' : 'Base (mm)'; divDim2.classList.remove('hidden'); }
};
window.calculateWeight = () => {
  const d = parseFloat(document.getElementById('calcMaterial').value);
  const shape = document.getElementById('calcShape').value;
  const a = parseFloat(document.getElementById('calcDim1').value) || 0;
  const b = parseFloat(document.getElementById('calcDim2').value) || 0;
  const l = parseFloat(document.getElementById('calcLength').value) || 0;
  let v = 0;
  if (shape === 'tondo') v = Math.PI * (a / 2) ** 2 * l;
  else if (shape === 'quadro') v = a * a * l;
  else if (shape === 'piatto') v = a * b * l;
  document.getElementById('calcResult').textContent = ((v / 1e6) * d).toFixed(2) + ' kg';
};

// ─── MTBF ──────────────────────────────────────────────────────────────
window.calcMtbf = () => {
  const h = parseFloat(document.getElementById('mtbfHours').value) || 0;
  const f = parseFloat(document.getElementById('mtbfFailures').value) || 0;
  const result = document.getElementById('mtbfResult');
  if (h <= 0 || f <= 0) { result?.classList.add('hidden'); return; }
  const mtbf = h / f;
  const lambda = 1 / mtbf;
  document.getElementById('mtbfValue').textContent = mtbf.toLocaleString(locale(), { maximumFractionDigits: 1 }) + ' h';
  document.getElementById('mtbfLambda').textContent = lambda.toExponential(4);
  document.getElementById('mtbfYears').textContent = (mtbf / 8760).toLocaleString(locale(), { maximumFractionDigits: 1 });
  const R = t => Math.exp(-lambda * t);
  document.getElementById('mtbfR24').textContent = (R(24) * 100).toFixed(2) + '%';
  document.getElementById('mtbfR168').textContent = (R(168) * 100).toFixed(2) + '%';
  document.getElementById('mtbfR720').textContent = (R(720) * 100).toFixed(2) + '%';
  document.getElementById('mtbfR8760').textContent = (R(8760) * 100).toFixed(2) + '%';
  result.classList.remove('hidden');
};
window.toggleMtbfDetails = () => document.getElementById('mtbfDetails')?.classList.toggle('hidden');

// ─── I18N ─────────────────────────────────────────────────────────────
window.changeLanguage = (lang) => {
  window.currentLang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = i18n[lang][key];
      else if (el.hasAttribute('title')) el.title = i18n[lang][key];
      else if (el.hasAttribute('data-i18n-html')) el.innerHTML = i18n[lang][key];
      else el.textContent = i18n[lang][key];
    }
  });
  const li = document.getElementById('lang-it'); const le = document.getElementById('lang-en');
  if (li) li.className = lang === 'it' ? 'px-2.5 py-1 text-xs font-bold bg-blue-600 text-white transition-all' : 'px-2.5 py-1 text-xs font-bold text-gray-400 hover:text-white transition-all';
  if (le) le.className = lang === 'en' ? 'px-2.5 py-1 text-xs font-bold bg-blue-600 text-white transition-all' : 'px-2.5 py-1 text-xs font-bold text-gray-400 hover:text-white transition-all';
  refreshDynamicContent();
};
function refreshDynamicContent() {
  const now = new Date();
  const el = document.getElementById('hubInfoTimeDisplay');
  if (el) el.textContent = `${cap(now.toLocaleDateString(locale(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))} — ${now.toLocaleTimeString(locale())}`;
  const update = document.getElementById('hubInfoUpdate');
  if (update) update.textContent = now.toLocaleDateString(locale(), { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const modalDate = document.getElementById('hubInfoDateDisplay');
  if (modalDate) modalDate.textContent = now.toLocaleDateString(locale(), { day:'2-digit', month:'short', year:'numeric' });
  const modalTime = document.getElementById('hubInfoTimeDisplayModal');
  if (modalTime) modalTime.textContent = now.toLocaleTimeString(locale(), { hour:'2-digit', minute:'2-digit' });
}

// ─── DRAG & DROP ──────────────────────────────────────────────────────
function setupDropzone(zoneId, inputId, textId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;
  zone.onclick = () => input.click();
  zone.ondragover = e => { e.preventDefault(); zone.classList.add('border-blue-500', 'bg-blue-50/10'); };
  zone.ondragleave = () => zone.classList.remove('border-blue-500', 'bg-blue-50/10');
  zone.ondrop = e => {
    e.preventDefault();
    zone.classList.remove('border-blue-500', 'bg-blue-50/10');
    if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; document.getElementById(textId).textContent = e.dataTransfer.files[0].name; }
  };
  input.onchange = () => { if (input.files.length) document.getElementById(textId).textContent = input.files[0].name; };
}
setupDropzone('dropzoneExcel', 'excelFile', 'textDropExcel');
setupDropzone('dropzoneDoc', 'docFile', 'textDropDoc');

// ─── TELEGRAM ─────────────────────────────────────────────────────────
function escapeMarkdown(text) { return text.replace(/[_*`\[]/g, '\\$&'); }
window.escapeMarkdown = escapeMarkdown;

async function sendTelegramBroadcast(text, targetRole) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    let query = db.collection('subscribers');
    if (targetRole) query = query.where('role', '==', targetRole);
    const snap = await query.get();
    await Promise.all(snap.docs.map(uDoc => {
      if (!uDoc.data().chatId) return;
      return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: uDoc.data().chatId, text, parse_mode: 'Markdown' })
      }).catch(() => {});
    }));
  } catch (e) { console.error('Telegram broadcast error:', e); }
}

window.testTelegramNotification = async () => {
  const chatId = document.getElementById('telChatIdInput').value.trim();
  if (!chatId) return alert('Inserisci prima un Chat ID.');
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '\u{1F514} *Test notifica Engineering Hub*\n\nSe vedi questo messaggio, il bot funziona correttamente! \u2705', parse_mode: 'Markdown' })
    });
    const data = await res.json();
    if (data.ok) alert('\u2705 Notifica inviata! Controlla Telegram.');
    else alert('\u274C Errore: ' + (data.description || 'Risposta sconosciuta'));
  } catch (e) { alert('\u274C Errore di rete: ' + e.message); }
};

document.getElementById('btnSubscribeTelegram').onclick = async () => {
  if (!db) return alert('Backend non disponibile.');
  const chatId = document.getElementById('telChatIdInput').value.trim();
  const name = document.getElementById('telNameInput').value.trim() || 'Membro Hub';
  const role = document.getElementById('telOwnerCheck')?.checked ? 'owner' : 'user';
  const username = window.username || '';
  if (!chatId) return alert('Inserisci un Chat ID numerico!');
  await db.collection('subscribers').add({ chatId, name, role, username, subscribedAt: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('telChatIdInput').value = '';
  document.getElementById('telNameInput').value = '';
};
document.getElementById('btnUnsubscribeTelegram').onclick = async () => {
  if (!db) return alert('Backend non disponibile.');
  const chatId = document.getElementById('telChatIdInput').value.trim();
  if (!chatId) return alert('Inserisci il Chat ID per disattivare.');
  const snap = await db.collection('subscribers').get();
  const dels = [];
  snap.forEach(uDoc => { if (uDoc.data().chatId === chatId) dels.push(db.collection('subscribers').doc(uDoc.id).delete()); });
  await Promise.all(dels);
  document.getElementById('telChatIdInput').value = '';
};

let allExcelFiles = [], allTextFiles = [], allFolders = [], allCategories = [];
let lastSubscriberDocs = [];
function renderSubscribers(docs) {
  const topTel = document.getElementById('topStatTelegram');
  if (topTel) topTel.textContent = docs.length;
  const container = document.getElementById('subscribersContainer');
  if (!container) return;
  if (!docs.length) { container.innerHTML = '<p class="text-[10px] text-gray-400 italic">Nessun iscritto alle notifiche Telegram.</p>'; return; }
  const isOwner = window.userRole === 'owner';
  container.innerHTML = docs.map(d => {
    const data = d.data();
    return `<div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border dark:border-slate-800 text-[11px]"><span class="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-[10px]">\u{1F464}</span><div class="flex-1"><span class="font-semibold text-gray-700 dark:text-gray-200">${escapeHtml(data.name || '')}</span><span class="text-gray-400 ml-1.5">\u00b7 ${escapeHtml(data.username || '')}</span><span class="text-gray-400 ml-1.5">\u00b7 ID ${escapeHtml(data.chatId || '')}</span></div>${isOwner ? `<button data-subid="${escapeHtml(d.id)}" class="delete-sub-btn text-gray-400 hover:text-red-500 cursor-pointer text-xs p-0.5 ml-1">\u2715</button>` : ''}</div>`;
  }).join('');
  container.querySelectorAll('.delete-sub-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.userRole !== 'owner') { showToast('Non autorizzato.', 'error'); return; }
      if (confirm('Rimuovere questo iscritto Telegram?')) {
        await db.collection('subscribers').doc(btn.dataset.subid).delete();
        showToast('Iscritto rimosso.', 'success');
      }
    });
  });
}
function refreshSubscribersRender() { if (lastSubscriberDocs.length) renderSubscribers(lastSubscriberDocs); }
if (!db) { console.warn('Firestore non disponibile — snapshot non registrati'); const fbBanner = document.getElementById('fbOfflineBanner'); if (fbBanner) fbBanner.classList.remove('hidden'); } else {
db.collection('subscribers').onSnapshot(snap => { lastSubscriberDocs = snap.docs; renderSubscribers(lastSubscriberDocs); });
// ─── NEWS ─────────────────────────────────────────────────────────────
document.getElementById('btnSendNews').onclick = async () => {
  const content = document.getElementById('newsContent').value.trim();
  if (content) {
    await db.collection('newsHub').add({ content, createdBy: window.username || 'unknown', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('newsContent').value = '';
    await sendTelegramBroadcast(`\u{1F4E2} *Nuova comunicazione in Bacheca Hub:*\n\n${escapeMarkdown(content)}`);
  }
};
let lastNewsDocs = [];
function renderNews(docs) {
  const container = document.getElementById('newsHistoryContainer');
  const list = document.getElementById('newsHistoryList');
  if (container) {
    if (!docs.length) {
      container.innerHTML = '<p class="text-[10px] text-gray-400 italic text-center py-4">Nessuna notizia pubblicata.</p>';
    } else {
      container.innerHTML = docs.map((d, i) => {
        const ts = d.data().createdAt;
        const dateStr = ts && ts.seconds ? new Date(ts.seconds * 1000).toLocaleDateString(locale(), { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
        return `<div class="p-2.5 rounded-lg border text-xs font-medium break-words ${i === 0 ? 'bg-purple-50/80 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 text-gray-800 dark:text-gray-200' : 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}">${dateStr ? '<span class="text-[10px] opacity-60 block mb-0.5">' + dateStr + '</span>' : ''}${escapeHtml(d.data().content || '')}</div>`;
      }).join('');
    }
  }
  if (list) {
    const isOwner = window.userRole === 'owner';
    if (!docs.length) {
      list.innerHTML = '<p class="text-[10px] text-gray-400 italic text-center py-4">Nessuna notizia pubblicata.</p>';
    } else {
      let itemsHtml = docs.map((d, i) => {
        const ts = d.data().createdAt;
        const dateStr = ts && ts.seconds ? new Date(ts.seconds * 1000).toLocaleDateString(locale(), { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
        return `<div class="flex items-start gap-2 p-2.5 rounded-lg border text-xs font-medium break-words ${i === 0 ? 'bg-purple-50/80 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 text-gray-800 dark:text-gray-200' : 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}"><input type="checkbox" class="news-checkbox mt-0.5" data-newsid="${escapeHtml(d.id)}"><div class="flex-1">${dateStr ? '<span class="text-[10px] opacity-60 block mb-0.5">' + dateStr + '</span>' : ''}${escapeHtml(d.data().content || '')}</div>${isOwner ? `<button data-newsid="${escapeHtml(d.id)}" class="delete-news-btn text-gray-400 hover:text-red-500 cursor-pointer text-xs p-0.5 ml-1 shrink-0">\u2715</button>` : ''}</div>`;
      }).join('');
      list.innerHTML = `<div class="flex items-center justify-between mb-2 ${isOwner ? '' : 'hidden'}"><label class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer"><input type="checkbox" id="selectAllNews" class="rounded border-gray-300 dark:border-gray-600" /> Seleziona tutte</label><button id="deleteSelectedNews" class="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition shadow-sm" disabled><i class="fas fa-trash-alt mr-1"></i>Elimina selezionate</button></div>` + itemsHtml;
      list.querySelectorAll('.delete-news-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (window.userRole !== 'owner') return;
          if (confirm('Rimuovere questa notizia?')) await db.collection('newsHub').doc(btn.dataset.newsid).delete();
        });
      });
      document.getElementById('selectAllNews')?.addEventListener('change', e => {
        list.querySelectorAll('.news-checkbox').forEach(cb => cb.checked = e.target.checked);
        updateSelectAllNews();
      });
      document.getElementById('deleteSelectedNews')?.addEventListener('click', () => {
        const checked = list.querySelectorAll('.news-checkbox:checked');
        if (!checked.length) return;
        if (window.userRole !== 'owner') { showToast('Solo il proprietario.', 'error'); return; }
        if (confirm(`Eliminare ${checked.length} notizia/e?`)) checked.forEach(cb => db.collection('newsHub').doc(cb.dataset.newsid).delete());
      });
    }
  }
}
function updateSelectAllNews() {
  const sa = document.getElementById('selectAllNews');
  const cbs = document.querySelectorAll('.news-checkbox');
  if (sa) sa.checked = cbs.length > 0 && document.querySelectorAll('.news-checkbox:checked').length === cbs.length;
  const btn = document.getElementById('deleteSelectedNews');
  if (btn) btn.disabled = document.querySelectorAll('.news-checkbox:checked').length === 0;
}
document.addEventListener('change', e => {
  if (e.target.classList.contains('news-checkbox')) updateSelectAllNews();
});
function refreshNewsRender() { if (lastNewsDocs.length) renderNews(lastNewsDocs); }
db.collection('newsHub').orderBy('createdAt', 'desc').onSnapshot(snap => { lastNewsDocs = snap.docs; renderNews(lastNewsDocs); });

// ─── MY ACCOUNT ─────────────────────────────────────────────────────────
document.getElementById('btnSaveAccount').onclick = async () => {
  const name = document.getElementById('myAccountName').value.trim();
  const curPwd = document.getElementById('myAccountCurPwd').value;
  const newPwd = document.getElementById('myAccountNewPwd').value;
  const user = window.username;
  if (!user || !db) return showToast('Non disponibile.', 'error');
  if (window.userRole === 'owner') {
    if (curPwd || newPwd) return showToast('L\'account proprietario non supporta cambio password.', 'info');
    showToast('Profilo aggiornato!', 'success');
    document.getElementById('myAccountCurPwd').value = '';
    document.getElementById('myAccountNewPwd').value = '';
    return;
  }
  const snap = await db.collection('accountsHub').where('username', '==', user).get();
  if (snap.empty) return showToast('Account non trovato.', 'error');
  const docRef = snap.docs[0].ref;
  const data = snap.docs[0].data();
  if (name && name !== data.name) {
    await docRef.update({ name });
  }
  if (curPwd && newPwd) {
    const curHash = DJB2(curPwd);
    if (data.password !== curHash) { showToast('Password attuale errata.', 'error'); return; }
    await docRef.update({ password: DJB2(newPwd) });
  }
  document.getElementById('myAccountCurPwd').value = '';
  document.getElementById('myAccountNewPwd').value = '';
  showToast('Account aggiornato!', 'success');
};

// ─── ACCOUNTS (registered) ──────────────────────────────────────────────
let lastAccountDocs = [];
function renderAccounts(docs) {
  const container = document.getElementById('accountsContainer');
  if (!container) return;
  if (!docs.length) { container.innerHTML = '<p class="text-[10px] text-gray-400 italic text-center py-4">Nessun account registrato.</p>'; return; }
  const role = window.userRole;
  let html = `<p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium mb-2">Totale: <span class="text-gray-700 dark:text-gray-200">${docs.length}</span></p>`;
  docs.forEach(d => {
    const { username, name, role: r } = d.data();
    const ts = d.data().createdAt;
    const dateStr = ts && ts.seconds ? new Date(ts.seconds * 1000).toLocaleDateString(locale(), { day:'2-digit', month:'short', year:'numeric' }) : '—';
    const isOwner = role === 'owner';
    const roleLabel = r === 'owner' ? 'Proprietario' : r === 'user' ? 'Utente' : r || 'Utente';
    html += `<div class="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-700"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="font-semibold text-xs text-gray-800 dark:text-gray-100">${escapeHtml(username || '')}</span><span class="text-[10px] px-1.5 py-0.5 rounded-full ${r === 'owner' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300'}">${roleLabel}</span></div><div class="flex items-center gap-2 mt-1"><span class="text-[10px] text-gray-400">${escapeHtml(name || '—')}</span><span class="text-[9px] text-gray-300 dark:text-gray-600">·</span><span class="text-[9px] text-gray-400">${dateStr}</span></div></div>${isOwner ? `<button data-accid="${escapeHtml(d.id)}" class="delete-acc-btn text-gray-400 hover:text-red-500 cursor-pointer text-xs p-0.5 ml-2">✕</button>` : ''}</div>`;
  });
  container.innerHTML = html;
  container.querySelectorAll('.delete-acc-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.userRole !== 'owner') { showToast('Non autorizzato.', 'error'); return; }
      if (confirm('Rimuovere questo account registrato?')) {
        await db.collection('accountsHub').doc(btn.dataset.accid).delete();
        showToast('Account rimosso.', 'success');
      }
    });
  });
}
function refreshAccountsRender() { if (lastAccountDocs.length) renderAccounts(lastAccountDocs); }
db.collection('accountsHub').orderBy('createdAt', 'desc').onSnapshot(snap => { lastAccountDocs = snap.docs; renderAccounts(lastAccountDocs); });

// ─── PRIVATE SPACE ────────────────────────────────────────────────────────
function cleanupExpiredPrivate() {
  if (!db) return;
  ['excelHub', 'textHub', 'notesHub'].forEach(col => {
    db.collection(col).where('private', '==', true).get().then(snap => {
      snap.forEach(d => {
        if (d.data().expiresAt && d.data().expiresAt.seconds * 1000 < Date.now()) {
          db.collection(col).doc(d.id).delete();
        }
      });
    }).catch(() => {});
  });
}
cleanupExpiredPrivate();
setInterval(cleanupExpiredPrivate, 3600000);

function isPrivateVisible(item) {
  if (!item.private) return true;
  const role = window.userRole || 'guest';
  if (role === 'owner') return true;
  return item.uploadedBy === window.username;
}

window.requestPrivateSpace = async function() {
  if (!db) return showToast('Backend non disponibile.', 'error');
  if (window.userRole === 'guest') return showToast('Accesso non consentito agli ospiti.', 'error');
  const user = window.username;
  if (!user) return showToast('Nessun utente loggato.', 'error');
  let fullName = user;
  try {
    const accSnap = await db.collection('accountsHub').where('username', '==', user).get();
    if (!accSnap.empty) fullName = accSnap.docs[0].data().name || user;
  } catch(e) {}
  const existing = await db.collection('privateSpaceRequests').where('username', '==', user).get();
  if (!existing.empty) {
    const req = existing.docs[0].data();
    if (req.approved) { showToast('Spazio privato già attivo!', 'info'); return; }
    showToast('Richiesta già inviata in attesa di approvazione.', 'info');
    return;
  }
  await db.collection('privateSpaceRequests').add({ username: user, name: fullName, approved: false, requestedAt: firebase.firestore.FieldValue.serverTimestamp() });
  sendTelegramBroadcast('\u{1F510} *Richiesta Spazio Privato*\nUtente: ' + escapeMarkdown(user) + '\nNome: ' + escapeMarkdown(fullName), 'owner');
  showToast('Richiesta inviata! Attendi approvazione dal proprietario.', 'success');
};

window.openPrivateRequestsModal = async function() {
  const modal = document.getElementById('privateRequestsModal');
  const list = document.getElementById('privateRequestsList');
  if (!modal || !list) return;
  modal.classList.remove('hidden');
  list.innerHTML = '<p class="text-sm text-gray-400">Caricamento...</p>';
  const snap = await db.collection('privateSpaceRequests').where('approved', '==', false).get();
  if (snap.empty) { list.innerHTML = '<p class="text-sm text-gray-400 italic text-center py-4">Nessuna richiesta in sospeso.</p>'; return; }
  list.innerHTML = '';
  snap.forEach(d => {
    const { username, name, requestedAt } = d.data();
    const dateStr = requestedAt && requestedAt.seconds ? new Date(requestedAt.seconds * 1000).toLocaleString(locale()) : 'N/D';
    list.innerHTML += `<div class="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-lg border dark:border-slate-700 text-xs"><div><span class="font-semibold text-gray-700 dark:text-gray-200">${escapeHtml(username || '')}</span><span class="text-gray-400 ml-1">${escapeHtml(name || '')}</span><div class="text-[10px] text-gray-400 mt-0.5">${dateStr}</div></div><div class="flex gap-1"><button data-reqid="${escapeHtml(d.id)}" data-requser="${escapeHtml(username)}" class="approve-private-btn px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition">Approva</button><button data-reqid="${escapeHtml(d.id)}" data-requser="${escapeHtml(username)}" class="deny-private-btn px-3 py-1 text-xs bg-red-500 hover:bg-red-400 text-white rounded-lg transition">Nega</button></div></div>`;
  });
  list.querySelectorAll('.approve-private-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.userRole !== 'owner') return;
      await db.collection('privateSpaceRequests').doc(btn.dataset.reqid).update({ approved: true });
      await db.collection('historyHub').add({ name: 'Spazio Privato', operation: 'Approvato spazio privato per ' + btn.dataset.requser, uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
      showToast('Spazio privato approvato per ' + btn.dataset.requser, 'success');
      window.openPrivateRequestsModal();
    });
  });
  list.querySelectorAll('.deny-private-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.userRole !== 'owner') return;
      if (!confirm('Negare la richiesta di spazio privato per ' + btn.dataset.requser + '?')) return;
      await db.collection('privateSpaceRequests').doc(btn.dataset.reqid).delete();
      await db.collection('historyHub').add({ name: 'Spazio Privato', operation: 'Negata richiesta spazio privato per ' + btn.dataset.requser, uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
      showToast('Richiesta negata per ' + btn.dataset.requser, 'info');
      window.openPrivateRequestsModal();
    });
  });
};

window.closePrivateRequestsModal = function() {
  document.getElementById('privateRequestsModal')?.classList.add('hidden');
};

async function checkPrivateAccess() {
  const status = document.getElementById('privateStatus');
  const toggles = document.querySelectorAll('.private-toggle');
  const reqBtn = document.getElementById('btnRequestPrivate');
  if (!db || !window.username) return;
  if (window.userRole === 'owner') {
    toggles.forEach(el => el.classList.remove('hidden'));
    if (status) status.classList.add('hidden');
    if (reqBtn) reqBtn.classList.add('hidden');
    return;
  }
  const snap = await db.collection('privateSpaceRequests').where('username', '==', window.username).where('approved', '==', true).get();
  if (!snap.empty) {
    toggles.forEach(el => el.classList.remove('hidden'));
    if (status) status.classList.remove('hidden');
    if (reqBtn) reqBtn.classList.add('hidden');
  } else {
    toggles.forEach(el => el.classList.add('hidden'));
    if (status) status.classList.add('hidden');
  }
}
window.checkPrivateAccess = checkPrivateAccess;

window.deleteMyAccount = async function() {
  if (!db || !window.username) return;
  if (window.userRole === 'owner') { showToast('Non puoi eliminare l\'account proprietario.', 'error'); return; }
  const snap = await db.collection('accountsHub').where('username', '==', window.username).get();
  if (!snap.empty) {
    await db.collection('accountsHub').doc(snap.docs[0].id).delete();
  }
  localStorage.removeItem('hub-user');
  localStorage.removeItem('hub-pass');
  showToast('Account eliminato. La pagina si ricaricherà.', 'success');
  setTimeout(() => location.reload(), 1500);
};
// ─── FOLDER ───────────────────────────────────────────────────────────
window.toggleNewFolderForm = (select, formId) => {
  const form = document.getElementById(formId);
  if (form) form.classList.toggle('hidden', select.value !== '__new__');
};
window.quickCreateFolder = async (selectId, nameId, colorId) => {
  const name = document.getElementById(nameId).value.trim();
  const color = document.getElementById(colorId).value;
  if (!name) return;
  const ref = await db.collection('archiveFolders').add({ name, color, createdBy: window.username || 'unknown', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById(nameId).value = '';
  const sel = document.getElementById(selectId);
  sel.value = ref.id;
  document.getElementById(colorId === 'excelNewFolderColor' ? 'excelNewFolderForm' : 'docNewFolderForm')?.classList.add('hidden');
};
window.toggleFolderManager = () => {
  const m = document.getElementById('folderManagerModal');
  m?.classList.toggle('hidden');
  if (!m?.classList.contains('hidden')) renderFolderList();
};
window.addNewFolder = async () => {
  const name = document.getElementById('newFolderName').value.trim();
  const color = document.getElementById('newFolderColor').value;
  if (!name) return;
  await db.collection('archiveFolders').add({ name, color, createdBy: window.username || 'unknown', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('newFolderName').value = '';
  renderFolderList();
};
window.saveFolder = async (id, nameEl, colorEl) => {
  const name = nameEl.value.trim();
  if (!name) return;
  await db.collection('archiveFolders').doc(id).update({ name, color: colorEl.value });
  showToast('Cartella aggiornata.', 'success');
};
window.deleteFolder = async id => {
  const f = allFolders.find(x => x.id === id);
  if (!f) return;
  const isOwner = window.userRole === 'owner';
  const isCreator = f.createdBy && f.createdBy === window.username;
  if (!isOwner && !isCreator) { showToast('Solo il proprietario o chi l\'ha creata può eliminare.', 'error'); return; }
  const used = [...allExcelFiles, ...allTextFiles].filter(x => x.folderId === id);
  if (used.length) return showToast(`Impossibile eliminare: ${used.length} file presenti in questa cartella.`, 'error');
  if (!confirm(`Eliminare la cartella "${f.name}"?`)) return;
  await db.collection('archiveFolders').doc(id).delete();
  showToast('Cartella eliminata.', 'success');
};

// ─── CATEGORY MANAGER ────────────────────────────────────────────────
window.toggleCategoryManager = () => {
  const m = document.getElementById('categoryManagerModal');
  m?.classList.toggle('hidden');
  if (!m?.classList.contains('hidden')) renderCategoryList();
};
window.addNewCategory = async () => {
  const name = document.getElementById('newCategoryName').value.trim();
  const emoji = document.getElementById('newCategoryEmoji').value;
  if (!name) return;
  await db.collection('categoriesHub').add({ name, emoji, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('newCategoryName').value = '';
  renderCategoryList();
};
window.deleteCategory = async id => {
  if (window.userRole !== 'owner') { showToast('Solo il proprietario può eliminare categorie.', 'error'); return; }
  const cat = allCategories.find(c => c.id === id);
  if (!cat) return;
  const used = [...allExcelFiles].filter(f => f.category === cat.name);
  if (used.length) return showToast(`Impossibile eliminare: ${used.length} file Excel nella categoria "${cat.name}".`, 'error');
  if (!confirm(`Eliminare la categoria "${cat.name}"?`)) return;
  await db.collection('categoriesHub').doc(id).delete();
};
function renderCategoryList() {
  const el = document.getElementById('categoryList');
  if (!el) return;
  if (!allCategories.length) { el.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-4">Nessuna categoria. Creane una.</p>'; return; }
  el.innerHTML = allCategories.map(c => {
    const used = allExcelFiles.filter(f => f.category === c.name).length;
    const canDel = window.userRole === 'owner' && used === 0;
    return `<div class="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border dark:border-slate-700 text-xs"><div class="flex items-center gap-2"><span class="text-sm">${c.emoji || '📁'}</span><span class="font-medium text-gray-700 dark:text-gray-200">${c.name}</span><span class="text-[10px] text-gray-400">${used} file</span></div>${canDel ? `<button onclick="deleteCategory('${c.id}')" class="text-gray-400 hover:text-red-500 cursor-pointer text-xs">✕</button>` : ''}</div>`;
  }).join('');
}
setTimeout(() => { if (typeof renderCategoryList === 'function') renderCategoryList(); }, 1000);

// ─── FILE READ ────────────────────────────────────────────────────────
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── MULTI UPLOAD HELPERS ─────────────────────────────────────────────
function fileNameNoExt(name) { const dot = name.lastIndexOf('.'); return dot > 0 ? name.substring(0, dot) : name; }
function fileIcon(ext) {
  const icons = { xls:'📊', xlsx:'📊', csv:'📋', pdf:'📄', doc:'📝', docx:'📝', txt:'📃', dwg:'📐', dxf:'📐', jpg:'🖼️', jpeg:'🖼️', png:'🖼️' };
  return icons[ext.toLowerCase()] || '📁';
}
function triggerFileInput(containerId) {
  if (containerId === 'excelFileList') document.getElementById('excelFile')?.click();
  else if (containerId === 'docFileList') document.getElementById('docFile')?.click();
}
function renderFileList(containerId, files) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!files || !files.length) { container.innerHTML = ''; return; }
  const catOpts = '<option value="">— Nessuna —</option>' + allCategories.map(c => `<option value="${c.name}">${c.emoji || '📁'} ${c.name}</option>`).join('');
  let html = '<div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1"><i class="fas fa-list"></i> File selezionati <span class="ml-auto bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">' + files.length + '</span></div>';
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = f.name.split('.').pop();
    const icon = fileIcon(ext);
    html += `<div class="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-white dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow text-xs" data-fi="${i}">
      <div class="text-lg sm:text-xl shrink-0 mt-0.5">${icon}</div>
      <div class="flex-1 min-w-0">
        <div class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 truncate mb-1 font-mono">${escapeHtml(f.name)}</div>
        <div class="text-[10px] text-gray-400 dark:text-gray-500 font-medium mb-0.5">Titolo</div>
        <input type="text" class="file-title-input w-full px-2 sm:px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition" value="${escapeHtml(fileNameNoExt(f.name))}" placeholder="Titolo..." />
        <div class="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1.5 mb-0.5">Categoria</div>
        <select class="file-cat-select w-full px-2 sm:px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition">${catOpts}</select>
      </div>
      <button onclick="this.closest('div[data-fi]').remove(); var c=document.getElementById('${containerId}'); if(c&&!c.querySelector('div[data-fi]'))c.innerHTML='';" class="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg p-1.5 shrink-0 self-start transition text-sm">✕</button>
    </div>`;
  }
  html += `<button onclick="triggerFileInput('${containerId}')" class="w-full mt-2 py-2 text-xs border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-400 hover:text-blue-500 hover:border-blue-400 transition flex items-center justify-center gap-1.5 bg-gray-50/50 dark:bg-gray-800/30"><i class="fas fa-plus-circle"></i> Aggiungi altri file</button>`;
  container.innerHTML = html;
}
document.getElementById('excelFile')?.addEventListener('change', function() { renderFileList('excelFileList', this.files); });
document.getElementById('docFile')?.addEventListener('change', function() { renderFileList('docFileList', this.files); });

// ─── UPLOAD EXCEL ─────────────────────────────────────────────────────
document.getElementById('btnUploadExcel').onclick = async () => {
  if (window.userRole === 'guest') { showToast('Accesso non consentito agli ospiti.', 'error'); return; }
  const sel = document.getElementById('excelFolder');
  const folderId = sel.value === '__new__' ? '' : sel.value;
  const isPrivate = document.getElementById('excelPrivate')?.checked || false;
  const rows = document.querySelectorAll('#excelFileList > div[data-fi]');
  if (!rows.length) { showToast('Seleziona almeno un file.', 'error'); return; }
  let count = 0, catLog = [];
  for (const row of rows) {
    const idx = parseInt(row.dataset.fi);
    const file = document.getElementById('excelFile').files[idx];
    if (!file) continue;
    const title = row.querySelector('.file-title-input')?.value.trim() || fileNameNoExt(file.name);
    const category = row.querySelector('.file-cat-select')?.value || '';
    const fileData = await readFileAsBase64(file);
    await db.collection('excelHub').add({ name: title, category, folderId: folderId || '', fileData, fileName: file.name, fileMime: file.type, uploadedBy: window.username || 'unknown', private: isPrivate, expiresAt: isPrivate ? firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) : null, uploadedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('historyHub').add({ name: title, operation: `Caricato Excel (${category || 'nessuna'})`, uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    count++; if (category) catLog.push(category);
  }
  document.getElementById('excelFileList').innerHTML = '';
  document.getElementById('excelFile').value = '';
  document.getElementById('textDropExcel').textContent = 'Trascina qui i file Excel o clicca per selezionare';
  showToast(`${count} file Excel caricati.`, 'success');
  if (count) await sendTelegramBroadcast(`\u2699\uFE0F *Caricati ${count} file Excel*`);
};

// ─── UPLOAD DOC ───────────────────────────────────────────────────────
document.getElementById('btnUploadDoc').onclick = async () => {
  if (window.userRole === 'guest') { showToast('Accesso non consentito agli ospiti.', 'error'); return; }
  const sel = document.getElementById('docFolder');
  const folderId = sel.value === '__new__' ? '' : sel.value;
  const isPrivate = document.getElementById('docPrivate')?.checked || false;
  const rows = document.querySelectorAll('#docFileList > div[data-fi]');
  if (!rows.length) { showToast('Seleziona almeno un file.', 'error'); return; }
  let count = 0;
  for (const row of rows) {
    const idx = parseInt(row.dataset.fi);
    const file = document.getElementById('docFile').files[idx];
    if (!file) continue;
    const title = row.querySelector('.file-title-input')?.value.trim() || fileNameNoExt(file.name);
    const category = row.querySelector('.file-cat-select')?.value || '';
    const fileData = await readFileAsBase64(file);
    const fileType = file.name.split('.').pop().toUpperCase();
    await db.collection('textHub').add({ title, category, fileName: file.name, fileType, fileMime: file.type, fileData: fileData || '', extractedText: '', folderId: folderId || '', uploadedBy: window.username || 'unknown', private: isPrivate, expiresAt: isPrivate ? firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) : null, uploadedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('historyHub').add({ name: title, operation: `Caricato Documento (${category || 'nessuna'})`, uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    count++;
  }
  document.getElementById('docFileList').innerHTML = '';
  document.getElementById('docFile').value = '';
  document.getElementById('textDropDoc').textContent = 'Trascina qui i file o clicca per selezionare (PDF, DOC, TXT, DWG, DXF)';
  showToast(`${count} documenti caricati.`, 'success');
  if (count) await sendTelegramBroadcast(`\u{1F4DD} *Caricati ${count} documenti*`);
};

// ─── NOTES ────────────────────────────────────────────────────────────
document.getElementById('btnUploadNote').onclick = async () => {
  if (window.userRole === 'guest') { showToast('Accesso non consentito agli ospiti.', 'error'); return; }
  const content = document.getElementById('newNoteContent').value.trim();
  if (content) {
    const isPrivate = document.getElementById('notePrivate')?.checked || false;
    await db.collection('notesHub').add({ content, createdBy: window.username || 'unknown', private: isPrivate, expiresAt: isPrivate ? firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) : null, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('historyHub').add({ name: 'Nota Rapida', operation: 'Aggiunta nota condivisa', uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('newNoteContent').value = '';
    await sendTelegramBroadcast(`\u{1F4CC} *Nuova Nota:* ${escapeMarkdown(content)}`);
  }
};
let lastNoteDocs = [];
function renderNotes(docs) {
  const visible = docs.filter(d => isPrivateVisible({ private: d.data().private, uploadedBy: d.data().createdBy }));
  const cn = document.getElementById('countNotes'); if (cn) cn.textContent = visible.length;
  const container = document.getElementById('notesContainer');
  if (!container) return;
  container.innerHTML = '';
  const role = window.userRole;
  const user = window.username;
  visible.forEach(d => {
    const div = document.createElement('div');
    div.className = 'bg-gray-50/80 dark:bg-slate-800/80 p-2 rounded border border-gray-200 dark:border-slate-700 text-xs text-gray-700 dark:text-gray-300 shadow-2xs';
    const canDelete = role === 'owner' || d.data().createdBy === user;
    const label = d.data().private ? '<span class="text-[10px] text-purple-500 ml-1">\u{1F512}</span>' : '';
    div.innerHTML = `<div class="flex items-start gap-2"><input type="checkbox" class="note-checkbox mt-0.5" ${canDelete ? '' : 'disabled'} data-note-id="${escapeHtml(d.id)}"><p class="break-words flex-1">${escapeHtml(d.data().content || '')}${label}</p>${canDelete ? `<button data-note-id="${escapeHtml(d.id)}" class="delete-note-btn text-gray-400 hover:text-red-600 cursor-pointer">\u2715</button>` : ''}</div>`;
    container.appendChild(div);
  });
  container.querySelectorAll('.delete-note-btn').forEach(btn => {
    btn.addEventListener('click', () => window.deleteNote(btn.dataset.noteId));
  });
  updateSelectAllNotes();
  const ba = document.getElementById('noteBulkActions');
  if (ba) ba.classList.remove('hidden');
  const btn = document.getElementById('deleteSelectedNotes');
  if (btn) btn.disabled = document.querySelectorAll('.note-checkbox:checked').length === 0;
}
function refreshNotesRender() { if (lastNoteDocs.length) renderNotes(lastNoteDocs); }
db.collection('notesHub').orderBy('createdAt', 'desc').onSnapshot(snap => { lastNoteDocs = snap.docs; renderNotes(lastNoteDocs); });
window.deleteNote = async id => {
  if (window.userRole !== 'owner' && !document.querySelector(`.delete-note-btn[data-note-id="${escapeHtml(id)}"]`)) return;
  if (confirm('Rimuovere questa nota?')) await db.collection('notesHub').doc(id).delete();
};
function updateSelectAllNotes() {
  const sa = document.getElementById('selectAllNotes');
  const cbs = document.querySelectorAll('.note-checkbox:not([disabled])');
  if (sa) sa.checked = cbs.length > 0 && document.querySelectorAll('.note-checkbox:checked').length === cbs.length;
  const btn = document.getElementById('deleteSelectedNotes');
  if (btn) btn.disabled = document.querySelectorAll('.note-checkbox:checked').length === 0;
}
document.getElementById('selectAllNotes')?.addEventListener('change', e => {
  document.querySelectorAll('.note-checkbox:not([disabled])').forEach(cb => cb.checked = e.target.checked);
  updateSelectAllNotes();
});
document.addEventListener('change', e => {
  if (e.target.classList.contains('note-checkbox')) updateSelectAllNotes();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Delete' && !document.getElementById('notesModal')?.classList.contains('hidden') && document.querySelectorAll('.note-checkbox:checked').length > 0) {
    const checked = document.querySelectorAll('.note-checkbox:checked');
    if (checked[0]?.disabled) { showToast('Non hai permessi per eliminare queste note.', 'error'); return; }
    if (confirm(`Rimuovere ${checked.length} nota/e?`)) checked.forEach(cb => db.collection('notesHub').doc(cb.dataset.noteId).delete());
  }
});
document.getElementById('deleteSelectedNotes')?.addEventListener('click', () => {
  const checked = document.querySelectorAll('.note-checkbox:checked');
  if (!checked.length) return;
  if (checked[0]?.disabled) { showToast('Non hai permessi per eliminare queste note.', 'error'); return; }
  if (confirm(`Eliminare ${checked.length} nota/e?`)) checked.forEach(cb => db.collection('notesHub').doc(cb.dataset.noteId).delete());
});

function updateCountArchive() {
  const ca = document.getElementById('countArchive');
  if (ca) ca.textContent = [...allExcelFiles, ...allTextFiles].filter(f => isPrivateVisible(f)).length;
}
db.collection('excelHub').orderBy('uploadedAt', 'desc').onSnapshot(s => {
  allExcelFiles = [];
  s.forEach(d => allExcelFiles.push({ id: d.id, ...d.data(), isExcel: true }));
  updateCountArchive();
  combineAndRenderArchive();
});
db.collection('textHub').orderBy('uploadedAt', 'desc').onSnapshot(s => {
  allTextFiles = [];
  s.forEach(d => allTextFiles.push({ id: d.id, ...d.data(), isExcel: false }));
  updateCountArchive();
  combineAndRenderArchive();
});
db.collection('archiveFolders').orderBy('createdAt', 'asc').onSnapshot(s => {
  allFolders = [];
  s.forEach(d => allFolders.push({ id: d.id, ...d.data() }));
  populateFolderSelects();
  combineAndRenderArchive();
});
db.collection('categoriesHub').orderBy('createdAt', 'asc').onSnapshot(s => {
  allCategories = [];
  s.forEach(d => allCategories.push({ id: d.id, ...d.data() }));
  populateCategorySelects();
  combineAndRenderArchive();
});
}

function populateFolderSelects() {
  const html = '<option value="">\u2014 Nessuna \u2014</option>' + allFolders.map(f => `<option value="${f.id}" style="color:${f.color};font-weight:700">\u{1F4C1} ${f.name}</option>`).join('') + '<option value="__new__">\u2728 Nuova cartella...</option>';
  ['excelFolder', 'docFolder'].forEach(id => { const el = document.getElementById(id); if (el) { const v = el.value; el.innerHTML = html; el.value = v; } });
  const filter = document.getElementById('folderFilter');
  if (filter) {
    const v = filter.value;
    filter.innerHTML = '<option value="">\u{1F4C1} Tutte</option>' + allFolders.map(f => `<option value="${f.id}" style="color:${f.color}">\u{1F4C1} ${f.name}</option>`).join('');
    filter.value = v;
  }
  renderFolderIcons();
}

function populateCategorySelects() {
  const html = '<option value="">— Nessuna —</option>' + allCategories.map(c => `<option value="${c.name}">${c.emoji || '📁'} ${c.name}</option>`).join('');
  ['excelCategory'].forEach(id => { const el = document.getElementById(id); if (el) { const v = el.value; el.innerHTML = html; el.value = v; } });
}

window.toggleNewCategoryForm = (select, formId) => {
  const form = document.getElementById(formId);
  if (form) form.classList.toggle('hidden', select.value !== '__new__');
};

document.getElementById('excelCategory')?.addEventListener('change', function() {
  const form = document.getElementById('excelNewCategoryForm');
  if (form) form.classList.toggle('hidden', this.value !== '__new__');
});

document.getElementById('excelCreateCategory')?.addEventListener('click', async () => {
  const name = document.getElementById('excelNewCategoryName').value.trim();
  const emoji = document.getElementById('excelNewCategoryEmoji').value;
  if (!name) return;
  await db.collection('categoriesHub').add({ name, emoji, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('excelNewCategoryName').value = '';
  document.getElementById('excelNewCategoryForm').classList.add('hidden');
  const sel = document.getElementById('excelCategory');
  sel.value = name;
});

function renderFolderList() {
  const el = document.getElementById('folderList');
  if (!el) return;
  if (!allFolders.length) { el.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-4">Nessuna cartella. Creane una sopra.</p>'; return; }
  const canEdit = id => { const f = allFolders.find(x => x.id === id); return window.userRole === 'owner' || (f && f.createdBy === window.username); };
  el.innerHTML = allFolders.map(f => `
    <div class="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg border dark:border-slate-700">
      <input type="color" id="fc_${f.id}" value="${f.color}" class="w-7 h-7 rounded cursor-pointer border border-gray-300 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-700 shrink-0"${canEdit(f.id) ? '' : ' disabled'} />
      <input type="text" id="fn_${f.id}" value="${escapeHtml(f.name)}" class="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 outline-none focus:ring-1 focus:ring-blue-400 dark:text-white"${canEdit(f.id) ? '' : ' readonly'} />
      <span class="text-[10px] text-gray-400 hidden sm:block shrink-0">${escapeHtml(f.createdBy || '—')}</span>
      ${canEdit(f.id) ? `<button onclick="saveFolder('${f.id}',document.getElementById('fn_${f.id}'),document.getElementById('fc_${f.id}'))" class="text-green-500 hover:text-green-400 text-xs p-1 shrink-0" title="Salva"><i class="fas fa-check"></i></button><button onclick="deleteFolder('${f.id}')" class="text-gray-400 hover:text-red-500 text-xs p-1 shrink-0" title="Elimina"><i class="fas fa-trash-alt"></i></button>` : ''}
    </div>
  `).join('');
}

function getFolder(id) { return allFolders.find(f => f.id === id); }

function moveFileToFolder(fileId, isExcel, newFolderId) {
  db.collection(isExcel ? 'excelHub' : 'textHub').doc(fileId).update({ folderId: newFolderId || '' });
}

function renderFolderIcons() {
  const bar = document.getElementById('folderIconsBar');
  if (!bar) return;
  const filterFolder = document.getElementById('folderFilter')?.value || '';
  const allFiles = [...allExcelFiles, ...allTextFiles].filter(f => isPrivateVisible(f));
  const totalCount = allFiles.length;
  const canEdit = id => { const f = allFolders.find(x => x.id === id); return window.userRole === 'owner' || (f && f.createdBy === window.username); };
  let html = '<div class="folder-icon' + (!filterFolder ? ' active' : '') + '" style="color:#2563eb" data-folder-id=""><span class="fi-emoji">\u{1F4C1}</span><span class="fi-name">Tutte</span><span class="fi-count">' + totalCount + '</span></div>';
  allFolders.forEach(f => {
    const cnt = allFiles.filter(x => x.folderId === f.id).length;
    html += '<div class="folder-icon' + (filterFolder === f.id ? ' active' : '') + '" style="color:' + escapeHtml(f.color) + '" data-folder-id="' + f.id + '" data-folder-name="' + escapeHtml(f.name) + '"><span class="fi-emoji">\u{1F4C1}</span><span class="fi-name">' + escapeHtml(f.name) + '</span><span class="fi-count">' + cnt + '</span></div>';
  });
  bar.innerHTML = html;
  // add context menu on right-click
  bar.querySelectorAll('.folder-icon[data-folder-id]').forEach(el => {
    const fid = el.dataset.folderId;
    if (!fid) return;
    el.title = 'Click: filtra | Tasto destro: modifica/elimina';
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      const f = allFolders.find(x => x.id === fid);
      if (!f) return;
      if (window.userRole !== 'owner' && (!f.createdBy || f.createdBy !== window.username)) { showToast('Solo il proprietario o chi l\'ha creata può modificare.', 'error'); return; }
      const name = prompt('Modifica nome cartella:', f.name);
      if (name && name.trim()) {
        db.collection('archiveFolders').doc(fid).update({ name: name.trim() });
        showToast('Cartella rinominata.', 'success');
      }
    });
  });
}

window.searchQuery = '';
document.getElementById('typeFilter')?.addEventListener('change', combineAndRenderArchive);
document.getElementById('folderFilter')?.addEventListener('change', combineAndRenderArchive);
document.getElementById('searchCloud')?.addEventListener('input', e => {
  window.searchQuery = e.target.value.toLowerCase();
  const clearBtn = document.getElementById('clearSearch');
  if (clearBtn) clearBtn.classList.toggle('hidden', !e.target.value);
  combineAndRenderArchive();
});
document.getElementById('clearSearch')?.addEventListener('click', () => {
  const input = document.getElementById('searchCloud');
  if (input) { input.value = ''; input.focus(); }
  window.searchQuery = '';
  document.getElementById('clearSearch')?.classList.add('hidden');
  combineAndRenderArchive();
});
document.getElementById('selectAllArchive')?.addEventListener('change', e => {
  document.querySelectorAll('.archive-checkbox').forEach(cb => cb.checked = e.target.checked);
  updateBulkActions();
});
document.getElementById('deleteSelectedArchive')?.addEventListener('click', async () => {
  const checked = document.querySelectorAll('.archive-checkbox:checked');
  if (!checked.length) return;
  if (window.userRole !== 'owner') { showToast('Solo il proprietario pu\u00f2 eliminare in blocco.', 'error'); return; }
  if (!confirm(`Eliminare ${checked.length} elemento/i dal Cloud?`)) return;
  for (const cb of checked) {
    const id = cb.dataset.id;
    const isExcel = cb.dataset.excel === 'true';
    const file = [...allExcelFiles, ...allTextFiles].find(f => f.id === id);
    const itemName = file ? (file.name || file.title || id) : id;
    await db.collection(isExcel ? 'excelHub' : 'textHub').doc(id).delete();
    await db.collection('historyHub').add({ name: itemName, operation: `Cancellazione ${isExcel ? 'Excel' : 'Documento'} dal Cloud`, uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
  }
});
document.getElementById('downloadSelectedArchive')?.addEventListener('click', async () => {
  const checked = document.querySelectorAll('.archive-checkbox:checked');
  if (!checked.length) return;
  for (const cb of checked) window.downloadDocument(cb.dataset.id);
});
document.addEventListener('change', e => {
  if (e.target.classList.contains('archive-checkbox')) updateBulkActions();
});

function updateBulkActions() {
  const checked = document.querySelectorAll('.archive-checkbox:checked');
  const el = document.getElementById('bulkActions');
  if (el) el.classList.toggle('hidden', checked.length === 0);
}

(function folderBarEvents() {
  const bar = document.getElementById('folderIconsBar');
  if (!bar) return;
  bar.addEventListener('click', e => {
    const icon = e.target.closest('.folder-icon');
    if (!icon) return;
    document.getElementById('folderFilter').value = icon.dataset.folderId || '';
    combineAndRenderArchive();
  });
  bar.addEventListener('dragover', e => { if (e.target.closest('.folder-icon')) e.preventDefault(); });
  bar.addEventListener('drop', e => {
    const icon = e.target.closest('.folder-icon');
    if (!icon) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && data.fileId) moveFileToFolder(data.fileId, data.isExcel, icon.dataset.folderId || '');
  });
})();

function combineAndRenderArchive() {
  const body = document.getElementById('archiveTableBody');
  if (!body) return;
  body.innerHTML = '';
  const sa = document.getElementById('selectAllArchive');
  if (sa) sa.checked = false;
  renderFolderIcons();
  const filterFolder = document.getElementById('folderFilter')?.value || '';
  const typeFilter = document.getElementById('typeFilter')?.value || 'all';
  let items = [...allExcelFiles, ...allTextFiles].filter(f => {
    if (!isPrivateVisible(f)) return false;
    if (typeFilter === 'excel' && !f.isExcel) return false;
    if (typeFilter === 'doc' && f.isExcel) return false;
    if (!window.searchQuery) return true;
    const haystack = f.isExcel ? `${f.name || ''} ${f.category || ''}` : `${f.title || ''} ${f.fileType || ''} ${f.extractedText ? f.extractedText.substring(0, 200) : ''}`;
    return haystack.toLowerCase().includes(window.searchQuery);
  });
  if (filterFolder) items = items.filter(f => f.folderId === filterFolder);
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-xs text-gray-400 italic">Nessun file trovato</td></tr>';
    updateBulkActions();
    return;
  }
  items.forEach(f => {
    const isGuest = window.userRole === 'guest';
    const folder = f.folderId ? getFolder(f.folderId) : null;
    const color = folder?.color || '#6b7280';
    const fName = folder?.name || 'Senza cartella';
    const tr = document.createElement('tr');
    tr.className = 'text-xs text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-slate-800 hover:bg-slate-50/50';
    tr.draggable = !isGuest;
    if (!isGuest) tr.ondragstart = e => { e.dataTransfer.setData('text/plain', JSON.stringify({ fileId: f.id, isExcel: f.isExcel })); e.dataTransfer.effectAllowed = 'move'; };
    const folderCell = `<td class="p-3"><span class="folder-dot" style="background:${color}"></span><span class="hidden sm:inline">${escapeHtml(fName)}</span></td>`;
    const canDel = !isGuest && (window.userRole === 'owner' || f.uploadedBy === window.username);
    const checkbox = isGuest ? '' : `<td class="p-3 text-center"><input type="checkbox" class="archive-checkbox cursor-pointer" data-id="${escapeHtml(f.id)}" data-excel="${f.isExcel}"></td>`;
    const actionsCell = isGuest ? '<td class="p-3"></td>' : `<td class="p-3 text-center whitespace-nowrap"><button data-id="${escapeHtml(f.id)}" class="download-doc-btn text-blue-500 hover:text-blue-300 cursor-pointer text-sm" title="Scarica">\u{1F4E5}</button>${canDel ? `<button data-id="${escapeHtml(f.id)}" data-excel="${f.isExcel}" data-name="${escapeHtml(f.name || f.title || 'File')}" class="delete-btn text-red-500 hover:text-red-300 cursor-pointer text-sm" title="Elimina">\u{1F5D1}\uFE0F</button>` : ''}</td>`;
    const catOptsHtml = '<option value="">—</option>' + allCategories.map(c => `<option value="${escapeHtml(c.name)}" ${f.category === c.name ? 'selected' : ''}>${escapeHtml(c.emoji || '📁')} ${escapeHtml(c.name)}</option>`).join('');
    const catSelectHtml = isGuest
      ? `<td class="p-3 text-gray-500 text-[10px] truncate max-w-[80px] sm:max-w-none">${escapeHtml(f.category || '—')}</td>`
      : `<td class="p-3"><select data-file-id="${escapeHtml(f.id)}" data-is-excel="${f.isExcel}" class="cat-edit-select bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 text-[10px] text-gray-600 dark:text-gray-400 outline-none focus:border-blue-400 cursor-pointer max-w-[120px]">${catOptsHtml}</select></td>`;
    if (f.isExcel) {
      tr.innerHTML = `${checkbox}<td class="p-3 font-medium text-xs">${f.private ? '<span class="text-purple-500 mr-0.5">\u{1F512}</span>' : ''}${escapeHtml(f.name || 'File Excel')}</td><td class="p-3"><span class="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded font-bold text-[9px]">EXCEL</span></td>${folderCell}${catSelectHtml}${actionsCell}`;
    } else {
      tr.innerHTML = `${checkbox}<td class="p-3 font-medium text-xs">${f.private ? '<span class="text-purple-500 mr-0.5">\u{1F512}</span>' : ''}${escapeHtml(f.title || 'Documento')}</td><td class="p-3"><span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded font-bold text-[9px]">${escapeHtml(f.fileType || '')}</span></td>${folderCell}${catSelectHtml}${actionsCell}`;
    }
    body.appendChild(tr);
  });
  body.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => window.deleteCloudItem(btn.dataset.id, btn.dataset.excel === 'true', btn.dataset.name));
  });
  body.querySelectorAll('.download-doc-btn').forEach(btn => {
    btn.addEventListener('click', () => window.downloadDocument(btn.dataset.id));
  });
  body.querySelectorAll('.cat-edit-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const file = sel.dataset.isExcel === 'true'
        ? allExcelFiles.find(e => e.id === sel.dataset.fileId)
        : allTextFiles.find(t => t.id === sel.dataset.fileId);
      if (!file) return;
      const coll = file.isExcel ? 'excelHub' : 'textHub';
      try {
        await db.collection(coll).doc(sel.dataset.fileId).update({ category: sel.value });
        file.category = sel.value;
        showToast(window.currentLang === 'en' ? 'Category updated' : 'Categoria aggiornata', 'success');
      } catch (e) {
        showToast('Errore: ' + e.message, 'error');
      }
    });
  });
  updateBulkActions();
}
window.combineAndRenderArchive = combineAndRenderArchive;

window.downloadDocument = function(id) {
  if (window.userRole === 'guest') { showToast('Accesso ai file non consentito per gli ospiti.', 'error'); return; }
  const file = [...allTextFiles, ...allExcelFiles].find(f => f.id === id);
  if (!file) return alert('File non trovato.');
  if (file.fileData) {
    const link = document.createElement('a');
    link.href = file.fileData;
    link.download = file.fileName || (file.title || file.name || 'documento');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  } else if (file.isExcel) {
    const content = `File Excel: ${file.name}\nCategoria: ${file.category || 'nessuna'}\nCaricato il: ${file.uploadedAt ? new Date(file.uploadedAt.seconds * 1000).toLocaleString(locale()) : 'N/D'}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = (file.name || 'excel') + '.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  } else {
    if (!file.extractedText) return alert('Nessun contenuto testuale disponibile per il download.');
    const blob = new Blob([file.extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = (file.title || 'documento') + '.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }
};

window.deleteCloudItem = async (id, isExcel, itemName) => {
  if (window.userRole === 'guest') { showToast('Non puoi eliminare file.', 'error'); return; }
  if (window.userRole !== 'owner') {
    const file = [...allExcelFiles, ...allTextFiles].find(f => f.id === id);
    if (!file || file.uploadedBy !== window.username) { showToast('Non hai i permessi per eliminare questo file.', 'error'); return; }
  }
  if (confirm(`Eliminare l'elemento "${itemName}" dal Cloud?`)) {
    const tipo = isExcel ? 'Excel' : 'Documento';
    await db.collection(isExcel ? 'excelHub' : 'textHub').doc(id).delete();
    await db.collection('historyHub').add({ name: itemName, operation: `Cancellazione ${tipo} dal Cloud`, uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
  }
};

// ─── HISTORY ──────────────────────────────────────────────────────────
if (!db) { console.warn('Firestore non disponibile — history snapshot non registrato'); } else { db.collection('historyHub').orderBy('timestamp', 'desc').onSnapshot(snap => {
  const ch = document.getElementById('countHistory'); if (ch) ch.textContent = snap.size;
  const b = document.getElementById('historyTableBody');
  if (!b) return;
  b.innerHTML = '';
  snap.forEach(d => {
    const data = d.data();
    const dStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString(locale()) : 'In sincro...';
    const nameObj = escapeHtml(data.name || 'Elemento indefinito');
    const opObj = data.operation ? escapeHtml(data.operation) : (data.name ? 'Azione su: ' + escapeHtml(data.name) : 'Registrazione del ' + dStr);
    b.innerHTML += `<tr class="border-b dark:border-slate-800"><td class="p-2.5 text-center"><input type="checkbox" class="history-checkbox cursor-pointer" data-hid="${escapeHtml(d.id)}"></td><td class="p-2.5 font-mono text-[11px] text-purple-600 dark:text-purple-400">${dStr}</td><td class="p-2.5 font-medium">${nameObj}</td><td class="p-2.5 text-gray-500">${opObj}</td><td class="p-2.5 text-center"><button data-hid="${escapeHtml(d.id)}" class="delete-history-btn text-gray-400 hover:text-red-500 cursor-pointer">\u2715</button></td></tr>`;
  });
  b.querySelectorAll('.delete-history-btn').forEach(btn => {
    btn.addEventListener('click', () => window.deleteHistoryItem(btn.dataset.hid));
  });
  updateSelectAllHistory();
}); }
document.getElementById('selectAllHistory')?.addEventListener('change', e => {
  document.querySelectorAll('.history-checkbox').forEach(cb => cb.checked = e.target.checked);
});
window.deleteHistoryItem = async id => {
  if (window.userRole !== 'owner') { showToast('Solo il proprietario pu\u00f2 eliminare log storici.', 'error'); return; }
  if (confirm('Rimuovere log storico?')) await db.collection('historyHub').doc(id).delete();
};
function updateSelectAllHistory() {
  const sa = document.getElementById('selectAllHistory');
  if (sa) sa.checked = document.querySelectorAll('.history-checkbox:checked').length === document.querySelectorAll('.history-checkbox').length && document.querySelectorAll('.history-checkbox').length > 0;
  const dbh = document.getElementById('deleteSelectedHistory');
  if (dbh) dbh.disabled = document.querySelectorAll('.history-checkbox:checked').length === 0;
}
document.addEventListener('change', e => {
  if (e.target.classList.contains('history-checkbox')) updateSelectAllHistory();
});
document.getElementById('deleteSelectedHistory')?.addEventListener('click', () => {
  const checked = document.querySelectorAll('.history-checkbox:checked');
  if (!checked.length) return;
  if (window.userRole !== 'owner') { showToast('Solo il proprietario pu\u00f2 eliminare log storici.', 'error'); return; }
  if (confirm(`Eliminare ${checked.length} log storico/i?`)) checked.forEach(cb => db.collection('historyHub').doc(cb.dataset.hid).delete());
});
document.addEventListener('keydown', e => {
  if (e.key === 'Delete' && !document.getElementById('historyModal')?.classList.contains('hidden') && document.querySelectorAll('.history-checkbox:checked').length > 0) {
    if (window.userRole !== 'owner') { showToast('Solo il proprietario.', 'error'); return; }
    const checked = document.querySelectorAll('.history-checkbox:checked');
    if (confirm(`Rimuovere ${checked.length} log storico/i?`)) checked.forEach(cb => db.collection('historyHub').doc(cb.dataset.hid).delete());
  }
});

// ─── AI ASSISTANT ─────────────────────────────────────────────────────
function cleanLatex(s) {
  const g = { 'tau': '\u03c4', 'omega': '\u03c9', 'pi': '\u03c0', 'alpha': '\u03b1', 'beta': '\u03b2', 'delta': '\u03b4', 'theta': '\u03b8', 'gamma': '\u03b3', 'lambda': '\u03bb', 'mu': '\u03bc', 'sigma': '\u03c3', 'phi': '\u03c6', 'psi': '\u03c8', 'cdot': '\u00b7', 'times': '\u00d7', 'div': '\u00f7', 'leq': '\u2264', 'geq': '\u2265', 'neq': '\u2260', 'infty': '\u221e', 'partial': '\u2202', 'nabla': '\u2207', 'rightarrow': '\u2192', 'leftarrow': '\u2190', 'cdots': '\u2026', 'forall': '\u2200', 'exists': '\u2203', 'emptyset': '\u2205', 'subset': '\u2282', 'supset': '\u2283', 'subseteq': '\u2286', 'supseteq': '\u2287', 'cup': '\u222a', 'cap': '\u2229', 'in': '\u2208', 'notin': '\u2209', 'approx': '\u2248', 'equiv': '\u2261', 'propto': '\u221d', 'pm': '\u00b1', 'mp': '\u2213', 'cdotp': '\u00b7', 'text': '' };
  for (let k in g) s = s.replace(new RegExp('\\\\' + k + '\\b', 'g'), g[k]);
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2');
  s = s.replace(/\\sqrt(?:\[([^\]]*)\])?\{([^}]*)\}/g, '\u221a($2)');
  s = s.replace(/\\boxed\{([^}]*)\}/g, '$1');
  s = s.replace(/\\(?:[,:;]| )/g, ' ');
  s = s.replace(/\\!/g, '');
  s = s.replace(/\\[a-zA-Z]+/g, '');
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\$\$([^$]*)\$\$/g, '$1');
  s = s.replace(/\$([^$]*)\$/g, '$1');
  s = s.replace(/\\\[([^\\]*)\\\]/g, '$1');
  s = s.replace(/\\\(([^\\]*)\\\)/g, '$1');
  return s;
}

window.askAI = async () => {
  const inputEl = document.getElementById('aiInput');
  const container = document.getElementById('chat-container');
  const sendBtn = document.getElementById('aiSendBtn');
  const queryText = inputEl.value.trim();
  if (!queryText) return;

  inputEl.disabled = true;
  sendBtn.disabled = true;
  container.innerHTML += `<div class="bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700/50 p-2.5 rounded-lg text-blue-900 dark:text-blue-100 font-medium text-right max-w-[85%] ml-auto">\u{1F464} ${escapeHtml(queryText)}</div>`;
  inputEl.value = '';
  container.scrollTop = container.scrollHeight;

  const keyMatch = queryText.match(/^\/key\s+(.+)/i);
  if (keyMatch) {
    const k = keyMatch[1].trim();
    if (k.startsWith('gsk_') && k.length > 20) {
      localStorage.setItem('ai_key', k);
      container.innerHTML += `<div class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-2.5 rounded-lg text-emerald-800 dark:text-emerald-300 max-w-[90%] text-xs">\u2705 API key salvata. La chat AI è ora attiva!</div>`;
    } else {
      container.innerHTML += `<div class="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 p-2.5 rounded-lg text-red-800 dark:text-red-300 max-w-[90%] text-xs">\u274C Formato non valido. La chiave deve iniziare con "gsk_" ed essere una chiave Groq valida.</div>`;
    }
    inputEl.disabled = false; sendBtn.disabled = false; inputEl.focus();
    container.scrollTop = container.scrollHeight;
    return;
  }

  const dlMatch = queryText.match(/^(?:scarica|download|scaricare)\s+(.+)/i);
  if (dlMatch) {
    const query = dlMatch[1].toLowerCase().trim();
    const file = [...allTextFiles, ...allExcelFiles].find(f => (f.title || f.name || '').toLowerCase().includes(query));
    if (file) {
      window.downloadDocument(file.id);
      container.innerHTML += `<div class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-2.5 rounded-lg text-emerald-800 dark:text-emerald-300 max-w-[90%] text-xs">\u2705 Download avviato: <b>${escapeHtml(file.title || file.name)}</b></div>`;
      inputEl.disabled = false; sendBtn.disabled = false; inputEl.focus();
      container.scrollTop = container.scrollHeight;
      return;
    }
  }

  const loadingId = 'loading-' + Date.now();
  container.innerHTML += `<div id="${loadingId}" class="p-2 text-slate-500 italic font-mono text-[11px]">\u270D\uFE0F Sto pensando...</div>`;
  container.scrollTop = container.scrollHeight;

  let contextParts = [];
  allTextFiles.forEach(d => { contextParts.push(`[${d.title}] Tipo: Documento | File: ${d.fileName || 'N/A'} | Contenuto: ${(d.extractedText || 'Vuoto').substring(0, 300)}`); });
  allExcelFiles.forEach(e => { contextParts.push(`[${e.name}] Tipo: Excel | Categoria: ${e.category || 'Generale'}`); });
  let contextText = contextParts.join('\n');

  const platformInfo = `Piattaforma: Engineering Cloud Hub v3.5.0
Ruoli utente: owner (proprietario), user (utente registrato), guest (ospite non autenticato)
Owner: credenziali Ing/Ing, ha accesso totale, gestione utenti, statistiche, elimina cartelle/categorie.
User: può caricare file, creare cartelle/categorie, modificare il proprio account (nome, password).
Guest: solo lettura, non può caricare né modificare. Vede pulsante "Crea un Account".
Moduli disponibili: Excel (fogli di calcolo), Documenti (PDF/DOC/DWG/DXF/TXT), Note Rapide, Archivio, Calcolatrice, MTBF, Notizie, Registro Attività.
Cartelle: organizzazione files, creabili da chiunque, modificabili/eliminabili solo da owner o creatore.
Categorie: emoji + nome, assegnabili a file Excel e Documenti, eliminabili solo da owner se vuote.
Spazio Privato: upload con scadenza 7 giorni, toggle privato attivabile su richiesta.
Archivio: filtri per tipo/cartella/categoria, cerca per nome, drag&drop file tra cartelle, selezioni multiple, download/eliminazione bulk.
Assistente AI: questo stesso chatbot, accessibile dal footer, risponde sui file caricati e sul funzionamento della piattaforma.`;

   const systemInstruction = `Sei un assistente AI tecnico-ingegneristico integrato in Engineering Cloud Hub v3.5.0.

IDENTITÀ E TONO:
- Rispondi in italiano tecnico, pulito, professionale.
- Usa un lessico ingegneristico preciso quando pertinente.
- Struttura le risposte con paragrafi brevi e, se utile, elenchi puntati nitidi.
- Non usare codice, markdown grezzo, ID interni o riferimenti tecnici visibili all'utente.

CONOSCENZA DELLA PIATTAFORMA:
${platformInfo}

REGOLE DI RISPOSTA:
1. Per ogni dato preso dai file, cita la fonte così: (Fonte: TitoloFile).
2. Se usi più file: (Fonte: Titolo1, Titolo2).
3. Per offrire il download di un file: [SCARICA:ID_FILE].
4. Se un'informazione non è nei file elencati, dichiara la fonte esterna.
5. Se non sai o non trovi l'informazione, dillo chiaramente. Non inventare né allucinare.
6. Quando elenchi file, usa elenchi puntati ordinati, senza grassetti eccessivi.
7. Non esporre mai ID di Firestore, hash, chiavi, o dati interni.

CONTROLLO ACCESSI:
- Se un ospite (guest) chiede di caricare, modificare, eliminare file: rispondi che per queste operazioni deve creare un account o autenticarsi.
- Se un guest chiede dati privati altrui: declina.
- Se un utente user chiede di gestire altri utenti o vedere statistiche globali: informa che è riservato all'owner.

File disponibili:
${contextText}`;

  const reqBase = { messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: queryText }] };

  async function aiFetch(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const raw = await r.text();
    try { const j = JSON.parse(raw); return j.choices?.[0]?.message?.content || raw; } catch { return raw; }
  }

  let replyText = '';
  const groqKey = localStorage.getItem('ai_key') || '';
  if (groqKey) {
    try {
      replyText = await aiFetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: reqBase.messages, max_tokens: 1024 })
      });
    } catch {}
  }
  if (!replyText) {
    try {
      replyText = await aiFetch('https://text.pollinations.ai/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: systemInstruction.substring(0, 2000) + '\n\nDomanda: ' + queryText }] })
      });
    } catch {}
  }
  if (!replyText) {
    try {
      const urlPrompt = encodeURIComponent(systemInstruction.substring(0, 1500) + '\n\nDomanda: ' + queryText).substring(0, 4000);
      replyText = await aiFetch('https://text.pollinations.ai/' + urlPrompt + '?model=openai-fast', { method: 'GET' });
    } catch {}
  }
  if (!replyText) {
    replyText = groqKey
      ? '\u26A0\uFE0F AI non disponibile al momento. Riprova tra qualche secondo.'
      : '\u26A0\uFE0F AI non configurata. Per attivarla, inserisci la tua API key gratuita di Groq nella chat (manda un messaggio con: /key gsk_xxx).';
  }

  document.getElementById(loadingId)?.remove();
  if (!replyText) replyText = '\u26A0\uFE0F Nessuna risposta ricevuta.';
  replyText = cleanLatex(replyText);

  const downloadMatch = replyText.match(/\[DOWNLOAD:([^\]]+)\]/);
  if (downloadMatch) {
    const fileId = downloadMatch[1];
    const file = [...allTextFiles, ...allExcelFiles].find(f => f.id === fileId);
    if (file) {
      replyText = replyText.replace(/\[DOWNLOAD:[^\]]+\]/, `<button onclick="window.downloadDocument('${fileId}')" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded cursor-pointer">\u{1F4E5} Scarica ${file.title || file.name}</button>`);
    }
  }

  const replyDiv = document.createElement('div');
  replyDiv.className = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-gray-800 dark:text-gray-200 max-w-[90%] text-xs font-normal shadow-sm';
  replyDiv.innerHTML = typeof marked !== 'undefined' ? marked.parse(replyText) : replyText.replace(/\n/g, '<br>');
  container.appendChild(replyDiv);

  inputEl.disabled = false;
  sendBtn.disabled = false;
  inputEl.focus();
  container.scrollTop = container.scrollHeight;
};

document.getElementById('aiInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.askAI(); });

