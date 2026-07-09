// ─── TOAST (override) ────────────────────────────────────────────────
window.alert = window.showToast || function(msg) { console.warn('[Alert fallback]', msg); };

// ─── FIREBASE INIT (compat SDK — loaded via <script> in index.html) ────
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

function escapeHtml(t) { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; }

// ─── LOGIN ────────────────────────────────────────────────────────────
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
    db.collection('accountsHub').where('username', '==', u).get().then(snap => {
      if (!snap.empty) {
        const d = snap.docs[0].data();
        let hash = 0; for (let i = 0; i < p.length; i++) { hash = ((hash << 5) - hash) + p.charCodeAt(i); hash |= 0; }
        if (d.password === hash.toString(36)) { login(d.role || 'user'); return; }
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
    document.querySelectorAll('.delete-btn, .delete-cloud-btn, .delete-note-btn, .delete-history-btn, .unregister-btn, .delete-user-btn').forEach(el => el.remove());
    document.querySelectorAll('#btnSendNews, #btnUploadExcel, #btnUploadDoc, #btnUploadNote, #btnRegister, #btnAddUser, #btnSubscribeTelegram, #btnUnsubscribeTelegram, #testTelegramNotification').forEach(el => el.disabled = true);
  }
}

// ─── TOGGLE UTILITY ───────────────────────────────────────────────────
window.closeCalc = () => document.getElementById('calcModal')?.classList.add('hidden');
window.closeNews = () => document.getElementById('newsModal')?.classList.add('hidden');

window.closeUserModal = () => document.getElementById('userModal')?.classList.add('hidden');
window.closeMtbfModal = () => document.getElementById('mtbfModal')?.classList.add('hidden');
window.closeSubscribersModal = () => document.getElementById('subscribersModal')?.classList.add('hidden');
window.closeNewsHistoryModal = () => document.getElementById('newsHistoryModal')?.classList.add('hidden');
window.closeTeamModal = () => document.getElementById('teamModal')?.classList.add('hidden');
window.closeStatsModal = () => document.getElementById('statsModal')?.classList.add('hidden');
window.openUserModal = () => document.getElementById('userModal')?.classList.remove('hidden');
window.openTeamModal = () => document.getElementById('teamModal')?.classList.remove('hidden');
window.openMtbfModal = () => document.getElementById('mtbfModal')?.classList.remove('hidden');
window.openSubscribersModal = () => document.getElementById('subscribersModal')?.classList.remove('hidden');
window.openNewsHistoryModal = () => document.getElementById('newsHistoryModal')?.classList.remove('hidden');
window.openStatsModal = () => document.getElementById('statsModal')?.classList.remove('hidden');
window.toggleCalcModal = () => document.getElementById('calcModal')?.classList.toggle('hidden');
document.getElementById('toggleCalc')?.addEventListener('click', () => window.toggleCalcModal());
window.toggleHubInfo = () => {
  const p = document.getElementById('hubInfoPanel');
  p?.classList.toggle('hidden');
  if (!p?.classList.contains('hidden')) updateHubInfoClock();
};
window.openSidebar = () => document.getElementById('sidebar')?.classList.remove('hidden');
window.closeSidebar = () => document.getElementById('sidebar')?.classList.add('hidden');
window.toggleSidebar = () => document.getElementById('sidebar')?.classList.toggle('hidden');
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

window.toggleExcelModal = () => document.getElementById('excelModal')?.classList.toggle('hidden');
window.toggleDocModal = () => document.getElementById('docModal')?.classList.toggle('hidden');
window.toggleNotesModal = () => document.getElementById('notesModal')?.classList.toggle('hidden');
window.toggleArchiveModal = () => { document.getElementById('archiveModal')?.classList.toggle('hidden'); combineAndRenderArchive(); };
window.toggleHistoryModal = () => document.getElementById('historyModal')?.classList.toggle('hidden');

// ─── HUB INFO ─────────────────────────────────────────────────────────
(function populateHubInfo() {
  const uptime = document.getElementById('hubInfoUptime');
  const update = document.getElementById('hubInfoUpdate');
  if (uptime) uptime.textContent = '01/02/2025';
  if (update) update.textContent = new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
})();

// ─── HUB INFO CLOCK ──────────────────────────────────────────────────
function updateHubInfoClock() {
  const el = document.getElementById('hubInfoTimeDisplay');
  const panel = document.getElementById('hubInfoPanel');
  if (!el || !panel || panel.classList.contains('hidden')) return;
  const now = new Date();
  el.textContent = `${now.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — ${now.toLocaleTimeString('it-IT')}`;
  setTimeout(updateHubInfoClock, 1000);
}

// ─── CALCOLATORE PESO ─────────────────────────────────────────────────
window.updateCalcFields = () => {
  const shape = document.getElementById('calcShape').value;
  const labelDim1 = document.getElementById('labelDim1');
  const divDim2 = document.getElementById('divDim2');
  if (shape === 'tondo') { labelDim1.textContent = 'Diametro (mm)'; divDim2.classList.add('hidden'); }
  else if (shape === 'quadro') { labelDim1.textContent = 'Lato (mm)'; divDim2.classList.add('hidden'); }
  else if (shape === 'piatto') { labelDim1.textContent = 'Base (mm)'; divDim2.classList.remove('hidden'); }
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
  document.getElementById('mtbfValue').textContent = mtbf.toLocaleString('it-IT', { maximumFractionDigits: 1 }) + ' h';
  document.getElementById('mtbfLambda').textContent = lambda.toExponential(4);
  document.getElementById('mtbfYears').textContent = (mtbf / 8760).toLocaleString('it-IT', { maximumFractionDigits: 1 });
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
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = i18n[lang][key];
      else el.textContent = i18n[lang][key];
    }
  });
  const li = document.getElementById('lang-it'); const le = document.getElementById('lang-en');
  if (li) li.className = lang === 'it' ? 'px-2 py-1 rounded-md bg-blue-600 text-white transition-all' : 'px-2 py-1 rounded-md text-gray-400 hover:text-white transition-all';
  if (le) le.className = lang === 'en' ? 'px-2 py-1 rounded-md bg-blue-600 text-white transition-all' : 'px-2 py-1 rounded-md text-gray-400 hover:text-white transition-all';
};

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

async function sendTelegramBroadcast(text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    const snap = await db.collection('subscribers').get();
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
  const chatId = document.getElementById('telChatIdInput').value.trim();
  const name = document.getElementById('telNameInput').value.trim() || 'Membro Hub';
  if (!chatId) return alert('Inserisci un Chat ID numerico!');
  await db.collection('subscribers').add({ chatId, name, subscribedAt: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('telChatIdInput').value = '';
  document.getElementById('telNameInput').value = '';
};
document.getElementById('btnUnsubscribeTelegram').onclick = async () => {
  const chatId = document.getElementById('telChatIdInput').value.trim();
  if (!chatId) return alert('Inserisci il Chat ID per disattivare.');
  const snap = await db.collection('subscribers').get();
  const dels = [];
  snap.forEach(uDoc => { if (uDoc.data().chatId === chatId) dels.push(db.collection('subscribers').doc(uDoc.id).delete()); });
  await Promise.all(dels);
  document.getElementById('telChatIdInput').value = '';
};

db.collection('subscribers').onSnapshot(snap => {
  const topTel = document.getElementById('topStatTelegram');
  if (topTel) topTel.textContent = snap.size;
  const container = document.getElementById('subscribersContainer');
  if (!container) return;
  if (snap.empty) { container.innerHTML = '<p class="text-[10px] text-gray-400 italic">Nessun iscritto alle notifiche Telegram.</p>'; return; }
  container.innerHTML = '';
  snap.forEach(d => {
    container.innerHTML += `<div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border dark:border-slate-800 text-[11px]"><span class="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-[10px]">\u{1F464}</span><div><span class="font-semibold text-gray-700 dark:text-gray-200">${escapeHtml(d.data().name || '')}</span><span class="text-gray-400 ml-1.5">\u00b7 ID ${escapeHtml(d.data().chatId || '')}</span></div></div>`;
  });
});

// ─── NEWS ─────────────────────────────────────────────────────────────
document.getElementById('btnSendNews').onclick = async () => {
  const content = document.getElementById('newsContent').value.trim();
  if (content) {
    await db.collection('newsHub').add({ content, createdBy: window.username || 'unknown', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('newsContent').value = '';
    await sendTelegramBroadcast(`\u{1F4E2} *Nuova comunicazione in Bacheca Hub:*\n\n${escapeMarkdown(content)}`);
  }
};
db.collection('newsHub').orderBy('createdAt', 'desc').onSnapshot(snap => {
  const container = document.getElementById('newsHistoryContainer');
  const list = document.getElementById('newsHistoryList');
  let html = '';
  if (snap.empty) {
    html = '<p class="text-[10px] text-gray-400 italic text-center py-4">Nessuna notizia pubblicata.</p>';
  } else {
    snap.forEach((d, i) => {
      const ts = d.data().createdAt;
      const dateStr = ts && ts.seconds ? new Date(ts.seconds * 1000).toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
      html += `<div class="p-2.5 rounded-lg border text-xs font-medium break-words ${i === 0 ? 'bg-purple-50/80 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 text-gray-800 dark:text-gray-200' : 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}">${dateStr ? '<span class="text-[10px] opacity-60 block mb-0.5">' + dateStr + '</span>' : ''}${escapeHtml(d.data().content || '')}</div>`;
    });
  }
  if (container) container.innerHTML = html;
  if (list) list.innerHTML = html;
});

// ─── TEAM ─────────────────────────────────────────────────────────────
document.getElementById('btnRegister').onclick = async () => {
  const name = document.getElementById('regName').value.trim();
  const contact = document.getElementById('regContact').value.trim();
  if (name && contact) {
    await db.collection('teamHub').add({ name, contact, joinedBy: window.username || 'unknown', joinedAt: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('regName').value = '';
    document.getElementById('regContact').value = '';
  }
};
db.collection('teamHub').orderBy('joinedAt', 'desc').onSnapshot(snap => {
  const topTeam = document.getElementById('topStatTeam');
  if (topTeam) topTeam.textContent = snap.size;
  const container = document.getElementById('teamMembersContainer');
  if (!container) return;
  if (snap.empty) { container.innerHTML = '<p class="text-[10px] text-gray-400 italic">Nessun membro registrato.</p>'; return; }
  container.innerHTML = `<p class="text-[10px] text-gray-400 font-medium mb-1 tracking-wide uppercase">Membri iscritti (${snap.size})</p>`;
  snap.forEach(d => {
    const { name, contact } = d.data();
    container.innerHTML += `<div class="flex items-center justify-between gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-lg border dark:border-slate-700 text-[11px]"><div class="min-w-0 flex-1"><span class="font-semibold text-gray-700 dark:text-gray-200">${escapeHtml(name || '')}</span><span class="text-gray-400 ml-1.5">\u00b7 ${escapeHtml(contact || '')}</span></div><button data-tid="${escapeHtml(d.id)}" class="unregister-btn text-gray-400 hover:text-red-500 hover:font-bold cursor-pointer text-xs leading-none p-0.5">\u2715</button></div>`;
  });
  container.querySelectorAll('.unregister-btn').forEach(btn => {
    btn.addEventListener('click', () => window.unregisterMember(btn.dataset.tid));
  });
});
window.unregisterMember = async id => {
  if (confirm('Rimuovere la tua registrazione dal team?')) await db.collection('teamHub').doc(id).delete();
};

// ─── USERS ────────────────────────────────────────────────────────────
document.getElementById('btnAddUser').onclick = async () => {
  const name = document.getElementById('userNameInput').value.trim();
  const role = document.getElementById('userRoleInput').value.trim() || 'Membro';
  const email = document.getElementById('userEmailInput').value.trim();
  if (!name) return showToast('Inserisci almeno il nome.', 'error');
  await db.collection('usersHub').add({ name, role, email, addedAt: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('userNameInput').value = '';
  document.getElementById('userRoleInput').value = '';
  document.getElementById('userEmailInput').value = '';
  showToast('Utente aggiunto!', 'success');
};
db.collection('usersHub').orderBy('addedAt', 'desc').onSnapshot(snap => {
  const container = document.getElementById('usersContainer');
  if (!container) return;
  if (snap.empty) { container.innerHTML = '<p class="text-[10px] text-gray-400 italic text-center py-4">Nessun utente registrato.</p>'; return; }
  container.innerHTML = '';
  snap.forEach(d => {
    const { name, role, email } = d.data();
    const isOwner = window.userRole === 'owner';
    container.innerHTML += `<div class="flex items-center justify-between gap-1 bg-white dark:bg-slate-900 p-2 rounded-lg border dark:border-slate-700 text-xs"><div class="min-w-0 flex-1"><span class="font-semibold text-gray-700 dark:text-gray-200">${escapeHtml(name || '')}</span><span class="text-[10px] text-gray-400 ml-1.5">${escapeHtml(role || '')}</span>${email ? '<span class="text-[10px] text-gray-400 ml-1.5">· ' + escapeHtml(email) + '</span>' : ''}</div>${isOwner ? `<button data-uid="${escapeHtml(d.id)}" class="delete-user-btn text-gray-400 hover:text-red-500 cursor-pointer text-xs p-0.5">✕</button>` : ''}</div>`;
  });
  container.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (window.userRole !== 'owner') { showToast('Non autorizzato.', 'error'); return; }
      if (confirm('Rimuovere questo utente?')) {
        await db.collection('usersHub').doc(btn.dataset.uid).delete();
        showToast('Utente rimosso.', 'success');
      }
    });
  });
});

// ─── FOLDER ───────────────────────────────────────────────────────────
window.toggleNewFolderForm = (select, formId) => {
  const form = document.getElementById(formId);
  if (form) form.classList.toggle('hidden', select.value !== '__new__');
};
window.quickCreateFolder = async (selectId, nameId, colorId) => {
  const name = document.getElementById(nameId).value.trim();
  const color = document.getElementById(colorId).value;
  if (!name) return;
  const ref = await db.collection('archiveFolders').add({ name, color, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
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
  await db.collection('archiveFolders').add({ name, color, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('newFolderName').value = '';
  renderFolderList();
};
window.deleteFolder = async id => {
  if (window.userRole !== 'owner') { showToast('Solo il proprietario può eliminare cartelle.', 'error'); return; }
  const used = [...allExcelFiles, ...allTextFiles].filter(f => f.folderId === id);
  if (used.length) return showToast(`Impossibile eliminare: ${used.length} file presenti in questa cartella.`, 'error');
  if (!confirm('Eliminare questa cartella?')) return;
  await db.collection('archiveFolders').doc(id).delete();
};

// ─── FILE READ ────────────────────────────────────────────────────────
function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ─── UPLOAD EXCEL ─────────────────────────────────────────────────────
document.getElementById('btnUploadExcel').onclick = async () => {
  const branch = document.getElementById('excelBranch').value;
  const note = document.getElementById('excelNote').value.trim();
  if (!note) return;
  const sel = document.getElementById('excelFolder');
  const folderId = sel.value === '__new__' ? '' : sel.value;
  const fileInput = document.getElementById('excelFile');
  const file = fileInput?.files?.[0];
  let fileData = '', fileName = '', fileMime = '';
  if (file) { fileData = await readFileAsBase64(file); fileName = file.name; fileMime = file.type; }
  await db.collection('excelHub').add({ name: note, branch, folderId: folderId || '', fileData, fileName, fileMime, uploadedBy: window.username || 'unknown', uploadedAt: firebase.firestore.FieldValue.serverTimestamp() });
  await db.collection('historyHub').add({ name: note, operation: `Caricato Excel (${branch})`, uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('excelNote').value = '';
  if (fileInput) fileInput.value = '';
  document.getElementById('textDropExcel').textContent = 'Trascina qui il file Excel o clicca';
  await sendTelegramBroadcast(`\u2699\uFE0F *Nuovo File Excel:* ${escapeMarkdown(note)}\nRamo: ${escapeMarkdown(branch)}`);
};

// ─── UPLOAD DOC ───────────────────────────────────────────────────────
document.getElementById('btnUploadDoc').onclick = async () => {
  const title = document.getElementById('textTitle').value.trim();
  const bodyContent = document.getElementById('textContentBody').value.trim() || 'Nessun testo estratto inserito.';
  if (!title) return;
  const sel = document.getElementById('docFolder');
  const folderId = sel.value === '__new__' ? '' : sel.value;
  const fileInput = document.getElementById('docFile');
  const file = fileInput?.files?.[0];
  let fileData = '', fileName = '', fileMime = '', fileType = '';
  if (file) { fileData = await readFileAsBase64(file); fileName = file.name; fileMime = file.type; fileType = file.name.split('.').pop().toUpperCase(); }
  await db.collection('textHub').add({ title, fileName: fileName || (title + '.txt'), fileType: fileType || 'TXT', fileMime: fileMime || 'text/plain', fileData: fileData || '', extractedText: bodyContent, folderId: folderId || '', uploadedBy: window.username || 'unknown', uploadedAt: firebase.firestore.FieldValue.serverTimestamp() });
  await db.collection('historyHub').add({ name: title, operation: 'Caricato Documento / Report', uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
  document.getElementById('textTitle').value = '';
  document.getElementById('textContentBody').value = '';
  if (fileInput) fileInput.value = '';
  document.getElementById('textDropDoc').textContent = 'Trascina qui il documento o clicca';
  await sendTelegramBroadcast(`\u{1F4DD} *Nuovo Documento:* ${escapeMarkdown(title)}\nAnalizzabile dal Co-Pilot.`);
};

// ─── NOTES ────────────────────────────────────────────────────────────
document.getElementById('btnUploadNote').onclick = async () => {
  const content = document.getElementById('newNoteContent').value.trim();
  if (content) {
    await db.collection('notesHub').add({ content, createdBy: window.username || 'unknown', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    await db.collection('historyHub').add({ name: 'Nota Rapida', operation: 'Aggiunta nota condivisa', uploadedBy: window.username || 'unknown', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('newNoteContent').value = '';
    await sendTelegramBroadcast(`\u{1F4CC} *Nuova Nota:* ${escapeMarkdown(content)}`);
  }
};
db.collection('notesHub').orderBy('createdAt', 'desc').onSnapshot(snap => {
  const cn = document.getElementById('countNotes'); if (cn) cn.textContent = snap.size;
  const container = document.getElementById('notesContainer');
  if (!container) return;
  container.innerHTML = '';
  snap.forEach(d => {
    const div = document.createElement('div');
    div.className = 'bg-gray-50/80 dark:bg-slate-800/80 p-2 rounded border border-gray-200 dark:border-slate-700 flex justify-between items-start text-xs text-gray-700 dark:text-gray-300 shadow-2xs';
    const canDelete = window.userRole === 'owner' || d.data().createdBy === window.username;
    div.innerHTML = `<p class="break-words pr-2">${escapeHtml(d.data().content || '')}</p>` + (canDelete ? `<button data-note-id="${escapeHtml(d.id)}" class="delete-note-btn text-gray-400 hover:text-red-600 cursor-pointer">\u2715</button>` : '');
    container.appendChild(div);
  });
  container.querySelectorAll('.delete-note-btn').forEach(btn => {
    btn.addEventListener('click', () => window.deleteNote(btn.dataset.noteId));
  });
});
window.deleteNote = async id => { await db.collection('notesHub').doc(id).delete(); };

// ─── ARCHIVE + HISTORY ────────────────────────────────────────────────
let allExcelFiles = [], allTextFiles = [], allFolders = [];

db.collection('excelHub').orderBy('uploadedAt', 'desc').onSnapshot(s => {
  const ce = document.getElementById('countExcel'); if (ce) ce.textContent = s.size;
  allExcelFiles = [];
  s.forEach(d => allExcelFiles.push({ id: d.id, ...d.data(), isExcel: true }));
  combineAndRenderArchive();
});
db.collection('textHub').orderBy('uploadedAt', 'desc').onSnapshot(s => {
  const cd = document.getElementById('countDoc'); if (cd) cd.textContent = s.size;
  allTextFiles = [];
  s.forEach(d => allTextFiles.push({ id: d.id, ...d.data(), isExcel: false }));
  combineAndRenderArchive();
});
db.collection('archiveFolders').orderBy('createdAt', 'asc').onSnapshot(s => {
  allFolders = [];
  s.forEach(d => allFolders.push({ id: d.id, ...d.data() }));
  populateFolderSelects();
  combineAndRenderArchive();
});

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

function renderFolderList() {
  const el = document.getElementById('folderList');
  if (!el) return;
  if (!allFolders.length) { el.innerHTML = '<p class="text-xs text-gray-400 italic text-center py-4">Nessuna cartella. Creane una sopra.</p>'; return; }
  el.innerHTML = allFolders.map(f => `
    <div class="flex items-center justify-between gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-lg border dark:border-slate-700">
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 rounded" style="background:${f.color}"></span>
        <span class="text-xs font-semibold text-gray-700 dark:text-gray-200">${escapeHtml(f.name)}</span>
      </div>
      <button onclick="deleteFolder('${f.id}')" class="text-gray-400 hover:text-red-500 cursor-pointer text-xs" title="Elimina cartella">\u2715</button>
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
  const allFiles = [...allExcelFiles, ...allTextFiles];
  const totalCount = allFiles.length;
  let html = '<div class="folder-icon' + (!filterFolder ? ' active' : '') + '" style="color:#2563eb" data-folder-id=""><span class="fi-emoji">\u{1F4C1}</span><span class="fi-name">Tutte</span><span class="fi-count">' + totalCount + '</span></div>';
  allFolders.forEach(f => {
    const cnt = allFiles.filter(x => x.folderId === f.id).length;
    html += '<div class="folder-icon' + (filterFolder === f.id ? ' active' : '') + '" style="color:' + escapeHtml(f.color) + '" data-folder-id="' + f.id + '"><span class="fi-emoji">\u{1F4C1}</span><span class="fi-name">' + escapeHtml(f.name) + '</span><span class="fi-count">' + cnt + '</span></div>';
  });
  bar.innerHTML = html;
}

window.searchQuery = '';
document.getElementById('searchCloud')?.addEventListener('input', e => {
  window.searchQuery = e.target.value.toLowerCase();
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
  let items = [...allExcelFiles, ...allTextFiles].filter(f => {
    if (!window.searchQuery) return true;
    const haystack = f.isExcel ? `${f.name || ''} ${f.branch || ''}` : `${f.title || ''} ${f.fileType || ''} ${f.extractedText ? f.extractedText.substring(0, 200) : ''}`;
    return haystack.toLowerCase().includes(window.searchQuery);
  });
  if (filterFolder) items = items.filter(f => f.folderId === filterFolder);
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-xs text-gray-400 italic">Nessun file trovato</td></tr>';
    updateBulkActions();
    return;
  }
  items.forEach(f => {
    const folder = f.folderId ? getFolder(f.folderId) : null;
    const color = folder?.color || '#6b7280';
    const fName = folder?.name || 'Senza cartella';
    const tr = document.createElement('tr');
    tr.className = 'text-xs text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-slate-800 hover:bg-slate-50/50';
    tr.draggable = true;
    tr.ondragstart = e => { e.dataTransfer.setData('text/plain', JSON.stringify({ fileId: f.id, isExcel: f.isExcel })); e.dataTransfer.effectAllowed = 'move'; };
    const folderCell = `<td class="p-3"><span class="folder-dot" style="background:${color}"></span>${escapeHtml(fName)}</td>`;
    const canDel = window.userRole === 'owner' || f.uploadedBy === window.username;
    const actionsCell = `<td class="p-3 text-center flex items-center justify-center gap-1"><button data-id="${escapeHtml(f.id)}" class="download-doc-btn text-blue-500 hover:text-blue-300 cursor-pointer text-sm" title="Scarica">\u{1F4E5}</button>${canDel ? `<button data-id="${escapeHtml(f.id)}" data-excel="${f.isExcel}" data-name="${escapeHtml(f.name || f.title || 'File')}" class="delete-btn text-red-500 hover:text-red-300 cursor-pointer text-sm" title="Elimina">\u{1F5D1}\uFE0F</button>` : ''}</td>`;
    if (f.isExcel) {
      tr.innerHTML = `<td class="p-3 text-center"><input type="checkbox" class="archive-checkbox cursor-pointer" data-id="${escapeHtml(f.id)}" data-excel="true"></td><td class="p-3 font-medium">${escapeHtml(f.name || 'File Excel')}</td><td><span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">EXCEL</span></td>${folderCell}<td class="p-3 text-gray-500 italic">${escapeHtml(f.branch || '')}</td>${actionsCell}`;
    } else {
      tr.innerHTML = `<td class="p-3 text-center"><input type="checkbox" class="archive-checkbox cursor-pointer" data-id="${escapeHtml(f.id)}" data-excel="false"></td><td class="p-3 font-medium">${escapeHtml(f.title || 'Documento')}</td><td><span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">${escapeHtml(f.fileType || '')}</span></td>${folderCell}<td class="p-3 text-gray-400 font-mono text-[11px]">${escapeHtml(f.extractedText ? f.extractedText.substring(0, 40) + '...' : (f.fileName || ''))}</td>${actionsCell}`;
    }
    body.appendChild(tr);
  });
  body.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => window.deleteCloudItem(btn.dataset.id, btn.dataset.excel === 'true', btn.dataset.name));
  });
  body.querySelectorAll('.download-doc-btn').forEach(btn => {
    btn.addEventListener('click', () => window.downloadDocument(btn.dataset.id));
  });
  updateBulkActions();
}
window.combineAndRenderArchive = combineAndRenderArchive;

window.downloadDocument = id => {
  const file = [...allTextFiles, ...allExcelFiles].find(f => f.id === id);
  if (!file) return alert('File non trovato.');
  if (file.fileData) {
    const link = document.createElement('a');
    link.href = file.fileData;
    link.download = file.fileName || (file.title || file.name || 'documento');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  } else if (file.isExcel) {
    const content = `File Excel: ${file.name}\nRamo: ${file.branch}\nCaricato il: ${file.uploadedAt ? new Date(file.uploadedAt.seconds * 1000).toLocaleString('it-IT') : 'N/D'}`;
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
db.collection('historyHub').orderBy('timestamp', 'desc').onSnapshot(snap => {
  const b = document.getElementById('historyTableBody');
  if (!b) return;
  b.innerHTML = '';
  snap.forEach(d => {
    const data = d.data();
    const dStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString('it-IT') : 'In sincro...';
    const nameObj = escapeHtml(data.name || 'Elemento indefinito');
    const opObj = data.operation ? escapeHtml(data.operation) : (data.name ? 'Azione su: ' + escapeHtml(data.name) : 'Registrazione del ' + dStr);
    b.innerHTML += `<tr class="border-b dark:border-slate-800"><td class="p-2.5 text-center"><input type="checkbox" class="history-checkbox cursor-pointer" data-hid="${escapeHtml(d.id)}"></td><td class="p-2.5 font-mono text-[11px] text-purple-600 dark:text-purple-400">${dStr}</td><td class="p-2.5 font-medium">${nameObj}</td><td class="p-2.5 text-gray-500">${opObj}</td><td class="p-2.5 text-center"><button data-hid="${escapeHtml(d.id)}" class="delete-history-btn text-gray-400 hover:text-red-500 cursor-pointer">\u2715</button></td></tr>`;
  });
  b.querySelectorAll('.delete-history-btn').forEach(btn => {
    btn.addEventListener('click', () => window.deleteHistoryItem(btn.dataset.hid));
  });
  updateSelectAllHistory();
});
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
}
document.addEventListener('change', e => {
  if (e.target.classList.contains('history-checkbox')) updateSelectAllHistory();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Delete' && document.querySelectorAll('.history-checkbox:checked').length > 0) {
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

  let contextText = 'ARCHIVIO FILE DISPONIBILI:\n';
  allTextFiles.forEach(d => { contextText += `- ID:${d.id} | FILE: ${d.fileName || 'N/A'} | TITOLO: ${d.title} | CONTENUTO: ${(d.extractedText || 'Vuoto').substring(0, 300)}\n`; });
  allExcelFiles.forEach(e => { contextText += `- ID:${e.id} | FILE: ${e.name} | RAMO: ${e.branch}\n`; });

  const systemInstruction = `Sei l'assistente di Engineering Cloud Hub v3.0. Risposte in italiano, molto concise, sempre con fonte.

REGOLE:
- Cita SEMPRE la fonte con [Fonte: TitoloFile] per ogni informazione.
- Se usi piu file: [Fonte: File1] [Fonte: File2].
- Se dai info non presenti nei file elencati, dichiara la fonte esterna.
- Se non sai o non trovi l'informazione, dillo. Non inventare.
- Per offrire download: [DOWNLOAD:ID].

File:\n${contextText}`;

  const reqBase = { messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: queryText }] };

  async function aiFetch(url, opts) {
    const r = await fetch(url, opts);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const raw = await r.text();
    try { const j = JSON.parse(raw); return j.choices?.[0]?.message?.content || raw; } catch { return raw; }
  }

  let replyText = '';
  try {
    replyText = await aiFetch('https://text.pollinations.ai/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBase) });
  } catch {
    try {
      replyText = await aiFetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
        body: JSON.stringify({ ...reqBase, model: 'openai' })
      });
    } catch (err2) {
      replyText = '\u26A0\uFE0F AI non disponibile: ' + err2.message;
    }
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

// ─── SERVICE WORKER ───────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js?_=' + Date.now()).then(reg => { if (reg.active) reg.update(); }).catch(() => {});
}
