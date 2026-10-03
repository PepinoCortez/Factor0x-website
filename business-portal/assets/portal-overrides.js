(function () {
  // ---- Language. English is the default; Russian is what's actually
  // baked into the compiled bundle's own JSX (no i18n system exists there
  // — see the language-switcher comment further down), so getting English
  // requires two different mechanisms depending on who owns the text:
  //   - Everything THIS file writes to the DOM (labels, tooltips, notif
  //     copy, aria-labels) is wrapped in t(ru, en) at the call site below.
  //   - Everything the COMPILED APP renders natively is translated after
  //     the fact by translatePage() (see far below), which runs last in
  //     run() — after every Russian-text-matching selector elsewhere in
  //     this file (OVERDUE_OBLIGOR_RE, DEAL_STATUS_TONE, hideDealTermHeader,
  //     etc.) has already done its own matching against the untranslated
  //     Russian DOM. Translating first would break all of those.
  // Switching languages reloads the page (see ensureLanguageSwitcher)
  // rather than live-updating in place — the native app's own Russian
  // strings only exist freshly per mount, and re-deriving every already-
  // attached tooltip/label in place isn't worth the complexity a toggle
  // that already isn't a hot path doesn't need.
  const LANGUAGE_STORAGE_KEY = 'portalLanguage';

  const getStoredLanguage = () => {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch (error) {
      return null;
    }
  };

  const currentLang = getStoredLanguage() === 'ru' ? 'ru' : 'en';

  // t('русский', 'english') — returns whichever matches currentLang.
  const t = (ru, en) => (currentLang === 'ru' ? ru : en);

  // Two different date recipes render in this app: this file's own custom
  // formatter (pn() in the compiled bundle) uses short abbreviations
  // ("24 июл"), but at least one native spot formats via the browser's own
  // Intl with the 'ru-RU' locale hardcoded (see the one activity-feed
  // timestamp toLocaleDateString call in the compiled bundle), which
  // produces full genitive month names instead ("3 мая"). Both need an
  // entry here since they're never both the same token.
  const RU_MONTH_ABBR_EN = {
    'янв': 'Jan', 'февр': 'Feb', 'март': 'Mar', 'апр': 'Apr', 'май': 'May', 'июн': 'Jun',
    'июл': 'Jul', 'авг': 'Aug', 'сент': 'Sep', 'окт': 'Oct', 'нояб': 'Nov', 'дек': 'Dec',
    'января': 'January', 'февраля': 'February', 'марта': 'March', 'апреля': 'April',
    'мая': 'May', 'июня': 'June', 'июля': 'July', 'августа': 'August',
    'сентября': 'September', 'октября': 'October', 'ноября': 'November', 'декабря': 'December',
  };

  // Small regex rules for the pieces of native bundle text that combine a
  // Russian word with a number the app computed at runtime (a due-date
  // month, "N дн.", a penalty amount) — too dynamic for the exact-string
  // dictionary in translatePage() below, so handled as patterns instead.
  // Reused both by translatePage() (on whole bundle text nodes) and inline,
  // wherever this file itself copies a fragment of native text out of the
  // DOM to reconstruct it elsewhere (e.g. ensureDealCountdownCell).
  //
  // NOTE: \b is ASCII-only in JS regex (word chars = [A-Za-z0-9_]), so it
  // never fires around Cyrillic letters — "\bмай\b" silently matches
  // nothing, ever. The month rule below uses an explicit non-Cyrillic
  // lookaround instead; the plain-word rules just drop \b entirely, safe
  // here since this app's whole Russian vocabulary is known and none of
  // these five words are substrings of any other word actually in it.
  const RU_EN_FRAGMENT_RULES = [
    [
      // Genitive forms (марта, апреля, ...) listed alongside the abbreviations
      // (март, апр, ...) they're prefixed by — safe regardless of which
      // alternative the engine tries first, since the lookahead below
      // rejects a match that leaves trailing Cyrillic letters unconsumed
      // (e.g. "март" matching inside "марта") and backtracks to the next
      // alternative until one actually accounts for the whole word.
      /(^|[^а-яёА-ЯЁ])(января|февраля|марта|апреля|июня|июля|августа|сентября|октября|ноября|декабря|янв|февр|март|апр|май|июн|июл|авг|сент|окт|нояб|дек|мая)(?=[^а-яёА-ЯЁ]|$)\.?/g,
      (m, pre, mo) => pre + (RU_MONTH_ABBR_EN[mo] || mo),
    ],
    [/(\d+(?:[.,]\d+)?)\s*мес\./g, '$1 mo.'],
    [/(\d+)\s*дн\./g, '$1 days'],
    [/%\s*в\s*день/g, '% per day'],
    [/пеня/gi, 'late fee'],
    [/сегодня/gi, 'today'],
    [/просрочено/gi, 'overdue'],
  ];

  // RU -> EN only (translation only ever runs forward — see the note atop
  // the language section on why a switch reloads instead of live-reverting).
  // No-ops entirely in Russian mode, so it's safe to call unconditionally.
  const translateFragment = (text) => {
    if (currentLang !== 'en' || !text) return text;
    return RU_EN_FRAGMENT_RULES.reduce((acc, [re, repl]) => acc.replace(re, repl), text);
  };

  const CURRENCY_SEP = ' ';

  // Splits valueEl's own single text node into a tag + the remaining
  // amount by inserting the tag *before* it and shortening its nodeValue
  // in place, rather than clearing valueEl and appending two fresh nodes
  // (an earlier version did that — clearing via .textContent = '' destroys
  // the original text node React rendered here, and React's fiber still
  // referencing the now-detached node crashes with "NotFoundError: Failed
  // to execute 'removeChild'" once this page unmounts — same root cause as
  // setTextIfChanged's rewrite above, see its comment for the full
  // explanation). Reusing the existing node for the amount half keeps it
  // intact; only the tag is ever a new node.
  const splitCurrencyTag = (valueEl) => {
    if (!valueEl || valueEl.dataset.portalSplit) return;
    const textNode = valueEl.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    const text = textNode.nodeValue || '';
    const idx = text.indexOf(CURRENCY_SEP);
    if (idx === -1) return;
    const currency = text.slice(0, idx);
    const amount = text.slice(idx + 1);
    const tag = document.createElement('span');
    tag.className = 'metric-currency-tag';
    tag.textContent = currency;
    valueEl.insertBefore(tag, textNode);
    textNode.nodeValue = amount;
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
    title.textContent = t('Требует внимания', 'Needs Attention');
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
      action.textContent = t('Загрузить документ', 'Upload document');
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
    title.textContent = t('Ближайшие погашения', 'Upcoming Repayments');
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
      dateEl.textContent = translateFragment(overdue ? r.date + ' · просрочено' : r.date);

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

    // Matched by text content (every other page's entry point below keys
    // off a stable data-testid instead — see the language section up top).
    // React can paint this card's heading a tick before its list — on that
    // tick, translatePage() has no way to know listEl isn't ready yet and
    // translates the heading anyway, so the Russian-only check below would
    // permanently stop matching on every later run() once that happens.
    // Checking both languages makes the match survive regardless of which
    // cycle it lands on.
    const activityCard = Array.from(overviewRoot.children).find((node) => {
      return (
        node instanceof HTMLElement &&
        (node.textContent.includes('Последние события') || node.textContent.includes('Recent Activity')) &&
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
  //
  // In English mode the rail's own text gets rewritten to English by
  // translatePage() the very first time run() completes — and unlike `page`,
  // it never remounts, so it stays English (already translated) on every
  // later run() too. Matching only the Russian original meant this whole
  // lookup — and the hints it locates a home for — worked exactly once, on
  // whichever route happened to load first, and silently returned null (no
  // hints ever inserted again) on every route visited after that. Same
  // reasoning as the dual-language check on the overview activity card
  // above: accept either language's text so this doesn't depend on whether
  // translatePage() has already run yet.
  const GLOBAL_NAV_LABELS = ['Обзор', 'Новая заявка', 'Мои сделки', 'Архив'];

  const includesEitherLang = (text, ruLabel) =>
    text.includes(ruLabel) || text.includes(BUNDLE_RU_EN[ruLabel]);

  const findGlobalNavSidebar = () => {
    const newAppLink = Array.from(document.querySelectorAll('a, button, [role="link"]')).find(
      (el) => {
        const text = el.textContent.trim();
        return text === 'Новая заявка' || text === BUNDLE_RU_EN['Новая заявка'];
      }
    );
    if (!newAppLink) return null;
    let node = newAppLink.parentElement;
    while (node && node !== document.body) {
      const text = node.textContent || '';
      if (GLOBAL_NAV_LABELS.every((label) => includesEitherLang(text, label))) return node;
      node = node.parentElement;
    }
    return null;
  };

  // Proxies to the app's own SPA routing (same trick as the old upload
  // shortcut card): clicking the real nav link gets client-side navigation
  // for free, instead of a full-page window.location reload. `label` is
  // always the Russian original from the call site — same dual-language
  // reasoning as findGlobalNavSidebar just above applies here too (e.g. the
  // "Active Deals" metric card's click-through to "Мои сделки" only ever
  // worked on the first route visited, same underlying bug).
  const findNavLink = (label) =>
    Array.from(document.querySelectorAll('a, button, [role="link"]')).find((el) => {
      const text = el.textContent.trim();
      return text === label || text === BUNDLE_RU_EN[label];
    });

  // The MutationObserver driving run() watches childList/subtree, and
  // `el.textContent = x` always replaces child nodes (even when the text is
  // unchanged) — writing on every tick would retrigger the observer and spin
  // forever. Only touch the DOM when the value actually changed.
  //
  // That replacement is also the reason this crashed React on navigating
  // away from whatever page called it on a native (React-rendered) element:
  // `el.textContent = x` doesn't update the existing text node's value, it
  // DESTROYS it and creates a brand new one, even when el already has
  // exactly one text-node child. React's fiber still holds a reference to
  // the original (now-detached) node; when the page later unmounts, React
  // walks down and tries to remove that stale reference from el, which
  // throws "NotFoundError: Failed to execute 'removeChild'" because it was
  // already replaced (confirmed by intercepting Node.prototype.removeChild
  // during the actual crash: parent was a plain react-rendered <span>, the
  // node being removed a lone text node no longer in it). Setting
  // `.nodeValue` on the *existing* text node instead — the same technique
  // React itself uses to update text — changes what's on screen without
  // touching node identity, so it's safe regardless of who rendered el.
  // Falls back to a plain assignment only when el doesn't have the simple
  // single-text-node shape this rewrite needs (no existing node to mutate,
  // or a currently-empty element, both of which aren't React-tracked text
  // to destroy).
  const setTextIfChanged = (el, value) => {
    if (el.textContent === value) return;
    if (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE) {
      el.firstChild.nodeValue = value;
    } else {
      el.textContent = value;
    }
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
  const NEWAPP_LOCKED_PLACEHOLDER = t('Определится автоматически', 'Determined automatically');

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

  // Plain <input>s (text/date) can't hold a floating icon inside themselves —
  // they're void elements, no children allowed. An earlier version wrapped
  // each field in a new div and moved the field into it (a positioning
  // anchor sized to match, per the CSS comment on .portal-lock-wrap) — that
  // reparenting crashed React on navigating away from this page: unmounting
  // removes each node from the parent React itself rendered it into, and a
  // moved field's actual DOM parent no longer matched that (see
  // groupNewAppDocuments above, which had the identical bug). This field's
  // native parent already holds its <label> too (a "flex flex-col gap-2"
  // stack, confirmed from the live DOM), so it can't just become the
  // position:relative anchor directly — top:50% would center against the
  // whole label+field block, not just the field's own row.
  // Used to position the icon with a one-time JS measurement of the
  // field's offsetTop instead of the bottom-anchored CSS below — that
  // measurement is only as good as the layout at the moment it runs, and
  // baked in whatever the label's height happened to be right then (one
  // line vs. wrapped to two, e.g. "Payment Due Date" squeezed into the
  // narrower of two side-by-side columns on mobile) as a fixed pixel
  // offset from the *top*. Any reflow afterwards (a web font finishing
  // its swap, the label wrapping differently at another width) left it
  // stale with no recheck, since the whole point of the dataset guard is
  // to never touch it again. Anchoring from the *bottom* instead (see
  // .portal-lock-anchor > .portal-lock-icon in portal-overrides.css)
  // sidesteps this entirely: every locked field/trigger this file touches
  // shares the same 38px min-height (.border-input's own rule), and here
  // the field's bottom edge always lines up with the anchor's own bottom
  // edge regardless of how tall the label above it happens to render — so
  // a fixed CSS offset from the bottom stays correct no matter what the
  // label does.
  const NEWAPP_LOCKED_SIBLING_ICON_IDS = ['invoiceAmount', 'obligorName', 'invoiceDate', 'dueDate'];

  const addNewAppLockIcons = (form) => {
    NEWAPP_LOCKED_SIBLING_ICON_IDS.forEach((id) => {
      const field = form.querySelector('#' + id);
      if (!field || field.dataset.portalLockIconAdded) return;
      const anchor = field.parentElement;
      if (!anchor) return;
      field.dataset.portalLockIconAdded = 'true';
      anchor.classList.add('portal-lock-anchor');
      const icon = document.createElement('span');
      icon.className = 'portal-lock-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = NEWAPP_LOCK_ICON_SVG;
      field.insertAdjacentElement('afterend', icon);
    });
  };

  // Валюта / Страна дебитора are <select> triggers. An earlier version
  // appended the lock icon directly into the trigger button on the theory
  // that a real element can safely hold an extra child since React only
  // ever touches the two it renders itself (the value span and the
  // chevron) via its own fiber references. That theory turned out to be
  // wrong in practice: it crashed React on navigating away from this page
  // with the exact same "NotFoundError: Failed to execute 'removeChild'"
  // as groupNewAppDocuments/addNewAppLockIcons above (confirmed by
  // bisecting — disabling only this function was enough to make the
  // crash disappear). Fixed the same way as those: the icon is inserted
  // as a plain new sibling *after* the trigger instead, positioned with a
  // one-time measurement rather than living inside a React-owned node.
  // The chevron itself is still hidden in place (a style-only change, not
  // a structural one — safe, unlike adding/moving a child).
  const NEWAPP_LOCKED_SELECT_IDS = ['currency', 'obligorCountry'];

  const addNewAppSelectLockIcons = (form) => {
    NEWAPP_LOCKED_SELECT_IDS.forEach((id) => {
      const trigger = form.querySelector('#' + id);
      if (!trigger) return;

      // AED / United Arab Emirates are real defaults, not empty placeholders
      // — reads as data already determined, unlike Сумма/Дебитор's honest
      // "Определится автоматически". Overwriting the value span's text (its
      // color already inherits the trigger's own dim placeholder tone — see
      // the [role="combobox"] color rule in portal-overrides.css) makes all
      // locked fields read the same way.
      const valueSpan = trigger.querySelector('span');
      if (valueSpan) setTextIfChanged(valueSpan, NEWAPP_LOCKED_PLACEHOLDER);

      if (trigger.dataset.portalLockIconAdded) return;
      const anchor = trigger.parentElement;
      if (!anchor) return;
      trigger.dataset.portalLockIconAdded = 'true';
      anchor.classList.add('portal-lock-anchor');
      const chevron = trigger.querySelector('.lucide-chevron-down');
      if (chevron) chevron.style.display = 'none';
      const icon = document.createElement('span');
      icon.className = 'portal-lock-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = NEWAPP_LOCK_ICON_SVG;
      trigger.insertAdjacentElement('afterend', icon);
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
    if (label) setTextIfChanged(label, t('Комментарий (необязательно)', 'Comment (optional)'));
    textarea.placeholder = t(
      'Если что-то из данных выше определено неверно — опишите здесь, и мы это учтём',
      "If anything above was picked up incorrectly, describe it here and we'll take it into account"
    );
  };

  // Set by applyNewAppColumnsLayout below (which runs first — see the
  // run() call order) — shared so the two stay in sync regardless of
  // language instead of each hardcoding the string separately.
  const NEWAPP_DATA_HEADING = t('Заявка на финансирование', 'Financing Application');

  const ensureNewAppAutoFillNote = (dataCard) => {
    if (!dataCard || dataCard.querySelector('.portal-newapp-autofill-note')) return;
    const heading = Array.from(dataCard.querySelectorAll('*')).find(
      (el) => el.children.length === 0 && el.textContent.trim() === NEWAPP_DATA_HEADING
    );
    if (!heading) return;
    const note = document.createElement('p');
    note.className = 'portal-newapp-autofill-note';
    // Short label on view; the full explanation (why fields are locked, what
    // triggers the autofill) moves into the "i" tooltip instead of running
    // on in the note itself — buildDealInfoIcon is defined further down this
    // file but already initialized by the time this actually runs (this
    // function is only called from applyNewApplicationTheme via run(), at
    // the very end of the file).
    note.append(t('Поля определяются автоматически.', 'Fields fill in automatically.'));
    note.appendChild(buildDealInfoIcon(
      t(
        'Загрузите документы, и поля заполнятся автоматически из инвойса. Останется только проверить. Пока документы не загружены.',
        "Upload the documents and the fields will fill in automatically from the invoice — you'll just need to check them. No documents uploaded yet."
      )
    ));
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
    newAppDocStatus().rows.forEach(({ key, uploaded }) => {
      const badge = document.querySelector('[data-testid="badge-doc-status-' + key + '"]');
      if (!badge) return;
      if (!uploaded) setTextIfChanged(badge, t('Не загружено', 'Not uploaded'));
    });
  };

  // "Комплектность пакета / Загружено N из M документов" + its progress bar
  // duplicated what the document list right below it already shows row by
  // row — hidden rather than removed (a plain display:none on nodes React
  // still owns is harmless and survives re-renders on its own).
  const hideNewAppPackageProgress = (form) => {
    const label = Array.from(form.querySelectorAll('span')).find(
      (el) => el.children.length === 0 && el.textContent.trim() === 'Комплектность пакета'
    );
    if (!label) return;
    const row = label.parentElement;
    if (!row || row.classList.contains('portal-hidden-package-progress')) return;
    row.classList.add('portal-hidden-package-progress');
    const progressBar = row.nextElementSibling;
    if (progressBar) progressBar.classList.add('portal-hidden-package-progress');
  };

  // Groups the 7 document rows into "needed to start" vs "can wait"
  // sections — WITHOUT reparenting the row elements themselves (an earlier
  // version wrapped each group's rows in its own new div and moved the
  // rows into it). That reparenting crashed React on navigating away from
  // this page: unmounting removes each node from the parent React itself
  // rendered it into, and once a row's actual DOM parent no longer matches
  // that (it's inside this file's wrapper div instead), React's own
  // cleanup throws "NotFoundError: Failed to execute 'removeChild'" and
  // leaves the next page's mount half-done — a blank #root, needing a hard
  // reload to recover. NEWAPP_DOC_ORDER already matches the native render
  // order (confirmed from the compiled component's own document-type
  // array) and happens to list every required doc before every optional
  // one, so the same visual grouping is achievable by just inserting two
  // heading elements as new siblings at the boundary — nothing native
  // ever changes parents.
  const groupNewAppDocuments = () => {
    const firstBadge = document.querySelector('[data-testid="badge-doc-status-invoice"]');
    const firstRow = firstBadge && firstBadge.closest('.flex.flex-col.gap-3');
    if (!firstRow) return;
    const rowsContainer = firstRow.parentElement;
    if (!rowsContainer || rowsContainer.classList.contains('portal-doc-rows-grouped')) return;
    rowsContainer.classList.add('portal-doc-rows-grouped');

    const buildHeading = (title, hint, className) => {
      const heading = document.createElement('div');
      heading.className = 'portal-doc-group-heading ' + className;
      const titleEl = document.createElement('span');
      titleEl.className = 'portal-doc-group-title';
      titleEl.textContent = title;
      const hintEl = document.createElement('span');
      hintEl.className = 'portal-doc-group-hint';
      hintEl.textContent = hint;
      heading.appendChild(titleEl);
      heading.appendChild(hintEl);
      return heading;
    };

    const requiredHeading = buildHeading(
      t('Необходимо для старта', 'Needed to start'),
      t('без этого заявку не отправить', "can't submit without these"),
      'portal-doc-group-required'
    );
    const laterHeading = buildHeading(
      t('Можно догрузить позже', 'Can add later'),
      t('приложите сразу или добавьте потом в карточке сделки', 'attach now, or add later from the deal card'),
      'portal-doc-group-later'
    );

    firstRow.insertAdjacentElement('beforebegin', requiredHeading);

    const firstOptional = NEWAPP_DOC_ORDER.find(({ required }) => !required);
    const firstOptionalBadge =
      firstOptional && document.querySelector('[data-testid="badge-doc-status-' + firstOptional.key + '"]');
    const firstOptionalRow = firstOptionalBadge && firstOptionalBadge.closest('.flex.flex-col.gap-3');
    if (firstOptionalRow) firstOptionalRow.insertAdjacentElement('beforebegin', laterHeading);
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
      parts.push(t('обязательные документы приложены ✓', 'required documents attached ✓'));
    } else {
      parts.push(t('осталось приложить: ', 'still need to attach: ') + docs.missingRequired.join(', '));
    }
    const requiredDone = docs.requiredTotal - docs.missingRequired.length;
    const bonus = docs.totalUploaded - requiredDone;
    if (bonus > 0) {
      parts.push(
        '+' + bonus + ' ' + t(bonus === 1 ? 'доп. документ' : 'доп. документа', bonus === 1 ? 'extra document' : 'extra documents') + ' ' + t('уже приложено', 'already attached')
      );
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
    if (dataHeading) setTextIfChanged(dataHeading, NEWAPP_DATA_HEADING);

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
        tag.textContent = t('Главный документ', 'Primary document');
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
    stepsTitle.textContent = t('Что будет после подачи', 'What happens after you apply');
    stepsCard.appendChild(stepsTitle);

    const stepsList = document.createElement('ol');
    stepsList.className = 'portal-newapp-steps';
    [
      t('Подаёте заявку — данные и документы уходят на проверку.', 'You submit the application — the data and documents go for review.'),
      t('Мы оцениваем риск-профиль сделки и рассчитываем ставку.', "We assess the deal's risk profile and calculate the rate."),
      t('Возвращаемся с предложением по финансированию.', 'We come back with a financing offer.'),
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
        '<div class="portal-newapp-summary-kicker">' + t('Проверьте перед отправкой', 'Review before submitting') + '</div>' +
        '<h3>' + t('Сводка заявки', 'Application summary') + '</h3>' +
        '<dl class="portal-newapp-summary-list">' +
          '<div><dt>' + t('Сумма', 'Amount') + '</dt><dd data-slot="amount">—</dd></div>' +
          '<div><dt>' + t('Дебитор', 'Debtor') + '</dt><dd data-slot="obligor">—</dd></div>' +
          '<div><dt>' + t('Срок оплаты', 'Payment due') + '</dt><dd data-slot="dueDate">—</dd></div>' +
          '<div><dt>' + t('Документы', 'Documents') + '</dt><dd data-slot="docs">—</dd></div>' +
          '<div><dt>' + t('Комментарий', 'Comment') + '</dt><dd data-slot="comment">—</dd></div>' +
        '</dl>' +
        '<div class="portal-newapp-summary-actions">' +
          '<button type="button" class="portal-newapp-summary-back">' + t('Вернуться к правке', 'Back to edit') + '</button>' +
          '<button type="button" class="portal-newapp-summary-confirm">' + t('Отправить', 'Submit') + '</button>' +
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
      ? Number(amount).toLocaleString(t('ru-RU', 'en-US')) + ' ' + currency
      : '—';
    overlay.querySelector('[data-slot="obligor"]').textContent = obligor || '—';
    overlay.querySelector('[data-slot="dueDate"]').textContent = formatNewAppDate(dueDate);
    overlay.querySelector('[data-slot="docs"]').textContent =
      docs.totalUploaded + t(' из ', ' of ') + docs.total + (docs.missingRequired.length ? t(' (не хватает: ', ' (missing: ') + docs.missingRequired.join(', ') + ')' : '');

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
      setTextIfChanged(subtitleEl, t(
        'Загрузите документы — остальные поля определятся автоматически.',
        'Upload the documents — the remaining fields will fill in automatically.'
      ));
    }
    fixNonSubmitButtonTypes(form);
    hideNewAppPackageProgress(form);
    groupNewAppDocuments();
    wireNewAppSubmit(form);

    const dataCard = applyNewAppColumnsLayout(form);
    wireNewAppFieldMuting(dataCard);
    lockNewAppDataFields(form);
    addNewAppLockIcons(form);
    addNewAppSelectLockIcons(form);
    repurposeNewAppComment(form);
    ensureNewAppAutoFillNote(dataCard);

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

  // Every status with a real explainer now gets the same treatment —
  // Дефолт/Просрочка already had a custom hover icon (no native explainer
  // existed for them); Ожидает загрузки документов/Расчёт ставки had a
  // native Radix "i" instead. Unified so hovering (or tapping) the BADGE
  // ITSELF opens the tooltip, not just a separate small icon next to it —
  // see attachDealTooltip below. Text for the native two is copied
  // verbatim from their own description field in P_ in the compiled
  // bundle. Готов к финансированию/Профинансировано stay unexplained,
  // they're self-evident.
  // Keys are matched against the native badge's CURRENT text (still
  // Russian at this point in run() — see the language comment up top), so
  // they stay literal Russian regardless of language. Only the tooltip
  // body values (what the visitor actually reads) are translated.
  const DEAL_STATUS_INFO = {
    'Дефолт': t(
      'Сделка не погашена в установленный срок и переведена в статус дефолта. Пеня продолжает начисляться до полного погашения.',
      'The deal was not repaid by the due date and has been moved to default. Late fees continue to accrue until it is fully repaid.'
    ),
    'Просрочка': t(
      'Срок оплаты по сделке прошёл. Идёт начисление пени — свяжитесь с дебитором или с нами, если нужна помощь.',
      "The deal's payment deadline has passed. Late fees are accruing — contact the debtor or us if you need help."
    ),
    'Ожидает загрузки документов': t(
      'Нужно загрузить документы по сделке, чтобы мы начали проверку.',
      'The deal documents need to be uploaded before we can start reviewing it.'
    ),
    'Расчёт ставки': t(
      'Рассчитывается ставка финансирования: документы получены, идёт оценка и расчёт ставки по сделке.',
      'The financing rate is being calculated: documents received, we are assessing and pricing the deal.'
    ),
  };

  // Native badgeClassName reuses the exact same --status-warning token for
  // both "Просрочка" (a problem) and "Готов к финансированию" (good news) —
  // indistinguishable at a glance despite opposite meaning. Six distinct
  // tones instead, applied via .portal-deal-badge plus one of these below
  // (see CSS) — doesn't touch the shared --status-* vars themselves, just
  // what these six specific labels render as in this one table.
  const DEAL_STATUS_TONE = {
    'Дефолт': 'danger',
    'Просрочка': 'warning',
    'Ожидает загрузки документов': 'neutral',
    'Расчёт ставки': 'info',
    'Готов к финансированию': 'gold',
    'Профинансировано': 'success',
  };

  const applyDealBadgeStyle = (badgeEl) => {
    badgeEl.classList.add('portal-deal-badge');
    const tone = DEAL_STATUS_TONE[badgeEl.textContent.trim()];
    if (tone) badgeEl.classList.add('portal-badge-' + tone);
  };

  // ---- Shared floating tooltip for every explainer in this file (status
  // badges below, plus the New Application autofill note further up) — one
  // node appended straight to <body> and positioned via
  // getBoundingClientRect on open, instead of the old position:absolute
  // child nested inside the trigger. That old approach broke wherever the
  // trigger sat inside a card with overflow:hidden (e.g. .portal-deals-
  // table, needed for its own rounded corners) — the tooltip content got
  // silently clipped at the card's edge instead of just spilling past it.
  // A single reused node also means the trigger itself needs no wrapper
  // element anymore — attachDealTooltip wires the behavior directly onto
  // whatever's passed in (an icon, or a badge on its own).
  const DEAL_FLOATING_TIP_WIDTH = 288;

  let dealFloatingTipEl = null;
  const getDealFloatingTip = () => {
    if (!dealFloatingTipEl) {
      dealFloatingTipEl = document.createElement('div');
      dealFloatingTipEl.className = 'portal-floating-tip';
      document.body.appendChild(dealFloatingTipEl);
    }
    return dealFloatingTipEl;
  };

  const positionDealFloatingTip = (trigger, tip) => {
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    let left = rect.left + rect.width / 2 - DEAL_FLOATING_TIP_WIDTH / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - DEAL_FLOATING_TIP_WIDTH - margin));
    let top = rect.top - tip.offsetHeight - margin;
    if (top < margin) top = rect.bottom + margin;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  };

  const showDealTooltip = (trigger) => {
    const text = trigger.dataset.portalTip;
    if (!text) return;
    const tip = getDealFloatingTip();
    tip.textContent = text;
    tip.classList.add('portal-floating-tip-visible');
    positionDealFloatingTip(trigger, tip);
  };

  const hideDealFloatingTip = () => {
    if (dealFloatingTipEl) dealFloatingTipEl.classList.remove('portal-floating-tip-visible');
  };

  // Which trigger, if any, was opened by a click/tap rather than hover —
  // stays open (ignores mouseleave/blur) until clicked again or dismissed
  // by clicking elsewhere (see ensureDealTooltipOutsideHandler below).
  let dealTipPinnedTrigger = null;

  // Wires hover, keyboard focus, and click/tap to the shared floating tip
  // for one trigger element (an icon span, or a status badge directly —
  // no wrapper needed now that the tip isn't a nested child of it). Click
  // always stops propagation: every trigger this is used on sits inside a
  // row that's itself a Link to the deal's own page, and without this a
  // tap would navigate there instead of just opening the tooltip.
  const attachDealTooltip = (trigger, text) => {
    trigger.dataset.portalTip = text;
    trigger.classList.add('portal-tip-trigger');
    trigger.tabIndex = 0;
    trigger.setAttribute('role', 'button');
    trigger.addEventListener('mouseenter', () => showDealTooltip(trigger));
    trigger.addEventListener('mouseleave', () => {
      if (dealTipPinnedTrigger !== trigger) hideDealFloatingTip();
    });
    trigger.addEventListener('focus', () => showDealTooltip(trigger));
    trigger.addEventListener('blur', () => {
      if (dealTipPinnedTrigger !== trigger) hideDealFloatingTip();
    });
    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      if (dealTipPinnedTrigger === trigger) {
        dealTipPinnedTrigger = null;
        hideDealFloatingTip();
      } else {
        dealTipPinnedTrigger = trigger;
        showDealTooltip(trigger);
      }
    });
  };

  let dealTooltipOutsideWired = false;
  const ensureDealTooltipOutsideHandler = () => {
    if (dealTooltipOutsideWired) return;
    dealTooltipOutsideWired = true;
    document.addEventListener('click', (event) => {
      if (dealTipPinnedTrigger && !dealTipPinnedTrigger.contains(event.target)) {
        dealTipPinnedTrigger = null;
        hideDealFloatingTip();
      }
    });
  };

  // Same "i" glyph used for the New Application autofill note above — kept
  // as an actual icon there since that note has no badge to hover on its
  // own. The Статус column below has no separate icon anymore: the badge
  // itself is the trigger (see attachDealTooltip).
  const DEAL_INFO_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>';

  const buildDealInfoIcon = (text) => {
    const wrap = document.createElement('span');
    wrap.className =
      'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover-elevate active-elevate-2';
    wrap.innerHTML = DEAL_INFO_ICON_SVG;
    wrap.setAttribute('aria-label', t('Пояснение', 'Explanation'));
    attachDealTooltip(wrap, text);
    return wrap;
  };

  // The status badge's own "i" tooltip button (native Radix, for Ожидает
  // загрузки документов/Расчёт ставки) is always its next sibling inside
  // the native "flex shrink-0 items-center gap-1" wrapper (see q_ in the
  // compiled bundle) — Radix only portals the tooltip's *content* into the
  // DOM while open, so this sibling is reliably just the trigger button.
  // Hidden unconditionally (the badge itself becomes the trigger instead,
  // via attachDealTooltip, wherever there's explainer text — nothing added
  // back for Готов к финансированию/Профинансировано, same as before).
  const trimDealStatusInfo = (row) => {
    const badge = row.querySelector('[data-testid^="badge-status-"]');
    if (!badge) return;
    applyDealBadgeStyle(badge);
    if (badge.classList.contains('portal-tip-trigger')) return;
    const infoBtn = badge.nextElementSibling;
    if (infoBtn) infoBtn.style.display = 'none';
    const infoText = DEAL_STATUS_INFO[badge.textContent.trim()];
    if (infoText) attachDealTooltip(badge, infoText);
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

    applyDealBadgeStyle(flagBadge);
    if (!flagBadge.classList.contains('portal-tip-trigger')) {
      const infoText = DEAL_STATUS_INFO[flagBadge.textContent.trim()];
      if (infoText) attachDealTooltip(flagBadge, infoText);
    }
    if (!badgeGroup.dataset.portalFlagSimplified) {
      badgeGroup.dataset.portalFlagSimplified = 'true';
      primaryWrap.style.display = 'none';
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

  // "12 май 2026" -> "12.05.26" — denser, and matches the дд.мм.гггг shape
  // used everywhere else in the portal. Parsed once, here, because
  // parseDealDate only understands the original "D MMM YYYY" text; every
  // other read of this cell's date below reuses the same parsed value
  // instead of re-parsing the now-reformatted text.
  const formatDealDueDateShort = (date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear() % 100).padStart(2, '0');
    return `${dd}.${mm}.${yy}`;
  };

  const ensureDealCountdownCell = (row) => {
    const dueDateCell = row.querySelector(DEAL_DUE_DATE_SELECTOR);
    if (!dueDateCell) return;
    if (dueDateCell.nextElementSibling && dueDateCell.nextElementSibling.classList.contains('portal-deal-countdown')) {
      return;
    }

    const parsedDueDate = parseDealDate(dueDateCell.textContent);
    if (parsedDueDate) {
      setTextIfChanged(dueDateCell, formatDealDueDateShort(parsedDueDate));
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
      daysSpan.textContent = t('просрочено ', 'overdue ') + translateFragment(daysPhrase);
      cell.appendChild(daysSpan);

      if (penaltyPhrase) {
        const penaltySpan = document.createElement('span');
        penaltySpan.className = 'portal-deal-countdown-penalty';
        penaltySpan.textContent = translateFragment(penaltyPhrase);
        cell.appendChild(penaltySpan);
      }
    } else {
      const statusText = badge ? badge.textContent.trim() : '';
      const dueDate = DEAL_COUNTDOWN_DASH_STATUSES.has(statusText) ? null : parsedDueDate;
      if (dueDate) {
        const days = dealDaysUntil(dueDate);
        cell.textContent = days <= 0 ? t('сегодня', 'today') : t(`через ${days} дн.`, `in ${days} days`);
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
    header.textContent = t('Отсчёт', 'Countdown');
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

  // Дебитор (grid column 2) truncates with an ellipsis at narrow widths
  // (see portal-overrides.css) — title= is the plain-HTML fallback for the
  // full name on hover, no Radix/JS tooltip machinery needed since this is
  // just the browser's own native title tooltip.
  const ensureDealObligorTooltip = (row) => {
    const gridRow = row.querySelector(':scope > div');
    const obligorCell = gridRow && gridRow.children[1];
    if (!obligorCell || obligorCell.title) return;
    const name = obligorCell.textContent.trim();
    if (name) obligorCell.title = name;
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
    if (problemCount === 0) return t('Все сделки в порядке', 'All deals are on track');
    const rest = totalCount - problemCount;
    const base =
      currentLang === 'ru'
        ? `${problemCount} ${ruPlural(problemCount, DEAL_WORD_FORMS.deal)} ${ruPlural(problemCount, DEAL_WORD_FORMS.require)} внимания`
        : `${problemCount} ${problemCount === 1 ? 'deal needs' : 'deals need'} attention`;
    return rest > 0 ? base + t(' · остальные в порядке', ' · the rest are on track') : base;
  };

  // Gives the borrower context before the list itself — which may open on a
  // red "Дефолт" row — is the first thing they see. Rendered as a badge on
  // the same line as the page subtitle (row wraps the native <p>, moving it
  // — not replacing it — into a flex row alongside the badge; same
  // "reparent, don't rebuild" rule the rest of this file follows around
  // React-owned nodes, so React keeps its own reference to the <p> and
  // never notices it changed parents).
  const ensureDealsSummaryBar = (pageRoot, problemCount, totalCount) => {
    const headerBlock = pageRoot && pageRoot.firstElementChild;
    const subtitle = headerBlock && headerBlock.querySelector('p');
    if (!subtitle) return;

    let row = subtitle.parentElement;
    if (!row || !row.classList.contains('portal-deals-subtitle-row')) {
      row = document.createElement('div');
      row.className = 'portal-deals-subtitle-row';
      subtitle.insertAdjacentElement('beforebegin', row);
      row.appendChild(subtitle);
    }

    let badge = row.querySelector('.portal-deals-summary');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'portal-deals-summary';
      row.appendChild(badge);
    }

    setTextIfChanged(badge, buildDealsSummaryText(problemCount, totalCount));
    badge.classList.toggle('portal-deals-summary-warning', problemCount > 0);
    badge.classList.toggle('portal-deals-summary-ok', problemCount === 0);
  };

  // ---- Rotate-to-landscape prompt for Мои сделки / Архив ----
  // Same idea as the landing page's own invoice table (rotateHint /
  // openLandscapeModal in main.js): both tables are wide by nature (7-8
  // columns) and only fit a portrait phone by scrolling sideways, which is
  // finicky and easy to miss entirely. Rather than that landing-page
  // implementation's approach (a JS-driven fullscreen overlay it reparents
  // DOM nodes into on 'orientationchange'), this is plain CSS: the hint is
  // inserted once as a plain sibling right before the table card, and which
  // one is visible is entirely driven by the (max-width:960px) portrait/
  // landscape media queries in portal-overrides.css — no JS orientation
  // listener needed, and it can't drift out of sync with the CSS.
  const ensureRotateHint = (anchor, subtitleRu, subtitleEn) => {
    if (!anchor || anchor.previousElementSibling?.classList.contains('portal-rotate-hint')) return;
    const hint = document.createElement('div');
    hint.className = 'portal-rotate-hint';
    hint.innerHTML =
      '<div class="portal-rotate-hint-phone">' +
      '<svg viewBox="0 0 48 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<rect x="2" y="2" width="44" height="76" rx="7" stroke="currentColor" stroke-width="3"/>' +
      '<circle cx="24" cy="68" r="3" fill="currentColor"/>' +
      '<rect x="18" y="8" width="12" height="3" rx="1.5" fill="currentColor" opacity="0.4"/>' +
      '</svg></div>' +
      '<p class="portal-rotate-hint-text"></p>' +
      '<p class="portal-rotate-hint-sub"></p>';
    hint.querySelector('.portal-rotate-hint-text').textContent = t('Переверните телефон горизонтально', 'Rotate your phone to landscape');
    hint.querySelector('.portal-rotate-hint-sub').textContent = t(subtitleRu, subtitleEn);
    anchor.parentElement.insertBefore(hint, anchor);
  };

  const applyDealsTheme = () => {
    const list = document.querySelector('[data-testid="list-deals"]');
    if (!list) return false;

    const tableWrap = list.parentElement;
    if (!tableWrap) return false;

    ensureDealTooltipOutsideHandler();

    // The page root is shared markup with Обзор (same "mx-auto max-w-5xl"
    // combo, which is why applyOverviewTheme's own generic selector also
    // tags it "portal-overview-page" harmlessly) — this class is the
    // deals-page-specific hook for widening just this page (see CSS).
    const overflowWrap = tableWrap.parentElement;
    const pageRoot = overflowWrap && overflowWrap.parentElement;
    if (pageRoot) pageRoot.classList.add('portal-deals-page');

    tableWrap.classList.add('portal-deals-table');
    list.classList.add('portal-deals-list');
    ensureRotateHint(
      tableWrap,
      'Таблица сделок лучше смотрится в альбомном режиме',
      'The deals table fits better in landscape mode'
    );
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
      ensureDealObligorTooltip(row);
      tagDealRowSeverity(row);
    });
    ensureDealsSummaryBar(pageRoot, problemCount, rows.length);

    return true;
  };

  // Архив is a real native <table> (shadcn Table primitives), not Мои
  // сделки's CSS-grid div cards — same visual recipe, different selectors
  // (there's no shared markup to hook a single class onto both). Now
  // brought to an identical look column-width-for-column-width where the
  // two tables share a column (ID/Дебитор/Сумма/Ставка — see the widths in
  // portal-overrides.css); Архив's own extra columns (Комиссия/Вы
  // получили/Дни просрочки/Пеня/Дата закрытия) render in the same style
  // but obviously have no Мои сделки equivalent to copy a width from.
  //
  // Column indices below (row.children, 0-based): 0 chevron, 1 ID,
  // 2 Дебитор, 3 Сумма, 4 Ставка, 5 Срок, 6 Комиссия, 7 Вы получили,
  // 8 Дни просрочки, 9 Пеня, 10 Статус, 11 Дата закрытия.
  const ensureArchiveRowFormatted = (row) => {
    if (row.dataset.portalArchiveFormatted) return;
    row.dataset.portalArchiveFormatted = 'true';

    // Срок: "180 days" -> "180 дн." — the only column left with a raw
    // English literal (hardcoded in the compiled component, not from a
    // shared formatter), out of place next to eleven Russian-labeled ones.
    // In English mode it's already the right language — left untouched.
    if (currentLang === 'ru') {
      const termCell = row.children[5];
      if (termCell) {
        const match = termCell.textContent.trim().match(/^(\d+)\s*days$/);
        if (match) setTextIfChanged(termCell, `${match[1]} дн.`);
      }
    }

    // Дата закрытия: same "12 май 2026" -> "12.05.26" reformat as Мои
    // сделки's Погашение column, reusing the same parse/format helpers —
    // it's the same pn()-produced text shape, just a different column.
    const dateCell = row.children[row.children.length - 1];
    if (dateCell) {
      const date = parseDealDate(dateCell.textContent);
      if (date) setTextIfChanged(dateCell, formatDealDueDateShort(date));
    }

    // Дебитор (column 2): 310px comfortably fits most names on one line,
    // but not an extreme one like "Carrefour UAE (Majid Al Futtaim
    // Hypermarkets LLC)" — same ellipsis + title= hover fallback as Мои
    // сделки's own Дебитор column (see ensureDealObligorTooltip), so a
    // name that doesn't fit degrades the exact same way in both tables.
    const obligorCell = row.children[2];
    if (obligorCell) {
      const name = obligorCell.textContent.trim();
      if (name) obligorCell.title = name;
    }

    // Статус (column 10): the only label that ever renders here is
    // "Погашена" (hardcoded in the compiled component — even a deal that
    // was once overdue closes as "Погашена", Дни просрочки/Пеня are what
    // carry that history), so this can reuse Мои сделки's own success
    // tone directly instead of duplicating the tone system for one label.
    const statusCell = row.children[10];
    const statusBadge = statusCell && statusCell.firstElementChild;
    if (statusBadge) {
      statusBadge.classList.add('portal-deal-badge', 'portal-badge-success');
    }

    // "Дни просрочки" (column 8, hidden — see CSS) reads "—" for a deal
    // that was never overdue, "N дн." otherwise; still a real cell here,
    // just not shown as its own column anymore. Was overdue: warm row
    // tint (Мои сделки's own .portal-deal-row-warning, a plain unscoped
    // rule — applies to a <tr> here exactly like it does to that table's
    // row divs) — full days/rate/amount are one click away in "Была
    // просрочка платежа".
    const overdueCell = row.children[8];
    if (overdueCell && overdueCell.textContent.trim() !== '—') {
      row.classList.add('portal-deal-row-warning');
    }
  };

  // 1400px — 8% wider than .portal-deals-page's 1296px (see the CSS rule
  // for why; the two pages no longer share a width on purpose).
  const ensureArchivePageWidened = (card) => {
    const pageRoot = card.parentElement;
    if (pageRoot) pageRoot.classList.add('portal-archive-page');
  };

  const applyArchiveTheme = () => {
    const table = document.querySelector('[data-testid="table-archive"]');
    if (!table) return false;

    const card = table.closest('.bg-card');
    if (card) {
      card.classList.add('portal-archive-table');
      ensureArchivePageWidened(card);
      ensureRotateHint(
        card,
        'Таблица архива лучше смотрится в альбомном режиме',
        'The archive table fits better in landscape mode'
      );
    }

    table.querySelectorAll('[data-testid^="row-archive-"]').forEach(ensureArchiveRowFormatted);

    // Expanding a row (chevron click) renders "Была просрочка платежа" with
    // the same native bg-status-warning-bg token as the deal detail page's
    // own overdue banner — same pale-on-dark bug, same fix (see
    // ensureDealDetailFlagBanner above; reused directly, no danger variant
    // exists here since Архив has no equivalent to a "Дефолт" flag).
    table.querySelectorAll('[class*="bg-status-warning-bg"]').forEach((banner) => {
      banner.classList.add('portal-deal-detail-flag', 'portal-deal-detail-flag-warning');
    });

    return true;
  };

  // Deal detail page ("Мои сделки" -> a row): its 4 cards (Статус сделки /
  // Расчёт финансирования / Ключевые даты / Документы по сделке) use the
  // native, plain bg-card background — the one place left with a visibly
  // different container color from the table it was opened out of, or from
  // Обзор's own cards. No data-testid on the Cards themselves, so this
  // walks up from the one stable testid on the page (the deal's own ID
  // heading) to the page root, then grabs every direct child that's an
  // actual Card (bg-card) — skips the header block and the submitted/
  // overdue banners above them, neither of which carries that class.
  const ensureDealDetailCardsThemed = (pageRoot) => {
    pageRoot.querySelectorAll(':scope > .bg-card').forEach((card) => {
      card.classList.add('portal-deal-detail-card');
    });
  };

  // The overdue/default banner reuses the native --status-warning-bg/
  // --status-danger-bg tokens directly (bg-status-warning-bg /
  // bg-status-danger-bg) — those are pale, ~94% lightness light-mode
  // colors with no dark-theme override anywhere in the compiled app (the
  // same root cause behind the Статус badges a few rounds back), and read
  // as a near-white box on this dark page. Recolored to this file's own
  // dark-safe --warning-bg/--danger-bg instead — same tones already used
  // for row severity tints elsewhere.
  const ensureDealDetailFlagBanner = (pageRoot) => {
    const banner = pageRoot.querySelector('[class*="bg-status-warning-bg"], [class*="bg-status-danger-bg"]');
    if (!banner || banner.classList.contains('portal-deal-detail-flag')) return;
    const isDanger = banner.className.includes('bg-status-danger-bg');
    banner.classList.add('portal-deal-detail-flag', isDanger ? 'portal-deal-detail-flag-danger' : 'portal-deal-detail-flag-warning');
  };

  const applyDealDetailTheme = () => {
    const idEl = document.querySelector('[data-testid="text-deal-detail-id"]');
    if (!idEl) return false;
    const pageRoot = idEl.closest('.mx-auto.flex.max-w-3xl.flex-col.gap-6');
    if (!pageRoot) return false;

    ensureDealDetailCardsThemed(pageRoot);
    ensureDealDetailFlagBanner(pageRoot);

    return true;
  };

  // Notification bell, added to the persistent header next to the user
  // menu — no such feature exists anywhere in the compiled app (no
  // backend for it either), so this is a self-contained, purely front-end
  // mock: a fixed list below, one item marked unread, badge disappears
  // once the panel's been opened. Same lucide-style stroke recipe as the
  // rest of this file's hand-built icons (see DEAL_INFO_ICON_SVG).
  const NOTIF_BELL_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>';

  // Language switcher, matching the marketing site's own .language-select
  // (see index.html/style.css) — same pure-CSS globe glyph (a circle plus
  // a vertical bar and a horizontal band via ::before/::after, no SVG
  // there either). The dropdown panel itself is this portal's own dark
  // recipe instead of the landing page's light one — that page has no
  // dark theme to match, this one does. English is the default; picking a
  // different language saves it and reloads (see setLanguage below) rather
  // than live-translating in place — see the language section up top for
  // why.
  const setLanguage = (lang) => {
    if (lang === currentLang) return;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (error) {
      // Private-browsing/storage-disabled — reloading would just lose the
      // choice immediately, so there's nothing useful to do here.
    }
    location.reload();
  };

  let langMenuEl = null;

  const closeLangMenu = () => {
    if (langMenuEl) langMenuEl.classList.remove('portal-lang-open');
  };

  const ensureLangOutsideHandler = () => {
    document.addEventListener('click', (event) => {
      if (langMenuEl && !langMenuEl.closest('.portal-lang-select').contains(event.target)) {
        closeLangMenu();
      }
    });
  };

  const ensureLanguageSwitcher = (group, beforeEl) => {
    if (group.querySelector('.portal-lang-select')) return;

    const wrap = document.createElement('div');
    wrap.className = 'portal-lang-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'portal-lang-trigger';
    trigger.setAttribute('aria-label', t('Выбрать язык', 'Choose language'));
    trigger.setAttribute('aria-expanded', 'false');
    const glyph = document.createElement('span');
    glyph.setAttribute('aria-hidden', 'true');
    trigger.appendChild(glyph);
    wrap.appendChild(trigger);

    const menu = document.createElement('div');
    menu.className = 'portal-lang-menu';
    langMenuEl = menu;

    const options = [
      { lang: 'en', label: 'ENG' },
      { lang: 'ru', label: 'РУС' },
    ].map(({ lang, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.className = 'portal-lang-option' + (lang === currentLang ? ' portal-lang-option-active' : '');
      btn.dataset.lang = lang;
      return btn;
    });
    options.forEach((btn) => menu.appendChild(btn));
    wrap.appendChild(menu);

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = menu.classList.toggle('portal-lang-open');
      trigger.setAttribute('aria-expanded', String(open));
    });

    options.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        closeLangMenu();
        trigger.setAttribute('aria-expanded', 'false');
        setLanguage(btn.dataset.lang);
      });
    });

    group.insertBefore(wrap, beforeEl);
    ensureLangOutsideHandler();
  };

  // Light/dark theme toggle. Flips .portal-light-theme on <html>, which is
  // what every neutral-surface token in portal-overrides.css (--ov-*, plus
  // the --background/--card/--popover/etc. this file forces dark up top)
  // resolves through — see that class in portal-overrides.css for the full
  // light palette. Saved to localStorage so it survives a reload; inline
  // class on documentElement itself already survives SPA navigation
  // without any of this, since the document never reloads between routes.
  const SUN_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>';
  const MOON_ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';
  const THEME_MODE_STORAGE_KEY = 'portalThemeMode';

  let themeToggleTrigger = null;

  const currentThemeMode = () => (document.documentElement.classList.contains('portal-light-theme') ? 'light' : 'dark');

  const applyThemeMode = (mode) => {
    document.documentElement.classList.toggle('portal-light-theme', mode === 'light');
    if (themeToggleTrigger) {
      themeToggleTrigger.innerHTML = mode === 'light' ? MOON_ICON_SVG : SUN_ICON_SVG;
      const label = mode === 'light' ? t('Тёмная тема', 'Dark theme') : t('Светлая тема', 'Light theme');
      themeToggleTrigger.title = label;
      themeToggleTrigger.setAttribute('aria-label', label);
    }
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    } catch (error) {
      // Private-browsing/storage-disabled — the toggle still works for
      // the rest of this session, it just won't survive a reload.
    }
  };

  // Runs once, immediately (not gated behind the header even existing yet)
  // — the class has to be set before the very first paint, or dark-mode
  // visitors get a flash of the (default) light theme first.
  const restoreThemeMode = () => {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    } catch (error) {
      return;
    }
    if (saved === 'light') document.documentElement.classList.add('portal-light-theme');
  };
  restoreThemeMode();

  const ensureThemeToggle = (group, beforeEl) => {
    if (group.querySelector('.portal-theme-trigger')) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'portal-theme-trigger';
    themeToggleTrigger = trigger;

    trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      applyThemeMode(currentThemeMode() === 'light' ? 'dark' : 'light');
    });

    group.insertBefore(trigger, beforeEl);
    applyThemeMode(currentThemeMode());
  };

  // Standing in for a real activity feed (see "Последние события" on
  // Обзор, list-activity — that one's populated from an API this mock
  // doesn't have access to). Same tone/shape as that feed's own items:
  // one line of what happened, one relative timestamp.
  const NOTIF_ITEMS = [
    {
      text: t('Ставка рассчитана для DEAL-0011 — 5.2% в месяц.', 'Rate calculated for DEAL-0011 — 5.2% per month.'),
      time: t('5 минут назад', '5 minutes ago'),
      unread: true,
    },
    {
      text: t(
        'DEAL-0014 просрочена на 12 дн. — начислена пеня AED 1,536.',
        'DEAL-0014 is 12 days overdue — a late fee of AED 1,536 has accrued.'
      ),
      time: t('Вчера', 'Yesterday'),
    },
    {
      text: t(
        'DEAL-0013 профинансирована — AED 410,000 отправлены на ваш счёт.',
        'DEAL-0013 has been financed — AED 410,000 has been sent to your account.'
      ),
      time: t('3 дня назад', '3 days ago'),
    },
    {
      text: t('Документы по DEAL-0015 получены, начата проверка.', 'Documents for DEAL-0015 received, review has started.'),
      time: t('5 дней назад', '5 days ago'),
    },
  ];

  let notifPanelEl = null;
  let notifBadgeEl = null;

  const closeNotifPanel = () => {
    if (notifPanelEl) notifPanelEl.remove();
    notifPanelEl = null;
  };

  const positionNotifPanel = (bellBtn, panel) => {
    const rect = bellBtn.getBoundingClientRect();
    const margin = 8;
    const width = 320;
    let left = rect.right - width;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    panel.style.left = left + 'px';
    panel.style.top = rect.bottom + margin + 'px';
  };

  const openNotifPanel = (bellBtn) => {
    const panel = document.createElement('div');
    panel.className = 'portal-notif-panel';

    const header = document.createElement('div');
    header.className = 'portal-notif-panel-header';
    header.textContent = t('Уведомления', 'Notifications');
    panel.appendChild(header);

    const list = document.createElement('div');
    list.className = 'portal-notif-panel-list';
    NOTIF_ITEMS.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'portal-notif-item' + (item.unread ? ' portal-notif-item-unread' : '');
      const text = document.createElement('p');
      text.className = 'portal-notif-item-text';
      text.textContent = item.text;
      const time = document.createElement('p');
      time.className = 'portal-notif-item-time';
      time.textContent = item.time;
      row.appendChild(text);
      row.appendChild(time);
      list.appendChild(row);
    });
    panel.appendChild(list);

    document.body.appendChild(panel);
    positionNotifPanel(bellBtn, panel);
    notifPanelEl = panel;

    if (notifBadgeEl) notifBadgeEl.classList.add('portal-notif-badge-hidden');
  };

  let notifOutsideWired = false;
  const ensureNotifOutsideHandler = () => {
    if (notifOutsideWired) return;
    notifOutsideWired = true;
    document.addEventListener('click', (event) => {
      if (notifPanelEl && !notifPanelEl.contains(event.target) && !event.target.closest('.portal-notif-bell')) {
        closeNotifPanel();
      }
    });
  };

  // The dropdown-menu wrapper around the avatar (Radix DropdownMenu.Root)
  // renders no DOM node of its own, and its trigger (asChild) doesn't
  // either — button-user-menu is a direct child of <header>, matching
  // that header's own "justify-between" two-item layout exactly. Adding
  // the bell as a third direct child would put it in the middle of the
  // free space instead of snug against the avatar, so this wraps both in
  // one new flex group and drops that group where the avatar button used
  // to be — header still only ever sees two children.
  const ensureNotificationBell = () => {
    const userMenuBtn = document.querySelector('[data-testid="button-user-menu"]');
    if (!userMenuBtn || userMenuBtn.closest('.portal-notif-group')) return false;

    const group = document.createElement('div');
    group.className = 'portal-notif-group';
    userMenuBtn.insertAdjacentElement('beforebegin', group);
    group.appendChild(userMenuBtn);

    const bellBtn = document.createElement('button');
    bellBtn.type = 'button';
    bellBtn.className = 'portal-notif-bell';
    bellBtn.setAttribute('aria-label', t('Уведомления', 'Notifications'));
    bellBtn.innerHTML = NOTIF_BELL_ICON_SVG;

    const badge = document.createElement('span');
    badge.className = 'portal-notif-badge';
    badge.textContent = String(NOTIF_ITEMS.filter((item) => item.unread).length);
    bellBtn.appendChild(badge);
    notifBadgeEl = badge;

    group.insertAdjacentElement('afterbegin', bellBtn);
    ensureLanguageSwitcher(group, bellBtn);
    ensureThemeToggle(group, bellBtn);

    bellBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (notifPanelEl) {
        closeNotifPanel();
      } else {
        openNotifPanel(bellBtn);
      }
    });

    ensureNotifOutsideHandler();
    return true;
  };

  // ---- Translation of the compiled app's own native (Russian) output.
  // Exact-string dictionary, checked against a text node's *full* value —
  // covers every static label/sentence the bundle renders. Dynamic bits
  // (dates, "N дн.", a debtor's name mixed into a sentence) aren't safe to
  // match exactly, so those fall through to REGEX_ONLY below instead.
  const BUNDLE_RU_EN = {
    // Nav / shell
    'Обзор': 'Overview',
    'Новая заявка': 'New Application',
    'Мои сделки': 'My Deals',
    'Архив': 'Archive',
    'Профиль компании': 'Company Profile',
    'Настройки': 'Settings',
    'Выйти': 'Log Out',
    'К обзору': 'Back to Overview',
    // Overview page
    'Сводка по вашим заявкам и сделкам': 'Summary of your applications and deals',
    'Всего профинансировано': 'Total Financed',
    'Заявок на рассмотрении': 'Applications Under Review',
    'Активных сделок': 'Active Deals',
    'Ближайшее погашение': 'Next Repayment',
    'Подать новую заявку': 'Submit New Application',
    'Последние события': 'Recent Activity',
    'Нет': 'None',
    'У вас пока нет активных сделок.': "You don't have any active deals yet.",
    'У вас пока нет завершённых сделок.': "You don't have any completed deals yet.",
    'Ваши активные сделки — включая те, где ещё не наступило погашение': 'Your active deals — including those not yet due for repayment',
    'Ваши завершённые сделки, условия и соглашения': 'Your completed deals, terms, and agreements',
    'Загрузите акт приёмки по заявке №0012': 'Upload the acceptance certificate for application #0012',
    'Ваша заявка №0015 подана и ожидает рассмотрения': 'Your application #0015 has been submitted and is awaiting review',
    'Ваша заявка №0012 одобрена': 'Your application #0012 has been approved',
    'Сделка №0013 профинансирована': 'Deal #0013 has been financed',
    'Ваш дебитор Spinneys Dubai LLC просрочил оплату по сделке №0014': 'Your debtor Spinneys Dubai LLC is overdue on payment for deal #0014',
    'Ваш дебитор Lulu Group International оплатил инвойс по сделке №0009': 'Your debtor Lulu Group International paid the invoice for deal #0009',
    'Заявка отправлена': 'Application Submitted',
    'Заявка подана': 'Submitted',
    'На проверке': 'Under Review',
    'Одобрена': 'Approved',
    'Отправка…': 'Submitting…',
    // New Application
    'Загрузите документы — остальные поля определятся автоматически.': 'Upload the documents — the remaining fields will fill in automatically.',
    'Заявка на финансирование': 'Financing Application',
    'Данные по инвойсу': 'Invoice Data',
    'Документы': 'Documents',
    'Документы по сделке': 'Deal Documents',
    'Документы сделки': 'Deal Documents',
    'Демо-документ': 'Demo Document',
    'Инвойс': 'Invoice',
    'Контракт': 'Contract',
    'Заказ на поставку (PO)': 'Purchase Order (PO)',
    'Коносамент (B/L)': 'Bill of Lading (B/L)',
    'Акт приёмки': 'Acceptance Certificate',
    'Подписанное соглашение о факторинге': 'Signed Factoring Agreement',
    'Подтверждение долга дебитором': 'Debt Confirmation by Debtor',
    'Комплектность пакета': 'Package Completeness',
    'Загружено': 'Uploaded',
    'Загружено ': 'Uploaded ',
    ' из ': ' of ',
    ' документов': ' documents',
    'Нужно загрузить': 'Needs upload',
    'Валюта': 'Currency',
    'Дебитор / должник (название компании)': 'Debtor (company name)',
    'Дебитор': 'Debtor',
    'Дата выставления инвойса': 'Invoice Date',
    'Дата инвойса': 'Invoice Date',
    'Срок оплаты': 'Payment Due Date',
    'Страна дебитора': "Debtor's Country",
    'Сумма инвойса': 'Invoice Amount',
    'Сумма инвойса ': 'Invoice Amount ',
    'Краткое описание товаров/услуг': 'Brief description of goods/services',
    'Например, Carrefour UAE': 'e.g., Carrefour UAE',
    'Например, поставка бакалейной продукции для сети супермаркетов': 'e.g., delivery of grocery products for a supermarket chain',
    'Подайте инвойс на финансирование': 'Submit an invoice for financing',
    'Профиль компании': 'Company Profile',
    'Загрузить': 'Upload',
    'Заменить': 'Replace',
    'Приложите пакет документов сразу при подаче — или догрузите позже, в карточке этой сделки.':
      'Attach the document package right away, or add it later from the deal card.',
    'дд.мм.гггг': 'dd.mm.yyyy',
    // Deals / Archive / status
    'Дефолт': 'Default',
    'Просрочка': 'Overdue',
    'Погашена': 'Repaid',
    'Погашена дебитором': 'Repaid by Debtor',
    'Погашение': 'Repayment',
    'Профинансирована': 'Financed',
    'Профинансировано': 'Financed',
    'Готов к финансированию': 'Ready for Financing',
    'Ожидает загрузки документов': 'Awaiting Documents',
    'Расчёт ставки': 'Rate Calculation',
    'Расчёт финансирования': 'Financing Calculation',
    'Расчёт': 'Calculation',
    'Срок': 'Term',
    'Статус сделки': 'Deal Status',
    'Статус': 'Status',
    'Ключевые даты': 'Key Dates',
    'Дефолт по обязательству вашего дебитора': "Default on your debtor's obligation",
    'Дата закрытия сделки': 'Deal Closing Date',
    'Дата закрытия': 'Closing Date',
    'Дата получения транша': 'Disbursement Date',
    'Дата создания заявки': 'Application Creation Date',
    'Даты сделки': 'Deal Dates',
    'Условия оплаты': 'Payment Terms',
    'Полные условия сделки': 'Full Deal Terms',
    'Комиссия': 'Fee',
    'Ставка/мес': 'Rate/mo',
    'Ставка пени': 'Late Fee Rate',
    'Была просрочка платежа': 'There was a late payment',
    'Дней просрочки': 'Days Overdue',
    'Дни просрочки': 'Days Overdue',
    'Начислено': 'Accrued',
    'Пеня за просрочку': 'Late Payment Fee',
    'Как рассчитано': "How it's calculated",
    'Месячная ставка по вашему риск-профилю.': 'Monthly rate based on your risk profile.',
    'Ставка рассчитывается по вашему риск-профилю.': 'The rate is calculated based on your risk profile.',
    'Сделка одобрена, ставка определена, ожидается выплата финансирования.': 'The deal is approved, the rate is set, and disbursement is pending.',
    'Рассчитывается ставка финансирования: документы получены, идёт оценка и расчёт ставки по сделке.': 'The financing rate is being calculated: documents received, we are assessing and pricing the deal.',
    'Нужно загрузить документы по сделке, чтобы мы начали проверку.': 'The deal documents need to be uploaded before we can start reviewing it.',
    'Загрузите документы по сделке, чтобы мы начали проверку.': 'Upload the deal documents so we can start reviewing.',
    'Средства выплачены заёмщику; ожидается оплата инвойса дебитором.': 'Funds have been disbursed to the borrower; awaiting invoice payment from the debtor.',
    'Сделка не найдена.': 'Deal not found.',
    'Отправить': 'Submit',
    'Перейти к документам': 'Go to Documents',
    'Перейти к моим сделкам': 'Go to My Deals',
    // Rate/fee explainer tooltips — fragments (see the "Комиссия"/"Ставка/мес"/
    // "Вы получили" dt tooltips in the compiled bundle: each is a run of
    // sibling text nodes around interpolated numbers, so each fragment
    // below is its own isolated node rather than a full sentence).
    'Это ставка ': 'This is the ',
    'за один месяц': 'monthly rate',
    ' финансирования — не итоговая комиссия по сделке. Назначена по вашему риск-профилю:': ' for financing — not the total fee for the deal. Set according to your risk profile:',
    ' в месяц.': ' per month.',
    'Это ': 'This is ',
    'итоговая комиссия за весь срок': 'total fee for the entire term',
    ' сделки (': ' of the deal (',
    ' дней = ': ' days = ',
    '), а не месячная ставка: ': '), not a monthly rate: ',
    '/мес ×': '/mo ×',
    'Вы получили': 'You Received',
    '− комиссия ': '− fee ',
    '− комиссия': '− fee',
    ', выплачено одним траншем.': ', paid out in one lump sum.',
    '% в день': '% per day',
    // Seed/demo deal descriptions
    'Поставка бакалейной продукции для сети супермаркетов, июльская партия.': 'Grocery supply for a supermarket chain, July batch.',
    'Поставка бытовой техники в сеть гипермаркетов.': 'Home appliance supply to a hypermarket chain.',
    'Поставка бытовой химии, новогодняя партия.': 'Household chemicals supply, New Year batch.',
    'Поставка бытовой химии, регулярный ежемесячный заказ.': 'Household chemicals supply, regular monthly order.',
    'Поставка кондитерских изделий, партия за март.': 'Confectionery supply, March batch.',
    'Поставка промышленного оборудования и запасных частей.': 'Industrial equipment and spare parts supply.',
    'Поставка свежих продуктов, партия за июнь.': 'Fresh produce supply, June batch.',
    'Поставка строительных материалов по контракту на реконструкцию склада.': 'Construction materials supply under a warehouse renovation contract.',
    'Поставка строительных материалов, зимняя партия.': 'Construction materials supply, winter batch.',
  };

  // Whole-string regexes for bundle text that's a template literal baked
  // into ONE text node with a dynamic number inside it (so no fixed exact
  // string exists to put in the dictionary above).
  const BUNDLE_RU_EN_PATTERNS = [
    [/^Ваша заявка №(\d+) подана и ожидает рассмотрения$/, (_, id) => `Your application #${id} has been submitted and is awaiting review`],
    [/^Ваша заявка №(\d+) одобрена$/, (_, id) => `Your application #${id} has been approved`],
    [/^Сделка №(\d+) профинансирована$/, (_, id) => `Deal #${id} has been financed`],
    [
      /^Просрочка платежа со стороны вашего дебитора — платёж ожидался (.+)$/,
      (_, date) => `Payment from your debtor is overdue — payment was expected ${translateFragment(date)}`,
    ],
  ];

  // Walks every text node under <body> and, in English mode, swaps in the
  // translation for any exact dictionary match, whole-string pattern
  // match, or (as a last resort) the RU_EN_FRAGMENT_RULES substitutions
  // already used inline elsewhere in this file (month names, "N дн.", "N
  // мес.", "% в день") — covers the rare native text node this dictionary
  // doesn't have an exact entry for. Runs last in run(), after every
  // Russian-text-matching function above has already matched against the
  // untranslated DOM — see the language section up top for why the order
  // matters. Idempotent: already-English text matches nothing here, so
  // repeat calls (the MutationObserver fires again from this function's
  // own edits) settle after one extra no-op pass.
  const translatePage = () => {
    if (currentLang !== 'en') return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parentTag = node.parentElement && node.parentElement.tagName;
        if (parentTag === 'SCRIPT' || parentTag === 'STYLE') return NodeFilter.FILTER_REJECT;
        return node.nodeValue && /[а-яёА-ЯЁ]/.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach((n) => {
      const raw = n.nodeValue;
      if (Object.prototype.hasOwnProperty.call(BUNDLE_RU_EN, raw)) {
        n.nodeValue = BUNDLE_RU_EN[raw];
        return;
      }
      const trimmed = raw.trim();
      if (Object.prototype.hasOwnProperty.call(BUNDLE_RU_EN, trimmed)) {
        n.nodeValue = raw.replace(trimmed, BUNDLE_RU_EN[trimmed]);
        return;
      }
      for (const [re, fn] of BUNDLE_RU_EN_PATTERNS) {
        if (re.test(trimmed)) {
          n.nodeValue = raw.replace(trimmed, trimmed.replace(re, fn));
          return;
        }
      }
      const fragmented = translateFragment(raw);
      if (fragmented !== raw) n.nodeValue = fragmented;
    });

    // placeholder is an attribute, not a text node — invisible to the
    // TreeWalker above (e.g. the locked date fields' native "дд.мм.гггг",
    // or the two free-text fields' "Например, ..." hints).
    document.querySelectorAll('[placeholder]').forEach((el) => {
      const ph = el.getAttribute('placeholder');
      if (ph && Object.prototype.hasOwnProperty.call(BUNDLE_RU_EN, ph)) {
        el.setAttribute('placeholder', BUNDLE_RU_EN[ph]);
      }
    });
  };

  // ---- Mobile nav drawer: close automatically ----
  // shadcn's Sidebar doesn't do either of these on its own. There's no
  // direct handle on the Sheet's own React open/close state from outside,
  // so both cases below close it the same way a real user pressing Escape
  // would: dispatching that keydown is what Radix's own Dialog/Sheet
  // listens for.
  const closeMobileSidebar = () => {
    if (!document.querySelector('[data-slot="sidebar"].fixed[data-state="open"]')) return;
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true,
    }));
  };

  // 1) Tapping a nav link — clicking "Мои сделки" / "My Deals" navigates to
  // the new page but leaves the Sheet sitting open on top of it until the
  // user separately taps the backdrop. Delegated on document and
  // registered once here (menu buttons remount on every route change, a
  // listener bound to the link itself wouldn't survive that). Deferred a
  // tick so it can't fight the same click's own routing logic.
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-slot="sidebar-menu-button"]')) return;
    window.setTimeout(closeMobileSidebar, 0);
  });

  // 2) Rotating the phone — a portrait phone narrow enough to still be
  // "mobile" (< the md breakpoint) after rotating to landscape (e.g. an
  // iPhone SE: 375 portrait -> 667 landscape, both under 768) keeps
  // rendering the same Sheet-based drawer rather than swapping to the
  // desktop rail, and it stays open across the rotation with nothing to
  // prompt the user to close it. resize is what actually fires here (both
  // on a real rotation and via viewport-size changes in general);
  // orientationchange is the standard companion for real devices — same
  // deferred-check idea as main.js's own handleOrientationChange for the
  // landing page's rotate-hint modal, just closing instead of opening.
  window.addEventListener('resize', () => {
    if (window.matchMedia('(orientation: landscape)').matches) closeMobileSidebar();
  });
  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => {
      if (window.matchMedia('(orientation: landscape)').matches) closeMobileSidebar();
    }, 300);
  });

  const run = () => {
    const overviewDone = applyOverviewTheme();
    const newApplicationDone = applyNewApplicationTheme();
    const dealsDone = applyDealsTheme();
    const archiveDone = applyArchiveTheme();
    const dealDetailDone = applyDealDetailTheme();
    // Header is part of the persistent shell (never unmounts across
    // route changes), so this only ever needs to succeed once — not
    // counted towards the "nothing matched, keep polling" check below,
    // it just quietly no-ops on every later tick via its own guard.
    ensureNotificationBell();
    // Last, on purpose — see translatePage's own comment for why.
    translatePage();
    if (!overviewDone && !newApplicationDone && !dealsDone && !archiveDone && !dealDetailDone) {
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
  // Must be document.body, not #root: the mobile nav drawer (shadcn's
  // Sidebar swapping to a Radix Sheet below the md breakpoint) portals its
  // content straight to <body>, as a sibling of #root rather than a
  // descendant of it. Observing #root alone meant opening that drawer for
  // the first time never fired this observer, so translatePage() never got
  // a chance to run on it — its "Обзор"/"Мои сделки"/etc. stayed in the
  // bundle's native Russian even in English mode, no matter how many other
  // in-app mutations had already re-run translatePage() successfully.
  const observerRoot = document.body;
  new MutationObserver(run).observe(observerRoot, { childList: true, subtree: true });
})();
