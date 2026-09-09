# 🏗️ Engineering Cloud Hub

**Piattaforma cloud ingegneristico per la gestione di documenti tecnici, preventivi, relazioni e certificazioni.**

[![Live Demo](https://img.shields.io/badge/Demo%20Live-https%3A%2F%2Fnicholatunnera.github.io%2FHub--Ingegneria-blue)](https://nicolatunnera.github.io/Hub-Ingegneria)
[![Version](https://img.shields.io/badge/Version-3.5.0-green)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

---

## 🎯 Caratteristiche

### 📊 Gestione Documenti
- ✅ **Excel Viewer** - Visualizza e navigazione file .xlsx, .xls, .csv
- 📄 **Documenti** - PDF, Word (.doc, .docx), Testo, Disegni (DWG, DXF), Immagini
- 🔧 **File CAD** - Supporto per file .step (nuovo!)
- 📝 **Note Rapide** - Crea e organizza note sincronizzate
- 🗂️ **Archivio** - Sistema di cartelle con filtri e ricerca

### 🧠 Funzionalità Avanzate
- 🤖 **AI Co-Pilot** - Assistente integrato per interrogare l'archivio
- 📊 **Calcolatore Pesi** - Calcolo automatico per barre d'acciaio
- 📈 **MTBF Calculator** - Calcolo affidabilità e Mean Time Between Failures
- 📋 **Registro Attività** - Storico completo di tutte le operazioni
- 💬 **Telegram Bot** - Notifiche e aggiornamenti via Telegram

### 🎨 User Experience
- 🌓 **Tema Scuro/Chiaro** - Switching automatico
- 🌍 **Multilingua** - Italiano e Inglese
- 📱 **Responsive Design** - Mobile, tablet, desktop
- 👁️ **Protezione Occhi** - Modalità sepia per ridurre l'affaticamento
- 🔐 **Autenticazione** - Login, registrazione, "Remember Me"

---

## 🚀 Quick Start

### Prerequisiti
- Browser moderno (Chrome, Firefox, Safari, Edge)
- Connessione internet
- Account Firebase (opzionale, per self-hosting)

### 1. Accesso Demo
Visita direttamente: **https://nicolatunnera.github.io/Hub-Ingegneria**

**Credenziali Demo:**
```
Username: Ing
Password: Ing
```

### 2. Registrazione Account Personale
Clicca su "Non hai un account? Registrati" e crea il tuo profilo

### 3. Carica i Tuoi File
- Clicca su **Excel**, **Documenti**, **Note** dalla dashboard
- Trascina i file o selezionali dal computer
- Organizza in cartelle

---

## 📦 Installazione Locale

### Clonare il Repository
```bash
git clone https://github.com/nicolatunnera/Hub-Ingegneria.git
cd Hub-Ingegneria
```

### Setup Firebase
1. Vai su **https://console.firebase.google.com**
2. Crea un nuovo progetto (es. "hub-ingegneria")
3. Abilita **Firestore Database** (Modalità produzione)
4. Abilita **Authentication** → Accesso Anonimo
5. Copia config in `index.html` (sezione Firebase init)

### Aggiornare Firebase Config
Cerca in `index.html` la sezione:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};
```

### Deploy su GitHub Pages
```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

Attiva GitHub Pages nelle impostazioni del repo:
- Settings → Pages → Source: `main branch`

---

## 🔒 Sicurezza Firebase

### Firestore Rules (IMPORTANTE!)
Vai su **Firebase Console → Firestore → Rules** e aggiorna:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Utenti: solo il proprietario può leggere/modificare
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Cartelle: solo il proprietario
    match /folders/{folderId} {
      allow read, write: if get(/databases/$(database)/documents/folders/$(folderId)).data.owner_uid == request.auth.uid;
    }
    
    // File: verifica proprietà cartella
    match /files/{fileId} {
      allow read, write: if get(/databases/$(database)/documents/folders/$(resource.data.folder_id)).data.owner_uid == request.auth.uid;
    }
    
    // Pubblico: lettura per ospiti
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth.uid != null;
    }
  }
}
```

**⚠️ CRITICO:** Non lasciare mai regole troppo permissive in produzione!

---

## 📋 Formati File Supportati

| Tipo | Estensioni | Descrizione |
|------|-----------|------------|
| **Excel** | `.xlsx`, `.xls`, `.csv` | Fogli di calcolo |
| **Documenti** | `.pdf`, `.doc`, `.docx`, `.txt` | Testi e PDF |
| **Disegni** | `.dwg`, `.dxf`, `.step` | File CAD/3D |
| **Immagini** | `.jpg`, `.jpeg`, `.png` | Foto e screenshot |
| **Mobile** | `.apk` | Applicazioni Android |

---

## 🛠️ Sviluppo

### Struttura Progetto
```
Hub-Ingegneria/
├── index.html          # App principale (monolitica)
├── style.css           # Stili Tailwind + custom
├── sw.js               # Service Worker (PWA)
├── manifest.json       # PWA manifest
├── firebase.rules      # Firestore security rules
├── icon-192.png        # App icon
├── icon-512.png        # App icon large
└── js/                 # (Vuoto, pronto per moduli)
```

### Tecnologie
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend:** Firebase (Firestore + Auth)
- **PWA:** Service Worker per offline support
- **Librerie:**
  - PDF.js - Visualizzazione PDF
  - Mammoth.js - Conversione DOC/DOCX
  - XLSX.js - Parsing Excel
  - Font Awesome - Icone

### Aggiungere Supporto per Nuovo Formato
1. Modifica `index.html` → input `accept` per file upload
2. Aggiungi logica di parsing/preview in JavaScript
3. Testa su mobile
4. Aggiorna tabella file supportati nel README

---

## 🐛 Troubleshooting

### Firebase non si connette
```javascript
// Verifica in console browser (F12)
console.log(firebase.app())
```

### File non caricano
- Verifica Firestore Security Rules
- Controlla storage quota Firebase
- Verifica permessi cartella

### PWA non funziona offline
- Svuota cache (DevTools → Application → Clear)
- Ricarica pagina
- Service Worker si aggiorna automaticamente

### Excel non visualizza dati
- Verifica che il file sia .xlsx valido
- Prova a riaprire l'app
- Controlla console per errori

---

## 📞 Supporto

**Bug Report:** Apri un issue su GitHub
**Suggerimenti:** Discussioni nella sezione Issues
**Contatti:** nicolatunnera@example.com

---

## 📄 Licenza

MIT License - Vedi LICENSE file

---

## 🔄 Versioning

| Versione | Data | Novità |
|----------|------|--------|
| **3.5.0** | 2025-01-20 | ✨ Supporto file .step, improved security rules |
| 3.4.0 | 2024-12-15 | MTBF Calculator |
| 3.3.0 | 2024-11-10 | Telegram integration |
| 3.2.0 | 2024-10-20 | AI Co-Pilot |

---

## 🎯 Roadmap

- [ ] Condivisione file con link pubblici
- [ ] Versionamento documento
- [ ] Integrazione OneDrive/Google Drive
- [ ] API REST pubblica
- [ ] Mobile app nativa (React Native)
- [ ] OCR per scansioni
- [ ] Collaborazione real-time

---

**Made with ❤️ by Nicola Tunnera**
