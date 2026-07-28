(function () {
  const CURRENCY_SEP = ' ';

  const splitCurrencyTag = (valueEl) => {
    if (!valueEl || valueEl.dataset.portalSplit) return;
    const text = valueEl.textContent || '';
    const idx = text.indexOf(CURRENCY_SEP);
    if (idx === -1) return;
    const currency = text.slice(0, idx);
    const amount = text.slice(idx + 1);
    valueEl.textContent = '';
    const tag = document.createElement('span');
    tag.className = 'metric-currency-tag';
    tag.textContent = currency;
    valueEl.appendChild(tag);
    valueEl.appendChild(document.createTextNode(amount));
    valueEl.dataset.portalSplit = 'true';
  };

  const ICON_TONE = {
    'lucide-triangle-alert': 'warning',
    'lucide-banknote': 'success',
  };

  const colorizeFeed = (listEl) => {
    listEl.querySelectorAll('li').forEach((li) => {
      if (li.dataset.portalColorized) return;
      const svg = li.querySelector('svg');
      const toneClass = svg && Array.from(svg.classList).find((c) => ICON_TONE[c]);
      const tone = toneClass ? ICON_TONE[toneClass] : null;
      if (tone) li.classList.add('portal-feed-' + tone);
      li.dataset.portalColorized = 'true';
    });
  };

  const OVERDUE_OBLIGOR_RE = /дебитор\s+(.+?)\s+просрочил/i;

  const findOverdueObligors = (listEl) => {
    const names = [];
    listEl.querySelectorAll('li').forEach((li) => {
      const svg = li.querySelector('svg');
      if (!svg || !svg.classList.contains('lucide-triangle-alert')) return;
      const textEl = li.querySelector('p');
      const text = textEl ? textEl.textContent || '' : '';
      const match = text.match(OVERDUE_OBLIGOR_RE);
      if (match) names.push(match[1].trim());
    });
    return names;
  };

  const DEAL_ID_RE = /№\s?(\d+)/;

  const extractActionItems = (listEl) => {
    const found = [];
    listEl.querySelectorAll('li').forEach((li) => {
      const textEl = li.querySelector('p');
      const text = textEl ? (textEl.textContent || '').trim() : '';
      if (/^Загрузите/i.test(text)) found.push({ li, text });
    });
    return found;
  };

  const buildAttentionWidget = (items) => {
    const card = document.createElement('div');
    card.className = 'portal-metric-card portal-attention-card';

    const title = document.createElement('h2');
    title.className = 'portal-widget-title';
    title.textContent = 'Требует внимания';
    card.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'portal-attention-list';

    items.forEach(({ text }) => {
      const li = document.createElement('li');
      li.className = 'portal-attention-item';

      const p = document.createElement('p');
      p.className = 'portal-attention-text';
      p.textContent = text;
      li.appendChild(p);

      const match = text.match(DEAL_ID_RE);
      const action = document.createElement('a');
      action.className = 'portal-attention-action';
      action.textContent = 'Загрузить документ';
      action.href = match
        ? '/business-portal/deals/' + match[1]
        : '/business-portal/deals';
      li.appendChild(action);

      list.appendChild(li);
    });

    card.appendChild(list);
    return card;
  };

  const buildRepaymentsWidget = (overdueObligors) => {
    const valueEl = document.querySelector('[data-testid="kpi-next-repayment"]');
    const card = document.createElement('div');
    card.className = 'portal-metric-card portal-repayments-card';

    const title = document.createElement('h2');
    title.className = 'portal-widget-title';
    title.textContent = 'Ближайшие погашения';
    card.appendChild(title);

    const list = document.createElement('ul');
    list.className = 'portal-repayments-list';

    const rows = [];
    if (valueEl) {
      const amount = (valueEl.textContent || '').trim();
      const subEl = valueEl.parentElement
        ? valueEl.parentElement.querySelector('.text-white\\/50')
        : null;
      let date = '';
      let obligor = '';
      if (subEl) {
        const parts = (subEl.textContent || '').split('·').map((s) => s.trim());
        date = parts[0] || '';
        obligor = parts[1] || '';
      }
      if (amount) rows.push({ obligor, date, amount });
    }
    rows.push({ obligor: 'Lulu Group International', date: '28 июл 2026', amount: 'AED 64,500' });
    rows.push({ obligor: 'Al Futtaim Group', date: '05 авг 2026', amount: 'AED 92,200' });

    rows.forEach((r) => {
      const overdue = overdueObligors.includes(r.obligor);
      const li = document.createElement('li');
      li.className = 'portal-repayment-row' + (overdue ? ' portal-repayment-overdue' : '');

      const obligorEl = document.createElement('span');
      obligorEl.className = 'portal-repayment-obligor';
      obligorEl.textContent = r.obligor;

      const amountEl = document.createElement('span');
      amountEl.className = 'portal-repayment-amount';
      amountEl.textContent = r.amount;

      const dateEl = document.createElement('span');
      dateEl.className = 'portal-repayment-date';
      dateEl.textContent = overdue ? r.date + ' · просрочено' : r.date;

      li.appendChild(obligorEl);
      li.appendChild(amountEl);
      li.appendChild(dateEl);
      list.appendChild(li);
    });

    card.appendChild(list);
    return card;
  };

  const buildBottomGrid = (overviewRoot, activityCard) => {
    const grid = document.createElement('div');
    grid.className = 'portal-bottom-grid';

    const left = document.createElement('div');
    left.className = 'portal-bottom-left';

    const right = document.createElement('div');
    right.className = 'portal-bottom-right';

    activityCard.parentNode.insertBefore(grid, activityCard);
    left.appendChild(activityCard);
    grid.appendChild(left);
    grid.appendChild(right);

    return { left, right };
  };

  const applyOverviewTheme = () => {
    const overviewRoot = document.querySelector('main .mx-auto.flex.max-w-5xl.flex-col.gap-6');
    if (!overviewRoot) return false;

    // React remounts this subtree on every SPA navigation back to the
    // overview page, wiping the classes and DOM surgery this function adds.
    // If a bottom-grid is already present, this exact DOM was already
    // processed (re-running would move activityCard into a second nested
    // grid and duplicate the attention/repayments widgets) — skip.
    if (overviewRoot.querySelector('.portal-bottom-grid')) return true;

    overviewRoot.classList.add('portal-overview-page');

    const topCard = overviewRoot.children[0];
    if (topCard) {
      topCard.classList.add('portal-overview-card');

      const headerShell = Array.from(topCard.querySelectorAll('div')).find((node) => {
        const hasHeading = !!node.querySelector('h1');
        const hasAction = !!node.querySelector('a[href*="new-application"], button');
        return hasHeading && hasAction;
      });

      if (headerShell) {
        headerShell.classList.add('portal-overview-header');
      }

      const metricLabels = [
        'Заявок на рассмотрении',
        'Активных сделок',
        'Всего профинансировано',
        'Ближайшее погашение'
      ];

      const metricsShell = Array.from(topCard.querySelectorAll('div')).find((node) => {
        const text = node.textContent || '';
        return metricLabels.some((label) => text.includes(label));
      });

      if (metricsShell) {
        metricsShell.classList.add('portal-overview-metrics');
        Array.from(metricsShell.children).forEach((metricCard) => {
          if (metricCard instanceof HTMLElement) {
            metricCard.classList.add('portal-metric-card');
          }
        });
      }

      splitCurrencyTag(document.querySelector('[data-testid="kpi-total-financed"]'));
    }

    const activityCard = Array.from(overviewRoot.children).find((node) => {
      return (
        node instanceof HTMLElement &&
        node.textContent.includes('Последние события') &&
        !node.classList.contains('portal-bottom-grid')
      );
    });

    if (activityCard) {
      activityCard.classList.add('portal-activity-card');

      const listEl = activityCard.querySelector('[data-testid="list-activity"]');
      if (listEl) {
        const actionItems = extractActionItems(listEl);
        actionItems.forEach(({ li }) => li.remove());
        const overdueObligors = findOverdueObligors(listEl);
        colorizeFeed(listEl);

        const { left, right } = buildBottomGrid(overviewRoot, activityCard);
        if (actionItems.length) {
          right.appendChild(buildAttentionWidget(actionItems));
        }
        right.appendChild(buildRepaymentsWidget(overdueObligors));
      }
    }

    document.body.classList.add('portal-dark-theme');
    return true;
  };

  const run = () => {
    if (!applyOverviewTheme()) {
      window.setTimeout(run, 120);
    }
  };

  window.addEventListener('load', run);
  window.setTimeout(run, 0);
  window.setTimeout(run, 200);
  window.setTimeout(run, 400);
  window.setTimeout(run, 900);

  // SPA navigation (e.g. Обзор -> Архив -> Обзор) remounts the overview page
  // without a full document load, so the timers above never fire again.
  // Watch the app root and re-run whenever the DOM changes; applyOverviewTheme's
  // own guards make repeat calls on an already-themed, still-mounted DOM a no-op.
  // Call run() directly (no setTimeout debounce): the MutationObserver
  // callback fires as a microtask right after React commits the DOM, before
  // the browser paints that frame. A setTimeout would push the patch into a
  // later macrotask, letting the browser paint the raw/unthemed DOM first —
  // that's what caused the visible flash of unstyled content on every nav.
  const observerRoot = document.getElementById('root') || document.body;
  new MutationObserver(run).observe(observerRoot, { childList: true, subtree: true });
})();
