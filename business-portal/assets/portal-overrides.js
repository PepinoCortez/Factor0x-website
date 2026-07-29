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

  // Заявок на рассмотрении / Активных сделок / Ближайшее погашение all lead
  // to the same place a borrower would actually go to act on them — Мои
  // сделки — so they become links to it. Всего профинансировано is left
  // alone (a pure summary figure, nothing to drill into).
  const METRIC_CARD_LINKS = ['Заявок на рассмотрении', 'Активных сделок', 'Ближайшее погашение'];

  const wireMetricCardLinks = (metricsShell) => {
    Array.from(metricsShell.children).forEach((metricCard) => {
      if (!(metricCard instanceof HTMLElement) || metricCard.dataset.portalLinkWired) return;
      if (!METRIC_CARD_LINKS.some((label) => metricCard.textContent.includes(label))) return;
      metricCard.dataset.portalLinkWired = 'true';
      metricCard.classList.add('portal-metric-card-clickable');
      metricCard.setAttribute('role', 'link');
      metricCard.tabIndex = 0;
      const go = () => {
        const dealsLink = findNavLink('Мои сделки');
        if (dealsLink) dealsLink.click();
      };
      metricCard.addEventListener('click', go);
      metricCard.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          go();
        }
      });
    });
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
        wireMetricCardLinks(metricsShell);
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

  // ---------------------------------------------------------------------
  // "Новая заявка": mark required fields, validate on submit attempt
  // (native constraint validation instead of reimplementing it), split the
  // 7-document checklist into "needed to start" vs "can wait", reframe the
  // doc-count copy as progress instead of a deficit, gate the real submit
  // behind a review summary, and fill the empty left column with a "what
  // happens next" + fill-status sidebar.
  //
  // DOM-surgery constraint learned by testing against this exact build: the
  // page's own root wrapper (`.mx-auto`, called `page` below) keeps exactly
  // two children — the header and the <form> — and swaps them for a
  // "Заявка отправлена" success view in place on submit. Reparenting the
  // <form> itself (or inserting new siblings *inside* `page`) makes React
  // try to remove a child that is no longer where it expects and throw
  // (`NotFoundError: Failed to execute 'removeChild'`). Moving the
  // *document rows* (a stable, keyed list that never gets swapped wholesale)
  // is safe, and so is adding new siblings *next to* `page` rather than
  // inside it. Every DOM change below respects that line.
  // ---------------------------------------------------------------------

  const NEWAPP_DOC_ORDER = [
    { key: 'invoice', required: true },
    { key: 'contract', required: true },
    { key: 'purchase_order', required: false },
    { key: 'delivery_note', required: false },
    { key: 'acceptance_certificate', required: false },
    { key: 'bill_of_lading', required: false },
    { key: 'debt_confirmation', required: false },
  ];

  const newAppDocLabel = (key) => {
    const el = document.querySelector('[data-testid="text-doc-label-' + key + '"]');
    return el ? el.textContent.trim() : key;
  };

  const newAppFieldWrapper = (field) => field.closest('.flex.flex-col.gap-2') || field.parentElement;

  // Walks up from a known, stable descendant (a data-testid'd input/badge)
  // to whichever ancestor is a direct child of `parent`. Lets us grab a
  // whole native card (e.g. "Данные по инвойсу") without knowing its own
  // markup/class names — only the stable test-id buried inside it.
  const directChildOf = (parent, descendant) => {
    let node = descendant;
    while (node && node.parentElement && node.parentElement !== parent) node = node.parentElement;
    return node && node.parentElement === parent ? node : null;
  };

  // The app's persistent left navigation rail (Обзор / Новая заявка / Мои
  // сделки / Архив) — unlike `page`, this never unmounts across route
  // changes, which is exactly why it has room to spare below its four
  // links. Found by walking up from the "Новая заявка" link itself (no
  // stable test-id to anchor on here) until an ancestor's text contains all
  // four labels, so it doesn't depend on the rail's own markup/classes.
  const GLOBAL_NAV_LABELS = ['Обзор', 'Новая заявка', 'Мои сделки', 'Архив'];

  const findGlobalNavSidebar = () => {
    const newAppLink = Array.from(document.querySelectorAll('a, button, [role="link"]')).find(
      (el) => el.textContent.trim() === 'Новая заявка'
    );
    if (!newAppLink) return null;
    let node = newAppLink.parentElement;
    while (node && node !== document.body) {
      const text = node.textContent || '';
      if (GLOBAL_NAV_LABELS.every((label) => text.includes(label))) return node;
      node = node.parentElement;
    }
    return null;
  };

  // Proxies to the app's own SPA routing (same trick as the old upload
  // shortcut card): clicking the real nav link gets client-side navigation
  // for free, instead of a full-page window.location reload.
  const findNavLink = (label) =>
    Array.from(document.querySelectorAll('a, button, [role="link"]')).find(
      (el) => el.textContent.trim() === label
    );

  // The MutationObserver driving run() watches childList/subtree, and
  // `el.textContent = x` always replaces child nodes (even when the text is
  // unchanged) — writing on every tick would retrigger the observer and spin
  // forever. Only touch the DOM when the value actually changed.
  const setTextIfChanged = (el, value) => {
    if (el.textContent !== value) el.textContent = value;
  };

  // Every field but the comment is filled from the uploaded documents, not
  // typed in by the visitor — locked (disabled) rather than editable. A
  // disabled field is automatically excluded from native constraint
  // validation, so this alone is enough to keep the old required-field gate
  // from blocking submit on these; the submit gate that actually matters now
  // is the document checklist (see updateNewAppSubmitGate).
  const NEWAPP_LOCKED_FIELD_IDS = ['invoiceAmount', 'currency', 'obligorName', 'obligorCountry', 'invoiceDate', 'dueDate'];

  // The two free-text fields shipped with "Например, ..." typing hints —
  // wrong tone now that nobody types into them.
  const NEWAPP_LOCKED_PLACEHOLDER = 'Определится автоматически';

  const lockNewAppDataFields = (form) => {
    NEWAPP_LOCKED_FIELD_IDS.forEach((id) => {
      const field = form.querySelector('#' + id);
      if (!field) return;
      if (field.tagName === 'INPUT' && field.placeholder !== NEWAPP_LOCKED_PLACEHOLDER) {
        field.placeholder = NEWAPP_LOCKED_PLACEHOLDER;
      }
      if (field.disabled) return;
      field.disabled = true;
      field.classList.add('portal-field-locked');
    });
  };

  // A lucide "lock" glyph — same visual family as the rest of this file's
  // hand-built icons (see DEAL_INFO_ICON_SVG). Sits next to each locked
  // field as a plain visual cue ("this fills itself in, don't reach for it"),
  // distinct from the disabled-cursor styling alone, which is easy to miss
  // until you've already clicked in.
  const NEWAPP_LOCK_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>';

  // Inputs and the <select> trigger button can't hold a floating icon inside
  // themselves without either breaking void-element markup (<input> has no
  // children) or reaching into Radix's own internal child structure (risky
  // on the select trigger) — wrapping the field in a flex row and placing
  // the icon as a plain sibling after it sidesteps both, and works
  // identically for every locked field regardless of tag.
  const addNewAppLockIcons = (form) => {
    NEWAPP_LOCKED_FIELD_IDS.forEach((id) => {
      const field = form.querySelector('#' + id);
      if (!field || (field.parentElement && field.parentElement.classList.contains('portal-lock-wrap'))) return;
      const wrap = document.createElement('div');
      wrap.className = 'portal-lock-wrap';
      field.insertAdjacentElement('beforebegin', wrap);
      wrap.appendChild(field);
      const icon = document.createElement('span');
      icon.className = 'portal-lock-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = NEWAPP_LOCK_ICON_SVG;
      wrap.appendChild(icon);
    });
  };

  // "Краткое описание товаров/услуг" is repurposed as the one thing left for
  // the visitor to actually do here: flag it if the auto-filled data above
  // is wrong. No real document parsing exists yet (see lockNewAppDataFields)
  // — until it does, this comment is how a visitor corrects a bad value.
  const repurposeNewAppComment = (form) => {
    const textarea = form.querySelector('#description');
    if (!textarea || textarea.dataset.portalRepurposed) return;
    textarea.dataset.portalRepurposed = 'true';
    const label = form.querySelector('label[for="description"]');
    if (label) setTextIfChanged(label, 'Комментарий (необязательно)');
    textarea.placeholder = 'Если что-то из данных выше определено неверно — опишите здесь, и мы это учтём';
  };

  const ensureNewAppAutoFillNote = (dataCard) => {
    if (!dataCard || dataCard.querySelector('.portal-newapp-autofill-note')) return;
    const heading = Array.from(dataCard.querySelectorAll('*')).find(
      (el) => el.children.length === 0 && el.textContent.trim() === 'Заявка на финансирование'
    );
    if (!heading) return;
    const note = document.createElement('p');
    note.className = 'portal-newapp-autofill-note';
    note.textContent = 'Поля ниже определяются автоматически по загруженным документам.';
    heading.insertAdjacentElement('afterend', note);
    // Submit overlaps this same header area (position: sticky, top-right —
    // see .portal-newapp-submit-row) instead of sitting in flow; without a
    // reserved gutter, this text runs straight under the button on every
    // width this column's ever rendered at (confirmed by testing — not
    // only at narrow viewports).
    if (heading.parentElement) heading.parentElement.classList.add('portal-newapp-data-header');
  };

  const validateNewAppForm = (form) => {
    let firstInvalid = null;
    form.querySelectorAll('[required]').forEach((field) => {
      const wrapper = newAppFieldWrapper(field);
      if (!field.checkValidity()) {
        wrapper.classList.add('portal-field-invalid');
        if (!firstInvalid) firstInvalid = field;
      } else {
        wrapper.classList.remove('portal-field-invalid');
      }
    });
    return firstInvalid;
  };

  // Invoice upload has exactly one entry point: the "Инвойс" row in
  // Документы (highlighted as the primary document). The header subtitle
  // already explains the autofill flow, so no separate intro line here.

  // The per-document "Загрузить"/"Заменить" buttons never set type="button",
  // so inside a <form> they default to type="submit" — clicking one (a real
  // click, or our upload-first shortcut proxying .click() to it) submits the
  // form as a side effect. Harmless before this page had a submit gate, but
  // now it pops the review summary or a validation error every time someone
  // attaches a document. Force type="button" on every in-form button that
  // isn't the actual submit button.
  const fixNonSubmitButtonTypes = (form) => {
    form.querySelectorAll('button').forEach((btn) => {
      if (btn.dataset.testid === 'button-submit-application') return;
      if (btn.getAttribute('type') !== 'button') btn.setAttribute('type', 'button');
    });
  };

  const newAppDocStatus = () => {
    const rows = NEWAPP_DOC_ORDER.map(({ key, required }) => {
      const badge = document.querySelector('[data-testid="badge-doc-status-' + key + '"]');
      const uploaded = !!badge && badge.textContent.trim() === 'Загружено';
      return { key, required, uploaded, label: newAppDocLabel(key) };
    });
    const requiredTotal = rows.filter((r) => r.required).length;
    const missingRequired = rows.filter((r) => r.required && !r.uploaded).map((r) => r.label);
    return {
      rows,
      requiredTotal,
      missingRequired,
      total: rows.length,
      totalUploaded: rows.filter((r) => r.uploaded).length,
    };
  };

  // Softens the repeated "Нужно загрузить" status: 7 identical prompts read
  // as a list of things the visitor failed to do. The required docs keep a
  // neutral, un-urgent status word instead; the optional ones drop the
  // status altogether while nothing's attached — just the icon, name and
  // upload button, "here's what you could add" rather than "here's what
  // you didn't do". Reuses newAppDocStatus's own uploaded-detection (based
  // on the native "Загружено" text, which this never touches) rather than
  // re-deriving it, so it stays correct after this rewrites the other text.
  const softenDocStatusTone = () => {
    newAppDocStatus().rows.forEach(({ key, required, uploaded }) => {
      const badge = document.querySelector('[data-testid="badge-doc-status-' + key + '"]');
      if (!badge) return;
      if (required) {
        if (!uploaded) setTextIfChanged(badge, 'Не загружено');
      } else {
        badge.classList.toggle('portal-doc-badge-hidden', !uploaded);
      }
    });
  };

  // Groups the 7 document rows in place (same parent, no reparenting of the
  // rows container itself) into "needed to start" vs "can wait" sections.
  const groupNewAppDocuments = () => {
    const firstBadge = document.querySelector('[data-testid="badge-doc-status-invoice"]');
    const firstRow = firstBadge && firstBadge.closest('.flex.flex-col.gap-3');
    if (!firstRow) return;
    // Once grouped, the row's own parent IS a .portal-doc-group — checking
    // that directly (instead of re-deriving the original rows container,
    // which no longer exists as the row's parent after the first move) is
    // what makes this idempotent. Getting this wrong regroups on every
    // MutationObserver tick forever, nesting new groups infinitely.
    if (firstRow.parentElement && firstRow.parentElement.classList.contains('portal-doc-group')) return;
    const rowsContainer = firstRow.parentElement;
    if (!rowsContainer) return;

    const buildGroup = (title, hint, className) => {
      const group = document.createElement('div');
      group.className = 'portal-doc-group ' + className;
      const heading = document.createElement('div');
      heading.className = 'portal-doc-group-heading';
      const titleEl = document.createElement('span');
      titleEl.className = 'portal-doc-group-title';
      titleEl.textContent = title;
      const hintEl = document.createElement('span');
      hintEl.className = 'portal-doc-group-hint';
      hintEl.textContent = hint;
      heading.appendChild(titleEl);
      heading.appendChild(hintEl);
      group.appendChild(heading);
      return group;
    };

    const requiredGroup = buildGroup('Необходимо для старта', 'без этого заявку не отправить', 'portal-doc-group-required');
    const laterGroup = buildGroup('Можно догрузить позже', 'приложите сразу или добавьте потом в карточке сделки', 'portal-doc-group-later');

    NEWAPP_DOC_ORDER.forEach(({ key, required }) => {
      const badge = document.querySelector('[data-testid="badge-doc-status-' + key + '"]');
      const row = badge && badge.closest('.flex.flex-col.gap-3');
      if (!row) return;
      (required ? requiredGroup : laterGroup).appendChild(row);
    });

    rowsContainer.appendChild(requiredGroup);
    rowsContainer.appendChild(laterGroup);
  };

  // Replaces the bare "Загружено 0 из 7 документов" deficit-framed counter
  // with achievement-first copy: what's done, then what's actually still
  // blocking (the required docs), then any extra already-attached as a bonus.
  const updateNewAppProgressCopy = () => {
    const textEl = document.querySelector('[data-testid="text-doc-progress"]');
    if (!textEl) return;
    const docs = newAppDocStatus();
    const parts = [];
    if (docs.missingRequired.length === 0) {
      parts.push('обязательные документы приложены ✓');
    } else {
      parts.push('осталось приложить: ' + docs.missingRequired.join(', '));
    }
    const requiredDone = docs.requiredTotal - docs.missingRequired.length;
    const bonus = docs.totalUploaded - requiredDone;
    if (bonus > 0) {
      parts.push('+' + bonus + ' ' + (bonus === 1 ? 'доп. документ' : 'доп. документа') + ' уже приложено');
    }
    setTextIfChanged(textEl, parts.join(' · '));
  };

  // Data fields are a byproduct of the documents, not the other way round —
  // they're shown dim (still fully editable) until the visitor actually
  // touches one, signaling "this will fill itself in" rather than "locked".
  const wireNewAppFieldMuting = (dataCard) => {
    if (!dataCard) return;
    dataCard.querySelectorAll('input, select, textarea, [role="combobox"]').forEach((field) => {
      if (field.dataset.portalMuteWired) return;
      field.dataset.portalMuteWired = 'true';
      const wrapper = newAppFieldWrapper(field);
      const activate = () => wrapper && wrapper.classList.add('portal-field-active');
      field.addEventListener('focus', activate);
      field.addEventListener('click', activate);
      field.addEventListener('input', activate);
      field.addEventListener('change', activate);
    });
  };

  // Submit only needs the two documents that actually block underwriting —
  // the other five, and every data field, stay optional at this stage.
  const updateNewAppSubmitGate = (form) => {
    const submitBtn = form.querySelector('[data-testid="button-submit-application"]');
    if (!submitBtn) return;
    submitBtn.disabled = newAppDocStatus().missingRequired.length > 0;
  };

  // Splits the page into "Данные по инвойсу" (left) / "Документы" (right)
  // so the documents — what the visitor actually acts on — sit next to,
  // not below, the fields they're meant to populate.
  //
  // Deliberately does NOT reparent the two native cards into a new wrapper
  // (an earlier version did, wrapping them the same way groupNewAppDocuments
  // wraps individual document rows) — that broke in production: React
  // reconciles `form`'s own direct children by position, and unlike the doc
  // rows (a keyed list, safe to relocate per the note above `form`), these
  // cards are plain, unkeyed sections. Nesting two of them one level deeper
  // left React unable to find its expected child at the top level, so it
  // mounted a second, fresh copy there — duplicated heading/text.
  // Marking the cards with classes and letting CSS Grid (on `form` itself,
  // see portal-overrides.css) place them side by side keeps every node
  // exactly where React put it — only classList changes, nothing reparented.
  const applyNewAppColumnsLayout = (form) => {
    if (form.dataset.portalColumnsWired) {
      return form.querySelector('.portal-newapp-data-card');
    }

    const amountInput = form.querySelector('[data-testid="input-invoice-amount"]');
    const invoiceBadge = form.querySelector('[data-testid="badge-doc-status-invoice"]');
    const dataCard = amountInput && directChildOf(form, amountInput);
    const docsCard = invoiceBadge && directChildOf(form, invoiceBadge);
    if (!dataCard || !docsCard || dataCard === docsCard) return null;

    form.dataset.portalColumnsWired = 'true';
    dataCard.classList.add('portal-newapp-data-card');
    docsCard.classList.add('portal-newapp-docs-card');

    const dataHeading = Array.from(dataCard.querySelectorAll('*')).find(
      (el) => el.children.length === 0 && el.textContent.trim() === 'Данные по инвойсу'
    );
    if (dataHeading) setTextIfChanged(dataHeading, 'Заявка на финансирование');

    // If the submit button lives in its own section (not nested in either
    // card above), mark it too so it spans full width below both columns —
    // via CSS grid-column, same as above: no move, just a class.
    const submitBtn = form.querySelector('[data-testid="button-submit-application"]');
    const submitSection = submitBtn && directChildOf(form, submitBtn);
    if (submitSection && submitSection !== dataCard && submitSection !== docsCard) {
      submitSection.classList.add('portal-newapp-submit-row');
    }

    // Invoice upload now lives in exactly one place — this row — so it's
    // marked as the primary document: it's what autofill will eventually
    // key off of, and the visitor should reach for it first.
    const invoiceRow = invoiceBadge.closest('.flex.flex-col.gap-3');
    if (invoiceRow) {
      invoiceRow.classList.add('portal-doc-row-primary');
      const invoiceLabel = form.querySelector('[data-testid="text-doc-label-invoice"]');
      if (invoiceLabel) {
        const tag = document.createElement('span');
        tag.className = 'portal-doc-row-primary-tag';
        tag.textContent = 'Главный документ';
        // Appended *inside* the label (not as a sibling after it) so the
        // inline-flex tag sits on the same line as "Инвойс" instead of
        // wrapping to its own line below.
        invoiceLabel.appendChild(tag);
      }
    }

    return dataCard;
  };

  const updateNewAppLiveState = (form) => {
    updateNewAppProgressCopy();
    updateNewAppSubmitGate(form);
    softenDocStatusTone();
  };

  const buildNewAppSidebar = () => {
    const sidebar = document.createElement('div');
    sidebar.className = 'portal-newapp-sidebar';

    const stepsCard = document.createElement('div');
    stepsCard.className = 'portal-newapp-side-card';
    const stepsTitle = document.createElement('h2');
    stepsTitle.className = 'portal-newapp-side-title';
    stepsTitle.textContent = 'Что будет после подачи';
    stepsCard.appendChild(stepsTitle);

    const stepsList = document.createElement('ol');
    stepsList.className = 'portal-newapp-steps';
    [
      'Подаёте заявку — данные и документы уходят на проверку.',
      'Мы оцениваем риск-профиль сделки и рассчитываем ставку.',
      'Возвращаемся с предложением по финансированию.',
    ].forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      stepsList.appendChild(li);
    });
    stepsCard.appendChild(stepsList);
    sidebar.appendChild(stepsCard);

    return sidebar;
  };

  const formatNewAppDate = (value) => {
    const parts = (value || '').split('-');
    return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : '—';
  };

  const buildNewAppSummaryOverlay = () => {
    const backdrop = document.createElement('div');
    backdrop.className = 'portal-newapp-summary-backdrop';
    backdrop.innerHTML =
      '<div class="portal-newapp-summary-card">' +
        '<div class="portal-newapp-summary-kicker">Проверьте перед отправкой</div>' +
        '<h3>Сводка заявки</h3>' +
        '<dl class="portal-newapp-summary-list">' +
          '<div><dt>Сумма</dt><dd data-slot="amount">—</dd></div>' +
          '<div><dt>Дебитор</dt><dd data-slot="obligor">—</dd></div>' +
          '<div><dt>Срок оплаты</dt><dd data-slot="dueDate">—</dd></div>' +
          '<div><dt>Документы</dt><dd data-slot="docs">—</dd></div>' +
          '<div><dt>Комментарий</dt><dd data-slot="comment">—</dd></div>' +
        '</dl>' +
        '<div class="portal-newapp-summary-actions">' +
          '<button type="button" class="portal-newapp-summary-back">Вернуться к правке</button>' +
          '<button type="button" class="portal-newapp-summary-confirm">Отправить</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    return backdrop;
  };

  const fillNewAppSummary = (overlay, form) => {
    const amount = form.querySelector('#invoiceAmount') && form.querySelector('#invoiceAmount').value;
    const currencySpan = form.querySelector('#currency span');
    const currency = currencySpan ? currencySpan.textContent.trim() : '';
    const obligor = form.querySelector('#obligorName') && form.querySelector('#obligorName').value;
    const dueDate = form.querySelector('#dueDate') && form.querySelector('#dueDate').value;
    const docs = newAppDocStatus();

    overlay.querySelector('[data-slot="amount"]').textContent = amount
      ? Number(amount).toLocaleString('ru-RU') + ' ' + currency
      : '—';
    overlay.querySelector('[data-slot="obligor"]').textContent = obligor || '—';
    overlay.querySelector('[data-slot="dueDate"]').textContent = formatNewAppDate(dueDate);
    overlay.querySelector('[data-slot="docs"]').textContent =
      docs.totalUploaded + ' из ' + docs.total + (docs.missingRequired.length ? ' (не хватает: ' + docs.missingRequired.join(', ') + ')' : '');

    const comment = form.querySelector('#description') && form.querySelector('#description').value.trim();
    overlay.querySelector('[data-slot="comment"]').textContent = comment || '—';
  };

  // Gates the real submit behind a review step. `confirmed` lets the second,
  // user-approved submit through untouched — capture + stopPropagation on
  // the first attempt stops React's delegated onSubmit from ever seeing it.
  //
  // The browser's own constraint validation runs *before* it ever dispatches
  // a 'submit' event, and cancels the dispatch outright when a required
  // field is empty — so an invalid form never reaches this listener at all,
  // it just shows the native tooltip on its own and stops there. Turning
  // that off (noValidate) makes 'submit' fire unconditionally so we can run
  // the same checkValidity()/reportValidity() calls ourselves and still show
  // our own per-field highlighting alongside the native tooltip.
  const wireNewAppSubmit = (form) => {
    if (form.dataset.portalSubmitWired) return;
    form.dataset.portalSubmitWired = 'true';
    form.noValidate = true;
    let confirmed = false;

    form.addEventListener('submit', (event) => {
      if (confirmed) {
        confirmed = false;
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const firstInvalid = validateNewAppForm(form);
      if (firstInvalid) {
        form.reportValidity();
        firstInvalid.focus();
        return;
      }

      const overlay = buildNewAppSummaryOverlay();
      fillNewAppSummary(overlay, form);

      overlay.querySelector('.portal-newapp-summary-back').addEventListener('click', () => {
        overlay.remove();
      });
      overlay.querySelector('.portal-newapp-summary-confirm').addEventListener('click', () => {
        overlay.remove();
        confirmed = true;
        form.requestSubmit();
      });
    }, true);
  };

  const applyNewApplicationTheme = () => {
    const amountInput = document.querySelector('[data-testid="input-invoice-amount"]');
    if (!amountInput) {
      // The form isn't mounted (e.g. the post-submit "Заявка отправлена"
      // screen is showing, or we navigated elsewhere) — anything we added as
      // a sibling of it won't get cleaned up by React, so do it ourselves.
      // The sidebar itself now lives inside the persistent global nav rail
      // (see below), which never unmounts, so it has to be removed here
      // explicitly rather than going away with the rest of the page.
      document.querySelectorAll('.portal-newapp-sidebar, .portal-newapp-summary-backdrop').forEach((el) => el.remove());
      // ...including the scoped scroll-container override on <main> (see
      // below) — leaving it on would silently affect every other page.
      const scrollFixMain = document.querySelector('.portal-newapp-main-scroll-fix');
      if (scrollFixMain) scrollFixMain.classList.remove('portal-newapp-main-scroll-fix');
      return false;
    }

    const page = amountInput.closest('.mx-auto');
    const form = amountInput.closest('form');
    if (!page || !form) return false;

    page.classList.add('portal-new-application-page');
    // Header subtitle: page's first (and only non-form) child is the
    // "mb-6" div holding just the h1 and this one <p> — reworded now that
    // Документы sits on the left and is the actual point of entry.
    const subtitleEl = page.querySelector(':scope > div > p');
    if (subtitleEl) {
      setTextIfChanged(subtitleEl, 'Загрузите документы — остальные поля определятся автоматически. Что-то не так — укажите в комментарии.');
    }
    fixNonSubmitButtonTypes(form);
    groupNewAppDocuments();
    wireNewAppSubmit(form);

    const dataCard = applyNewAppColumnsLayout(form);
    wireNewAppFieldMuting(dataCard);
    lockNewAppDataFields(form);
    addNewAppLockIcons(form);
    repurposeNewAppComment(form);
    ensureNewAppAutoFillNote(dataCard);

    // Makes the Данные column's position:sticky (see portal-overrides.css)
    // actually track scroll: <main> carries Tailwind's overflow-auto, which
    // makes it *a* CSS scroll container regardless of whether it ever
    // actually overflows, and that alone is enough to make sticky inert.
    // Scoped to this page's <main> instance and reverted above.
    const scrollFixMain = form.closest('main');
    if (scrollFixMain) scrollFixMain.classList.add('portal-newapp-main-scroll-fix');

    // "Что будет после подачи" / "Подсказки" / mini-summary now live in the
    // spare room below the four links of the persistent nav rail instead of
    // a dedicated 280px column next to the form — that column is freed up
    // for the Данные/Документы split below to actually breathe.
    const navSidebar = findGlobalNavSidebar();
    if (navSidebar && !navSidebar.querySelector('.portal-newapp-sidebar')) {
      navSidebar.appendChild(buildNewAppSidebar());
    }

    updateNewAppLiveState(form);
    return true;
  };

  // "Мои сделки": each deal is its own separate, individually-rounded card
  // with a gap to the next one — Архив (a real <table> in one bordered
  // card) reads as denser and more unified. Can't turn this into an actual
  // <table> without rewriting how the app renders it, so this reskins the
  // existing cards in place: one shared frame around the header + list,
  // gaps removed, and each card flattened to a border-bottom row instead
  // of its own rounded/shadowed box — same visual result as Архив without
  // touching the DOM structure (list-deals's own cards, and their onClick/
  // Link navigation, are untouched).

  // Status badges that are self-explanatory on their own — the "i" next to
  // them is pure noise. Left alone: "Ожидает загрузки документов" /
  // "Расчёт ставки" (both benefit from the explainer) and the rate's own
  // "i" (untouched, native to the app).
  const DEAL_STATUS_HIDE_INFO = new Set(['Профинансировано', 'Готов к финансированию']);

  // The status badge's own "i" tooltip button is always its next sibling
  // inside the native "flex shrink-0 items-center gap-1" wrapper (see q_ in
  // the compiled bundle) — Radix only portals the tooltip's *content* into
  // the DOM while open, so this sibling is reliably just the trigger button.
  const trimDealStatusInfo = (row) => {
    const badge = row.querySelector('[data-testid^="badge-status-"]');
    if (!badge) return;
    const infoBtn = badge.nextElementSibling;
    if (infoBtn && DEAL_STATUS_HIDE_INFO.has(badge.textContent.trim())) {
      infoBtn.style.display = 'none';
    }
  };

  // Дефолт/Просрочка ship with no explainer at all in the native component —
  // these two are exactly the statuses worth explaining, so one gets added.
  const DEAL_FLAG_INFO = {
    'Дефолт': 'Сделка не погашена в установленный срок и переведена в статус дефолта. Пеня продолжает начисляться до полного погашения.',
    'Просрочка': 'Срок оплаты по сделке прошёл. Идёт начисление пени — свяжитесь с дебитором или с нами, если нужна помощь.',
  };

  // Same visual recipe as the app's own tooltip trigger button (identical
  // Tailwind classes, so it matches pixel-for-pixel) — just a plain
  // hover/focus CSS tooltip instead of a Radix portal, since we can't wire
  // real Radix state onto a node React doesn't own.
  const DEAL_INFO_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>';

  const buildDealInfoIcon = (text) => {
    const wrap = document.createElement('span');
    wrap.className =
      'portal-i-icon inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover-elevate active-elevate-2';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('aria-label', 'Пояснение');
    wrap.innerHTML = DEAL_INFO_ICON_SVG;
    wrap.addEventListener('click', (event) => event.stopPropagation());
    const tip = document.createElement('span');
    tip.className =
      'portal-i-tip z-50 w-72 rounded-md border bg-popover p-4 text-sm leading-relaxed text-popover-foreground shadow-md';
    tip.textContent = text;
    wrap.appendChild(tip);
    return wrap;
  };

  // A flagged deal (Дефолт/Просрочка) is the one main status for that row —
  // "Профинансировано" is still true, but it belongs in the deal's own
  // detail view, not competing for attention here. Hides the whole native
  // status-badge+info pair (not just the badge) since its "i" would now be
  // explaining a badge nobody can see. Returns whether this row is flagged,
  // so the caller can tally it into the summary bar.
  const simplifyFlaggedStatus = (row) => {
    const badge = row.querySelector('[data-testid^="badge-status-"]');
    if (!badge) return false;
    const primaryWrap = badge.parentElement;
    const badgeGroup = primaryWrap && primaryWrap.parentElement;
    if (!badgeGroup) return false;
    const flagBadge = Array.from(badgeGroup.children).find(
      (el) => el !== primaryWrap && (el.textContent.trim() === 'Дефолт' || el.textContent.trim() === 'Просрочка')
    );
    if (!flagBadge) return false;

    if (!badgeGroup.dataset.portalFlagSimplified) {
      badgeGroup.dataset.portalFlagSimplified = 'true';
      primaryWrap.style.display = 'none';
      const infoText = DEAL_FLAG_INFO[flagBadge.textContent.trim()];
      if (infoText) {
        flagBadge.insertAdjacentElement('afterend', buildDealInfoIcon(infoText));
      }
    }
    return true;
  };

  // "Мои сделки" has no raw ISO due date anywhere in the DOM, only the
  // already-formatted "12 май 2026" text (see pn() in the compiled bundle) —
  // this is that same formatter run in reverse, so month abbreviations must
  // stay in sync with the app's own Mj array if it's ever touched.
  const DEAL_MONTH_ABBR = ['янв', 'февр', 'март', 'апр', 'май', 'июн', 'июл', 'авг', 'сент', 'окт', 'нояб', 'дек'];

  const parseDealDate = (text) => {
    const parts = (text || '').trim().split(/\s+/);
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const monthIndex = DEAL_MONTH_ABBR.indexOf(parts[1]);
    const year = parseInt(parts[2], 10);
    if (Number.isNaN(day) || monthIndex === -1 || Number.isNaN(year)) return null;
    return new Date(year, monthIndex, day);
  };

  const dealStartOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const dealDaysUntil = (date) => Math.round((dealStartOfDay(date) - dealStartOfDay(new Date())) / 86400000);

  // These two statuses don't have a real repayment obligation yet (no
  // disbursement has happened), so a countdown against their due date would
  // be misleading — a dash instead, per spec.
  const DEAL_COUNTDOWN_DASH_STATUSES = new Set(['Ожидает загрузки документов', 'Расчёт ставки']);
  const DEAL_COUNTDOWN_SOON_DAYS = 7;

  // Both selectors are exact Tailwind class combos confirmed from the
  // compiled component (see q_) — Погашение carries whitespace-nowrap,
  // Срок doesn't, which is the only thing that tells the two apart.
  const DEAL_DUE_DATE_SELECTOR = '.whitespace-nowrap.text-right.text-muted-foreground.tabular-nums';
  const DEAL_TERM_SELECTOR = '.text-right.text-muted-foreground.tabular-nums:not(.whitespace-nowrap)';

  // Срок ("30 days") is dropped from the list to make room for the new
  // countdown column — still visible in the deal's own detail view. Hidden
  // rather than removed: a plain display:none on a node React still owns is
  // harmless and survives re-renders on its own.
  const hideDealTermCell = (row) => {
    const cell = row.querySelector(DEAL_TERM_SELECTOR);
    if (cell) cell.classList.add('portal-deal-term-cell');
  };

  // The "60 дн. · пеня AED 3,240" line used to render as its own wrapped row
  // under the status badge, which is what made flagged rows taller than the
  // rest — relocated into its own column instead (right next to Погашение,
  // which it explains), and the badge cell goes back to holding just one
  // line, same as every other row.
  const ensureDealCountdownCell = (row) => {
    const dueDateCell = row.querySelector(DEAL_DUE_DATE_SELECTOR);
    if (!dueDateCell) return;
    if (dueDateCell.nextElementSibling && dueDateCell.nextElementSibling.classList.contains('portal-deal-countdown')) {
      return;
    }

    const cell = document.createElement('div');
    cell.className = 'portal-deal-countdown';

    const badge = row.querySelector('[data-testid^="badge-status-"]');
    const badgeGroup = badge && badge.closest('.flex.flex-wrap.items-center.gap-2');
    const statusCell = badgeGroup && badgeGroup.parentElement;
    const note = statusCell && Array.from(statusCell.children).find((el) => el !== badgeGroup);

    if (note) {
      // Reuses the app's own already-computed overdueDays/latePenaltyAmount
      // text instead of re-deriving anything — just hides the original (kept
      // in the DOM, not removed, so React never notices) and reformats its
      // text into this column's two-line layout: "просрочено N дн." never
      // truncates (it's its own line, not fighting the penalty for space on
      // one line), and the penalty sits compactly underneath — every row's
      // min-height already accounts for two lines here (see CSS), so this
      // doesn't reintroduce the uneven-row-height problem the penalty used
      // to cause back when it lived under the status badge instead.
      note.style.display = 'none';
      const isDefault = note.classList.contains('text-status-danger');
      const match = note.textContent.match(/^(\d+\s*дн\.)\s*(?:·\s*(.+))?$/);
      const daysPhrase = match ? match[1] : note.textContent.trim();
      const penaltyPhrase = match ? match[2] : null;

      cell.classList.add(isDefault ? 'text-status-danger' : 'text-status-warning');
      const daysSpan = document.createElement('span');
      daysSpan.className = 'portal-deal-countdown-days';
      daysSpan.textContent = 'просрочено ' + daysPhrase;
      cell.appendChild(daysSpan);

      if (penaltyPhrase) {
        const penaltySpan = document.createElement('span');
        penaltySpan.className = 'portal-deal-countdown-penalty';
        penaltySpan.textContent = penaltyPhrase;
        cell.appendChild(penaltySpan);
      }
    } else {
      const statusText = badge ? badge.textContent.trim() : '';
      const dueDate = DEAL_COUNTDOWN_DASH_STATUSES.has(statusText) ? null : parseDealDate(dueDateCell.textContent);
      if (dueDate) {
        const days = dealDaysUntil(dueDate);
        cell.textContent = days <= 0 ? 'сегодня' : `через ${days} дн.`;
        cell.classList.add(
          days >= 0 && days <= DEAL_COUNTDOWN_SOON_DAYS ? 'portal-deal-countdown-soon' : 'text-muted-foreground'
        );
      } else {
        cell.textContent = '—';
        cell.classList.add('text-muted-foreground');
      }
    }

    dueDateCell.insertAdjacentElement('afterend', cell);
  };

  const hideDealTermHeader = (headerRow) => {
    const termHeader = Array.from(headerRow.children).find((el) => el.textContent.trim() === 'Срок');
    if (termHeader) termHeader.classList.add('portal-deal-term-cell');
  };

  const ensureDealCountdownHeader = (headerRow) => {
    if (headerRow.querySelector('.portal-deal-countdown-header')) return;
    const dueHeader = Array.from(headerRow.children).find((el) => el.textContent.trim() === 'Погашение');
    if (!dueHeader) return;
    const header = document.createElement('span');
    header.className = 'portal-deal-countdown-header';
    header.textContent = 'Отсчёт';
    dueHeader.insertAdjacentElement('afterend', header);
  };

  // A very faint full-row tint so a Дефолт/Просрочка row is the first thing
  // the eye catches scanning the list, on top of (not instead of) the
  // colored status badge — tagged on the row's own Link wrapper (the actual
  // element carrying the border/hover background, one level above the
  // card div itself) rather than the card, so it lines up with those.
  const tagDealRowSeverity = (row) => {
    const rowLink = row.parentElement;
    if (!rowLink || rowLink.dataset.portalSeverityTagged) return;
    const badge = row.querySelector('[data-testid^="badge-status-"]');
    const badgeGroup = badge && badge.closest('.flex.flex-wrap.items-center.gap-2');
    const flagBadge =
      badgeGroup &&
      Array.from(badgeGroup.children).find(
        (el) => el.textContent.trim() === 'Дефолт' || el.textContent.trim() === 'Просрочка'
      );
    if (!flagBadge) return;
    rowLink.dataset.portalSeverityTagged = 'true';
    rowLink.classList.add(flagBadge.textContent.trim() === 'Дефолт' ? 'portal-deal-row-danger' : 'portal-deal-row-warning');
  };

  const DEAL_WORD_FORMS = {
    deal: ['сделка', 'сделки', 'сделок'],
    require: ['требует', 'требуют', 'требуют'],
  };

  // Standard Russian plural-form selection (1/2-4/5+, with the 11-14 teens
  // exception) — used only for the summary bar's deal count.
  const ruPlural = (n, forms) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
    return forms[2];
  };

  const buildDealsSummaryText = (problemCount, totalCount) => {
    if (problemCount === 0) return 'Все сделки в порядке';
    const rest = totalCount - problemCount;
    const base = `${problemCount} ${ruPlural(problemCount, DEAL_WORD_FORMS.deal)} ${ruPlural(problemCount, DEAL_WORD_FORMS.require)} внимания`;
    return rest > 0 ? `${base} · остальные в порядке` : base;
  };

  // Gives the borrower context before the list itself — which may open on a
  // red "Дефолт" row — is the first thing they see. Inserted as a plain new
  // sibling next to tableWrap's own overflow wrapper (same "add next to,
  // don't reparent" rule the rest of this file follows around React-owned
  // subtrees), so it survives re-renders without fighting React for the node.
  const ensureDealsSummaryBar = (tableWrap, problemCount, totalCount) => {
    const overflowWrap = tableWrap.parentElement;
    if (!overflowWrap || !overflowWrap.parentElement) return;
    let bar = overflowWrap.previousElementSibling;
    if (!bar || !bar.classList.contains('portal-deals-summary')) {
      bar = document.createElement('div');
      bar.className = 'portal-deals-summary';
      overflowWrap.parentElement.insertBefore(bar, overflowWrap);
    }
    setTextIfChanged(bar, buildDealsSummaryText(problemCount, totalCount));
  };

  const applyDealsTheme = () => {
    const list = document.querySelector('[data-testid="list-deals"]');
    if (!list) return false;

    const tableWrap = list.parentElement;
    if (!tableWrap) return false;

    tableWrap.classList.add('portal-deals-table');
    list.classList.add('portal-deals-list');
    const headerRow = tableWrap.firstElementChild;
    if (headerRow && headerRow !== list) {
      headerRow.classList.add('portal-deals-header');
      hideDealTermHeader(headerRow);
      ensureDealCountdownHeader(headerRow);
    }

    let problemCount = 0;
    const rows = Array.from(list.querySelectorAll('[data-testid^="card-deal-"]'));
    rows.forEach((row) => {
      trimDealStatusInfo(row);
      if (simplifyFlaggedStatus(row)) problemCount++;
      hideDealTermCell(row);
      ensureDealCountdownCell(row);
      tagDealRowSeverity(row);
    });
    ensureDealsSummaryBar(tableWrap, problemCount, rows.length);

    return true;
  };

  const run = () => {
    const overviewDone = applyOverviewTheme();
    const newApplicationDone = applyNewApplicationTheme();
    const dealsDone = applyDealsTheme();
    if (!overviewDone && !newApplicationDone && !dealsDone) {
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
