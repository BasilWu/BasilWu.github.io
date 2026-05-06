/* ═══════════════════════════════════════════════
   BASIL STUDIO — Main JS
═══════════════════════════════════════════════ */

'use strict';

// ── THEME TOGGLE ──────────────────────────────
(function () {
  const toggleBtn = document.querySelector('[data-theme-toggle]');
  const html = document.documentElement;

  // Init from system preference (dark is default for this site)
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  let currentTheme = prefersDark ? 'dark' : 'light';
  html.setAttribute('data-theme', currentTheme);
  updateToggleIcon(currentTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', currentTheme);
      updateToggleIcon(currentTheme);
    });
  }

  function updateToggleIcon(theme) {
    if (!toggleBtn) return;
    if (theme === 'dark') {
      toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
      toggleBtn.setAttribute('aria-label', '切換至亮色模式');
    } else {
      toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      toggleBtn.setAttribute('aria-label', '切換至暗色模式');
    }
  }
})();

// ── HEADER SCROLL BEHAVIOR ────────────────────
(function () {
  const header = document.getElementById('header');
  if (!header) return;

  let lastScrollY = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;

        if (currentScrollY > 80) {
          header.classList.add('header--scrolled');
        } else {
          header.classList.remove('header--scrolled');
        }

        if (currentScrollY > lastScrollY && currentScrollY > 300) {
          header.classList.add('header--hidden');
        } else {
          header.classList.remove('header--hidden');
        }

        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

// ── MOBILE NAV ────────────────────────────────
(function () {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  const mobileLinks = mobileNav ? mobileNav.querySelectorAll('.mobile-nav__link') : [];

  if (!hamburger || !mobileNav) return;

  function openNav() {
    hamburger.classList.add('active');
    mobileNav.classList.add('open');
    mobileNav.setAttribute('aria-hidden', 'false');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    hamburger.classList.remove('active');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.contains('active');
    isOpen ? closeNav() : openNav();
  });

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
  });
})();

// ── SCROLL REVEAL ─────────────────────────────
(function () {
  const elements = document.querySelectorAll(
    '.service-card, .work-card, .process__step, .about__card, .about__code-block, .about__text, .contact__info, .contact__form'
  );

  elements.forEach((el, i) => {
    el.classList.add('reveal');
    // Stagger delay for grid children
    const delay = (i % 4) * 0.1;
    el.style.transitionDelay = `${delay}s`;
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  elements.forEach(el => observer.observe(el));
})();

// ── ACTIVE NAV LINK ───────────────────────────
(function () {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav__link:not(.nav__link--cta)');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('nav__link--active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { threshold: 0.3, rootMargin: '-64px 0px 0px 0px' });

  sections.forEach(s => observer.observe(s));
})();

// ── CONTACT FORM ──────────────────────────────
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    form.querySelectorAll('.form__error').forEach(el => el.remove());
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

    const name = form.querySelector('#name');
    const email = form.querySelector('#email');
    const message = form.querySelector('#message');

    let valid = true;

    if (!name.value.trim()) {
      showError(name, '請填寫你的名字');
      valid = false;
    }

    if (!email.value.trim() || !isValidEmail(email.value)) {
      showError(email, '請輸入有效的 Email');
      valid = false;
    }

    if (!message.value.trim()) {
      showError(message, '請填寫訊息內容');
      valid = false;
    }

    if (!valid) return;

    // Simulate submission
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>送出中...</span>';

    await delay(1200);

    form.innerHTML = `
      <div class="form__success">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" style="margin:0 auto var(--space-4)">
          <circle cx="12" cy="12" r="10"/><polyline points="9 12 11.5 14.5 15 10"/>
        </svg>
        <p>訊息已送出！</p>
        <p style="font-size:var(--text-sm);color:var(--color-text-muted);margin-top:var(--space-2);font-weight:400">
          謝謝你的訊息，我會在 24 小時內回覆。
        </p>
      </div>
    `;
  });

  function showError(input, msg) {
    input.classList.add('error');
    const err = document.createElement('p');
    err.className = 'form__error';
    err.textContent = msg;
    input.parentElement.appendChild(err);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();

// ── SMOOTH SCROLL FOR ANCHOR LINKS ───────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Add active style
const style = document.createElement('style');
style.textContent = `.nav__link--active { color: var(--color-primary) !important; }`;
document.head.appendChild(style);
