/* ==========================================================================
   HIJIN — app.js v4.5
   Navigation, tabs, clipboard helpers, smooth scrolling.
   Zero surveillance, zero fake trial generators, zero fake analytics.
   ========================================================================== */

'use strict';

// 1. Header scroll shadow
(function () {
  const header = document.getElementById('site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// 2. Mobile drawer navigation
(function () {
  const btn = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-mobile-drawer');
  if (!btn || !drawer) return;

  btn.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !drawer.contains(e.target)) {
      drawer.classList.remove('open');
    }
  });
})();

// 3. Tab switching (UI preview / Models filter)
(function () {
  document.querySelectorAll('[data-tab-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tabTarget;
      const group = btn.dataset.tabGroup || 'default';

      // Update buttons in group
      document.querySelectorAll(`[data-tab-group="${group}"]`).forEach(b => {
        b.classList.toggle('active', b === btn);
      });

      // Update panes in group
      document.querySelectorAll(`[data-pane-group="${group}"]`).forEach(pane => {
        pane.classList.toggle('active', pane.id === targetId);
      });
    });
  });
})();

// 4. Clipboard copy helper
(function () {
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy || btn.parentElement.querySelector('code')?.textContent?.trim();
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      });
    });
  });
})();

// 5. Smooth hash navigation
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

// 6. Account session detection across navigation
(function () {
  try {
    const stored = localStorage.getItem('hijin_auth_session_v1');
    if (stored) {
      const session = JSON.parse(stored);
      if (session && session.expiresAt > Date.now()) {
        document.querySelectorAll('a[href="auth.html"], #nav-auth-btn').forEach(el => {
          el.textContent = 'Account';
          el.setAttribute('href', 'account.html');
        });
      }
    }
  } catch (e) {}
})();
