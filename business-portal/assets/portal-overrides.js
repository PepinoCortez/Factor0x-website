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

  // The MutationObserver driving run() watches childList/subtree, and
  // `el.textContent = x` always replaces child nodes (even when the text is
  // unchanged) — writing on every tick would retrigger the observer and spin
  // forever. Only touch the DOM when the value actually changed.
  const setTextIfChanged = (el, value) => {
    if (el.textContent !== value) el.textContent = value;
  };

  const markRequiredLabels = (form) => {
    form.querySelectorAll('[required]').forEach((field) => {
      if (!field.id) return;
      const label = form.querySelector('label[for="' + field.id + '"]');
      if (label && !label.querySelector('.portal-required-mark')) {
        const mark = document.createElement('span');
        mark.className = 'portal-required-mark';
        mark.textContent = '*';
        mark.setAttribute('aria-hidden', 'true');
        label.appendChild(mark);
      }
    });
  };

  const newAppRequiredFieldsFilled = (form) => {
    const required = Array.from(form.querySelectorAll('[required]'));
    return required.length > 0 && required.every((field) => field.checkValidity());
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

  const wireRequiredFieldClearing = (form) => {
    form.querySelectorAll('[required]').forEach((field) => {
      if (field.dataset.portalValidationWired) return;
      field.dataset.portalValidationWired = 'true';
      field.addEventListener('input', () => {
        if (field.checkValidity()) {
          newAppFieldWrapper(field).classList.remove('portal-field-invalid');
        }
        updateNewAppLiveState(form);
      });
    });
  };

  // ---------------------------------------------------------------------
  // Visual-only "upload → autofill → review" framing. No file is read and
  // no data is invented here: the shortcut card just proxies a click to
  // the real, already-working invoice upload button/input so the actual
  // Документы row still does the real work and stays the source of truth;
  // this block only mirrors that row's own status text back to the top of
  // the page.
  // ---------------------------------------------------------------------

  const buildUploadFirstBlock = () => {
    const card = document.createElement('div');
    card.className = 'rounded-xl border bg-card text-card-foreground shadow portal-newapp-upload-first';
    card.innerHTML =
      '<div class="flex flex-col space-y-1.5 p-6">' +
        '<div class="font-semibold tracking-tight text-base">Начните с инвойса</div>' +
        '<p class="text-sm text-muted-foreground">Загрузите инвойс — данные ниже заполнятся автоматически. Останется только проверить.</p>' +
      '</div>' +
      '<div class="p-6 pt-0">' +
        '<button type="button" class="portal-newapp-upload-cta">' +
          '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"></path><path d="m17 8-5-5-5 5"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path></svg>' +
          '<span>Загрузить инвойс</span>' +
        '</button>' +
        '<p class="portal-newapp-upload-status"></p>' +
      '</div>';
    return card;
  };

  const wireUploadFirstShortcut = (block) => {
    const cta = block.querySelector('.portal-newapp-upload-cta');
    if (!cta || cta.dataset.portalWired) return;
    cta.dataset.portalWired = 'true';
    cta.addEventListener('click', () => {
      const realButton = document.querySelector('[data-testid="button-upload-invoice"]');
      if (realButton) realButton.click();
    });
  };

  const updateUploadFirstStatus = () => {
    const statusEl = document.querySelector('.portal-newapp-upload-status');
    const badge = document.querySelector('[data-testid="badge-doc-status-invoice"]');
    if (!statusEl || !badge) return;
    const uploaded = badge.textContent.trim() === 'Загружено';
    setTextIfChanged(statusEl, uploaded ? 'Инвойс загружен — можно проверить данные ниже.' : 'Пока не загружен — поля ниже можно заполнить и вручную.');
    statusEl.classList.toggle('is-done', uploaded);
  };

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

  const updateNewAppMiniSummary = (form) => {
    const dataEl = document.querySelector('.portal-newapp-mini-data');
    const docsEl = document.querySelector('.portal-newapp-mini-docs');
    if (!dataEl || !docsEl) return;
    const dataDone = newAppRequiredFieldsFilled(form);
    setTextIfChanged(dataEl, dataDone ? 'Готово ✓' : 'В процессе');
    dataEl.classList.toggle('is-done', dataDone);
    const docs = newAppDocStatus();
    const requiredDone = docs.requiredTotal - docs.missingRequired.length;
    const docsDone = docs.missingRequired.length === 0;
    setTextIfChanged(
      docsEl,
      requiredDone + ' из ' + docs.requiredTotal + (docs.totalUploaded > requiredDone ? ' (+' + (docs.totalUploaded - requiredDone) + ')' : '')
    );
    docsEl.classList.toggle('is-done', docsDone);
  };

  const updateNewAppLiveState = (form) => {
    updateNewAppProgressCopy();
    updateNewAppMiniSummary(form);
    updateUploadFirstStatus();
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

    const helpCard = document.createElement('div');
    helpCard.className = 'portal-newapp-side-card';
    const helpTitle = document.createElement('h2');
    helpTitle.className = 'portal-newapp-side-title';
    helpTitle.textContent = 'Подсказки';
    helpCard.appendChild(helpTitle);

    const tipsList = document.createElement('ul');
    tipsList.className = 'portal-newapp-tips';
    [
      'Указывайте точную сумму — от неё зависит расчёт ставки.',
      'Название дебитора — как в договоре, это ускорит проверку.',
      'Не хватает документа? Можно приложить его позже, в карточке сделки.',
    ].forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      tipsList.appendChild(li);
    });
    helpCard.appendChild(tipsList);

    const miniSummary = document.createElement('div');
    miniSummary.className = 'portal-newapp-mini-summary';
    miniSummary.innerHTML =
      '<div class="portal-newapp-mini-row"><span>Данные</span><span class="portal-newapp-mini-data">—</span></div>' +
      '<div class="portal-newapp-mini-row"><span>Документы</span><span class="portal-newapp-mini-docs">—</span></div>';
    helpCard.appendChild(miniSummary);
    sidebar.appendChild(helpCard);

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
      // screen is showing, or we navigated elsewhere) — anything we added
      // next to it as a sibling won't get cleaned up by React, so do it
      // ourselves.
      document.querySelectorAll('.portal-newapp-sidebar, .portal-newapp-summary-backdrop').forEach((el) => el.remove());
      // ...including the layout-parent's grid class: leaving it on leaves the
      // sidebar's 280px column reserved with nothing in it, so on the next
      // visit the `!layoutParent.classList.contains(...)` guard below sees
      // the class already there and skips rebuilding the sidebar — the form
      // then lands in that empty first column instead of the wide one next
      // to it, reading as the whole page having shifted left.
      const layoutParent = document.querySelector('.portal-newapp-layout');
      if (layoutParent) layoutParent.classList.remove('portal-newapp-layout');
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
    markRequiredLabels(form);
    wireRequiredFieldClearing(form);
    fixNonSubmitButtonTypes(form);
    groupNewAppDocuments();
    wireNewAppSubmit(form);

    if (!form.querySelector('.portal-newapp-upload-first')) {
      const uploadBlock = buildUploadFirstBlock();
      form.insertBefore(uploadBlock, form.firstElementChild);
      wireUploadFirstShortcut(uploadBlock);
    }
    updateUploadFirstStatus();

    const layoutParent = page.parentElement;
    if (layoutParent && !layoutParent.classList.contains('portal-newapp-layout')) {
      layoutParent.classList.add('portal-newapp-layout');
      layoutParent.insertBefore(buildNewAppSidebar(), page);
    }

    // The sidebar's position:sticky is inert without this: <main> carries
    // Tailwind's overflow-auto, which makes it *a* CSS scroll container
    // regardless of whether it ever actually overflows — and here it never
    // does (its height just grows to fit content), so it never scrolls and
    // sticky has nothing to track. The real scrolling happens on the
    // document itself. Overriding <main>'s overflow to visible only while
    // this page is showing lets sticky bind to that real scroll instead;
    // scoped to this page (and reverted above) so no other route's scroll
    // behavior changes.
    const scrollFixMain = form.closest('main');
    if (scrollFixMain) scrollFixMain.classList.add('portal-newapp-main-scroll-fix');

    updateNewAppLiveState(form);
    return true;
  };

  const run = () => {
    const overviewDone = applyOverviewTheme();
    const newApplicationDone = applyNewApplicationTheme();
    if (!overviewDone && !newApplicationDone) {
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
