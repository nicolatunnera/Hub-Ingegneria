import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { TELEGRAM_BOT_TOKEN, AI_KEY, firebaseConfig, i18n } from "./config.js";

const db = getFirestore(initializeApp(firebaseConfig));

function escapeHtml(t) { const d = document.createElement("div"); d.textContent = t; return d.innerHTML; }

// ─── LOGIN ────────────────────────────────────────────────────────────
window.verifyHubLogin = () => {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  if (user === 'Ing' && pass === 'Ing') {
    if (document.getElementById('rememberMe')?.checked) {
      localStorage.setItem('hub-user', user);
      localStorage.setItem('hub-pass', pass);
    } else {
      localStorage.removeItem('hub-user');
      localStorage.removeItem('hub-pass');
    }
    document.getElementById('loginBlocker').remove();
    document.getElementById('hubMainContent').classList.remove('hidden');
  } else {
    document.getElementById('loginError').classList.remove('hidden');
  }
};
(function autoLogin() {
  const u = localStorage.getItem('hub-user');
  const p = localStorage.getItem('hub-pass');
  if (u && p) {
    document.getElementById('loginUser').value = u;
    document.getElementById('loginPass').value = p;
    document.getElementById('rememberMe').checked = true;
    window.verifyHubLogin();
  }
})();
document.getElementById('loginUser')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.verifyHubLogin(); });
document.getElementById('loginPass')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.verifyHubLogin(); });

// ─── TOGGLE UTILITY ───────────────────────────────────────────────────
window.closeCalc = () => document.getElementById('calcModal')?.classList.add('hidden');
window.closeNews = () => document.getElementById('newsModal')?.classList.add('hidden');
window.closeChat = () => document.getElementById('chatModal')?.classList.add('hidden');
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
document.getElementById('chatBtn')?.addEventListener('click', () => document.getElementById('chatModal')?.classList.remove('hidden'));

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

// ─── I18N (imported from config.js) ──────────────────────────────────
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
    const snap = await getDocs(collection(db, 'subscribers'));
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
      body: JSON.stringify({ chat_id: chatId, text: '🔔 *Test notifica Engineering Hub*\n\nSe vedi questo messaggio, il bot funziona correttamente! ✅', parse_mode: 'Markdown' })
    });
    const data = await res.json();
    if (data.ok) alert('✅ Notifica inviata! Controlla Telegram.');
    else alert('❌ Errore: ' + (data.description || 'Risposta sconosciuta'));
  } catch (e) { alert('❌ Errore di rete: ' + e.message); }
};

document.getElementById('btnSubscribeTelegram').onclick = async () => {
  const chatId = document.getElementById('telChatIdInput').value.trim();
  const name = document.getElementById('telNameInput').value.trim() || 'Membro Hub';
  if (!chatId) return alert('Inserisci un Chat ID numerico!');
  await addDoc(collection(db, 'subscribers'), { chatId, name, subscribedAt: serverTimestamp() });
  document.getElementById('telChatIdInput').value = '';
  document.getElementById('telNameInput').value = '';
};
document.getElementById('btnUnsubscribeTelegram').onclick = async () => {
  const chatId = document.getElementById('telChatIdInput').value.trim();
  if (!chatId) return alert('Inserisci il Chat ID per disattivare.');
  const snap = await getDocs(collection(db, 'subscribers'));
  const dels = [];
  snap.forEach(uDoc => { if (uDoc.data().chatId === chatId) dels.push(deleteDoc(doc(db, 'subscribers', uDoc.id))); });
  await Promise.all(dels);
  document.getElementById('telChatIdInput').value = '';
};

onSnapshot(collection(db, 'subscribers'), snap => {
  const topTel = document.getElementById('topStatTelegram');
  if (topTel) topTel.textContent = snap.size;
  const container = document.getElementById('subscribersContainer');
  if (!container) return;
  if (snap.empty) { container.innerHTML = '<p class="text-[10px] text-gray-400 italic">Nessun iscritto alle notifiche Telegram.</p>'; return; }
  container.innerHTML = '';
  snap.forEach(d => {
    container.innerHTML += `<div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border dark:border-slate-800 text-[11px]"><span class="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-[10px]">👤</span><div><span class="font-semibold text-gray-700 dark:text-gray-200">${escapeHtml(d.data().name || '')}</span><span class="text-gray-400 ml-1.5">· ID ${escapeHtml(d.data().chatId || '')}</span></div></div>`;
  });
});

// ─── NEWS ─────────────────────────────────────────────────────────────
document.getElementById('btnSendNews').onclick = async () => {
  const content = document.getElementById('newsContent').value.trim();
  if (content) {
    await addDoc(collection(db, 'newsHub'), { content, createdAt: serverTimestamp() });
    document.getElementById('newsContent').value = '';
    await sendTelegramBroadcast(`📢 *Nuova comunicazione in Bacheca Hub:*\n\n${escapeMarkdown(content)}`);
  }
};
onSnapshot(query(collection(db, 'newsHub'), orderBy('createdAt', 'desc')), snap => {
  const container = document.getElementById('newsHistoryContainer');
  if (!container) return;
  container.innerHTML = '';
  snap.forEach(d => {
    container.innerHTML += `<div class="bg-purple-50/50 dark:bg-purple-950/10 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/40 text-xs text-gray-700 dark:text-gray-300 font-medium break-words">${escapeHtml(d.data().content || '')}</div>`;
  });
});

// ─── TEAM ─────────────────────────────────────────────────────────────
document.getElementById('btnRegister').onclick = async () => {
  const name = document.getElementById('regName').value.trim();
  const contact = document.getElementById('regContact').value.trim();
  if (name && contact) {
    await addDoc(collection(db, 'teamHub'), { name, contact, joinedAt: serverTimestamp() });
    document.getElementById('regName').value = '';
    document.getElementById('regContact').value = '';
  }
};
onSnapshot(query(collection(db, 'teamHub'), orderBy('joinedAt', 'desc')), snap => {
  const topTeam = document.getElementById('topStatTeam');
  if (topTeam) topTeam.textContent = snap.size;
  const container = document.getElementById('teamMembersContainer');
  if (!container) return;
  if (snap.empty) { container.innerHTML = '<p class="text-[10px] text-gray-400 italic">Nessun membro registrato.</p>'; return; }
  container.innerHTML = `<p class="text-[10px] text-gray-400 font-medium mb-1 tracking-wide uppercase">Membri iscritti (${snap.size})</p>`;
  snap.forEach(d => {
    const { name, contact } = d.data();
    container.innerHTML += `<div class="flex items-center justify-between gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-lg border dark:border-slate-700 text-[11px]"><div class="min-w-0 flex-1"><span class="font-semibold text-gray-700 dark:text-gray-200">${escapeHtml(name || '')}</span><span class="text-gray-400 ml-1.5">· ${escapeHtml(contact || '')}</span></div><button data-tid="${escapeHtml(d.id)}" class="unregister-btn text-gray-400 hover:text-red-500 hover:font-bold cursor-pointer text-xs leading-none p-0.5">✕</button></div>`;
  });
  container.querySelectorAll('.unregister-btn').forEach(btn => {
    btn.addEventListener('click', () => window.unregisterMember(btn.dataset.tid));
  });
});
window.unregisterMember = async id => {
  if (confirm('Rimuovere la tua registrazione dal team?')) await deleteDoc(doc(db, 'teamHub', id));
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
  const ref = await addDoc(collection(db, 'archiveFolders'), { name, color, createdAt: serverTimestamp() });
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
  await addDoc(collection(db, 'archiveFolders'), { name, color, createdAt: serverTimestamp() });
  document.getElementById('newFolderName').value = '';
  renderFolderList();
};
window.deleteFolder = async id => {
  const used = [...allExcelFiles, ...allTextFiles].filter(f => f.folderId === id);
  if (used.length) return alert(`Impossibile eliminare: ${used.length} file presenti in questa cartella.`);
  if (!confirm('Eliminare questa cartella?')) return;
  await deleteDoc(doc(db, 'archiveFolders', id));
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
  await addDoc(collection(db, 'excelHub'), { name: note, branch, folderId: folderId || '', fileData, fileName, fileMime, uploadedAt: serverTimestamp() });
  await addDoc(collection(db, 'historyHub'), { name: note, operation: `Caricato Excel (${branch})`, timestamp: serverTimestamp() });
  document.getElementById('excelNote').value = '';
  if (fileInput) fileInput.value = '';
  document.getElementById('textDropExcel').textContent = 'Trascina qui il file Excel o clicca';
  await sendTelegramBroadcast(`⚙️ *Nuovo File Excel:* ${escapeMarkdown(note)}\nRamo: ${escapeMarkdown(branch)}`);
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
  await addDoc(collection(db, 'textHub'), { title, fileName: fileName || (title + '.txt'), fileType: fileType || 'TXT', fileMime: fileMime || 'text/plain', fileData: fileData || '', extractedText: bodyContent, folderId: folderId || '', uploadedAt: serverTimestamp() });
  await addDoc(collection(db, 'historyHub'), { name: title, operation: 'Caricato Documento / Report', timestamp: serverTimestamp() });
  document.getElementById('textTitle').value = '';
  document.getElementById('textContentBody').value = '';
  if (fileInput) fileInput.value = '';
  document.getElementById('textDropDoc').textContent = 'Trascina qui il documento o clicca';
  await sendTelegramBroadcast(`📝 *Nuovo Documento:* ${escapeMarkdown(title)}\nAnalizzabile dal Co-Pilot.`);
};

// ─── NOTES ────────────────────────────────────────────────────────────
document.getElementById('btnUploadNote').onclick = async () => {
  const content = document.getElementById('newNoteContent').value.trim();
  if (content) {
    await addDoc(collection(db, 'notesHub'), { content, createdAt: serverTimestamp() });
    await addDoc(collection(db, 'historyHub'), { name: 'Nota Rapida', operation: 'Aggiunta nota condivisa', timestamp: serverTimestamp() });
    document.getElementById('newNoteContent').value = '';
    await sendTelegramBroadcast(`📌 *Nuova Nota:* ${escapeMarkdown(content)}`);
  }
};
onSnapshot(query(collection(db, 'notesHub'), orderBy('createdAt', 'desc')), snap => {
  const cn = document.getElementById('countNotes'); if (cn) cn.textContent = snap.size;
  const container = document.getElementById('notesContainer');
  if (!container) return;
  container.innerHTML = '';
  snap.forEach(d => {
    const div = document.createElement('div');
    div.className = 'bg-gray-50/80 dark:bg-slate-800/80 p-2 rounded border border-gray-200 dark:border-slate-700 flex justify-between items-start text-xs text-gray-700 dark:text-gray-300 shadow-2xs';
    div.innerHTML = `<p class="break-words pr-2">${escapeHtml(d.data().content || '')}</p><button data-note-id="${escapeHtml(d.id)}" class="delete-note-btn text-gray-400 hover:text-red-600 cursor-pointer">✕</button>`;
    container.appendChild(div);
  });
  container.querySelectorAll('.delete-note-btn').forEach(btn => {
    btn.addEventListener('click', () => window.deleteNote(btn.dataset.noteId));
  });
});
window.deleteNote = async id => { await deleteDoc(doc(db, 'notesHub', id)); };

// ─── ARCHIVE + HISTORY ────────────────────────────────────────────────
let allExcelFiles = [], allTextFiles = [], allFolders = [];

onSnapshot(query(collection(db, 'excelHub'), orderBy('uploadedAt', 'desc')), s => {
  const ce = document.getElementById('countExcel'); if (ce) ce.textContent = s.size;
  allExcelFiles = [];
  s.forEach(d => allExcelFiles.push({ id: d.id, ...d.data(), isExcel: true }));
  combineAndRenderArchive();
});
onSnapshot(query(collection(db, 'textHub'), orderBy('uploadedAt', 'desc')), s => {
  const cd = document.getElementById('countDoc'); if (cd) cd.textContent = s.size;
  allTextFiles = [];
  s.forEach(d => allTextFiles.push({ id: d.id, ...d.data(), isExcel: false }));
  combineAndRenderArchive();
});
onSnapshot(query(collection(db, 'archiveFolders'), orderBy('createdAt', 'asc')), s => {
  allFolders = [];
  s.forEach(d => allFolders.push({ id: d.id, ...d.data() }));
  populateFolderSelects();
  combineAndRenderArchive();
});

function populateFolderSelects() {
  const html = '<option value="">— Nessuna —</option>' + allFolders.map(f => `<option value="${f.id}" style="color:${f.color};font-weight:700">📁 ${f.name}</option>`).join('') + '<option value="__new__">✨ Nuova cartella...</option>';
  ['excelFolder', 'docFolder'].forEach(id => { const el = document.getElementById(id); if (el) { const v = el.value; el.innerHTML = html; el.value = v; } });
  const filter = document.getElementById('folderFilter');
  if (filter) {
    const v = filter.value;
    filter.innerHTML = '<option value="">📁 Tutte</option>' + allFolders.map(f => `<option value="${f.id}" style="color:${f.color}">📁 ${f.name}</option>`).join('');
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
      <button onclick="deleteFolder('${f.id}')" class="text-gray-400 hover:text-red-500 cursor-pointer text-xs" title="Elimina cartella">✕</button>
    </div>
  `).join('');
}

function getFolder(id) { return allFolders.find(f => f.id === id); }

function moveFileToFolder(fileId, isExcel, newFolderId) {
  updateDoc(doc(db, isExcel ? 'excelHub' : 'textHub', fileId), { folderId: newFolderId || '' });
}

function renderFolderIcons() {
  const bar = document.getElementById('folderIconsBar');
  if (!bar) return;
  const filterFolder = document.getElementById('folderFilter')?.value || '';
  const allFiles = [...allExcelFiles, ...allTextFiles];
  const totalCount = allFiles.length;
  let html = '<div class="folder-icon' + (!filterFolder ? ' active' : '') + '" style="color:#2563eb" data-folder-id=""><span class="fi-emoji">📁</span><span class="fi-name">Tutte</span><span class="fi-count">' + totalCount + '</span></div>';
  allFolders.forEach(f => {
    const cnt = allFiles.filter(x => x.folderId === f.id).length;
    html += '<div class="folder-icon' + (filterFolder === f.id ? ' active' : '') + '" style="color:' + escapeHtml(f.color) + '" data-folder-id="' + f.id + '"><span class="fi-emoji">📁</span><span class="fi-name">' + escapeHtml(f.name) + '</span><span class="fi-count">' + cnt + '</span></div>';
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
  if (!checked.length || !confirm(`Eliminare ${checked.length} elemento/i dal Cloud?`)) return;
  for (const cb of checked) {
    const id = cb.dataset.id;
    const isExcel = cb.dataset.excel === 'true';
    const file = [...allExcelFiles, ...allTextFiles].find(f => f.id === id);
    const itemName = file ? (file.name || file.title || id) : id;
    await deleteDoc(doc(db, isExcel ? 'excelHub' : 'textHub', id));
    await addDoc(collection(db, 'historyHub'), { name: itemName, operation: `Cancellazione ${isExcel ? 'Excel' : 'Documento'} dal Cloud`, timestamp: serverTimestamp() });
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
    const actionsCell = `<td class="p-3 text-center flex items-center justify-center gap-1"><button data-id="${escapeHtml(f.id)}" class="download-doc-btn text-blue-500 hover:text-blue-300 cursor-pointer text-sm" title="Scarica">📥</button><button data-id="${escapeHtml(f.id)}" data-excel="${f.isExcel}" data-name="${escapeHtml(f.name || f.title || 'File')}" class="delete-btn text-red-500 hover:text-red-300 cursor-pointer text-sm" title="Elimina">🗑️</button></td>`;
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
  if (confirm(`Eliminare l'elemento "${itemName}" dal Cloud?`)) {
    const tipo = isExcel ? 'Excel' : 'Documento';
    await deleteDoc(doc(db, isExcel ? 'excelHub' : 'textHub', id));
    await addDoc(collection(db, 'historyHub'), { name: itemName, operation: `Cancellazione ${tipo} dal Cloud`, timestamp: serverTimestamp() });
  }
};

// ─── HISTORY ──────────────────────────────────────────────────────────
onSnapshot(query(collection(db, 'historyHub'), orderBy('timestamp', 'desc')), snap => {
  const b = document.getElementById('historyTableBody');
  if (!b) return;
  b.innerHTML = '';
  snap.forEach(d => {
    const data = d.data();
    const dStr = data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleString('it-IT') : 'In sincro...';
    const nameObj = escapeHtml(data.name || 'Elemento indefinito');
    const opObj = data.operation ? escapeHtml(data.operation) : (data.name ? 'Azione su: ' + escapeHtml(data.name) : 'Registrazione del ' + dStr);
    b.innerHTML += `<tr class="border-b dark:border-slate-800"><td class="p-2.5 text-center"><input type="checkbox" class="history-checkbox cursor-pointer" data-hid="${escapeHtml(d.id)}"></td><td class="p-2.5 font-mono text-[11px] text-purple-600 dark:text-purple-400">${dStr}</td><td class="p-2.5 font-medium">${nameObj}</td><td class="p-2.5 text-gray-500">${opObj}</td><td class="p-2.5 text-center"><button data-hid="${escapeHtml(d.id)}" class="delete-history-btn text-gray-400 hover:text-red-500 cursor-pointer">✕</button></td></tr>`;
  });
  b.querySelectorAll('.delete-history-btn').forEach(btn => {
    btn.addEventListener('click', () => window.deleteHistoryItem(btn.dataset.hid));
  });
  updateSelectAllHistory();
});
document.getElementById('selectAllHistory')?.addEventListener('change', e => {
  document.querySelectorAll('.history-checkbox').forEach(cb => cb.checked = e.target.checked);
});
window.deleteHistoryItem = async id => { if (confirm('Rimuovere log storico?')) await deleteDoc(doc(db, 'historyHub', id)); };
function updateSelectAllHistory() {
  const sa = document.getElementById('selectAllHistory');
  if (sa) sa.checked = document.querySelectorAll('.history-checkbox:checked').length === document.querySelectorAll('.history-checkbox').length && document.querySelectorAll('.history-checkbox').length > 0;
}
document.addEventListener('change', e => {
  if (e.target.classList.contains('history-checkbox')) updateSelectAllHistory();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Delete' && document.querySelectorAll('.history-checkbox:checked').length > 0) {
    const checked = document.querySelectorAll('.history-checkbox:checked');
    if (confirm(`Rimuovere ${checked.length} log storico/i?`)) checked.forEach(cb => deleteDoc(doc(db, 'historyHub', cb.dataset.hid)));
  }
});

// ─── AI ASSISTANT ─────────────────────────────────────────────────────
function cleanLatex(s) {
  const g = { 'tau': 'τ', 'omega': 'ω', 'pi': 'π', 'alpha': 'α', 'beta': 'β', 'delta': 'δ', 'theta': 'θ', 'gamma': 'γ', 'lambda': 'λ', 'mu': 'μ', 'sigma': 'σ', 'phi': 'φ', 'psi': 'ψ', 'cdot': '·', 'times': '×', 'div': '÷', 'leq': '≤', 'geq': '≥', 'neq': '≠', 'infty': '∞', 'partial': '∂', 'nabla': '∇', 'rightarrow': '→', 'leftarrow': '←', 'cdots': '…', 'forall': '∀', 'exists': '∃', 'emptyset': '∅', 'subset': '⊂', 'supset': '⊃', 'subseteq': '⊆', 'supseteq': '⊇', 'cup': '∪', 'cap': '∩', 'in': '∈', 'notin': '∉', 'approx': '≈', 'equiv': '≡', 'propto': '∝', 'pm': '±', 'mp': '∓', 'cdotp': '·', 'text': '' };
  for (let k in g) s = s.replace(new RegExp('\\\\' + k + '\\b', 'g'), g[k]);
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2');
  s = s.replace(/\\sqrt(?:\[([^\]]*)\])?\{([^}]*)\}/g, '√($2)');
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
  container.innerHTML += `<div class="bg-blue-600/10 border border-blue-500/20 p-2.5 rounded-lg text-slate-200 font-medium text-right max-w-[85%] ml-auto">👤 ${escapeHtml(queryText)}</div>`;
  inputEl.value = '';
  container.scrollTop = container.scrollHeight;

  const dlMatch = queryText.match(/^(?:scarica|download|scaricare)\s+(.+)/i);
  if (dlMatch) {
    const query = dlMatch[1].toLowerCase().trim();
    const file = [...allTextFiles, ...allExcelFiles].find(f => (f.title || f.name || '').toLowerCase().includes(query));
    if (file) {
      window.downloadDocument(file.id);
      container.innerHTML += `<div class="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-emerald-400 max-w-[90%] text-xs">✅ Download avviato: <b>${escapeHtml(file.title || file.name)}</b></div>`;
      inputEl.disabled = false; sendBtn.disabled = false; inputEl.focus();
      container.scrollTop = container.scrollHeight;
      return;
    }
  }

  const loadingId = 'loading-' + Date.now();
  container.innerHTML += `<div id="${loadingId}" class="p-2 text-slate-500 italic font-mono text-[11px]">✍️ Sto pensando...</div>`;
  container.scrollTop = container.scrollHeight;

  let contextText = 'ARCHIVIO FILE DISPONIBILI:\n';
  allTextFiles.forEach(d => { contextText += `- ID:${d.id} | FILE: ${d.fileName || 'N/A'} | TITOLO: ${d.title} | CONTENUTO: ${(d.extractedText || 'Vuoto').substring(0, 300)}\n`; });
  allExcelFiles.forEach(e => { contextText += `- ID:${e.id} | FILE: ${e.name} | RAMO: ${e.branch}\n`; });

  const systemInstruction = `Sei l'assistente di Engineering Cloud Hub v2.5.0. Risposte in italiano, molto concise, sempre con fonte.

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
      replyText = '⚠️ AI non disponibile: ' + err2.message;
    }
  }

  document.getElementById(loadingId)?.remove();
  if (!replyText) replyText = '⚠️ Nessuna risposta ricevuta.';
  replyText = cleanLatex(replyText);

  const downloadMatch = replyText.match(/\[DOWNLOAD:([^\]]+)\]/);
  if (downloadMatch) {
    const fileId = downloadMatch[1];
    const file = [...allTextFiles, ...allExcelFiles].find(f => f.id === fileId);
    if (file) {
      replyText = replyText.replace(/\[DOWNLOAD:[^\]]+\]/, `<button onclick="window.downloadDocument('${fileId}')" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded cursor-pointer">📥 Scarica ${file.title || file.name}</button>`);
    }
  }

  const replyDiv = document.createElement('div');
  replyDiv.className = 'bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-slate-300 max-w-[90%] text-xs font-normal';
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
