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
| `firebase.rules.auth-ready` | niente lettura pubblica, owner da allowlist di uid nel token, anonimi rifiutati | **no**: dopo la migrazione auth |
| `firebase.rules.agent-proposed.txt` | bozza esterna (2026-11-01), archiviata con i suoi difetti elencati in testa | **no**: romperebbe lettura e scrittura |

Il pulsante "chiudi finestra" o "nascondi ai guest" nel codice **non è una protezione**:
i dati arrivano comunque dal network. Le uniche due cose che contano sono le rules e
il token di autenticazione.

### Incidente 2026-11-01: regole pubblicate da un altro agente

Sintomo: archivio e note vuoti, `Missing or insufficient permissions` su `excelHub`,
`textHub`, `notesHub`, `subscribers`, `accountsHub`; `archiveFolders`, `categoriesHub`
e `historyHub` continuavano a leggere perché chiedevano solo `isSignedIn()`. Nessun
commit del repo era coinvolto: la modifica era solo nella console Firebase.

Causa: regole che pretendono campi che il client non ha mai scritto (`ownerUid`,
`createdAt`, `private`). In Firestore una `list` fallisce **tutta** se anche un solo
documento restituito non supera la regola, quindi l'archivio appare vuoto invece di
mostrare i file non privati. Lo stesso errore si ottiene con `get()` dentro una
regola di lista: ogni documento candidato costa una lettura e il budget è 20 per
richiesta, quindi sopra i ~20 file la query si spegne in `permission-denied`. Le
regole nuove evitano entrambi i modi (vedi il commento in testa a
`firebase.rules.auth-ready`).

Ripristino (2 minuti, è l'unica strada finché il client non scrive quei campi):
Console → Firestore → Regole → incolla il contenuto di `firebase.rules` → Pubblica.

Due difetti delle regole dell'altro agente da non ripetere:
- `get(/databases/$(database)/documents/accountsHub/$(uid))` presume che il documento
  account abbia come id l'uid. Qui gli id sono automatici e l'identificatore è il campo
  `username`: `isOwner()` risulta falso sempre, anche per l'owner vero, e il `get()` su
  un documento inesistente fa fallire l'intera regola. Con login reale e queste regole
  nessuno riuscirebbe più a leggere o scrivere nulla.
- `!data.private` e `data.ownerUid == uid` su documenti che quei campi non ce l'hanno.

### `chatHub` (trascrizioni dell'assistente IA)

`js/app.js` salva la conversazione IA in `chatHub/{chiave}` con `saveChatToCloud` /
`loadChatFromCloud`. La collezione non era nominata da nessuna regola, quindi l'accesso
era negato e la persistenza funzionava solo con `localStorage`. `firebase.rules` (quelle
in vigore) continua a non includerla: la chat resta locale, nessun dato esposto.
`firebase.rules.auth-ready` le aggiunge un match con la doc intestata all'uid
dell'account (`chatKey()`), così dopo la migrazione ogni membro legge e scrive solo la
propria.

### Come verificare da soli che la lettura sia pubblica
Apri il sito in incognito senza fare login, premi F12 e incolla:

```javascript
fetch('https://firestore.googleapis.com/v1/projects/<projectId>/databases/(default)/documents/textHub?key=<apiKey>')
  .then(r => r.json()).then(d => console.log(d.documents ? d.documents.length + ' documenti visibili' : d));
```

`<apiKey>` è quello in `js/config.js`: non è un secret, è la chiave pubblica del
progetto Firebase. Se escono documenti, la lettura è aperta.

### Cosa copre la migrazione e cosa no

Dopo il deploy di `firebase.rules.auth-ready`:

- **fuori**: chi non ha un account **approvato**. Non basta un token valido: con il
  provider Google attivo qualunque account Google produce un token, quindi le regole
  accettano solo le email in `ownerEmails()` / `memberEmails()` (o nel dominio
  `memberDomain()`). Gli anonimi sono rifiutati esplicitamente.
- **dentro**: chi ha un account. Un membro legge l'archivio (excel, documenti, note,
  bacheca, storico) anche se un file è marcato `private`: quel flag oggi è un filtro
  dell'interfaccia, non della regola. Renderlo vincolato costa una query
  `.where('private','==',false)` su ogni lista — con un backfill del campo sui
  documenti che non ce l'hanno, altrimenti spariscono dalla vista — più una seconda
  query vincolata a `ownerUid` per i file privati dell'utente. È il passo successivo
  naturale, non è incluso.
- **mai leggibili da un altro membro**: `accountsHub`, la lista completa degli
  iscritti Telegram con le chat id e la coda `accessRequestsHub` delle richieste di
  accesso — solo il proprio documento, oppure tutto per l'owner. Dentro `accountsHub` i
  campi `password` e `aiKey` si cancellano una volta con `await hubDropLegacySecrets()`
  (punto 5b della migrazione).

### Migrazione auth

Obiettivo: sostituire l'accesso anonimo con un account vero **e approvato**, così le
regole possono distinguere chi è dentro da chiunque apra il sito. Il provider attivo su
questo progetto è **Google** (2026-11-02); Email/Password è facoltativo.

1. **Firebase Console → Authentication → Sign-in method**
   - **Google: Attivo** (già fatto). Se un giorno aggiungi **Email/Password**, il client
     lo usa già senza altre modifiche.
   - **Anonimo** si disattiva solo alla fine (punto 8): serve ancora per non rompere le
     scritture sotto le regole vecchie.
   - Se il popup Google risponde `auth/configuration-not-found`: stessa pagina →
     tab **Impostazioni** → **Screen di consenso OAuth** → compilo nome app e email.
2. **Authentication → Settings → Authorized domains**
   - Aggiungi il dominio del sito (es. `nicolatunnera.github.io`) e `localhost`
     solo per lo sviluppo.
3. **Client** — fatto nei commit "auth: account Firebase veri" e "Accedi con Google":
   - **`hubGoogleLogin()`** (pulsante "Accedi con Google" nel muro di login): apre il
     popup Google, poi `ensureHubProfile()` crea `accountsHub/{uid}` con `role: 'user'`
     se non esiste. L'email viene dal token: in Firestore non finisce nessuna password.
   - `verifyHubLogin` prova in ordine: credenziali nel bundle (porta vecchia),
     account Firebase Email/Password, tabella `accountsHub` con hash DJB2 (nati prima).
     L'email Firebase è sintetizzata dall'username: `<username>@hub-ingegneria.app`.
   - `registerHubAccount` (pulsante "Registrati") crea l'utente con
     `createUserWithEmailAndPassword` e scrive il profilo con `role: 'user'`.
   - Le scritture si firmano da sole: `add()` e `set()` sono avvolti da `stampOwner()`,
     che aggiunge `ownerUid` (uid dell'account vero) e `createdAt`
     (`FieldValue.serverTimestamp()`, quindi il client non può mentire) se mancano.
   - `hubLogout()` chiude la sessione; `onAuthStateChanged` la ripristina all'avvio e
     ripiega sul login anonimo quando non c'è un account.
4. **Entra con Google e promuoviti**: dal sito → *Accedi con Google* → scegli l'account
   che vuoi usare come amministratore. Poi, nella console del browser:
   ```js
   await hubClaimOwner()
   ```
   Alza `role: 'owner'` sul tuo documento `accountsHub/{uid}` e ti fa entrare da
   proprietario — funziona finché le regole in vigore sono quelle permissive; dopo il
   punto 6 il campo `role` è bloccato e l'unica strada è
   **Firebase Console → Firestore Database → `accountsHub` → il tuo documento → `role`
   da `user` a `owner`**. Se preferisci non fidarti del client, fai subito il giro della
   Console: il risultato è lo stesso.
   Da loggato con un account reale puoi anche cancellare i tre documenti `accountsHub`
   vecchi (id random, password DJB2): non sono utenti Firebase e non servono più.
   L'email che il token contiene la stampa `await hubMigrationReport()` (campo `login`):
   è quella da scrivere in `ownerEmails()`.
   > **Come si apre la console del browser**: sul sito, `F12` (o tasto destro →
   > *Ispeziona*) → tab **Console** → se Chrome chiede un conferimento digita
   > `allow pasting` e Invio → incolla il comando → Invio. L'output è un oggetto:
   > `console.table` stampa anche la tabella dei documenti.
5. **Backfill dei documenti esistenti** (finché le regole sono ancora permissive):
   loggato come owner, apri la console del browser e lancia
   ```js
   await hubBackfillOwners()
   ```
   Firma `ownerUid` + `createdAt` sui file caricati prima della migrazione. Senza
   questo passaggio, dopo il punto 6 i vecchi file restano leggibili ma **non si
   possono più cancellare o rinominare**, perché le regole nuove chiedono `ownerUid`.
5b. **Cancella i secret morti da `accountsHub`**, sempre loggato owner:
   ```js
   await hubDropLegacySecrets()
   ```
   Rimuove i campi `password` (hash DJB2) e `aiKey` da tutti i documenti. Sono campi
   che il codice non usa più — le password le verifica Firebase Auth e `askAI` non
   chiama nessun provider, quindi `aiKey` era solo una copia pubblicamente
   scaricabile di una chiave. **Da fare dopo il punto 4**: senza `password` gli
   account del vecchio login non hanno più modo di entrare, e chi ci stava dentro deve
   passare da "Accedi con Google".
   Per sapere a che punto sei, dopo ogni passaggio rilancia
   ```js
   await hubMigrationReport()
   ```
   Dice con che account sei dentro (provider ed email), se Email/Password è attivo, se
   le letture sono ancora pubbliche (HTTP 200 sull'API REST), quanti documenti mancano
   di firma e quale passo manca.
6. **Metti le email approvate nelle regole**, poi fa il deploy. In
   `firebase.rules.auth-ready`:
   ```javascript
   function ownerEmails()  { return ['nicola.tunnera@gmail.com']; }
   function memberEmails() { return ['email.del.collega@gmail.com']; }
   ```
   Due motivi, entrambi seri. Il primo: il ruolo letto con `get()` su `accountsHub`
   dentro una query costa una lettura per documento e oltre il budget la query fallisce
   (è il punto 2 dell'incidente qui sopra); l'allowlist sta nel token, costo zero. Il
   secondo: con il provider Google attivo **chiunque** ha un account Google e può
   ottenere un token valido — senza lista delle email "isMember()" sarebbe una porta
   aperta. Per approvare un collega si aggiunge la sua email e si ripubblica; `role` nel
   documento decide solo quali pannelli vede l'interfaccia.
   Se tutti i colleghi hanno un dominio in comune, `memberDomain()` ('@tuostudio.it')
   evita di elencarli uno per uno.
   **Se un dominio in comune non c'è** (tutti su Gmail personale), l'alternativa alla
   trafila uno-per-uno è la coda di approvazione, che evita di riscrivere le regole a
   ogni nuovo arrivo:
   - Chi entra con Google e non è in lista riceve `permission-denied` e il client invia
     da solo la sua email in `accessRequestsHub/{uid}` (`hubRequestAccess()`; la
     collezione è scrivibile da qualsiasi token non anonimo, leggibile solo dall'owner).
   - L'owner, quando gli pare, lancia
     ```js
     await hubAccessQueue(['email.gia.approvata@gmail.com'])
     ```
     che stampa le richieste e la riga `memberEmails()` già composta con dentro le
     vecchie e le nuove: si incolla in `firebase.rules.auth-ready` e si pubblica.
     Un solo deploy per più persone, invece di uno per persona.
     Approvare via interfaccia, senza toccare le regole, non è possibile: l'unica
     informazione che la regola può leggere gratis è quella già dentro il token.
   ```bash
   cp firebase.rules.auth-ready firebase.rules
   ./deploy-rules.sh     # oppure incolla il contenuto in Console → Firestore → Rules
   ```
   Fallo solo dopo il punto 4 e 5: con le regole chiuse l'accesso dal bundle (`Ing`/`Ing`)
   non basta più per scrivere, serve un account Firebase. Se qualcosa si rompe, rimetti
   subito `firebase.rules` in Console: il sito torna funzionante (e di nuovo leggibile da
   tutti) in un click.
7. **Test**: da una finestra incognito senza login la lista file deve venire vuota e
   la console deve mostrare `Missing or insufficient permissions`; con "Accedi con
   Google" (email in `ownerEmails()`) tutto deve funzionare come prima. Tre cose
   cambiano, e sono volute: l'accesso dal bundle `Ing`/`Ing` non scrive più niente, i
   pannelli *account registrati* e *iscritti Telegram* si svuotano per i non owner (le
   liste di quelle collezioni sono riservate), e gli account creati col vecchio
   confronto DJB2 non si possono più usare — chi era dentro così deve entrare con
   Google e va approvato in `memberEmails()`.
8. **A migrazione avvenuta**, in Authentication → Sign-in method disattiva **Anonimo**:
   le regole nuove lo rifiutano già, ma toglierlo chiude anche il foro delle regole
   vecchie nel caso dovessi rideployarle.

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
npm install                 # basta express: serve solo il token
TELEGRAM_BOT_TOKEN="<nuovo token da @BotFather>" node telegram-proxy.js
```

Poi in `js/config.js` imposta `window.TELEGRAM_PROXY_URL = "https://<host>/telegram"`.

### Variabili d'ambiente del proxy

| KEY | VALUE | Note |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | il token nuovo dato da @BotFather (`123456789:AA...`) | **l'unica obbligatoria**; senza, il processo si ferma |
| `FIREBASE_KEY` | il **contenuto** del JSON del service account, tutto in una riga | facoltativa oggi; serve quando le regole Firestore diventeranno private |
| `FIREBASE_KEY_JSON` | il **path** del file (es. env di tipo *Secret File* su Render) | alternativa a `FIREBASE_KEY`; ha la precedenza `FIREBASE_KEY` |
| `TELEGRAM_ALLOWED_ORIGINS` | `https://nicolatunnera.github.io` (più valori separati da virgola) | facoltativa: se vuota vale la lista di default (`*.github.io`, `*.onrender.com`, `localhost`) |
| `PORT` | — | la imposta il hosting; non crearla a mano |

Il proxy legge la lista iscritti in due modi e sceglie da solo quale ha a disposizione:

- **modo `rest`** (default, nessuna chiave da configurare): legge `subscribers` con l'API
  REST di Firestore usando l'apiKey già pubblica in `js/config.js`. Funziona con le regole
  in vigore oggi, che permettono la lettura.
- **modo `admin`**: se trova un service account (`FIREBASE_KEY` o `FIREBASE_KEY_JSON`)
  usa quello, e continua a funzionare anche quando le regole saranno chiuse. Il service
  account si prende da **Firebase Console → ⚙ Project settings → Service accounts →
  Generate new private key** e dà accesso **amministrativo** al progetto: va solo nelle
  variabili d'ambiente del server, mai nel repo (`.gitignore` lo esclude e il workflow
  *Leak scan* blocca il deploy se viene committato).

Nota: quando metterai in vigore `firebase.rules.auth-ready`, il modo `rest` smetterà di
leggere gli iscritti e il proxy lo dirà con un `readError` su `/health`. A quel punto
configura `FIREBASE_KEY` per passare al modo `admin`.

Note:
- Il proxy spinge solo chat id già presenti nella collezione `subscribers`: un attaccante
  non può usarlo come spam relay verso indirizzi scelti da lui.
- Limite di 10 richieste/minuto per IP e 3000 caratteri per messaggio.
- Verifica dopo il deploy: apri `https://<host>/health` nel browser. Risposta buona:
  `{"ok":true,"service":"telegram-proxy","mode":"rest","subscribers":1}`.
  Se compare `readError`, le regole Firestore non fanno leggere `subscribers`.
- Se `TELEGRAM_PROXY_URL` è vuoto, il client salta l'invio e mostra un avviso invece di
  chiamare Telegram direttamente.
- **Il token vecchio è revocato**: se le notifiche non partono e Telegram risponde
  `401 Unauthorized`, rigeneralo con @BotFather (`/token`) e aggiorna `TELEGRAM_BOT_TOKEN`.


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
├── firebase.rules.agent-proposed.txt  # Bozza esterna 2026-11-01, NON deployabile (note in testa)
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
| **3.7.1** | 2026-11-02 | 🖥️ Interfaccia: i grafici delle statistiche non crescono più all'infinito (canvas dentro `.chart-box` a altezza determinata, prima `responsive:true` + `maintainAspectRatio:false` si auto-alimentava a ogni resize). Cassetto laterale ridisegnato: testata con chi è entrato (iniziali, nome, email, ruolo) e "Esci / Cambia", gruppi etichettati, item da 2,4rem con stato attivo, scrim che oscura la pagina e barra in fondo/FAB che scendono sotto quando è aperto. Login: la sessione ripristinata non entra più da sola, mostra la card "Sessione già aperta" con Entra / Esci-Cambia e la casella "Entra subito" (per singolo uid) → su un PC condiviso si possono provare più account; se l'account non è approvato la card offre "Chiedi l'accesso". Responsive: finestre con `dvh` al posto di `vh`, muro di login scorrevole quando la card è più alta della finestra, `overflow-wrap` sui testi che arrivano dal cloud, griglia dashboard `minmax(min(140px,100%),1fr)`; verificato senza overflow orizzontale da 320 a 1280px |
| **3.7.0** | 2026-11-01 | 🔐 Account Firebase veri: login/registrazione con Email/Password, scritture firmate (`ownerUid` + `createdAt`), `hubBackfillOwners()`, logout, avviso quando le letture sono riservate. Regole `auth-ready` riscritte per reggere le query (owner da allowlist di uid, niente `get()` nelle liste), `chatHub` intestata all'uid. `hubMigrationReport()` e `hubDropLegacySecrets()` per guidare e chiudere la migrazione; eliminata l'ultima lettura del campo `aiKey`. **Accedi con Google** (`hubGoogleLogin`) e regole `auth-ready` con allowlist di email: con un provider Google attivo un token valido lo ha chiunque, quindi "approvato" vuol dire email in lista. Barra di ricerca dell'archivio: il browser riempiva il campo con le credenziali salvate, ora il campo resta `readonly` finché non lo si tocca, ha `autocomplete="off"` e ogni valore scritto senza focus viene scartato. `hubClaimOwner()` (ruolo owner senza passare dalla Console), coda richieste di accesso `accessRequestsHub` con `hubRequestAccess()` / `hubAccessQueue()`, che stampa la riga `memberEmails()` già pronta da pubblicare in batch |
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
