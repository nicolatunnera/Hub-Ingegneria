// Gestisce ciclo di vita e sovrapposizione di finestre (modali) e pannelli.
// Regole: una finestra per livello, clic fuori chiude, Esc chiude,
// scroll di fondo bloccato, focus intrappolato e ripristinato.
// In più: ogni finestra ha un link (#archivio per archiveModal) e l'ultima
// finestra aperta torna su al refresh della stessa scheda.
(() => {
  'use strict';

  const DEFAULT_LAYER = 50;
  const MODAL_SELECTOR = '[data-modal], [id$="Modal"]';
  // "overlay" = pannello fluttuante o cassetto, non una finestra a schermo intero.
  //   outsideClick: clic fuori lo chiude
  //   sweep:       quando si apre chiude le finestre già aperte (una sola cosa visibile)
  //   lockScroll:  false = la pagina sotto resta scrollabile
  const OVERLAY_DEFS = [
    { id: 'sidebar', close: 'closeSidebar', outsideClick: true },
    { id: 'chat-expanded', close: 'closeChatPanel', outsideClick: true, sweep: true, lockScroll: false },
    { id: 'evWishlistPanel', close: 'evCloseWishlist', outsideClick: true },
  ];
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), audio[controls], video[controls]';

  const info = new WeakMap();
  const openStack = [];
  let lastFocused = null;

  const isOpen = el => !!el && !el.classList.contains('hidden');
  const top = () => openStack[openStack.length - 1] || null;
  const entryOf = el => info.get(el);
  const isOverlay = el => {
    const entry = entryOf(el);
    return !!entry && entry.kind === 'overlay';
  };

  function layerOf(el) {
    const attr = el.getAttribute('data-modal-layer');
    if (attr !== null) return parseInt(attr, 10) || 0;
    const inline = parseInt(el.style && el.style.zIndex, 10);
    if (!isNaN(inline)) return inline;
    const match = /(?:^|\s)z-\[?(\d+)\]?/.exec(el.className || '');
    return match ? parseInt(match[1], 10) : DEFAULT_LAYER;
  }

  // Un figlio diretto senza contenuto proprio è il velo di sfondo, non la finestra.
  function isBackdropHit(root, node) {
    if (node === root) return true;
    if (node.nodeType !== 1 || node.parentElement !== root) return false;
    return node.children.length === 0 && !node.textContent.trim();
  }

  function hide(el) {
    if (!isOpen(el)) return;
    const name = el.getAttribute('data-modal-close') || (entryOf(el) || {}).close;
    const fn = name && window[name];
    markClosed(el);
    if (typeof fn === 'function') {
      try { fn(); } catch (e) { /* lo stato di chiusura viene verificato sotto */ }
    }
    if (isOpen(el)) el.classList.add('hidden');
  }

  const locksScroll = el => {
    const entry = entryOf(el);
    return !entry || entry.lockScroll !== false;
  };

  function syncScrollLock() {
    const root = document.documentElement;
    // Il chrome fluttuante (FAB, barra in basso) non deve restare sopra il velo.
    root.classList.toggle('window-open', openStack.some(el => !isOverlay(el)));
    if (openStack.some(locksScroll)) {
      if (!root.classList.contains('modal-lock')) {
        const gap = window.innerWidth - root.clientWidth;
        if (gap > 0) document.body.style.paddingRight = gap + 'px';
        root.classList.add('modal-lock');
      }
    } else {
      root.classList.remove('modal-lock');
      document.body.style.paddingRight = '';
    }
  }

  function visibleFocusables(el) {
    return Array.from(el.querySelectorAll(FOCUSABLE)).filter(node => {
      if (node.closest('.hidden, [hidden]')) return false;
      return !!(node.offsetWidth || node.offsetHeight || node.getClientRects().length);
    });
  }

  function markOpen(el) {
    const index = openStack.indexOf(el);
    if (index !== -1) openStack.splice(index, 1);
    if (!openStack.length) lastFocused = document.activeElement;
    openStack.push(el);
    const entry = entryOf(el);
    if (!isOverlay(el)) {
      const panel = Array.from(el.children).find(node => node.children.length || node.textContent.trim());
      if (panel) panel.setAttribute('data-modal-panel', '');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      const target = el.querySelector('[data-modal-focus]') || el;
      target.focus({ preventScroll: true });
      // Le finestre già aperte più in alto (o allo stesso livello) verrebbero
      // coperte da questa: si chiudono. Quelle sotto restano come base del pile.
      openStack.slice().forEach(other => {
        sweepOther(el, other, other => !isOverlay(other) && layerOf(other) < layerOf(el));
      });
      writeLocation(el);
      remember(el);
    } else if (entry && entry.sweep) {
      // Un pannello fluttuante (chat IA, preferiti) non ha velo: se resta aperto
      // sopra una finestra le due cose si vedono insieme. Chiude tutto il resto.
      openStack.slice().forEach(other => sweepOther(el, other, () => false));
    }
    syncScrollLock();
  }

  function sweepOther(el, other, keep) {
    if (other === el || other.hasAttribute('data-modal-sticky') || keep(other)) return;
    hide(other);
  }

  function markClosed(el) {
    const index = openStack.indexOf(el);
    if (index === -1) return;
    openStack.splice(index, 1);
    el.removeAttribute('aria-modal');
    syncScrollLock();
    if (openStack.length) return;
    forgetTop(el);
    const restore = lastFocused;
    lastFocused = null;
    if (restore && restore.isConnected && (!document.activeElement || document.activeElement === document.body || el.contains(document.activeElement))) {
      restore.focus({ preventScroll: true });
    }
  }

  const observer = new MutationObserver(records => {
    records.forEach(record => {
      const el = record.target;
      if (isOpen(el)) {
        if (openStack.indexOf(el) === -1) markOpen(el);
      } else {
        markClosed(el);
      }
    });
  });

  function register(el, entry) {
    if (info.has(el)) return;
    info.set(el, entry);
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    if (isOpen(el)) markOpen(el);
  }

  function considerModal(el) {
    if (info.has(el)) return;
    if (!el.classList.contains('fixed') || !el.classList.contains('inset-0')) return;
    register(el, { kind: 'modal' });
  }

  function scan(root) {
    const scope = root && root.nodeType === 1 ? root : document;
    if (scope !== document) considerModal(scope);
    Array.from(scope.querySelectorAll(MODAL_SELECTOR)).forEach(considerModal);
    if (scope !== document) return;
    OVERLAY_DEFS.forEach(def => {
      const el = document.getElementById(def.id);
      if (el) register(el, { kind: 'overlay', close: def.close, outsideClick: !!def.outsideClick, sweep: !!def.sweep, lockScroll: def.lockScroll !== false });
    });
  }

  const RESTORE_KEY = 'hub-ultima-finestra';

  const slugOf = el => String(el.id || '').replace(/Modal$/, '');

  function idFromHash(raw) {
    const slug = String(raw || '').replace(/^#/, '').trim();
    if (!/^[A-Za-z0-9_-]{2,60}$/.test(slug)) return '';
    const el = document.getElementById(slug) || document.getElementById(slug + 'Modal');
    if (!el) return '';
    const entry = entryOf(el);
    return entry && entry.kind === 'modal' ? el.id : '';
  }

  function writeLocation(el) {
    const slug = slugOf(el);
    if (!slug || location.hash === '#' + slug) return;
    try { history.replaceState(null, '', location.pathname + location.search + '#' + slug); } catch (e) { /* file:// blocca replaceState */ }
  }

  function remember(el) {
    try { sessionStorage.setItem(RESTORE_KEY, el.id); } catch (e) { /* modalità privata */ }
  }

  // L'URL e la memoria del "dove eri" si puliscono solo quando non resta nessuna finestra.
  function forgetTop(el) {
    const slug = slugOf(el);
    if (slug && location.hash === '#' + slug) {
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    }
    try { if (sessionStorage.getItem(RESTORE_KEY) === el.id) sessionStorage.removeItem(RESTORE_KEY); } catch (e) {}
  }

  function openFromHash() {
    const id = idFromHash(location.hash);
    if (!id) return false;
    const el = document.getElementById(id);
    if (isOpen(el)) return true;
    el.classList.remove('hidden');
    return true;
  }

  function restoreAtBoot() {
    if (openFromHash()) return;
    let saved = '';
    try { saved = sessionStorage.getItem(RESTORE_KEY) || ''; } catch (e) {}
    const el = saved && document.getElementById(saved);
    if (!el || isOverlay(el) || isOpen(el)) return;
    el.classList.remove('hidden');
  }

  // phase "press" = pointerdown, phase "click" = click.
  // I pannelli fluttuanti (chat IA, sidebar, preferiti) si chiudono già sul
  // pointerdown e SENZA stopPropagation: il pulsante toccato sotto funziona
  // davvero, altrimenti il primo tap sembrava "non fare nulla".
  // Le finestre a schermo intero restano al click: chiudere sul pointerdown
  // farebbe ricadere il click sulla pagina nascosta sotto il velo.
  function handlePress(e, phase) {
    if (!openStack.length) return false;
    const node = e.target;
    for (let i = openStack.length - 1; i >= 0; i--) {
      const el = openStack[i];
      if (!isOpen(el)) continue;
      if (isOverlay(el)) {
        const entry = entryOf(el);
        if (!entry.outsideClick || el.contains(node)) continue;
        const trigger = node.closest && node.closest('[data-overlay]');
        if (trigger && trigger.getAttribute('data-overlay') === el.id) continue;
        hide(el);
        return true;
      }
      if (phase === 'press') return false;
      if (isBackdropHit(el, node)) {
        hide(el);
        // Il clic di chiusura non deve arrivare anche al toggle inline sull'elemento.
        e.stopPropagation();
      }
      return true;
    }
    return false;
  }

  let closingPress = false;
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    closingPress = handlePress(e, 'press');
    if (closingPress) {
      // Se il gesto diventa uno scroll e il click non arriva, il flag non deve
      // mangiarsi il click successivo.
      setTimeout(() => { closingPress = false; }, 0);
    }
  }, true);
  document.addEventListener('click', e => {
    if (closingPress) { closingPress = false; return; }
    if (e.button !== 0) return;
    handlePress(e, 'click');
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const el = top();
      if (el) { e.preventDefault(); hide(el); }
      return;
    }
    if (e.key !== 'Tab') return;
    const el = top();
    if (!el || isOverlay(el)) return;
    const items = visibleFocusables(el);
    if (!items.length) return;
    if (!el.contains(e.target)) { e.preventDefault(); items[0].focus(); return; }
    const index = items.indexOf(e.target);
    if (e.shiftKey && index <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && index === items.length - 1) { e.preventDefault(); items[0].focus(); }
  });

  window.ModalManager = {
    open(id) {
      const el = document.getElementById(id);
      if (el) el.classList.remove('hidden');
      return el || null;
    },
    close(id) {
      const el = document.getElementById(id);
      if (el) hide(el);
    },
    closeAll() {
      openStack.slice().forEach(hide);
    },
    current() {
      return top();
    },
    refresh: scan,
  };

  scan(document);
  window.addEventListener('hashchange', openFromHash);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreAtBoot, { once: true });
  } else {
    restoreAtBoot();
  }
  new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (node.nodeType !== 1 || !node.matches) return;
        if (node.matches(MODAL_SELECTOR) || (node.querySelector && node.querySelector(MODAL_SELECTOR))) scan(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
