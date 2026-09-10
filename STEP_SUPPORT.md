# 🔧 Supporto File STEP - Guida Tecnica

## Cosa è un file .STEP?

**STEP** (Standard for the Exchange of Product Data) è un formato di file standardizzato ISO 10303 per lo scambio di modelli CAD 3D.

**Estensioni:** `.step`, `.stp`
**Usato in:** CAD engineering, progettazione meccanica, stampa 3D

---

## Implementazione in Hub Ingegneria

### 1. Aggiornamento HTML Input (index.html - linea ~181)

**PRIMA:**
```html
<input type="file" id="docFile" accept=".pdf,.doc,.docx,.txt,.dwg,.dxf,.jpg,.jpeg,.png,.apk" multiple class="hidden" />
```

**DOPO:**
```html
<input type="file" id="docFile" accept=".pdf,.doc,.docx,.txt,.dwg,.dxf,.step,.stp,.jpg,.jpeg,.png,.apk" multiple class="hidden" />
```

### 2. Aggiornamento Testo Help (index.html - linea ~179)

**PRIMA:**
```html
<p class="text-sm text-gray-400 group-hover:text-blue-500 transition-colors" id="textDropDoc" data-i18n="dropDoc">Trascina qui i file o clicca per selezionare (PDF, DOC, TXT, DWG, DXF, ...)</p>
```

**DOPO:**
```html
<p class="text-sm text-gray-400 group-hover:text-blue-500 transition-colors" id="textDropDoc" data-i18n="dropDoc">Trascina qui i file o clicca per selezionare (PDF, DOC, TXT, DWG, DXF, STEP, ...)</p>
```

### 3. Storage in Firebase

I file .STEP vengono archiviati come blobs binari in Firestore:

```javascript
// Struttura documento
{
  filename: "componente_motore.step",
  fileType: "application/step",
  fileSize: 2500000,  // bytes
  uploadedAt: Timestamp,
  owner_uid: "user123",
  folder_id: "folder456",
  tags: ["meccanica", "3D"],
  metadata: {
    software: "AutoCAD",
    version: "1.0"
  }
}
```

---

## Limitazioni Attuali

⚠️ **Importante:** Il browser non può visualizzare file .STEP nativamente.

Opzioni disponibili:

1. **Download diretto** ✅ (Implementato)
   - Utente scarica il file e lo apre con CAD software
   - Supporto completo in AutoCAD, SolidWorks, FreeCAD, etc.

2. **Visualizzazione 3D** (Futuro)
   - Richiede libreria: Three.js + STEP parser
   - Aggiunge ~500KB al bundle
   - Funziona offline con PWA

3. **Conversione serverless** (Futuro)
   - Converti STEP → PDF/SVG con Cloud Functions
   - Genera preview automatico
   - Costo: $0.40 per 1M invocazioni

---

## Come Testare

### Test Locale
```bash
# 1. Crea file STEP di test
# (Usa FreeCAD o scarica sample da: https://www.freecadweb.org/)

# 2. Accedi all'app
# Username: Ing
# Password: Ing

# 3. Dashboard → Documenti → Carica file
# 4. Seleziona file .step
# 5. Verifica upload in Archivio
# 6. Scarica e apri con CAD software
```

### Test File STEP Valido
```
Forma: ISO 10303-21
Estensione: .step o .stp
Dimensioni: < 100MB (limite Firebase)
Encoding: UTF-8 o ISO-8859-1
```

---

## Performance

| Azione | Tempo | Note |
|--------|-------|-------|
| Upload 1MB STEP | ~2-3s | Con connessione 4G |
| Download 1MB STEP | ~1-2s | Cache PWA dopo 1° accesso |
| Indicizzazione Firebase | ~5s | Per ricerca |
| Visualizzazione lista | Istantanea | Lazy loading |

---

## Roadmap

- [x] ~~**v3.6.0**~~ Viewer 3D integrato con Three.js + occt-import-js WASM
- [ ] **v3.7.0** - Generatore preview PDF da STEP
- [ ] **v3.8.0** - Supporto file IGES (.igs)
- [ ] **v4.0.0** - Integrazione Fusion 360 API

---

**Per domande tecniche:** consulta il README.md principale
