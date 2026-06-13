/* =============================================
   FACTOR0X — MAIN JAVASCRIPT
   ============================================= */

// ── NAV SCROLL ──────────────────────────────
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

// ── HERO LOGO LABEL ────────────────────────
(() => {
  const logo = document.querySelector('#nav .logo');
  const heroLogoStage = document.querySelector('.brand-logo-stage');
  const heroImage = document.querySelector('.brand-first-slide img');
  if (!logo || !heroImage) return;

  const factorLogo = 'Factor<span class="logo-accent">0x</span>';
  const homeLogo = 'HOME';
  let currentLabel = '';

  function setLogo(label) {
    if (currentLabel === label) return;
    logo.innerHTML = label === 'home' ? homeLogo : factorLogo;
    currentLabel = label;
  }

  function updateLogoLabel() {
    const logoAnchor = window.matchMedia('(min-width: 769px)').matches && heroLogoStage
      ? heroLogoStage
      : heroImage;
    const imageBottom = logoAnchor.getBoundingClientRect().bottom + window.scrollY;
    const navHeight = nav?.offsetHeight || 0;
    setLogo(window.scrollY + navHeight >= imageBottom ? 'factor' : 'home');
  }

  window.addEventListener('scroll', updateLogoLabel, { passive: true });
  window.addEventListener('resize', updateLogoLabel);
  updateLogoLabel();
})();

// ── MOBILE MENU ─────────────────────────────
(() => {
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  const links = menu.querySelectorAll('a');

  function setOpen(isOpen) {
    burger.classList.toggle('open', isOpen);
    menu.classList.toggle('open', isOpen);
    document.body.classList.toggle('mobile-menu-open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-hidden', String(!isOpen));
  }

  burger.addEventListener('click', () => {
    setOpen(!menu.classList.contains('open'));
  });

  links.forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) setOpen(false);
  });
})();

// ── MOBILE INVOICE CAROUSEL ────────────────
(() => {
  const board = document.querySelector('.invoice-board');
  if (!board) return;

  const cards = Array.from(board.querySelectorAll('.invoice-card'));
  const slider = document.querySelector('.invoice-carousel-slider');
  const portraitQuery = window.matchMedia('(max-width: 820px) and (orientation: portrait)');
  let frame;
  let hasPositionedInitialCard = false;
  let isSliderSettling = false;
  let settleTimer;

  function setSliderIndex(index) {
    if (!slider) return;
    const max = Math.max(cards.length - 1, 0);
    const clamped = Math.min(Math.max(index, 0), max);
    slider.max = String(max);
    slider.value = String(clamped);
    slider.style.setProperty('--carousel-progress', max ? `${(clamped / max) * 100}%` : '0%');
  }

  function scrollToCard(index, behavior = 'smooth') {
    const card = cards[index];
    if (!portraitQuery.matches || !card) return;

    const targetLeft = card.offsetLeft - ((board.clientWidth - card.offsetWidth) / 2);
    board.scrollTo({
      left: Math.max(0, targetLeft),
      behavior
    });
  }

  function moveToCard(index) {
    isSliderSettling = true;
    window.clearTimeout(settleTimer);
    setSliderIndex(index);
    scrollToCard(index);
    settleTimer = window.setTimeout(() => {
      isSliderSettling = false;
      updateActiveCard();
    }, 520);
  }

  function scrollToInitialCard(force = false) {
    if (!portraitQuery.matches || cards.length < 2) return;
    if (hasPositionedInitialCard && !force) return;

    const initialCard = cards[1];
    const targetLeft = initialCard.offsetLeft - ((board.clientWidth - initialCard.offsetWidth) / 2);
    board.scrollLeft = Math.max(0, targetLeft);
    hasPositionedInitialCard = true;
    setSliderIndex(1);
    updateActiveCard();
  }

  function updateActiveCard() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!portraitQuery.matches) {
        cards.forEach(card => card.classList.remove('is-carousel-active'));
        setSliderIndex(Math.min(Number(slider?.value) || 0, Math.max(cards.length - 1, 0)));
        return;
      }

      const boardRect = board.getBoundingClientRect();
      const boardCenter = boardRect.left + boardRect.width / 2;
      let activeCard = cards[0];
      let activeDistance = Infinity;

      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const distance = Math.abs(cardCenter - boardCenter);
        if (distance < activeDistance) {
          activeDistance = distance;
          activeCard = card;
        }
      });

      cards.forEach(card => {
        card.classList.toggle('is-carousel-active', card === activeCard);
      });
      if (!isSliderSettling) {
        setSliderIndex(cards.indexOf(activeCard));
      }
    });
  }

  setSliderIndex(cards.length > 1 ? 1 : 0);
  slider?.addEventListener('input', () => {
    moveToCard(Number(slider.value));
  });
  board.addEventListener('scroll', updateActiveCard, { passive: true });
  window.addEventListener('resize', updateActiveCard);
  if (portraitQuery.addEventListener) {
    portraitQuery.addEventListener('change', event => {
      if (event.matches) scrollToInitialCard(true);
      updateActiveCard();
    });
  } else {
    portraitQuery.addListener(event => {
      if (event.matches) scrollToInitialCard(true);
      updateActiveCard();
    });
  }
  requestAnimationFrame(() => scrollToInitialCard());
})();

// ── MOBILE FLOW DETAILS CAROUSEL ───────────
(() => {
  const track = document.querySelector('.flow-panel-inner');
  const slider = document.querySelector('.flow-carousel-slider');
  if (!track || !slider) return;

  const steps = Array.from(track.querySelectorAll('.flow-step'));
  const portraitQuery = window.matchMedia('(max-width: 820px) and (orientation: portrait)');
  let frame;
  let isSliderSettling = false;
  let settleTimer;
  let snapTimer;

  function setSliderPosition(position) {
    const clamped = Math.min(Math.max(position, 0), 1);
    slider.max = '1';
    slider.value = String(clamped);
    slider.style.setProperty('--carousel-progress', clamped ? '100%' : '0%');
  }

  function scrollToStep(index, behavior = 'smooth') {
    const step = steps[index];
    if (!portraitQuery.matches || !step) return;

    const targetLeft = step.offsetLeft - ((track.clientWidth - step.offsetWidth) / 2);
    track.scrollTo({
      left: Math.max(0, targetLeft),
      behavior
    });
  }

  function moveToBinaryPosition(position) {
    isSliderSettling = true;
    window.clearTimeout(settleTimer);
    const normalized = position ? 1 : 0;
    setSliderPosition(normalized);
    scrollToStep(normalized ? steps.length - 1 : 0);
    settleTimer = window.setTimeout(() => {
      isSliderSettling = false;
      updateActiveStep();
    }, 520);
  }

  function settleToNearestBinaryPosition() {
    if (!portraitQuery.matches || isSliderSettling) return;
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => {
      const maxScroll = Math.max(track.scrollWidth - track.clientWidth, 1);
      moveToBinaryPosition(track.scrollLeft > maxScroll * 0.38 ? 1 : 0);
    }, 120);
  }

  function updateActiveStep() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!portraitQuery.matches) {
        steps.forEach(step => step.classList.remove('is-flow-visible'));
        setSliderPosition(Number(slider.value) ? 1 : 0);
        return;
      }

      const trackRect = track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;
      let activeStep = steps[0];
      let activeDistance = Infinity;
      const firstRect = steps[0]?.getBoundingClientRect();
      const lastRect = steps[steps.length - 1]?.getBoundingClientRect();
      const isFirstVisible = firstRect && firstRect.right > trackRect.left && firstRect.left < trackRect.right;
      const isLastVisible = lastRect && lastRect.right > trackRect.left && lastRect.left < trackRect.right;

      steps.forEach(step => {
        const rect = step.getBoundingClientRect();
        const stepCenter = rect.left + rect.width / 2;
        const distance = Math.abs(stepCenter - trackCenter);
        const visibleWidth = Math.min(rect.right, trackRect.right) - Math.max(rect.left, trackRect.left);
        const visibleRatio = Math.max(0, visibleWidth) / rect.width;
        const index = steps.indexOf(step);
        const isFlowVisible = isFirstVisible
          ? index <= 1
          : isLastVisible
            ? index >= Math.max(steps.length - 3, 0)
            : visibleRatio >= 0.64;
        step.classList.toggle('is-flow-visible', isFlowVisible);
        if (distance < activeDistance) {
          activeDistance = distance;
          activeStep = step;
        }
      });

      if (isSliderSettling) return;

      if (isFirstVisible) {
        setSliderPosition(0);
      } else {
        setSliderPosition(1);
      }
    });
  }

  setSliderPosition(0);
  updateActiveStep();
  slider.addEventListener('input', () => {
    moveToBinaryPosition(Number(slider.value) ? 1 : 0);
  });
  track.addEventListener('scroll', () => {
    updateActiveStep();
    settleToNearestBinaryPosition();
  }, { passive: true });
  track.addEventListener('touchend', () => {
    settleToNearestBinaryPosition();
  }, { passive: true });
  track.addEventListener('pointerup', () => {
    settleToNearestBinaryPosition();
  });
  window.addEventListener('resize', updateActiveStep);
  if (portraitQuery.addEventListener) {
    portraitQuery.addEventListener('change', updateActiveStep);
  } else {
    portraitQuery.addListener(updateActiveStep);
  }
})();

// ── FAQ ACCORDION ───────────────────────────
(() => {
  document.querySelectorAll('.faq-card').forEach(card => {
    const button = card.querySelector('.faq-question');
    if (!button) return;

    button.addEventListener('click', () => {
      const isOpen = card.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
    });
  });
})();

// ── REVEAL ON SCROLL ─────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, i * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── TVL INFO ────────────────────────────────
(function initTvlInfo() {
  const items = Array.from(document.querySelectorAll('.tvl-info-btn'))
    .map(button => ({
      button,
      info: button.closest('.tvl-strip')?.querySelector('.tvl-info')
    }))
    .filter(item => item.info);
  if (!items.length) return;

  function setOpen(target, isOpen) {
    items.forEach(item => {
      const shouldOpen = item === target && isOpen;
      item.button.setAttribute('aria-expanded', String(shouldOpen));
      item.info.classList.toggle('open', shouldOpen);
      item.info.setAttribute('aria-hidden', String(!shouldOpen));
    });
  }

  items.forEach(item => {
    item.button.addEventListener('click', event => {
      event.stopPropagation();
      setOpen(item, item.button.getAttribute('aria-expanded') !== 'true');
    });
    item.info.addEventListener('click', event => {
      event.stopPropagation();
    });
  });

  document.addEventListener('click', () => setOpen(null, false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setOpen(null, false);
  });
})();

// ── QUICK FLOW EXPANDER ─────────────────────
(function initQuickPanels() {
  const panels = [
    {
      toggle: document.querySelector('.flow-toggle'),
      panel: document.getElementById('flowPanel')
    },
    {
      toggle: document.querySelector('.apply-toggle'),
      panel: document.getElementById('applyPanel')
    }
  ].filter(item => item.toggle && item.panel);

  function closePanels() {
    panels.forEach(item => {
      item.panel.classList.remove('open');
      item.panel.setAttribute('aria-hidden', 'true');
      item.toggle.setAttribute('aria-expanded', 'false');
    });
  }

  function openPanel(panel, toggle) {
    closePanels();
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
  }

  panels.forEach(({ toggle, panel }) => {
    toggle.addEventListener('click', () => {
      const shouldOpen = !panel.classList.contains('open');
      closePanels();
      if (shouldOpen) {
        openPanel(panel, toggle);
        window.setTimeout(() => {
          panel.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }, 120);
      }
    });
  });

  const applyModal = document.getElementById('applyModal');
  const applyModalBody = applyModal?.querySelector('.apply-modal-body');
  const applyModalClose = applyModal?.querySelector('.apply-modal-close');
  const sourceApplyForm = document.querySelector('#applyPanel .apply-form');

  if (applyModal && applyModalBody && sourceApplyForm) {
    const modalForm = sourceApplyForm.cloneNode(true);
    modalForm.classList.add('modal-apply-form');
    applyModalBody.appendChild(modalForm);
  }

  function openApplyModal() {
    if (!applyModal) return;
    applyModal.classList.add('open');
    applyModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeApplyModal() {
    if (!applyModal) return;
    applyModal.classList.remove('open');
    applyModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-open-apply]').forEach(link => {
    if (!applyModal) return;

    link.addEventListener('click', event => {
      event.preventDefault();
      openApplyModal();
    });
  });

  applyModalClose?.addEventListener('click', closeApplyModal);
  applyModal?.addEventListener('click', event => {
    if (event.target === applyModal) closeApplyModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && applyModal?.classList.contains('open')) closeApplyModal();
  });

  function initApplyForm(applyForm) {
    applyForm.addEventListener('submit', event => {
      event.preventDefault();
      let firstMissing = null;

      applyForm.querySelectorAll('[data-required]').forEach(input => {
        const field = input.closest('label');
        const isEmpty = input.type === 'file'
          ? input.files.length === 0
          : input.value.trim() === '';

        field?.classList.toggle('is-missing', isEmpty);
        if (isEmpty && !firstMissing) firstMissing = input;
      });

      firstMissing?.focus();
    });

    applyForm.querySelectorAll('[data-required]').forEach(input => {
      const clearMissing = () => {
        const field = input.closest('label');
        const hasValue = input.type === 'file'
          ? input.files.length > 0
          : input.value.trim() !== '';
        if (hasValue) field?.classList.remove('is-missing');
      };
      input.addEventListener('input', clearMissing);
      input.addEventListener('change', clearMissing);
    });

    applyForm.querySelectorAll('[data-number-only]').forEach(input => {
      input.addEventListener('input', () => {
        const cleaned = input.value.replace(/\D/g, '');
        const hadLetters = input.value !== cleaned;

        input.value = cleaned;

        if (hadLetters) {
          window.clearTimeout(input.hintTimer);
          input.classList.add('show-inline-hint');
          input.placeholder = 'Only numbers';
          input.hintTimer = window.setTimeout(() => {
            input.classList.remove('show-inline-hint');
            input.placeholder = '';
          }, 1800);
        }
      });
    });

    applyForm.querySelectorAll('[data-amount-format]').forEach(input => {
      input.addEventListener('input', () => {
        const digits = input.value.replace(/\D/g, '');
        const hadLetters = input.value !== input.value.replace(/[^\d\s]/g, '');

        input.value = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

        if (hadLetters) {
          window.clearTimeout(input.hintTimer);
          input.classList.add('show-inline-hint');
          input.placeholder = 'Only numbers';
          input.hintTimer = window.setTimeout(() => {
            input.classList.remove('show-inline-hint');
            input.placeholder = '100 000';
          }, 1800);
        }
      });
    });

    applyForm.querySelectorAll('[data-date-mask]').forEach(input => {
      input.addEventListener('input', () => {
        const digits = input.value.replace(/\D/g, '').slice(0, 8);
        const parts = [
          digits.slice(0, 2),
          digits.slice(2, 4),
          digits.slice(4, 8)
        ].filter(Boolean);

        input.value = parts.join('/');
      });
    });

    applyForm.querySelectorAll('.date-icon-btn').forEach(button => {
      const field = button.closest('.date-field');
      const input = field?.querySelector('input');
      const picker = field?.querySelector('.date-picker');
      const title = picker?.querySelector('.date-picker-head strong');
      const days = picker?.querySelector('.date-days');
      const prev = picker?.querySelector('.date-prev');
      const next = picker?.querySelector('.date-next');
      if (!field || !input || !picker || !title || !days || !prev || !next) return;

      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      let visibleDate = new Date();

      function formatDate(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}/${date.getFullYear()}`;
      }

      function renderCalendar() {
        const year = visibleDate.getFullYear();
        const month = visibleDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        title.textContent = `${monthNames[month]} ${year}`;
        days.innerHTML = '';

        for (let i = 0; i < firstDay; i += 1) {
          const empty = document.createElement('button');
          empty.type = 'button';
          empty.className = 'is-muted';
          empty.tabIndex = -1;
          empty.textContent = '';
          days.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
          const option = document.createElement('button');
          const date = new Date(year, month, day);
          option.type = 'button';
          option.textContent = String(day);
          option.classList.toggle('is-selected', input.value === formatDate(date));
          option.addEventListener('click', () => {
            input.value = formatDate(date);
            field.classList.remove('open');
            picker.setAttribute('aria-hidden', 'true');
          });
          days.appendChild(option);
        }
      }

      button.addEventListener('click', event => {
        event.stopPropagation();
        field.classList.toggle('open');
        picker.setAttribute('aria-hidden', String(!field.classList.contains('open')));
        renderCalendar();
      });

      prev.addEventListener('click', event => {
        event.stopPropagation();
        visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() - 1, 1);
        renderCalendar();
      });

      next.addEventListener('click', event => {
        event.stopPropagation();
        visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 1);
        renderCalendar();
      });

      picker.addEventListener('click', event => {
        event.stopPropagation();
      });
    });

    document.addEventListener('click', () => {
      applyForm.querySelectorAll('.date-field.open').forEach(field => {
        field.classList.remove('open');
        field.querySelector('.date-picker')?.setAttribute('aria-hidden', 'true');
      });
    });

    applyForm.querySelectorAll('.file-field').forEach(field => {
      const input = field.querySelector('input[type="file"]');
      const display = field.querySelector('.file-selected');
      const singleRemove = field.querySelector('.file-single-remove');
      const allToggle = field.querySelector('.file-all-toggle');
      const list = field.querySelector('.file-list');
      if (!input || !display || !singleRemove || !allToggle || !list) return;

      let selectedFiles = [];

      function syncInputFiles() {
        const dataTransfer = new DataTransfer();
        selectedFiles.forEach(file => dataTransfer.items.add(file));
        input.files = dataTransfer.files;
      }

      function renderSelectedFiles() {
        field.classList.toggle('has-files', selectedFiles.length > 0);
        field.classList.toggle('has-multiple', selectedFiles.length > 1);
        if (selectedFiles.length < 2) {
          field.classList.remove('show-list');
          allToggle.setAttribute('aria-expanded', 'false');
        }

        display.textContent = selectedFiles.length === 0
          ? 'No files selected'
          : selectedFiles.length === 1
            ? selectedFiles[0].name
            : `${selectedFiles.length} files selected`;

        list.innerHTML = '';
        const items = document.createElement('span');
        items.className = 'file-list-items';

        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'file-list-close';
        close.textContent = 'Close';
        close.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          field.classList.remove('show-list');
          allToggle.setAttribute('aria-expanded', 'false');
        });

        selectedFiles.forEach((file, index) => {
          const chip = document.createElement('span');
          chip.className = 'file-chip';

          const name = document.createElement('span');
          name.textContent = file.name;

          const remove = document.createElement('button');
          remove.type = 'button';
          remove.setAttribute('aria-label', `Remove ${file.name}`);
          remove.textContent = '×';
          remove.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            selectedFiles = selectedFiles.filter((_, itemIndex) => itemIndex !== index);
            syncInputFiles();
            renderSelectedFiles();
          });

          chip.append(name, remove);
          items.appendChild(chip);
        });

        list.append(items, close);
        requestAnimationFrame(() => {
          items.classList.toggle('is-scrollable', items.scrollHeight > items.clientHeight);
        });
      }

      display.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
      });

      allToggle.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        applyForm.querySelectorAll('.file-field.show-list').forEach(item => {
          if (item !== field) {
            item.classList.remove('show-list');
            item.querySelector('.file-all-toggle')?.setAttribute('aria-expanded', 'false');
          }
        });
        const isOpen = field.classList.toggle('show-list');
        allToggle.setAttribute('aria-expanded', String(isOpen));
      });

      singleRemove.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        selectedFiles = [];
        syncInputFiles();
        renderSelectedFiles();
      });

      list.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
      });

      input.addEventListener('change', () => {
        const incomingFiles = Array.from(input.files);
        incomingFiles.forEach(file => {
          const alreadySelected = selectedFiles.some(item =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
          );
          if (!alreadySelected) selectedFiles.push(file);
        });
        syncInputFiles();
        renderSelectedFiles();
      });
    });

    document.addEventListener('click', () => {
      applyForm.querySelectorAll('.file-field.show-list').forEach(field => {
        field.classList.remove('show-list');
        field.querySelector('.file-all-toggle')?.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('.apply-form').forEach(initApplyForm);
})();

// ── PARTICLES ────────────────────────────────
(function initParticles() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'cosmic-dust-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

  let W = 0;
  let H = 0;
  let particles = [];
  let frame = 0;
  let dustExclusionZones = [];

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getPageHeight() {
    const previousCanvasHeight = canvas.style.height;
    canvas.style.height = '0px';

    const pageHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight
    );

    canvas.style.height = previousCanvasHeight;
    return pageHeight;
  }

  function getCurrentPageHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight
    );
  }

  function getParticleCount() {
    const baseCount = W < 700 ? 78 : 138;
    const pageRatio = Math.min(getPageHeight() / window.innerHeight, 3.2);
    return Math.round(baseCount * pageRatio);
  }

  function syncParticleCount() {
    const count = getParticleCount();
    if (particles.length < count) {
      particles.push(...Array.from({ length: count - particles.length }, () => new DustParticle()));
    } else if (particles.length > count) {
      particles.length = count;
    }
  }

  function syncDustExclusionZones() {
    dustExclusionZones = Array.from(document.querySelectorAll('.brand-first-slide, .hub-card, .faq-card, footer')).map(element => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top + window.scrollY,
        bottom: rect.bottom + window.scrollY
      };
    });
  }

  function isInsideDustExclusionZone(x, y) {
    return dustExclusionZones.some(zone =>
      x >= zone.left &&
      x <= zone.right &&
      y >= zone.top &&
      y <= zone.bottom
    );
  }

  function resize() {
    W = window.innerWidth;
    H = getPageHeight();
    canvas.width = Math.floor(W * pixelRatio);
    canvas.height = Math.floor(H * pixelRatio);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    syncDustExclusionZones();
  }

  class DustParticle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : H + randomBetween(10, 80);
      this.size = randomBetween(0.8, 2.35);
      this.speedX = randomBetween(-0.08, 0.16);
      this.speedY = randomBetween(-0.24, -0.06);
      this.baseOpacity = randomBetween(0.18, 0.54);
      this.pulse = Math.random() * Math.PI * 2;
      this.pulseSpeed = randomBetween(0.006, 0.014);
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.pulse += this.pulseSpeed;

      if (this.x < -24 || this.x > W + 24 || this.y < -24) {
        this.reset();
      }
    }

    draw() {
      if (isInsideDustExclusionZone(this.x, this.y)) return;

      const twinkle = Math.sin(this.pulse) * 0.18 + 0.82;
      ctx.save();
      ctx.globalAlpha = this.baseOpacity * twinkle;
      ctx.fillStyle = '#A8A8A8';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function init() {
    resize();
    particles = Array.from({ length: getParticleCount() }, () => new DustParticle());
  }

  function draw() {
    frame += 1;
    if (frame % 120 === 0 && Math.abs(getPageHeight() - H) > 80) {
      resize();
      syncParticleCount();
    }
    if (frame % 30 === 0) syncDustExclusionZones();

    ctx.clearRect(0, 0, W, H);
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    resize();
    syncParticleCount();
  });

  init();
  requestAnimationFrame(draw);
})();

// ── NUMBER COUNTER ANIMATION ─────────────────
function animateCounter(el, end, suffix = '') {
  const start = 0;
  const duration = 1800;
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (end - start) * eased);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── SMOOTH ANCHOR SCROLL ─────────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const offset = 80;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── WEB3 MARKETPLACE MICRO-INTERACTIONS ─────
(function initMarketplaceActions() {
  const walletButton = document.querySelector('.wallet-toggle');
  const contributionButtons = document.querySelectorAll('.invoice-actions button:first-child');
  const viewMoreButtons = document.querySelectorAll('.view-more-btn');
  const invoiceListLinks = document.querySelectorAll('[data-open-invoice-list]');
  const moreInvoices = document.getElementById('moreInvoices');
  const languageSelect = document.querySelector('.language-select');
  const languageTrigger = document.querySelector('.language-trigger');
  const languageOptions = document.querySelectorAll('.language-menu button');
  const networkSelect = document.querySelector('.network-select');
  const networkTrigger = document.querySelector('.network-trigger');
  const networkTriggerIcon = document.querySelector('.network-trigger .network-icon');
  const networkOptions = document.querySelectorAll('.network-menu button');
  const supportedLangs = ['en', 'ru'];
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  let currentLang = supportedLangs.includes(urlLang)
    ? urlLang
    : 'en';

  if (walletButton) {
    walletButton.addEventListener('click', () => {
      const isConnected = walletButton.classList.toggle('connected');
      walletButton.textContent = isConnected
        ? '0xA4...19C2'
        : currentLang === 'en'
          ? 'Connect wallet'
          : 'Подключить кошелек';
    });
  }

  contributionButtons.forEach(button => {
    button.addEventListener('click', () => {
      contributionButtons.forEach(item => {
        if (item !== button) item.textContent = 'Contribute';
      });
      button.textContent = 'Selected';
    });
  });

  document.querySelectorAll('.table-contribute-btn').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.table-contribute-btn').forEach(item => {
        if (item !== button) item.textContent = 'Contribute';
      });
      button.textContent = 'Selected';
    });
  });

  if (viewMoreButtons.length && moreInvoices) {
    const invoiceHero = moreInvoices.closest('.invoice-hero');
    const offersTitle = invoiceHero?.querySelector('.offers-title');
    const setInvoiceTableOpen = isOpen => {
      invoiceHero?.classList.toggle('show-invoice-table', isOpen);
      moreInvoices.setAttribute('aria-hidden', String(!isOpen));
      const buttonText = isOpen
        ? currentLang === 'en' ? 'View less' : 'Скрыть'
        : currentLang === 'en' ? 'View more' : 'Смотреть еще';
      viewMoreButtons.forEach(button => {
        button.setAttribute('aria-expanded', String(isOpen));
        button.textContent = buttonText;
      });
      if (offersTitle) {
        offersTitle.textContent = isOpen
          ? currentLang === 'en' ? 'Offer list' : 'Список предложений'
          : currentLang === 'en' ? 'Top offers' : 'ТОП сделки';
        offersTitle.classList.toggle('plain', isOpen);
      }
    };

    viewMoreButtons.forEach(viewMoreButton => {
      viewMoreButton.addEventListener('click', () => {
        setInvoiceTableOpen(!invoiceHero?.classList.contains('show-invoice-table'));
      });
    });

    invoiceListLinks.forEach(link => {
      link.addEventListener('click', () => {
        setInvoiceTableOpen(true);
        requestAnimationFrame(() => {
          moreInvoices.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    });
  }

  document.querySelectorAll('.more-invoices').forEach(invoiceList => {
    const tableBody = invoiceList.querySelector('.invoice-table tbody');
    const rows = Array.from(invoiceList.querySelectorAll('.invoice-table tbody tr'));
    const sortButtons = Array.from(invoiceList.querySelectorAll('.invoice-sort'));
    const pageSizeButtons = Array.from(invoiceList.querySelectorAll('[data-page-size]'));
    const prev = invoiceList.querySelector('.invoice-page-prev');
    const next = invoiceList.querySelector('.invoice-page-next');
    const status = invoiceList.querySelector('.invoice-page-status');
    const riskOrder = {
      'Low Risk': 1,
      'Medium Risk': 2,
      'High Risk': 3,
    };
    let activeRows = [...rows];
    let pageSize = 10;
    let page = 0;
    let sortState = {
      key: null,
      direction: 'desc',
    };

    if (!tableBody || !rows.length || !prev || !next || !status) return;

    function parseTableValue(row, key) {
      if (key === 'amount') return Number(row.dataset.amount?.replace(/[^\d.]/g, '')) || 0;
      if (key === 'apr') return Number(row.dataset.apr?.replace(/[^\d.]/g, '')) || 0;
      if (key === 'dueDate') return Number(row.dataset.dueDate?.replace(/[^\d.]/g, '')) || 0;
      if (key === 'filled') return Number(row.children[4]?.textContent.replace(/[^\d.]/g, '')) || 0;
      if (key === 'risk') return riskOrder[row.dataset.risk] || 0;
      if (key === 'minContribution') return Number(row.dataset.minContribution?.replace(/[^\d.]/g, '')) || 0;
      return 0;
    }

    function applySort() {
      if (!sortState.key) {
        activeRows = [...rows];
      } else {
        const direction = sortState.direction === 'asc' ? 1 : -1;
        activeRows = [...activeRows].sort((a, b) => {
          const diff = parseTableValue(a, sortState.key) - parseTableValue(b, sortState.key);
          return diff * direction;
        });
      }

      activeRows.forEach(row => tableBody.appendChild(row));
    }

    function renderInvoicePage() {
      const size = pageSize === 'all' ? activeRows.length : pageSize;
      const pages = pageSize === 'all' ? 1 : Math.max(Math.ceil(activeRows.length / size), 1);
      page = Math.min(Math.max(page, 0), pages - 1);

      activeRows.forEach((row, index) => {
        const isVisible = pageSize === 'all' || (index >= page * size && index < (page + 1) * size);
        row.hidden = !isVisible;
      });

      status.textContent = `Page ${page + 1} / ${pages}`;
      prev.disabled = page === 0;
      next.disabled = page >= pages - 1;
    }

    prev.addEventListener('click', () => {
      page -= 1;
      renderInvoicePage();
    });

    next.addEventListener('click', () => {
      page += 1;
      renderInvoicePage();
    });

    pageSizeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.pageSize;
        pageSize = value === 'all' ? 'all' : Number(value);
        page = 0;
        pageSizeButtons.forEach(item => item.classList.toggle('active', item === button));
        renderInvoicePage();
      });
    });

    sortButtons.forEach(button => {
      button.addEventListener('click', () => {
        const key = button.dataset.sort;
        if (!key) return;

        if (sortState.key === key) {
          sortState.direction = sortState.direction === 'desc' ? 'asc' : 'desc';
        } else {
          sortState = { key, direction: 'desc' };
        }

        sortButtons.forEach(item => {
          const isActive = item === button;
          item.classList.toggle('active', isActive);
          item.classList.toggle('asc', isActive && sortState.direction === 'asc');
        });

        page = 0;
        applySort();
        renderInvoicePage();
      });
    });

    applySort();
    renderInvoicePage();
  });

  if (networkSelect && networkTrigger && networkTriggerIcon) {
    networkTrigger.addEventListener('click', event => {
      event.stopPropagation();
      languageSelect?.classList.remove('open');
      languageTrigger?.setAttribute('aria-expanded', 'false');
      const isOpen = networkSelect.classList.toggle('open');
      networkTrigger.setAttribute('aria-expanded', String(isOpen));
    });

    networkOptions.forEach(option => {
      option.addEventListener('click', () => {
        const icon = option.querySelector('.network-icon');
        if (!icon) return;
        networkTriggerIcon.className = icon.className;
        networkSelect.classList.remove('open');
        networkTrigger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', () => {
      networkSelect.classList.remove('open');
      networkTrigger.setAttribute('aria-expanded', 'false');
    });
  }

  if (languageSelect && languageTrigger) {
    const ruTextNodes = new WeakMap();
    const ruAttributeValues = new WeakMap();
    const translations = {
      text: {
        'О нас': 'About',
        'Контакты': 'Contacts',
        'TVL —капитал, размещённый в активных invoice financing deals.': 'TVL is capital allocated to active invoice financing deals.',
        'Подключить кошелек': 'Connect wallet',
        'Капитал для бизнеса': 'Capital for business',
        'Доход для инвестора': 'Yield for investors',
        'Платформа, где проверенные инвойсы находят ликвидность': 'A platform where verified invoices find liquidity',
        'Получить финансирование': 'Get financing',
        'Начать инвестировать': 'Start investing',
        'Заявка': 'Apply',
        'Подробнее': 'Flow',
        'Инвестировать': 'Earn',
        'Краткосрочное финансировании реального бизнеса.': 'Short-term financing for real businesses.',
        'Проверенные': 'Finance verified',
        'B2B инвойсы': 'B2B invoices',
        'ТОП сделки': 'Top offers',
        'Смотреть еще': 'View more',
        'Скрыть': 'View less',
        'Список предложений': 'Offer list',
        'ОАЭ · Дубай': 'UAE · Dubai',
        'Крипто-ликвидность': 'Crypto Liquidity',
        'Активы реального сектора': 'Real World Assets',
        'Финансирование SME': 'SME Financing',
        'Финансирование инвойсов': 'Invoice Financing',
        'Трансграничный B2B': 'Cross-border B2B',
        'Как работает модель': 'How the model works',
        'Factor0x помогает бизнесу получить оборотный капитал, а инвесторам — заработать на проверенных B2B-инвойсах.': 'Factor0x helps businesses access working capital and investors earn from verified B2B invoices.',
        'Бизнес': 'Business',
        'Получает финансирование': 'Receives financing',
        'Передаёт подтверждённый B2B-инвойс и получает оборотный капитал до оплаты клиента.': 'Submits a confirmed B2B invoice and receives working capital before the customer pays.',
        'Структурирует сделку': 'Structures the deal',
        'Связывает бизнес, капитал и процесс выплат в единую управляемую инфраструктуру.': 'Connects business, capital, and the repayment process in one managed infrastructure.',
        'Инвесторы': 'Investors',
        'Предоставляют ликвидность': 'Provide liquidity',
        'Финансируют реальные торговые сделки и получают доход после их погашения.': 'Finance real trade deals and earn after they are repaid.',
        'Инвойс': 'Invoice',
        'Проверка': 'Verification',
        'Финансирование': 'Financing',
        'Погашение': 'Repayment',
        'Доход': 'Yield',
        'Каждый этап фиксируется в системе и отображается инвестору в статусе сделки.': 'Every stage is recorded in the system and shown to investors in the deal status.',
        'Factor0x работает на пересечении trade finance,': 'Factor0x operates at the intersection of trade finance,',
        'Web3-ликвидности и реального B2B-сектора.': 'Web3 liquidity, and the real B2B sector.',
        'Мы начинаем с ОАЭ — рынка с сильной торговлей, логистикой и спросом на оборотный капитал.': 'We start with the UAE, a market with strong trade, logistics, and demand for working capital.',
        'Наша цель — дать бизнесу быстрый капитал, а инвестору — понятный способ заработка на проверенных B2B-инвойсах.': 'Our goal is to give businesses fast capital and investors a clear way to earn from verified B2B invoices.',
        'Прозрачность сделок': 'Deal transparency',
        'Проверка инвойса': 'Invoice Verification',
        'Проверяем инвойс, документы и факт поставки.': 'We verify the invoice, documents, and delivery evidence.',
        'Проверка компании и плательщика': 'KYB & Debtor Check',
        'Проверяем бизнес, должника и юридические риски.': 'We check the business, debtor, and legal risks.',
        'Степень риска': 'Risk Tier',
        'Оцениваем срок, сумму, отрасль и качество сделки.': 'We assess term, amount, sector, and deal quality.',
        'On-chain прослеживаемость': 'On-chain Tracking',
        'Фиксируем статус сделки, repayment и распределения.': 'We record deal status, repayment, and distributions.',
        'Реальный доход': 'Real Yield',
        'Реальные активы': 'Real assets',
        'Пулы связаны с реальными бизнес-сделками.': 'Pools are linked to real business deals.',
        'Понятные условия': 'Clear terms',
        'Сумма, срок, APR и контрагент видны до участия.': 'Amount, APR, term, and counterparty upfront.',
        'Без токеномики': 'No tokenomics',
        'Доходность связана с инвойсом, не с токеном.': 'Yield is linked to the invoice, not a token.',
        'Безопасно': 'Secure',
        'Регулярный аудит смарт-контрактов.': 'Regular smart contract audits.',
        'Что такое Factor0x?': 'What is Factor0x?',
        'Factor0x — это платформа для финансирования проверенных B2B-инвойсов. Бизнес получает оборотный капитал до оплаты клиента, а инвесторы финансируют реальные сделки из B2B-сектора.': 'Factor0x is a platform for financing verified B2B invoices. Businesses receive working capital before customer payment, while investors finance real B2B-sector deals.',
        'Что финансируют инвесторы?': 'What do investors finance?',
        'Инвесторы финансируют проверенные B2B-инвойсы. Каждая сделка имеет сумму, срок, степень риска, статус проверки и ожидаемый процесс погашения.': 'Investors finance verified B2B invoices. Each deal has an amount, term, risk tier, verification status, and expected repayment process.',
        'Как инвестор получает доход?': 'How does an investor earn?',
        'Доход формируется после погашения инвойса должником. Когда клиент бизнеса оплачивает инвойс, средства распределяются между участниками сделки согласно условиям.': 'Yield is generated after the debtor repays the invoice. When the business customer pays the invoice, funds are distributed to deal participants according to the terms.',
        'Доходность гарантирована?': 'Is yield guaranteed?',
        'Нет. Доходность зависит от погашения инвойса, качества должника, условий сделки и возможных задержек. Factor0x показывает ориентировочную годовую доходность, но не гарантирует доход.': 'No. Yield depends on invoice repayment, debtor quality, deal terms, and possible delays. Factor0x shows target APR but does not guarantee returns.',
        'Что происходит, если инвойс не оплатят вовремя?': 'What happens if an invoice is not paid on time?',
        'Сделка получает статус «просрочено». Инвесторы видят обновления по статусу погашения, а Factor0x и партнёры работают по предусмотренному процессу взыскания / урегулирования.': 'The deal receives overdue status. Investors see repayment updates, while Factor0x and partners follow the defined collection or resolution process.',
        'Какие инвойсы подходят?': 'Which invoices are eligible?',
        'На первом этапе Factor0x фокусируется на B2B-инвойсах компаний из ОАЭ, связанных с торговлей, логистикой, дистрибуцией, финансированием цепочек поставок и B2B-услугами.': 'At the first stage, Factor0x focuses on B2B invoices from UAE companies in trade, logistics, distribution, supply chain finance, and B2B services.',
        'Зачем нужна проверка KYB / KYC?': 'Why are KYB / KYC checks needed?',
        'KYB / KYC нужны для проверки бизнеса, инвесторов, источника средств, санкционных рисков и соответствия требованиям комплаенса.': 'KYB / KYC checks verify businesses, investors, source of funds, sanctions risks, and compliance requirements.',
        'Нужен ли бизнесу криптокошелёк?': 'Does a business need a crypto wallet?',
        'Нет. Бизнесу не обязательно использовать криптокошелёк. Для бизнеса продукт должен работать как понятное финансирование под инвойс.': 'No. A business does not have to use a crypto wallet. For businesses, the product should work as straightforward invoice financing.',
        'В чём роль Web3?': 'What is the role of Web3?',
        'Web3 используется для прозрачности, учёта участия инвесторов, статуса сделки и on-chain прослеживания. Factor0x не строится вокруг спекулятивного токена.': 'Web3 is used for transparency, investor participation records, deal status, and on-chain tracking. Factor0x is not built around a speculative token.',
        'В какой валюте происходит финансирование?': 'Which currency is used for financing?',
        'Инвесторы могут участвовать через USDT / USDC или фиат, если это доступно для конкретной сделки и соответствует требованиям комплаенс-контура.': 'Investors may participate through USDT / USDC or fiat when available for a specific deal and compliant with requirements.',
        'Команда проекта': 'Project team',
        'Итан Уокер': 'Ethan Walker',
        'Генеральный директор': 'CEO',
        'Стратегия, партнёрства, сделки': 'Strategy, partnerships, deals',
        'Дэниел Чен': 'Daniel Chen',
        'Главный архитектор': 'Chief Architect',
        'Архитектура платформы, смарт-контракты, безопасность': 'Platform architecture, smart contracts, security',
        'София Лоран': 'Sophia Laurent',
        'Главный юрист': 'Chief Legal Officer',
        'Юридическая структура, комплаенс, регуляция': 'Legal structure, compliance, regulation',
        'Маркус Беннетт': 'Marcus Bennett',
        'Риск-директор': 'Risk Director',
        'Оценка сделок, присвоение уровней риска, анализ качества плательщиков.': 'Deal assessment, risk tiering, payer quality analysis.',
        'Адриан Моро': 'Adrian Moreau',
        'Стратегический советник': 'Strategic Advisor',
        'Привлечение капитала, партнёрства, выход на новые рынки': 'Capital raising, partnerships, expansion into new markets',
        'Майя Рейнольдс': 'Maya Reynolds',
        'Партнер по бизнес-развитию': 'BD Partner',
        'Развитие партнерств, бизнес-связей': 'Partnership development, business relations',
        'Модель двух хабов': 'Dual-hub model',
        'Дубай': 'Dubai',
        'Операционный хаб': 'Operational hub',
        'Благоприятная юрисдикция для цифровых активов': 'Crypto-friendly jurisdiction for digital assets',
        'Первые инвойсы от SME из ОАЭ и плательщиков из GCC': 'First invoices from UAE-based SMEs and GCC obligors',
        'Доступ к капиталу стран Персидского залива: family offices и crypto investors': 'Access to Gulf capital: family offices and crypto investors',
        'Поток сделок из логистики и торговли': 'Logistics and trade deal flow',
        'Регуляторный маршрут через UAE / VARA / ADGM / DIFC': 'UAE / VARA / ADGM / DIFC regulatory pathway',
        'Сингапур': 'Singapore',
        'Центр структурирования и комплаенса': 'Structuring & Compliance hub',
        'Слой для структурирования, банковской инфраструктуры и комплаенса в SEA': 'Structuring / banking / compliance layer for SEA',
        'Фокус на рынки: Малайзия, Индонезия, Вьетнам, Индия': 'Focus markets: Malaysia, Indonesia, Vietnam, India',
        'Институциональная надёжность для банков и партнёров': 'Institutional credibility for banks and partners',
        'Масштабирование операций': 'Scaling operations',
        'Онбординг институционального капитала': 'Institutional capital onboarding',
        'СКОРО': 'COMING SOON',
        'Продукт': 'Product',
        'Как работает': 'How it works',
        'Хабы': 'Hubs',
        'Для бизнеса': 'For business',
        'Инвесторам': 'Investors',
        'Контакт': 'Contact'
      },
      attributes: {
        'Выбрать язык': 'Select language',
        'Выбрать сеть': 'Select network',
        'Открыть меню': 'Open menu',
        'Мобильная навигация': 'Mobile navigation',
        'Открыть список инвойсов': 'Open invoice list',
        'Что такое TVL': 'What is TVL',
        'Позиция инвойса': 'Invoice position',
        'Позиция этапа': 'Step position',
        'Закрыть': 'Close',
        'Реальный доход': 'Real Yield',
        'Итан Уокер': 'Ethan Walker',
        'Дэниел Чен': 'Daniel Chen',
        'София Лоран': 'Sophia Laurent',
        'Маркус Беннетт': 'Marcus Bennett',
        'Адриан Моро': 'Adrian Moreau',
        'Майя Рейнольдс': 'Maya Reynolds'
      }
    };

    function translateNodeText(node, lang) {
      if (!ruTextNodes.has(node)) ruTextNodes.set(node, node.nodeValue);
      const original = ruTextNodes.get(node);
      const trimmed = original.trim();
      if (!trimmed) return;
      const leading = original.match(/^\s*/)?.[0] || '';
      const trailing = original.match(/\s*$/)?.[0] || '';
      node.nodeValue = lang === 'en' && translations.text[trimmed]
        ? `${leading}${translations.text[trimmed]}${trailing}`
        : original;
    }

    function updateDocumentLinks(lang) {
      document.querySelectorAll('[data-doc-link]').forEach(link => {
        const docType = link.dataset.docLink;
        const baseHref = docType === 'whitepaper' && lang === 'en'
          ? 'whitepaper-en.html'
          : docType === 'whitepaper'
            ? 'whitepaper.html'
            : docType === 'privacy' && lang === 'ru'
              ? 'privacy-policy-ru.html'
              : docType === 'privacy'
                ? 'privacy-policy.html'
                : docType === 'terms' && lang === 'ru'
                  ? 'terms-of-service-ru.html'
                  : docType === 'terms'
                    ? 'terms-of-service.html'
                    : link.getAttribute('href').split('?')[0];
        const url = new URL(baseHref, window.location.href);
        url.searchParams.set('lang', lang);
        link.setAttribute('href', `${url.pathname.split('/').pop()}${url.search}`);
      });
    }

    function setLanguage(lang) {
      currentLang = lang;
      localStorage.setItem('factor0xLang', lang);
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || ['SCRIPT', 'STYLE', 'SVG', 'PATH'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });

      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(node => translateNodeText(node, lang));

      document.querySelectorAll('[aria-label]').forEach(element => {
        if (!ruAttributeValues.has(element)) {
          ruAttributeValues.set(element, element.getAttribute('aria-label'));
        }
        const original = ruAttributeValues.get(element);
        element.setAttribute('aria-label', lang === 'en' && translations.attributes[original]
          ? translations.attributes[original]
          : original);
      });

      document.documentElement.lang = supportedLangs.includes(lang) ? lang : 'ru';
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
      updateDocumentLinks(lang);
    }

    languageTrigger.addEventListener('click', event => {
      event.stopPropagation();
      networkSelect?.classList.remove('open');
      networkTrigger?.setAttribute('aria-expanded', 'false');
      const isOpen = languageSelect.classList.toggle('open');
      languageTrigger.setAttribute('aria-expanded', String(isOpen));
    });

    languageOptions.forEach(option => {
      option.addEventListener('click', () => {
        const lang = option.dataset.lang;
        if (supportedLangs.includes(lang)) setLanguage(lang);
        languageSelect.classList.remove('open');
        languageTrigger.setAttribute('aria-expanded', 'false');
      });
    });

    setLanguage(currentLang);

    document.addEventListener('click', () => {
      languageSelect.classList.remove('open');
      languageTrigger.setAttribute('aria-expanded', 'false');
    });
  }
})();

// ── INVOICE DETAILS MODAL ────────────────────
(function initDetailsModal() {
  const modal = document.getElementById('detailsModal');
  if (!modal) return;

  const closeButton = modal.querySelector('.modal-close');
  const card = document.getElementById('modalCard');
  const title = document.getElementById('modalCompanyName');
  const description = document.getElementById('modalDescription');
  const facts = document.getElementById('modalFacts');
  const metrics = document.getElementById('modalMetrics');

  const companyDetails = {
    gulf: {
      cardClass: 'modal-card modal-card-photo modal-card-gulf',
      name: 'Gulf Trade Logistics',
      description: 'UAE-based logistics operator financing verified cross-border receivables from a Singapore trade counterparty. The invoice is backed by shipping documents, KYB review, and obligor confirmation before funding.',
      investment: {
        amount: '$420,000',
        apr: '6.2%',
        dueDays: '58 days',
        dueDate: 'Jul 18, 2026',
        fill: '64.0%',
        risk: 'Low Risk',
        riskNote: 'Backed by shipping docs, KYB review & obligor confirmation',
        contributors: 47,
        minContribution: '$1,000'
      },
      facts: [
        ['Borrower', 'Gulf Trade Logistics LLC'],
        ['Obligor', 'Singapore Distribution Pte. Ltd.'],
        ['Sector', 'Trade Logistics'],
        ['Risk Level', 'Low Risk'],
        ['Jurisdiction', 'Dubai, UAE'],
        ['Invoice Amount', '$420,000'],
        ['Due Date', '2026/07/18'],
        ['APR', '6.2% annual']
      ]
    },
    asia: {
      cardClass: 'modal-card modal-card-photo modal-card-asia',
      name: 'Asia Components Ltd',
      description: 'Electronics components supplier using invoice financing to bridge working capital between shipment and payment settlement. Medium-risk profile reflects sector cyclicality and a shorter counterparty history.',
      investment: {
        amount: '$315,000',
        apr: '9.4%',
        dueDays: '40 days',
        dueDate: 'Jun 30, 2026',
        fill: '38.5%',
        risk: 'Medium Risk',
        riskNote: 'Backed by shipping docs, KYB review & obligor confirmation',
        contributors: 22,
        minContribution: '$500'
      },
      facts: [
        ['Borrower', 'Asia Components Ltd'],
        ['Obligor', 'GCC Manufacturing Group'],
        ['Sector', 'Electronics'],
        ['Risk Level', 'Medium Risk'],
        ['Jurisdiction', 'Singapore'],
        ['Invoice Amount', '$315,000'],
        ['Due Date', '2026/06/30'],
        ['APR', '9.4% annual']
      ]
    },
    desert: {
      cardClass: 'modal-card modal-card-photo modal-card-desert',
      name: 'Desert Cloud Services',
      description: 'Recurring SaaS receivable from an enterprise services contract. The invoice has a low-risk profile due to confirmed service delivery, repeat payment history, and a diversified obligor base.',
      investment: {
        amount: '$250,000',
        apr: '5.4%',
        dueDays: '24 days',
        dueDate: 'Jun 14, 2026',
        fill: '81.0%',
        risk: 'Low Risk',
        riskNote: 'Confirmed SaaS delivery, repeat payment history & diversified obligors',
        contributors: 83,
        minContribution: '$250'
      },
      facts: [
        ['Borrower', 'Desert Cloud Services FZCO'],
        ['Obligor', 'Regional Enterprise Client'],
        ['Sector', 'SaaS Contract'],
        ['Risk Level', 'Low Risk'],
        ['Jurisdiction', 'UAE Free Zone'],
        ['Invoice Amount', '$250,000'],
        ['Due Date', '2026/06/14'],
        ['APR', '5.4% annual']
      ]
    }
  };

  function parseNumber(value) {
    return Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;
  }

  function formatCurrency(value) {
    return '$' + Math.round(value).toLocaleString('en-US');
  }

  function getInvestmentMeta(details, row) {
    const fill = details.investment?.fill || row?.children?.[4]?.textContent?.trim() || '0%';
    return {
      amount: details.investment?.amount || row?.dataset.amount || '$0',
      apr: details.investment?.apr || row?.dataset.apr || '0%',
      dueDays: details.investment?.dueDays || row?.dataset.dueDate || '0 days',
      fill,
      risk: details.investment?.risk || row?.dataset.risk || 'Risk pending',
      minContribution: details.investment?.minContribution || row?.dataset.minContribution || '$100',
      dueDate: details.investment?.dueDate || '',
      contributors: details.investment?.contributors || null,
      riskNote: details.investment?.riskNote || ''
    };
  }

  function renderRiskMeter(riskValue) {
    const level = riskValue.toLowerCase().includes('medium') ? 'medium'
      : riskValue.toLowerCase().includes('high') ? 'high' : 'low';
    const filled = level === 'low' ? 1 : level === 'medium' ? 2 : 3;
    const labels = { low: 'Low', medium: 'Medium', high: 'High' };
    const segs = Array.from({ length: 3 }, (_, i) =>
      `<span class="risk-gauge-seg${i < filled ? ' filled' : ''}" aria-hidden="true"></span>`
    ).join('');
    return `<div class="risk-gauge risk-gauge-${level}" role="img" aria-label="Risk level: ${level}, ${filled} of 3"><div class="risk-gauge-track" aria-hidden="true">${segs}</div><span class="risk-gauge-label">${labels[level]}</span></div>`;
  }

  function renderMetrics(meta) {
    const amount = parseNumber(meta.amount);
    const apr = parseNumber(meta.apr);
    const dueDays = parseNumber(meta.dueDays);
    const fillPercent = Math.min(Math.max(parseNumber(meta.fill), 0), 100);
    const raised = amount * fillPercent / 100;
    const poolYield = amount * (apr / 100) * (dueDays / 365);
    return `
    <div class="lc-apr-block">
      <span class="lc-apr-number">${meta.apr}</span>
      <span class="lc-apr-label">annual APR</span>
    </div>
    <div class="lc-progress-block">
      <div class="lc-progress-meta">
        <span class="lc-progress-stat">${fillPercent.toFixed(1)}% funded</span>
        ${meta.contributors ? `<span class="lc-progress-stat">${meta.contributors} contributors</span>` : ''}
      </div>
      <div class="modal-progress" aria-hidden="true"><span style="width:${fillPercent}%"></span></div>
      <span class="lc-progress-amounts">${formatCurrency(raised)} of ${formatCurrency(amount)}</span>
    </div>
    <div class="lc-metrics-row">
      <div class="lc-metric-cell">
        <span class="lc-metric-label">Time to repayment</span>
        <span class="lc-metric-value">${dueDays} days${meta.dueDate ? ` · ${meta.dueDate}` : ''}</span>
      </div>
      <div class="lc-metric-cell">
        <span class="lc-metric-label">Pool yield · ${dueDays}d</span>
        <span class="lc-metric-value">${formatCurrency(poolYield)}</span>
      </div>
    </div>
    <div class="lc-risk-block">
      <span class="lc-metric-label">Risk level</span>
      ${renderRiskMeter(meta.risk)}
      <div class="modal-checks">
        <div class="modal-check-item">
          <svg class="modal-check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="4" width="13" height="8.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="5.5" cy="8.2" r="1.6" stroke="currentColor" stroke-width="1.3"/><path d="M9 6.8h3M9 8.8h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <span class="modal-check-text">KYB Completed</span>
        </div>
        <div class="modal-check-item">
          <svg class="modal-check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 2.5h6.5l3 3V14a.5.5 0 01-.5.5H3.5A.5.5 0 013 14V3a.5.5 0 01.5-.5z" stroke="currentColor" stroke-width="1.4"/><path d="M10 2.5v3H13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9.5l1.5 1.5 3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="modal-check-text">Invoice Verified</span>
        </div>
        <div class="modal-check-item">
          <svg class="modal-check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 14h13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M8 2.5L3.5 5.5V14M8 2.5L12.5 5.5V14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="6.5" y="10" width="3" height="4" rx=".5" stroke="currentColor" stroke-width="1.3"/></svg>
          <span class="modal-check-text">Obligor Confirmed</span>
        </div>
        <div class="modal-check-item">
          <svg class="modal-check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5L2.5 4v3.5C2.5 11 5 13.5 8 14.5c3-1 5.5-3.5 5.5-7V4L8 1.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 8l1.8 1.8L10.5 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="modal-check-text">Bank Account Verified</span>
        </div>
      </div>
    </div>`;
  }

  function renderCalculator(meta, ctx) {
    ctx = ctx || {};
    const amount = parseNumber(meta.amount);
    const fillPercent = Math.min(Math.max(parseNumber(meta.fill), 0), 100);
    const raised = amount * fillPercent / 100;
    const remaining = Math.max(amount - raised, 0);
    const minInvest = 500;
    const maxInvest = Math.max(minInvest, Math.floor(remaining / 100) * 100);
    const dueDays = parseNumber(meta.dueDays);
    const facts = [
      ctx.obligor       && ['Obligor',        ctx.obligor],
      ctx.sector        && ['Sector',          ctx.sector],
      ctx.jurisdiction  && ['Jurisdiction',    ctx.jurisdiction],
      ctx.invoiceAmount && ['Invoice Amount',  ctx.invoiceAmount, true],
    ].filter(Boolean);
    return `
      <div class="rc-facts">
        ${facts.map(([label, value, bold]) => `
          <div class="rc-fact-row">
            <span class="rc-fact-label">${label}</span>
            <span class="rc-fact-value${bold ? ' rc-fact-bold' : ''}">${value}</span>
          </div>`).join('')}
      </div>
      <div class="rc-calc">
        <span class="rc-calc-label">Your investment</span>
        <div class="rc-input-group">
          <span class="deal-calc-prefix" aria-hidden="true">$</span>
          <input type="text" inputmode="numeric" id="calcAmount" class="deal-calc-input"
            aria-label="Investment amount in USD">
          <button type="button" id="calcMaxBtn" class="rc-max-btn">Max</button>
        </div>
        <input type="range" id="calcSlider" class="deal-calc-slider"
          min="${minInvest}" max="${maxInvest}" step="100"
          aria-label="Adjust investment amount">
        <span class="rc-hint">${formatCurrency(maxInvest)} available · Min ${formatCurrency(minInvest)}</span>
        <div class="rc-outputs">
          <div class="rc-output-row">
            <span class="rc-output-label">Return · ${dueDays}d</span>
            <span class="rc-output-value" id="calcReturn">—</span>
          </div>
          <div class="rc-output-row">
            <span class="rc-output-label">You receive at maturity</span>
            <span class="rc-output-value" id="calcReceive">—</span>
          </div>
        </div>
      </div>
      <div class="rc-urgency">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" stroke-width="1.2"/><path d="M6.5 3.5v3l2 1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${formatCurrency(maxInvest)} left · closes in ${dueDays} days
      </div>
      <button class="modal-contribute-btn modal-invest-cta rc-contribute" type="button" id="calcCtaBtn">Contribute</button>
      <div class="rc-escrow">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><rect x="2.5" y="6" width="8" height="5.5" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M4.5 6V4.5a2 2 0 014 0V6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        Funds held in escrow until maturity
      </div>`;
  }

  function initCalculator(meta) {
    const amount = parseNumber(meta.amount);
    const apr = parseNumber(meta.apr);
    const dueDays = parseNumber(meta.dueDays);
    const fillPercent = Math.min(Math.max(parseNumber(meta.fill), 0), 100);
    const raised = amount * fillPercent / 100;
    const remaining = Math.max(amount - raised, 0);
    const minInvest = 500;
    const maxInvest = Math.max(minInvest, Math.floor(remaining / 100) * 100);
    const termRatio = (apr / 100) * (dueDays / 365);
    const termPct = (termRatio * 100).toFixed(2);

    const inputEl   = document.getElementById('calcAmount');
    const sliderEl  = document.getElementById('calcSlider');
    const maxBtn    = document.getElementById('calcMaxBtn');
    const returnEl  = document.getElementById('calcReturn');
    const receiveEl = document.getElementById('calcReceive');
    const ctaBtn    = document.getElementById('calcCtaBtn');
    if (!inputEl || !sliderEl) return;

    function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
    function clamp(val) { return Math.max(minInvest, Math.min(maxInvest, Math.round(val / 100) * 100)); }
    function rawFromInput() { return parseFloat(inputEl.value.replace(/,/g, '')) || 0; }

    function update(rawVal) {
      const val = clamp(isNaN(rawVal) || rawVal <= 0 ? minInvest : rawVal);
      const isMax = val >= maxInvest;
      inputEl.value  = fmt(val);
      sliderEl.value = val;
      if (maxBtn)    maxBtn.classList.toggle('active', isMax);
      if (returnEl)  returnEl.innerHTML    = `<strong class="calc-return-pct">+${termPct}%</strong><span class="calc-return-apr">${meta.apr} APR</span>`;
      if (receiveEl) receiveEl.textContent = `$${fmt(val + val * termRatio)}${meta.dueDate ? ` · ${meta.dueDate}` : ''}`;
      if (ctaBtn)    ctaBtn.textContent    = `Contribute $${fmt(val)}`;
    }

    update(clamp(5000));

    inputEl.addEventListener('focus', () => { inputEl.value = String(clamp(rawFromInput() || 5000)); inputEl.select(); });
    inputEl.addEventListener('blur',  () => update(rawFromInput()));
    inputEl.addEventListener('input', () => {
      const raw = parseFloat(inputEl.value.replace(/,/g, ''));
      if (!isNaN(raw)) {
        const val = clamp(raw);
        sliderEl.value = val;
        if (maxBtn)    maxBtn.classList.toggle('active', val >= maxInvest);
        if (returnEl)  returnEl.innerHTML    = `<strong class="calc-return-pct">+${termPct}%</strong><span class="calc-return-apr">${meta.apr} APR</span>`;
        if (receiveEl) receiveEl.textContent = `$${fmt(val + val * termRatio)}${meta.dueDate ? ` · ${meta.dueDate}` : ''}`;
        if (ctaBtn)    ctaBtn.textContent    = `Contribute $${fmt(val)}`;
      }
    });
    sliderEl.addEventListener('input', () => update(parseFloat(sliderEl.value)));
    if (maxBtn) maxBtn.addEventListener('click', () => update(maxInvest));
  }

  function getFocusable() {
    return [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(el => !el.disabled);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('details-modal-open');
  }

  document.querySelectorAll('.details-btn').forEach(button => {
    button.addEventListener('click', () => {
      const row = button.closest('tr');
      const details = companyDetails[button.dataset.company] || (row ? {
        cardClass: 'modal-card',
        name: row.dataset.companyName,
        description: `${row.dataset.companyName} is a verified B2B invoice opportunity in ${row.dataset.sector}. The deal is listed with current funding progress, target pricing, and risk tier for investor review.`,
        facts: [
          ['Invoice', row.dataset.invoiceId],
          ['Sector', row.dataset.sector],
          ['Invoice Amount', row.dataset.amount],
          ['Due Date', row.dataset.dueDate],
          ['Risk', row.dataset.risk],
          ['Min Contribution', row.dataset.minContribution],
          ['APR', `${row.dataset.apr} annual`]
        ]
      } : null);
      if (!details) return;

      const investment = getInvestmentMeta(details, row);
      const getFact = (label) => (details.facts.find(([l]) => l === label) || [])[1] || '';
      card.className = details.cardClass || 'modal-card';
      title.textContent = details.name;
      description.textContent = details.description;
      facts.innerHTML = renderCalculator(investment, {
        obligor:       getFact('Obligor'),
        sector:        getFact('Sector'),
        jurisdiction:  getFact('Jurisdiction'),
        invoiceAmount: getFact('Invoice Amount'),
      });
      if (metrics) metrics.innerHTML = renderMetrics(investment);
      initCalculator(investment);

      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('details-modal-open');
      requestAnimationFrame(() => getFocusable()[0]?.focus());
    });
  });

  closeButton.addEventListener('click', closeModal);
  modal.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeModal(); return; }
    if (event.key === 'Tab' && modal.classList.contains('open')) {
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) { event.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
  });
})();

(() => {
  const platform = document.querySelector('.earning-gold-platform-wrap');
  const earnButton = document.querySelector('.earning-platform-label');
  if (!platform || !earnButton) return;

  let soonTimer;
  earnButton.addEventListener('click', () => {
    clearTimeout(soonTimer);
    platform.classList.add('soon-visible');
    soonTimer = setTimeout(() => {
      platform.classList.remove('soon-visible');
    }, 1300);
  });
})();

console.log('%cFactor%c0x', 'font-size:32px; color:#050505; font-weight:700', 'font-size:32px; color:#6F6F6F; font-weight:700');
console.log('%cLiquidity for Business · factor0x.com', 'font-size:14px; color:#888');
