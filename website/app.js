/* ==========================================================================
   HIJIN TECH — app.js v3.0
   Navigation, animations, pricing toggle, trial generator, firm calculator
   ========================================================================== */

'use strict';

// ── 1. Header scroll shadow ────────────────────────────────────────────────
(function () {
  const header = document.getElementById('site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ── 2. Mobile hamburger menu ───────────────────────────────────────────────
(function () {
  const btn = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-mobile-drawer');
  if (!btn || !drawer) return;

  btn.addEventListener('click', () => {
    const open = drawer.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !drawer.contains(e.target)) {
      drawer.classList.remove('open');
      btn.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  // Close drawer links
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      drawer.classList.remove('open');
      btn.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
})();

// ── 3. Scroll-reveal intersection observer ─────────────────────────────────
(function () {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
})();

// ── 4. Animated number counters (hero metrics) ─────────────────────────────
(function () {
  const metrics = document.querySelectorAll('[data-count]');
  if (!metrics.length) return;

  const animate = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      const current = Math.round(target * ease);
      el.textContent = current + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animate(e.target); obs.unobserve(e.target); } });
  }, { threshold: 0.5 });

  metrics.forEach(el => obs.observe(el));
})();

// ── 5. Scroll-to-top FAB ──────────────────────────────────────────────────
(function () {
  const fab = document.getElementById('fab-top');
  if (!fab) return;
  window.addEventListener('scroll', () => fab.classList.toggle('visible', window.scrollY > 500), { passive: true });
  fab.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// ── 6. Pricing toggle (Monthly ↔ Annual) ──────────────────────────────────
(function () {
  const monthlyBtn = document.getElementById('toggle-monthly');
  const annualBtn  = document.getElementById('toggle-annual');
  const singleToggle = document.getElementById('pricing-toggle');
  const labelMonthly = document.getElementById('label-monthly');
  const labelAnnual = document.getElementById('label-annual');

  let mode = 'monthly';

  const updatePrices = () => {
    document.querySelectorAll('[data-monthly-price]').forEach(el => {
      const price = mode === 'monthly'
        ? el.dataset.monthlyPrice
        : el.dataset.annualPrice;
      if (price !== undefined) el.textContent = '$' + price;
    });

    if (monthlyBtn && annualBtn) {
      monthlyBtn.classList.toggle('active', mode === 'monthly');
      annualBtn.classList.toggle('active', mode === 'annual');
    }
    if (labelMonthly && labelAnnual) {
      labelMonthly.classList.toggle('active', mode === 'monthly');
      labelAnnual.classList.toggle('active', mode === 'annual');
    }
    if (singleToggle) {
      singleToggle.setAttribute('aria-pressed', String(mode === 'annual'));
      const textSpan = singleToggle.querySelector('span');
      if (textSpan) {
        textSpan.textContent = mode === 'monthly' ? 'Switch to Annual (Save 18%)' : 'Switch to Monthly';
      }
    }
  };

  if (monthlyBtn && annualBtn) {
    monthlyBtn.addEventListener('click', () => { mode = 'monthly'; updatePrices(); });
    annualBtn.addEventListener('click',  () => { mode = 'annual';  updatePrices(); });
  }
  if (singleToggle) {
    singleToggle.addEventListener('click', () => {
      mode = mode === 'monthly' ? 'annual' : 'monthly';
      updatePrices();
    });
  }
  updatePrices();
})();

// ── 7. Trial key generator ─────────────────────────────────────────────────
(function () {
  const form   = document.getElementById('trial-form');
  const input  = document.getElementById('trial-email');
  const result = document.getElementById('trial-result');
  const keyEl  = document.getElementById('trial-key');
  const copyBtn= document.getElementById('trial-copy-btn');

  if (!form || !input) return;

  function generateKey(email) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seed   = Array.from(email + Date.now()).reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 7);
    let rng = seed;
    const next = () => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng; };
    const seg = (n) => Array.from({ length: n }, () => chars[next() % chars.length]).join('');
    return `HJN-TRL-${seg(4)}-${seg(4)}-${seg(4)}`;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!email || !email.includes('@')) {
      input.style.borderColor = '#f43f5e';
      input.focus();
      setTimeout(() => { input.style.borderColor = ''; }, 2000);
      return;
    }
    const key = generateKey(email);
    if (keyEl) keyEl.textContent = key;
    if (result) result.style.display = 'block';
  });

  if (copyBtn && keyEl) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(keyEl.textContent).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = orig; }, 2000);
      });
    });
  }
})();

// ── 8. Firm seat calculator ────────────────────────────────────────────────
(function () {
  const slider       = document.getElementById('seat-slider');
  const seatCountEl  = document.getElementById('seat-count-display');
  const baseRateEl   = document.getElementById('calc-base-rate');
  const discountEl   = document.getElementById('calc-discount');
  const totalMonthEl = document.getElementById('calc-total-month');
  const totalYearEl  = document.getElementById('calc-total-year');

  if (!slider) return;

  const BASE_PRICE = 99;

  const getDiscount = (seats) => {
    if (seats >= 50) return 0.30;
    if (seats >= 25) return 0.22;
    if (seats >= 10) return 0.15;
    if (seats >=  5) return 0.08;
    return 0;
  };

  const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const update = () => {
    const seats    = parseInt(slider.value, 10);
    const disc     = getDiscount(seats);
    const rate     = Math.round(BASE_PRICE * (1 - disc));
    const monthly  = rate * seats;
    const yearly   = monthly * 10; // 2 months free

    if (seatCountEl)  seatCountEl.textContent  = seats;
    if (baseRateEl)   baseRateEl.textContent    = fmt(rate) + '/seat';
    if (discountEl)   discountEl.textContent    = disc > 0 ? `${Math.round(disc * 100)}% volume discount` : 'No discount';
    if (totalMonthEl) totalMonthEl.textContent  = fmt(monthly) + '/mo';
    if (totalYearEl)  totalYearEl.textContent   = fmt(yearly) + '/yr';
  };

  slider.addEventListener('input', update);
  update();
})();

// ── 9. Download page: plan-based UI ───────────────────────────────────────
(function () {
  const params = new URLSearchParams(window.location.search);
  const plan   = params.get('plan') || 'trial';
  const banners = { trial: 'trial-banner', monthly: 'monthly-banner', institutional: 'inst-banner' };

  Object.entries(banners).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = key === plan ? 'block' : 'none';
  });

  const dlBtn = document.getElementById('main-download-btn');
  if (dlBtn) {
    if (plan === 'trial') {
      dlBtn.textContent = 'Download & Start Trial';
    } else if (plan === 'monthly') {
      dlBtn.textContent = 'Download Licensed Installer';
    }
  }
})();

// ── 10. Hash copy button ───────────────────────────────────────────────────
(function () {
  document.querySelectorAll('[data-copy-hash]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hash = btn.closest('.hash-display')?.textContent?.trim() || '';
      navigator.clipboard.writeText(hash).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 2000);
      });
    });
  });
})();

// ── 11. Smooth anchor scrolling for #links ─────────────────────────────────
(function () {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
// ── 12. Interactive App Showcase Tabs ─────────────────────────────────────
(function () {
  const tabBtns = document.querySelectorAll('.preview-tab-btn');
  const tabPanes = document.querySelectorAll('.preview-tab-pane');
  if (!tabBtns.length || !tabPanes.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.toggle('active', b === btn));
      tabPanes.forEach(p => p.classList.toggle('active', p.id === target));
    });
  });
})();

// ── 13. Hardware & Storage Readiness Checker ──────────────────────────────
(function () {
  const ramSelect = document.getElementById('hw-ram');
  const storageSelect = document.getElementById('hw-storage');
  const gpuSelect = document.getElementById('hw-gpu');
  const badgeEl = document.getElementById('hw-result-badge');
  const textEl = document.getElementById('hw-result-text');
  const etaEl = document.getElementById('hw-eta-text');

  if (!ramSelect || !storageSelect || !gpuSelect) return;

  const evaluateHardware = () => {
    const ram = parseInt(ramSelect.value, 10);
    const storage = parseInt(storageSelect.value, 10);
    const gpu = gpuSelect.value;

    let isOptimal = ram >= 16 && storage >= 25;
    let isCompatible = ram >= 8 && storage >= 15;

    if (badgeEl && textEl) {
      if (isOptimal) {
        badgeEl.className = 'status-pill status-verified';
        badgeEl.textContent = '✓ Hardware Verified: Optimal Performance';
        textEl.innerHTML = Your workstation has sufficient memory and high-speed NVMe storage to run both the <strong>Hijin Financial Specialist (6 GB)</strong> and <strong>Gemma 3 Conversation Core (6 GB)</strong> entirely locally. ;
      } else if (isCompatible) {
        badgeEl.className = 'status-pill badge-cyan';
        badgeEl.textContent = '✓ Hardware Compatible: Balanced Mode';
        textEl.innerHTML = Your workstation meets minimum operating criteria. We recommend installing the <strong>Smart Installer (6.58 MB)</strong> and downloading the <strong>Hijin Financial Specialist (6 GB)</strong> first.;
      } else {
        badgeEl.className = 'status-pill badge-amber';
        badgeEl.textContent = '⚠ Hardware Warning: Storage or RAM Limited';
        textEl.innerHTML = Running full local models requires at least 8 GB RAM and 15 GB free disk space. Consider freeing up drive space or connecting to an existing external Ollama server.;
      }
    }

    if (etaEl) {
      etaEl.textContent = gpu === 'cuda' 
        ? 'Expected Inference Speed: ~45–60 tokens/sec (High-speed RTX)' 
        : 'Expected Inference Speed: ~12–22 tokens/sec (CPU Multi-threaded)';
    }
  };

  ramSelect.addEventListener('change', evaluateHardware);
  storageSelect.addEventListener('change', evaluateHardware);
  gpuSelect.addEventListener('change', evaluateHardware);
  evaluateHardware();
})();

// ── 14. Real Release Download Handlers ──────────────────────────────────────
(function () {
  const downloadLinks = document.querySelectorAll('[data-download-installer]');
  downloadLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Allow default href navigation to https://github.com/Aktnyl/Hijin-AI/releases/download/v1.0.0/Hijin_Setup_1.0.0.exe
      const originalText = link.innerHTML;
      link.innerHTML = '<span>Starting Download (6.58 MB)...</span>';
      setTimeout(() => { link.innerHTML = originalText; }, 3500);
    });
  });
})();
