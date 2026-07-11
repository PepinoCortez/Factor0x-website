#!/usr/bin/env python3
"""Migrate old-site flat layout to en/ru folder structure."""

from __future__ import annotations

import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

TRANSLATIONS = {
    "О нас": "About",
    "Контакты": "Contacts",
    "TVL —капитал, размещённый в активных invoice financing deals.": "TVL is capital allocated to active invoice financing deals.",
    "Подключить кошелек": "Connect wallet",
    "Капитал для бизнеса": "Capital for business",
    "Доход для инвестора": "Yield for investors",
    "Платформа, где проверенные инвойсы находят ликвидность": "A platform where verified invoices find liquidity",
    "Получить финансирование": "Get financing",
    "Начать инвестировать": "Start investing",
    "Заявка": "Apply",
    "Подробнее": "Flow",
    "Инвестировать": "Earn",
    "Краткосрочное финансировании реального бизнеса.": "Short-term financing for real businesses.",
    "Проверенные": "Finance verified",
    "B2B инвойсы": "B2B invoices",
    "ТОП сделки": "Top offers",
    "Смотреть еще": "View More",
    "Скрыть": "View less",
    "Список предложений": "Offer list",
    "ОАЭ · Дубай": "UAE · Dubai",
    "Крипто-ликвидность": "Crypto Liquidity",
    "Активы реального сектора": "Real World Assets",
    "Финансирование SME": "SME Financing",
    "Финансирование инвойсов": "Invoice Financing",
    "Трансграничный B2B": "Cross-border B2B",
    "Как работает модель": "How the model works",
    "Factor0x помогает бизнесу получить оборотный капитал, а инвесторам — заработать на проверенных B2B-инвойсах.": "Factor0x helps businesses access working capital and investors earn from verified B2B invoices.",
    "Бизнес": "Business",
    "Получает финансирование": "Receives financing",
    "Передаёт подтверждённый B2B-инвойс и получает оборотный капитал до оплаты клиента.": "Submits a confirmed B2B invoice and receives working capital before the customer pays.",
    "Структурирует сделку": "Structures the deal",
    "Связывает бизнес, капитал и процесс выплат в единую управляемую инфраструктуру.": "Connects business, capital, and the repayment process in one managed infrastructure.",
    "Инвесторы": "Investors",
    "Предоставляют ликвидность": "Provide liquidity",
    "Финансируют реальные торговые сделки и получают доход после их погашения.": "Finance real trade deals and earn after they are repaid.",
    "Инвойс": "Invoice",
    "Проверка": "Verification",
    "Финансирование": "Financing",
    "Погашение": "Repayment",
    "Доход": "Yield",
    "Каждый этап фиксируется в системе и отображается инвестору в статусе сделки.": "Every stage is recorded in the system and shown to investors in the deal status.",
    "Factor0x работает на пересечении trade finance,": "Factor0x operates at the intersection of trade finance,",
    "Web3-ликвидности и реального B2B-сектора.": "Web3 liquidity, and the real B2B sector.",
    "Мы начинаем с ОАЭ — рынка с сильной торговлей, логистикой и спросом на оборотный капитал.": "We start with the UAE, a market with strong trade, logistics, and demand for working capital.",
    "Наша цель — дать бизнесу быстрый капитал, а инвестору — понятный способ заработка на проверенных B2B-инвойсах.": "Our goal is to give businesses fast capital and investors a clear way to earn from verified B2B invoices.",
    "Прозрачность сделок": "Deal transparency",
    "Проверка инвойса": "Invoice Verification",
    "Проверяем инвойс, документы и факт поставки.": "We verify the invoice, documents, and delivery evidence.",
    "Проверка компании и плательщика": "KYB & Debtor Check",
    "Проверяем бизнес, должника и юридические риски.": "We check the business, debtor, and legal risks.",
    "Степень риска": "Risk Tier",
    "Оцениваем срок, сумму, отрасль и качество сделки.": "We assess term, amount, sector, and deal quality.",
    "On-chain прослеживаемость": "On-chain Tracking",
    "Фиксируем статус сделки, repayment и распределения.": "We record deal status, repayment, and distributions.",
    "Реальный доход": "Real Yield",
    "Реальные активы": "Real assets",
    "Пулы связаны с реальными бизнес-сделками.": "Pools are linked to real business deals.",
    "Понятные условия": "Clear terms",
    "Сумма, срок, APR и контрагент видны до участия.": "Amount, APR, term, and counterparty upfront.",
    "Без токеномики": "No tokenomics",
    "Доходность связана с инвойсом, не с токеном.": "Yield is linked to the invoice, not a token.",
    "Безопасно": "Secure",
    "Регулярный аудит смарт-контрактов.": "Regular smart contract audits.",
    "Что такое Factor0x?": "What is Factor0x?",
    "Factor0x — это платформа для финансирования проверенных B2B-инвойсов. Бизнес получает оборотный капитал до оплаты клиента, а инвесторы финансируют реальные сделки из B2B-сектора.": "Factor0x is a platform for financing verified B2B invoices. Businesses receive working capital before customer payment, while investors finance real B2B-sector deals.",
    "Что финансируют инвесторы?": "What do investors finance?",
    "Инвесторы финансируют проверенные B2B-инвойсы. Каждая сделка имеет сумму, срок, степень риска, статус проверки и ожидаемый процесс погашения.": "Investors finance verified B2B invoices. Each deal has an amount, term, risk tier, verification status, and expected repayment process.",
    "Как инвестор получает доход?": "How does an investor earn?",
    "Доход формируется после погашения инвойса должником. Когда клиент бизнеса оплачивает инвойс, средства распределяются между участниками сделки согласно условиям.": "Yield is generated after the debtor repays the invoice. When the business customer pays the invoice, funds are distributed to deal participants according to the terms.",
    "Доходность гарантирована?": "Is yield guaranteed?",
    "Нет. Доходность зависит от погашения инвойса, качества должника, условий сделки и возможных задержек. Factor0x показывает ориентировочную годовую доходность, но не гарантирует доход.": "No. Yield depends on invoice repayment, debtor quality, deal terms, and possible delays. Factor0x shows target APR but does not guarantee returns.",
    "Что происходит, если инвойс не оплатят вовремя?": "What happens if an invoice is not paid on time?",
    "Сделка получает статус «просрочено». Инвесторы видят обновления по статусу погашения, а Factor0x и партнёры работают по предусмотренному процессу взыскания / урегулирования.": "The deal receives overdue status. Investors see repayment updates, while Factor0x and partners follow the defined collection or resolution process.",
    "Какие инвойсы подходят?": "Which invoices are eligible?",
    "На первом этапе Factor0x фокусируется на B2B-инвойсах компаний из ОАЭ, связанных с торговлей, логистикой, дистрибуцией, финансированием цепочек поставок и B2B-услугами.": "At the first stage, Factor0x focuses on B2B invoices from UAE companies in trade, logistics, distribution, supply chain finance, and B2B services.",
    "Зачем нужна проверка KYB / KYC?": "Why are KYB / KYC checks needed?",
    "KYB / KYC нужны для проверки бизнеса, инвесторов, источника средств, санкционных рисков и соответствия требованиям комплаенса.": "KYB / KYC checks verify businesses, investors, source of funds, sanctions risks, and compliance requirements.",
    "Нужен ли бизнесу криптокошелёк?": "Does a business need a crypto wallet?",
    "Нет. Бизнесу не обязательно использовать криптокошелёк. Для бизнеса продукт должен работать как понятное финансирование под инвойс.": "No. A business does not have to use a crypto wallet. For businesses, the product should work as straightforward invoice financing.",
    "В чём роль Web3?": "What is the role of Web3?",
    "Web3 используется для прозрачности, учёта участия инвесторов, статуса сделки и on-chain прослеживания. Factor0x не строится вокруг спекулятивного токена.": "Web3 is used for transparency, investor participation records, deal status, and on-chain tracking. Factor0x is not built around a speculative token.",
    "В какой валюте происходит финансирование?": "Which currency is used for financing?",
    "Инвесторы могут участвовать через USDT / USDC или фиат, если это доступно для конкретной сделки и соответствует требованиям комплаенс-контура.": "Investors may participate through USDT / USDC or fiat when available for a specific deal and compliant with requirements.",
    "Команда проекта": "Project team",
    "Итан Уокер": "Ethan Walker",
    "Генеральный директор": "CEO",
    "Стратегия, партнёрства, сделки": "Strategy, partnerships, deals",
    "Дэниел Чен": "Daniel Chen",
    "Главный архитектор": "Chief Architect",
    "Архитектура платформы, смарт-контракты, безопасность": "Platform architecture, smart contracts, security",
    "София Лоран": "Sophia Laurent",
    "Главный юрист": "Chief Legal Officer",
    "Юридическая структура, комплаенс, регуляция": "Legal structure, compliance, regulation",
    "Маркус Беннетт": "Marcus Bennett",
    "Риск-директор": "Risk Director",
    "Оценка сделок, присвоение уровней риска, анализ качества плательщиков.": "Deal assessment, risk tiering, payer quality analysis.",
    "Адриан Моро": "Adrian Moreau",
    "Стратегический советник": "Strategic Advisor",
    "Привлечение капитала, партнёрства, выход на новые рынки": "Capital raising, partnerships, expansion into new markets",
    "Майя Рейнольдс": "Maya Reynolds",
    "Партнер по бизнес-развитию": "BD Partner",
    "Развитие партнерств, бизнес-связей": "Partnership development, business relations",
    "Модель двух хабов": "Dual-hub model",
    "Дубай": "Dubai",
    "Операционный хаб": "Operational hub",
    "Благоприятная юрисдикция для цифровых активов": "Crypto-friendly jurisdiction for digital assets",
    "Первые инвойсы от SME из ОАЭ и плательщиков из GCC": "First invoices from UAE-based SMEs and GCC obligors",
    "Доступ к капиталу стран Персидского залива: family offices и crypto investors": "Access to Gulf capital: family offices and crypto investors",
    "Поток сделок из логистики и торговли": "Logistics and trade deal flow",
    "Регуляторный маршрут через UAE / VARA / ADGM / DIFC": "UAE / VARA / ADGM / DIFC regulatory pathway",
    "Сингапур": "Singapore",
    "Центр структурирования и комплаенса": "Structuring & Compliance hub",
    "Слой для структурирования, банковской инфраструктуры и комплаенса в SEA": "Structuring / banking / compliance layer for SEA",
    "Фокус на рынки: Малайзия, Индонезия, Вьетнам, Индия": "Focus markets: Malaysia, Indonesia, Vietnam, India",
    "Институциональная надёжность для банков и партнёров": "Institutional credibility for banks and partners",
    "Масштабирование операций": "Scaling operations",
    "Онбординг институционального капитала": "Institutional capital onboarding",
    "СКОРО": "COMING SOON",
    "Продукт": "Product",
    "Как работает": "How it works",
    "Хабы": "Hubs",
    "Для бизнеса": "For business",
    "Инвесторам": "Investors",
    "Контакт": "Contact",
}

ATTR_TRANSLATIONS = {
    "Выбрать язык": "Select language",
    "Выбрать сеть": "Select network",
    "Открыть меню": "Open menu",
    "Мобильная навигация": "Mobile navigation",
    "Открыть список инвойсов": "Open invoice list",
    "Что такое TVL": "What is TVL",
    "Позиция инвойса": "Invoice position",
    "Позиция этапа": "Step position",
    "Закрыть": "Close",
    "Реальный доход": "Real Yield",
    "Итан Уокер": "Ethan Walker",
    "Дэниел Чен": "Daniel Chen",
    "София Лоран": "Sophia Laurent",
    "Маркус Беннетт": "Marcus Bennett",
    "Адриан Моро": "Adrian Moreau",
    "Майя Рейнольдс": "Maya Reynolds",
    "Переверните телефон горизонтально": "Rotate your phone to landscape",
    "Таблица сделок лучше смотрится в альбомном режиме": "The deals table fits better in landscape mode",
}


def translate_html(html: str) -> str:
    for ru, en in sorted(TRANSLATIONS.items(), key=lambda x: -len(x[0])):
        html = html.replace(ru, en)
    for ru, en in ATTR_TRANSLATIONS.items():
        html = html.replace(f'aria-label="{ru}"', f'aria-label="{en}"')
    return html


def update_home_paths(html: str, lang: str) -> str:
    html = re.sub(r'href="style\.css', 'href="../style.css', html)
    html = re.sub(r'src="assets/', 'src="../assets/', html)
    html = re.sub(r'src="main\.js', 'src="../main.js', html)

    html = re.sub(
        r'<script>\s*\(function\(\)\{\s*document\.documentElement\.classList\.add\(\'lang-pending\'\);.*?</script>\s*',
        "",
        html,
        flags=re.DOTALL,
    )

    if lang == "en":
        html = html.replace("<html lang=\"ru\">", "<html lang=\"en\">")
        html = html.replace(
            "<title>Factor0x — Liquidity for Business</title>",
            "<title>Factor0x — Capital for Business, Yield for Investors</title>",
        )
        other = "../ru/"
        active = "en"
    else:
        html = html.replace(
            "<title>Factor0x — Liquidity for Business</title>",
            "<title>Factor0x — Капитал для бизнеса, доход для инвестора</title>",
        )
        other = "../en/"
        active = "ru"

    hreflang = f"""  <link rel="canonical" href="https://factor0x.bitilia.com/{lang}/">
  <link rel="alternate" hreflang="en" href="https://factor0x.bitilia.com/en/">
  <link rel="alternate" hreflang="ru" href="https://factor0x.bitilia.com/ru/">
  <link rel="alternate" hreflang="x-default" href="https://factor0x.bitilia.com/en/">
"""
    html = html.replace("<meta name=\"viewport\"", hreflang + "<meta name=\"viewport\"")

    html = re.sub(
        r'<div class="language-menu">\s*<button type="button" data-lang="en">ENG</button>\s*<button type="button" data-lang="ru">РУС</button>\s*</div>',
        f"""<div class="language-menu">
        <a href="../en/" class="language-link{" is-active" if active == "en" else ""}"{" aria-current=\"page\"" if active == "en" else ""}>ENG</a>
        <a href="../ru/" class="language-link{" is-active" if active == "ru" else ""}"{" aria-current=\"page\"" if active == "ru" else ""}>РУС</a>
      </div>""",
        html,
    )

    html = html.replace('href="privacy-policy.html" data-doc-link="privacy"', 'href="legal/privacy/"')
    html = html.replace('href="terms-of-service.html" data-doc-link="terms"', 'href="legal/terms/"')
    html = html.replace('href="whitepaper.html" data-doc-link="whitepaper"', 'href="legal/whitepaper/"')

    return html


def update_legal_doc(html: str, lang: str, depth: int) -> str:
    prefix = "../" * depth
    html = html.replace('href="style.css"', f'href="{prefix}style.css"')
    html = html.replace('src="docs-language.js"', f'src="{prefix}docs-language.js"')
    html = html.replace('src="main.js"', f'src="{prefix}main.js"')
    html = html.replace('href="index.html"', f'href="{prefix}{lang}/"')
    if lang == "en":
        back = "← Back to Factor0x"
    else:
        back = "← Назад к Factor0x"
    html = re.sub(
        r'<a class="back" href="[^"]*">[^<]*</a>',
        f'<a class="back" href="{prefix}{lang}/">{back}</a>',
        html,
        count=1,
    )
    return html


LEGAL_INDEX_STYLE = """  :root {
    --text: #111;
    --muted: #555;
    --line: #e5e5e5;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #fff;
    color: var(--text);
    font-family: 'Manrope', Arial, sans-serif;
    line-height: 1.7;
  }
  .policy {
    max-width: 920px;
    margin: 0 auto;
    padding: 64px 24px 96px;
  }
  .back {
    display: inline-block;
    margin-bottom: 42px;
    color: var(--muted);
    font-size: 14px;
    text-decoration: none;
  }
  .back:hover { color: var(--text); }
  h1 {
    margin: 0 0 10px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(42px, 6vw, 72px);
    line-height: 0.95;
    letter-spacing: 0;
  }
  .updated {
    margin: 0 0 44px;
    color: var(--muted);
    font-size: 15px;
  }
  .legal-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .legal-list li a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 0;
    border-bottom: 1px solid var(--line);
    text-decoration: none;
    color: var(--text);
    transition: color 0.15s;
  }
  .legal-list li:first-child a { border-top: 1px solid var(--line); }
  .legal-list li a:hover { color: #555; }
  .legal-name { font-size: 18px; font-weight: 600; }
  .legal-desc { font-size: 13px; color: var(--muted); margin-top: 3px; }
  .legal-arrow { color: #999; opacity: 0.5; }
  @media (max-width: 640px) {
    .policy { padding: 42px 18px 72px; }
    h1 { font-size: 42px; }
  }"""


def legal_index_html(lang: str) -> str:
    if lang == "en":
        title = "Legal"
        back = "← Back to Factor0x"
        subtitle = "Platform policies, terms and documentation."
        items = [
            ("privacy/", "Privacy Policy", "How we collect, use and protect your personal data"),
            ("terms/", "Terms of Service", "Rules governing your use of the Factor0x platform"),
            ("whitepaper/", "Whitepaper", "Technical and business overview of the Factor0x model"),
        ]
    else:
        title = "Правовые документы"
        back = "← Назад к Factor0x"
        subtitle = "Политики платформы, условия и документация."
        items = [
            ("privacy/", "Политика конфиденциальности", "Как мы собираем, используем и защищаем ваши персональные данные"),
            ("terms/", "Условия использования", "Правила использования платформы Factor0x"),
            ("whitepaper/", "Whitepaper", "Технический и бизнес-обзор модели Factor0x"),
        ]

    links = "\n".join(
        f"""      <li>
        <a href="{href}">
          <div>
            <div class="legal-name">{name}</div>
            <div class="legal-desc">{desc}</div>
          </div>
          <span class="legal-arrow">→</span>
        </a>
      </li>"""
        for href, name, desc in items
    )

    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — Factor0x</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../style.css">
<style>
{LEGAL_INDEX_STYLE}
</style>
</head>
<body>
  <main class="policy">
    <a class="back" href="../">{back}</a>
    <h1>{title}</h1>
    <p class="updated">{subtitle}</p>
    <ul class="legal-list">
{links}
    </ul>
  </main>
</body>
</html>
"""


ROOT_INDEX = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Factor0x</title>
  <meta name="description" content="Factor0x — A platform where verified invoices find liquidity. Capital for business. Yield for investors.">
  <link rel="alternate" hreflang="en" href="en/">
  <link rel="alternate" hreflang="ru" href="ru/">
  <link rel="alternate" hreflang="x-default" href="en/">
  <meta http-equiv="refresh" content="0; url=en/">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; }
  </style>
  <script>
    (function () {
      var lang = (navigator.language || navigator.userLanguage || '').toLowerCase().slice(0, 2);
      window.location.replace(lang === 'ru' ? 'ru/' : 'en/');
    })();
  </script>
</head>
<body>
  <a href="en/">English</a>
  <a href="ru/">Русский</a>
</body>
</html>
"""


def main() -> None:
    home_src = (ROOT / "index.html").read_text(encoding="utf-8")

    (ROOT / "en").mkdir(exist_ok=True)
    (ROOT / "ru").mkdir(exist_ok=True)

    ru_html = update_home_paths(home_src, "ru")
    (ROOT / "ru" / "index.html").write_text(ru_html, encoding="utf-8")

    en_html = update_home_paths(translate_html(home_src), "en")
    (ROOT / "en" / "index.html").write_text(en_html, encoding="utf-8")

    legal_moves = [
        ("privacy-policy.html", "en/legal/privacy/index.html", "en", 3),
        ("privacy-policy-ru.html", "ru/legal/privacy/index.html", "ru", 3),
        ("terms-of-service.html", "en/legal/terms/index.html", "en", 3),
        ("terms-of-service-ru.html", "ru/legal/terms/index.html", "ru", 3),
        ("whitepaper-en.html", "en/legal/whitepaper/index.html", "en", 3),
        ("whitepaper.html", "ru/legal/whitepaper/index.html", "ru", 3),
    ]

    for src_name, dest_rel, lang, depth in legal_moves:
        dest = ROOT / dest_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        content = (ROOT / src_name).read_text(encoding="utf-8")
        content = update_legal_doc(content, lang, depth)
        dest.write_text(content, encoding="utf-8")

    (ROOT / "en" / "legal").mkdir(parents=True, exist_ok=True)
    (ROOT / "ru" / "legal").mkdir(parents=True, exist_ok=True)
    (ROOT / "en" / "legal" / "index.html").write_text(legal_index_html("en"), encoding="utf-8")
    (ROOT / "ru" / "legal" / "index.html").write_text(legal_index_html("ru"), encoding="utf-8")

    (ROOT / "index.html").write_text(ROOT_INDEX, encoding="utf-8")

    for src_name, _, _, _ in legal_moves:
        (ROOT / src_name).unlink(missing_ok=True)

    print("Migration complete.")


if __name__ == "__main__":
    main()
