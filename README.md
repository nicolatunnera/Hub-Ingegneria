# 🏗️ Engineering Cloud Hub

**Piattaforma cloud ingegneristico per la gestione di documenti tecnici, preventivi, relazioni e certificazioni.**

[![Live Demo](https://img.shields.io/badge/Demo%20Live-https%3A%2F%2Fnicholatunnera.github.io%2FHub--Ingegneria-blue)](https://nicolatunnera.github.io/Hub-Ingegneria)
[![Version](https://img.shields.io/badge/Version-3.6.0-green)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

---

## 🎯 Caratteristiche

### 📊 Gestione Documenti
- ✅ **Excel Viewer** - Visualizza e navigazione file .xlsx, .xls, .csv
- 💎 **Viewer Integrato** - Anteprima PDF, Word (.docx), disegni 2D DXF, modelli 3D STEP/STP direttamente in schedario
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
- 🪟 **Finestre** - Una finestra alla volta, click fuori o Esc per chiudere, link
  diretti (`#archivio`, `#note`, `#stats`…) e ripristino dell'ultima finestra al refresh

---

## 🚀 Quick Start

### Prerequisiti
- Browser moderno (Chrome, Firefox, Safari, Edge)
- Connessione internet
- Account Firebase (opzionale, per self-hosting)

### 1. Accesso Demo
Visita direttamente: **https://nicolatunnera.github.io/Hub-Ingegneria**

> ⚠️ **Le credenziali non sono più pubblicate qui.** Fino alla versione 3.6.0 questo
> file mostrava login e password dell'account owner, che è un controllo lato client:
> chiunque le leggesse avrebbe avuto il ruolo `owner`. Cambiali (vedi
> [Ruotare le credenziali owner](#ruotare-le-credenziali-owner)) e non rimetterle nel README.

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
4. Abilita **Authentication** → **Email/Password** (l'accesso Anonimo è quello che
   rende inutili le regole: vedi [Migrazione auth](#migrazione-auth))
5. Copia la config in `js/config.js` (`window.firebaseConfig`)
6. Se vuoi le notifiche Telegram, avvia il proxy e imposta `window.TELEGRAM_PROXY_URL`
   (vedi [Notifiche Telegram](#notifiche-telegram))

### Aggiornare Firebase Config
Cerca in `js/config.js` la sezione:
```javascript
window.firebaseConfig = {
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

## 🔒 Sicurezza

### Stato attuale (leggere prima di tutto il resto)

`firebase.rules` oggi fa `allow read: if true` su tutte le collezioni: **chiunque,
anche senza login, scarica file, documenti, note, storico e lista iscritti
Telegram con la chat id**. È il problema più grosso di questo repo e non si risolve
dal client — si risolve solo cambiando le regole, e le regole nuove hanno bisogno di
un login vero. Per questo il lavoro è in due passi:

| File | Ruolo | Si può deployare adesso? |
|------|-------|---------------------------|
| `firebase.rules` | quelle in vigore: lettura pubblica, scrittura a chi ha un token (anche anonimo) | sì, sono già online |
| `firebase.rules.auth-ready` | niente lettura pubblica, ruolo letto da `accountsHub/{uid}`, anonimi rifiutati | **no**: dopo la migrazione auth |

Il pulsante "chiudi finestra" o "nascondi ai guest" nel codice **non è una protezione**:
i dati arrivano comunque dal network. Le uniche due cose che contano sono le rules e
il token di autenticazione.

### Come verificare da soli che la lettura sia pubblica
Apri il sito in incognito senza fare login, premi F12 e incolla:

```javascript
fetch('https://firestore.googleapis.com/v1/projects/<projectId>/databases/(default)/documents/textHub?key=<apiKey>')
  .then(r => r.json()).then(d => console.log(d.documents ? d.documents.length + ' documenti visibili' : d));
```

`<apiKey>` è quello in `js/config.js`: non è un secret, è la chiave pubblica del
progetto Firebase. Se escono documenti, la lettura è aperta.

### Migrazione auth

Obiettivo: sostituire l'accesso anonimo con un account reale, così le regole possono
distinguere chi è dentro da chiunque apra il sito.

1. **Firebase Console → Authentication → Sign-in method**
   - Abilita **Email/Password** (o **Google** se preferisci).
   - Lascia **Anonimo** disattivato: è quello che rende inutile `isSignedIn()`.
2. **Authentication → Settings → Authorized domains**
   - Aggiungi il dominio del sito (es. `nicolatunnera.github.io`) e `localhost`
     solo per lo sviluppo.
3. **Sostituisci il login nel client** (`js/app.js`, la funzione `verifyHubLogin` e i
   due costanti `OWNER_USER` / `OWNER_PASS`): oggi confrontano stringhe salvate in
   `accountsHub` e decidono il ruolo nel browser, vanno rimpiazzate da
   `auth.createUserWithEmailAndPassword(email, pass)` e
   `auth.signInWithEmailAndPassword(email, pass)`.
4. **Migra gli account esistenti**: per ogni documento in `accountsHub` crea
   l'utente in Console (Authentication → Users → Aggiungi utente) e usa il suo `uid`
   come id del documento `accountsHub/{uid}`. Il campo `role` resta (`owner`, `user`, `guest`).
5. **Aggiungi i campi che le regole controllano**: ogni `add()`/`set()` lato client deve
   scrivere `ownerUid: auth.getUid()` e `createdAt: firebase.firestore.FieldValue.serverTimestamp()`.
6. **Deploy delle regole nuove**
   ```bash
   cp firebase.rules.auth-ready firebase.rules
   ./deploy-rules.sh     # oppure incolla il contenuto in Console → Firestore → Rules
   ```
7. **Test**: da una finestra incognito senza login la lista file deve venire vuota e
   la console deve mostrare `Missing or insufficient permissions`; con login normale
   tutto deve funzionare come prima.

Se qualcosa si rompe, rimetti subito `firebase.rules` in Console: il sito torna
funzionale (e di nuovo leggibile da tutti) in un click.

### Ruotare le credenziali owner

Il login `Ing` / `Ing` è hardcoded in `js/app.js` (`OWNER_USER` / `OWNER_PASS`) e il
ruolo `owner` è deciso dal client, quindi è apribile da chiunque legga il bundle. Dopo
la migrazione auth il ruolo non si indica più con una password condivisa: si toglie la
costante e il ruolo resta solo nel documento `accountsHub/{uid}`. In attesa della
migrazione, almeno cambia la password in `js/app.js` con una che non è pubblicata nel
README e non è la password di qualcos'altro.

### Notifiche Telegram

Il bot token **non deve mai stare in `js/config.js`**: quel file viene spedito al
browser, quindi qualsiasi token messo lì è pubblico per definizione (ed è così che il
token di questo progetto è finito nel bundle e nella history git).

Ora il flusso è: `app.js` → `POST <proxy>` → Telegram. Il proxy è in `server/telegram-proxy.js`
e tiene il token in una variabile d'ambiente.

```bash
cd server
npm install                 # dependencies già dichiarate in server/package.json
TELEGRAM_BOT_TOKEN="<nuovo token da @BotFather>" \
FIREBASE_KEY="$(cat ../firebase-key.json)" \
node telegram-proxy.js
```

Poi in `js/config.js` imposta `window.TELEGRAM_PROXY_URL = "https://<host>/telegram"`.

### Variabili d'ambiente del proxy

| KEY | VALUE | Note |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | il token nuovo dato da @BotFather (`123456789:AA...`) | obbligatoria; senza, il processo si ferma |
| `FIREBASE_KEY` | il **contenuto** del JSON del service account, tutto in una riga | il modo più semplice su Render: "Add Environment Variable" e incolla il file |
| `FIREBASE_KEY_JSON` | il **path** del file (es. env di tipo *Secret File* su Render) | alternativa a `FIREBASE_KEY`; ha la precedenza `FIREBASE_KEY` |
| `TELEGRAM_ALLOWED_ORIGINS` | `https://nicolatunnera.github.io` (più valori separati da virgola) | facoltativa: se vuota vale la lista di default (`*.github.io`, `*.onrender.com`, `localhost`) |
| `PORT` | — | la imposta il hosting; non crearla a mano |

Il service account JSON si prende da **Firebase Console → ⚙ Project settings → Service
accounts → Generate new private key**. Dà accesso **amministrativo** al progetto: va solo
dentro le variabili d'ambiente del server, mai nel repo (`.gitignore` lo esclude e il
workflow *Leak scan* blocca il deploy se viene committato).

Note:
- Il proxy spinge solo chat id già presenti nella collezione `subscribers`: un attaccante
  non può usarlo come spam relay verso indirizzi scelti da lui.
- Limite di 10 richieste/minuto per IP e 3000 caratteri per messaggio.
- Verifica dopo il deploy: apri `https://<host>/health` nel browser, deve rispondere
  `{"ok":true,"service":"telegram-proxy"}`.
- Se `TELEGRAM_PROXY_URL` è vuoto, il client salta l'invio e mostra un avviso invece di
  chiamare Telegram direttamente.
- **Il token vecchio è compromesso e va revocato**: @BotFather → `/revoke` (o
  `/token` per generarne uno nuovo). Rimuoverlo dal codice non basta, la history git lo
  contiene ancora.


---

## 📋 Formati File Supportati

| Tipo | Estensioni | Descrizione |
|------|-----------|------------|
| **Excel** | `.xlsx`, `.xls`, `.csv` | Fogli di calcolo |
| **Documenti** | `.pdf`, `.doc`, `.docx`, `.txt` | Testi e PDF |
| **Disegni** | `.dwg`, `.dxf`, `.step`, `.stp` | File CAD/3D |
| **Immagini** | `.jpg`, `.jpeg`, `.png` | Foto e screenshot |
| **Mobile** | `.apk` | Applicazioni Android |

---

## 🛠️ Sviluppo

### Struttura Progetto
```
Hub-Ingegneria/
├── index.html              # App principale (monolitica)
├── style.css               # Stili Tailwind + custom
├── sw.js                   # Service Worker (PWA, cache versionata per data)
├── manifest.json           # PWA manifest
├── firebase.rules          # Regole in vigore (lettura pubblica: da sostituire)
├── firebase.rules.auth-ready  # Regole pronte, da deployare dopo la migrazione auth
├── deploy-cloud.js         # Deployer rules da telefono (Firebase Admin)
├── deploy-web.js           # Deployer rules via browser/CLI
├── deploy-rules.sh         # Deployer rules via Firebase CLI
├── icon-192.png            # App icon
├── icon-512.png            # App icon large
├── .github/workflows/
│   ├── check-syntax.yml    # node --check sui file JS principali
│   └── leak-scan.yml       # blocca token/chiavi committati per errore
├── server/
│   └── telegram-proxy.js   # Proxy notifiche: qui vive il bot token, non nel bundle
└── js/
    ├── config.js           # Firebase config pubblica + i18n IT/EN (con chiavi vuote)
    ├── modal-manager.js    # Ciclo di vita finestre: sovrapposizioni, click fuori,
    │                       #   Esc, focus trap, deep-link #finestra
    └── app.js              # Logica app
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
| **3.6.0** | 2026-09-10 | 💎 Viewer file integrato: PDF, Word (.docx), STEP/STP 3D (occt-import-js WASM + Three.js), DXF 2D |
| **3.5.1** | 2026-09-10 | ✨ Supporto file STEP/STP, security rules adattate, deploy script, doc completa |
| **3.5.0** | 2025-01-20 | Mobile-layout fixes, chunking Firestore per file grandi |

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
