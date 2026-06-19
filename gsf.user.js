// ==UserScript==
// @name           GSF (ИПИГ) - Иконки для писем в Gmail
// @namespace      https://github.com/npekpacHo/gsf
// @version        1.60
// @icon           https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico
// @author         westakof, npekpacHo
// @description    Добавляет иконки отправителей в Gmail. Оптимизировано для AdGuard.
// @homepageURL    https://github.com/npekpacHo/gsf
// @supportURL     https://github.com/npekpacHo/gsf/issues
// @updateURL      https://npekpacho.github.io/gsf/gsf.user.js
// @downloadURL    https://npekpacho.github.io/gsf/gsf.user.js
// @match          https://mail.google.com/*
// @run-at         document-end
// @grant          none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const SCRIPT_ID = 'gsf';
  const STYLE_ID = `${SCRIPT_ID}-style`;
  const BADGE_CLASS = `${SCRIPT_ID}-badge`;
  const LETTER_CLASS = `${SCRIPT_ID}-letter`;

  const GSF_BASE = 'https://npekpacho.github.io/gsf';
  const ICON_BASE = `${GSF_BASE}/icons`;

  const SCAN_INTERVAL_MS = 3000;
  const DEBOUNCE_MS = 120;

  // Главная идея:
  // 1. Сначала берём favicon сайта.
  // 2. Потом пробуем DuckDuckGo.
  // 3. Только потом свои иконки с GitHub Pages.
  // 4. Если всё плохо, показываем цветную букву.
  const USE_GOOGLE_FAVICONS = true;
  const USE_DUCKDUCKGO_FAVICONS = true;
  const USE_CUSTOM_ICONS = true;

  // Некоторые домены можно принудительно вести на свою иконку первой.
  // Это нужно, если Google/DDG стабильно возвращают мусор или не тот бренд.
  const CUSTOM_ICON_FIRST_DOMAINS = new Set([
    // 'platformaofd.ru',
    // 'cloudpayments.ru'
  ]);

  // Исправление доменов.
  // Слева: домен отправителя или его часть.
  // Справа: домен сайта, favicon которого надо показывать.
  const DOMAIN_FIXES = {
    'ozon.ru': 'ozon.ru',
    'mailer.ozon.ru': 'ozon.ru',

    'vk.com': 'vk.com',
    'notify.vk.com': 'vk.com',

    'dom.ru': 'dom.ru',
    'b2b.dom.ru': 'dom.ru',

    'gosuslugi.ru': 'gosuslugi.ru',

    'wildberries.ru': 'wildberries.ru',
    'wb.ru': 'wildberries.ru',

    'sberbank.ru': 'sberbank.ru',
    'sber.ru': 'sberbank.ru',

    'tinkoff.ru': 'tinkoff.ru',
    'yandex.ru': 'yandex.ru',
    'dns-shop.ru': 'dns-shop.ru',

    'creatify.ai': 'creatify.ai',
    'etm.ru': 'etm.ru',
    'lemanapro.ru': 'lemanapro.ru',

    'bigam-info.ru': 'bigam.ru',

    '5ka.ru': '5ka.ru',

    'pofd.ru': 'platformaofd.ru',
    'checkkontur.ru': 'platformaofd.ru',

    'suno.com': 'suno.com',
    'ggsel.com': 'ggsel.com',
    'zarplata.ru': 'zarplata.ru',
    'rgs.ru': 'rgs.ru',
    'promopult.ru': 'promopult.ru',
    'systeme-electric.ru': 'systeme-electric.ru',
    'hik-partner.com': 'hik-partner.com',
    'vivino.com': 'vivino.com',
    'termius.com': 'termius.com',

    'microsoft.com': 'live.com',
    'instagram.com': 'instagram.com',
    'ekf.su': 'ekfgroup.com',
    'getcontact.com': 'getcontact.com',
    'ea.com': 'ea.com',
    'trassir.com': 'trassir.com',
    'cp.ru': 'cloudpayments.ru',

    'cainiao.com': 'aliexpress.ru',
    'aliexpress.ru': 'aliexpress.ru',
    'aliexpress.com': 'aliexpress.com'
  };

  // Ручные иконки.
  // Эти файлы должны лежать в /icons на GitHub Pages.
  // Например:
  // https://npekpacho.github.io/gsf/icons/platformaofd.png
  const CUSTOM_ICON_FILES = {
    'platformaofd.ru': 'platformaofd.png',
    'cloudpayments.ru': 'cloudpayments.png',
    'aliexpress.ru': 'aliexpress.png',

    // Можно пополнять:
    // 'gosuslugi.ru': 'gosuslugi.png',
    // 'sberbank.ru': 'sberbank.png',
    // 'ekfgroup.com': 'ekfgroup.png'
  };

  const DOMAIN_FIX_ENTRIES = Object.entries(DOMAIN_FIXES)
    .sort((a, b) => b[0].length - a[0].length);

  const FAILED_ICON_URLS = new Set();

  let observer = null;
  let debounceTimer = null;
  let rafId = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      .${BADGE_CLASS} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 18px;
        height: 18px;
        min-width: 18px;
        margin-right: 8px;
        vertical-align: middle;
        user-select: none;
        pointer-events: none;
      }

      .${BADGE_CLASS} img {
        display: block;
        width: 18px;
        height: 18px;
        border-radius: 4px;
        object-fit: contain;
      }

      .${LETTER_CLASS} {
        display: block;
        width: 18px;
        height: 18px;
        border-radius: 4px;
        color: #fff;
        font-weight: 700;
        font-size: 11px;
        line-height: 18px;
        text-align: center;
        text-shadow: 0 1px 2px rgba(0, 0, 0, .35);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .18);
      }

      tr.zA .${BADGE_CLASS} {
        opacity: .95;
      }

      tr.zA:hover .${BADGE_CLASS} {
        opacity: 1;
      }
    `;

    document.documentElement.appendChild(style);
  }

  function extractEmailLike(str) {
    if (!str) return '';

    const s = String(str);

    const m1 = s.match(/<\s*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\s*>/i);
    if (m1) return m1[1].toLowerCase();

    const m2 = s.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
    if (m2) return m2[1].toLowerCase();

    return '';
  }

  function getDomainFromEmail(email) {
    const at = String(email || '').lastIndexOf('@');
    if (at === -1) return '';

    return email
      .slice(at + 1)
      .trim()
      .toLowerCase()
      .replace(/[>\s]+$/g, '');
  }

  function normalizeDomain(originalDomain) {
    const domain = String(originalDomain || '').trim().toLowerCase();
    if (!domain) return '';

    for (const [key, fix] of DOMAIN_FIX_ENTRIES) {
      if (domain === key || domain.endsWith(`.${key}`)) {
        return fix;
      }
    }

    return domain;
  }

  function getBaseDomain(domain) {
    const d = String(domain || '').trim().toLowerCase();
    if (!d || !d.includes('.')) return d;

    const parts = d.split('.').filter(Boolean);
    if (parts.length <= 2) return d;

    const compoundSuffixes = new Set([
      'co.uk',
      'com.au',
      'com.br',
      'com.tr',
      'com.ua',
      'com.cn',
      'com.ru',
      'net.ru',
      'org.ru',
      'spb.ru',
      'msk.ru'
    ]);

    const lastTwo = parts.slice(-2).join('.');

    if (compoundSuffixes.has(lastTwo) && parts.length >= 3) {
      return parts.slice(-3).join('.');
    }

    return parts.slice(-2).join('.');
  }

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))];
  }

  function getIconDomains(rawDomain) {
    const fixed = normalizeDomain(rawDomain);
    const baseFixed = getBaseDomain(fixed);
    const baseRaw = getBaseDomain(rawDomain);

    return unique([
      fixed,
      baseFixed,
      rawDomain,
      baseRaw
    ]);
  }

  function stableColor(seed) {
    const s = String(seed || '?');

    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }

    return `hsl(${Math.abs(h) % 360}, 65%, 43%)`;
  }

  function pickLetter(senderText, domain) {
    const fromName = String(senderText || '').match(/[a-z0-9а-яё]/i);
    if (fromName) return fromName[0].toUpperCase();

    const fromDomain = String(domain || '').match(/[a-z0-9а-яё]/i);
    if (fromDomain) return fromDomain[0].toUpperCase();

    return '?';
  }

  function encodePath(path) {
    return String(path)
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/');
  }

  function getCustomIconUrl(domain) {
    const file = CUSTOM_ICON_FILES[domain];
    if (!file) return '';

    return `${ICON_BASE}/${encodePath(file)}`;
  }

  function getGoogleFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(domain)}`;
  }

  function getDuckDuckGoFaviconUrl(domain) {
    return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
  }

  function addDomainSources(urls, domain) {
    if (!domain) return;

    const customUrl = getCustomIconUrl(domain);
    const customFirst = CUSTOM_ICON_FIRST_DOMAINS.has(domain);

    if (USE_CUSTOM_ICONS && customFirst && customUrl) {
      urls.push(customUrl);
    }

    if (USE_GOOGLE_FAVICONS) {
      urls.push(getGoogleFaviconUrl(domain));
    }

    if (USE_DUCKDUCKGO_FAVICONS) {
      urls.push(getDuckDuckGoFaviconUrl(domain));
    }

    if (USE_CUSTOM_ICONS && !customFirst && customUrl) {
      urls.push(customUrl);
    }
  }

  function buildIconSources(rawDomain) {
    const domains = getIconDomains(rawDomain);
    const urls = [];

    for (const domain of domains) {
      addDomainSources(urls, domain);
    }

    return unique(urls).filter(url => !FAILED_ICON_URLS.has(url));
  }

  function findSenderInfo(row) {
    if (!row) return null;

    const emailNode = row.querySelector('span[email], [email]');
    if (emailNode) {
      const email = emailNode.getAttribute('email') || extractEmailLike(emailNode.textContent);

      if (email) {
        return {
          email,
          senderText: emailNode.getAttribute('name') || emailNode.textContent || email,
          node: emailNode
        };
      }
    }

    const hoverNode = row.querySelector('span[data-hovercard-id], [data-hovercard-id]');
    if (hoverNode) {
      const raw = hoverNode.getAttribute('data-hovercard-id') || '';
      const email = extractEmailLike(raw);

      if (email) {
        return {
          email,
          senderText: hoverNode.textContent || email,
          node: hoverNode
        };
      }
    }

    return null;
  }

  function makeLetterBadge(domain, letter) {
    const span = document.createElement('span');
    span.className = LETTER_CLASS;
    span.textContent = letter;
    span.style.backgroundColor = stableColor(domain || letter);
    return span;
  }

  function makeBadge(rawDomain, letter, email) {
    const normalizedDomain = normalizeDomain(rawDomain);

    const badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    badge.dataset.email = email || '';
    badge.dataset.domain = normalizedDomain || '';
    badge.title = normalizedDomain || email || 'sender';
    badge.setAttribute('aria-hidden', 'true');

    // Сразу показываем букву, чтобы не было пустых дыр.
    badge.replaceChildren(makeLetterBadge(normalizedDomain || rawDomain, letter));

    const sources = buildIconSources(rawDomain);
    let index = 0;

    const tryNext = () => {
      if (index >= sources.length) return;

      const url = sources[index];

      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';

      img.onerror = () => {
        FAILED_ICON_URLS.add(url);
        index++;
        tryNext();
      };

      img.onload = () => {
        if (!img.naturalWidth || !img.naturalHeight) {
          FAILED_ICON_URLS.add(url);
          index++;
          tryNext();
          return;
        }

        badge.replaceChildren(img);
      };

      img.src = url;
    };

    if (sources.length) {
      tryNext();
    }

    return badge;
  }

  function getTargetNode(row, info) {
    if (!row || !info) return null;

    const gmailSenderBlock = row.querySelector('.yX');
    if (gmailSenderBlock) return gmailSenderBlock;

    return info.node ? info.node.parentElement : null;
  }

  function enhanceRow(row) {
    if (!row || !row.matches || !row.matches('tr.zA, .zA')) return;

    const info = findSenderInfo(row);
    if (!info || !info.email) return;

    const rawDomain = getDomainFromEmail(info.email);
    if (!rawDomain) return;

    const normalizedDomain = normalizeDomain(rawDomain);
    const letter = pickLetter(info.senderText, normalizedDomain || rawDomain);
    const target = getTargetNode(row, info);

    if (!target) return;

    const currentBadge = target.querySelector(`.${BADGE_CLASS}`);

    // Gmail любит переиспользовать строки.
    // Поэтому проверяем не просто наличие значка, а соответствие отправителю.
    if (
      currentBadge &&
      currentBadge.dataset.email === info.email &&
      currentBadge.dataset.domain === normalizedDomain
    ) {
      return;
    }

    const newBadge = makeBadge(rawDomain, letter, info.email);

    if (currentBadge) {
      currentBadge.replaceWith(newBadge);
    } else {
      target.insertBefore(newBadge, target.firstChild);
    }
  }

  function enhanceAll(root = document) {
    const rows = root.querySelectorAll ? root.querySelectorAll('tr.zA, .zA') : [];
    rows.forEach(enhanceRow);
  }

  function collectRowsFromMutation(mutationList) {
    const rows = new Set();

    for (const mutation of mutationList) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;

        if (node.matches && node.matches('tr.zA, .zA')) {
          rows.add(node);
        }

        if (node.querySelectorAll) {
          node.querySelectorAll('tr.zA, .zA').forEach(row => rows.add(row));
        }
      }
    }

    return rows;
  }

  function scheduleEnhance(rows = null) {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        rafId = null;

        if (rows && rows.size) {
          rows.forEach(enhanceRow);
        } else {
          enhanceAll();
        }
      });
    }, DEBOUNCE_MS);
  }

  function startObserver() {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutationList) => {
      const rows = collectRowsFromMutation(mutationList);

      if (rows.size) {
        scheduleEnhance(rows);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function init() {
    if (!document.body) return;

    injectStyles();
    startObserver();
    enhanceAll();

    // Gmail иногда меняет существующие строки без нормального добавления новых узлов.
    // Поэтому контрольный проход оставляем.
    setInterval(() => {
      scheduleEnhance();
    }, SCAN_INTERVAL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
