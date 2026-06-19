// ==UserScript==
// @name           GSF (ИПИГ) - Иконки для писем в Gmail
// @namespace      https://github.com/npekpacHo/gsf
// @version        1.82
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
  const BADGE_IMG_CLASS = `${SCRIPT_ID}-badge-img`;
  const OVERLAY_CLASS = `${SCRIPT_ID}-overlay`;

  const GSF_BASE = 'https://npekpacho.github.io/gsf';
  const IMAGE_BASE = `${GSF_BASE}/images`;

  const SCAN_INTERVAL_MS = 3000;
  const DEBOUNCE_MS = 120;

  const USE_GOOGLE_FAVICONS = true;
  const USE_DUCKDUCKGO_FAVICONS = true;
  const USE_LOCAL_IMAGES = true;

  // Домены обычных пользовательских почтовых ящиков.
  // Для них показываем иконку почтового сервиса + букву отправителя.
  const MAIL_PROVIDERS = {
    'gmail.com': 'gmail.com',
    'googlemail.com': 'gmail.com',

    'yandex.ru': 'yandex.ru',
    'ya.ru': 'yandex.ru',
    'yandex.com': 'yandex.ru',
    'yandex.by': 'yandex.ru',
    'yandex.kz': 'yandex.ru',
    'yandex.ua': 'yandex.ru',

    'mail.ru': 'mail.ru',
    'bk.ru': 'mail.ru',
    'inbox.ru': 'mail.ru',
    'list.ru': 'mail.ru',
    'internet.ru': 'mail.ru',

    'outlook.com': 'outlook.com',
    'hotmail.com': 'outlook.com',
    'live.com': 'outlook.com',
    'msn.com': 'outlook.com',

    'icloud.com': 'icloud.com',
    'me.com': 'icloud.com',
    'mac.com': 'icloud.com',

    'yahoo.com': 'yahoo.com',
    'ymail.com': 'yahoo.com',
    'rocketmail.com': 'yahoo.com',

    'proton.me': 'proton.me',
    'protonmail.com': 'proton.me',
    'pm.me': 'proton.me',

    'rambler.ru': 'rambler.ru',
    'lenta.ru': 'rambler.ru',
    'autorambler.ru': 'rambler.ru',
    'myrambler.ru': 'rambler.ru',
    'ro.ru': 'rambler.ru',

    'aol.com': 'aol.com',
    'zoho.com': 'zoho.com',
    'gmx.com': 'gmx.com',
    'gmx.net': 'gmx.com'
  };

  // Отдельные проекты на поддоменах.
  // Для них НЕ схлопываем домен до yandex.ru, потому что это самостоятельные сервисы.
  const PROJECT_DOMAINS = {
    'uslugi.yandex.ru': 'uslugi.yandex.ru',
    'webmaster.yandex.ru': 'webmaster.yandex.ru',
    'metrika.yandex.ru': 'metrika.yandex.ru',
    'direct.yandex.ru': 'direct.yandex.ru',
    'business.yandex.ru': 'business.yandex.ru',
    'cloud.yandex.ru': 'cloud.yandex.ru',
    'forms.yandex.ru': 'forms.yandex.ru',
    'disk.yandex.ru': 'disk.yandex.ru',
    'music.yandex.ru': 'music.yandex.ru',
    'market.yandex.ru': 'market.yandex.ru',
    'pay.yandex.ru': 'pay.yandex.ru',
    'travel.yandex.ru': 'travel.yandex.ru',
    'taxi.yandex.ru': 'taxi.yandex.ru',
    'go.yandex.ru': 'go.yandex.ru',
    'eda.yandex.ru': 'eda.yandex.ru',
    'lavka.yandex.ru': 'lavka.yandex.ru',
    'kinopoisk.ru': 'kinopoisk.ru'
  };

  // Сопоставления доменов организаций и сервисов.
  // Слева: домен отправителя или его часть.
  // Справа: основной домен, favicon которого надо показывать.
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

  // Упрощённая папка локальных изображений.
  // Ключ: основной домен.
  // Значение: имя файла в /images.
  // Пример: https://npekpacho.github.io/gsf/images/platformaofd.png
  const LOCAL_IMAGES = {
    'platformaofd.ru': 'platformaofd.png',
    'cloudpayments.ru': 'cloudpayments.png',
    'aliexpress.ru': 'aliexpress.png',

    'uslugi.yandex.ru': 'yandex-uslugi.png',
    'webmaster.yandex.ru': 'yandex-webmaster.png',
    'metrika.yandex.ru': 'yandex-metrika.png',
    'direct.yandex.ru': 'yandex-direct.png',
    'business.yandex.ru': 'yandex-business.png',
    'cloud.yandex.ru': 'yandex-cloud.png',
    'forms.yandex.ru': 'yandex-forms.png',
    'disk.yandex.ru': 'yandex-disk.png',
    'music.yandex.ru': 'yandex-music.png',
    'market.yandex.ru': 'yandex-market.png',
    'pay.yandex.ru': 'yandex-pay.png',
    'travel.yandex.ru': 'yandex-travel.png',
    'taxi.yandex.ru': 'yandex-taxi.png',
    'go.yandex.ru': 'yandex-go.png',
    'eda.yandex.ru': 'yandex-eda.png',
    'lavka.yandex.ru': 'yandex-lavka.png',
    'kinopoisk.ru': 'kinopoisk.png'
  };

  // Для этих доменов локальная картинка из /images идёт перед Google/DuckDuckGo.
  // Это нужно как раз для отдельных проектов на поддоменах.
  const LOCAL_IMAGE_FIRST_DOMAINS = new Set(Object.keys(PROJECT_DOMAINS));

  const DOMAIN_FIX_ENTRIES = Object.entries(DOMAIN_FIXES)
    .sort((a, b) => b[0].length - a[0].length);

  const PROJECT_DOMAIN_ENTRIES = Object.entries(PROJECT_DOMAINS)
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
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        flex: 0 0 auto !important;
        height: 18px !important;
        min-width: 18px !important;
        margin-right: 8px !important;
        border-radius: 4px !important;
        vertical-align: middle !important;
        user-select: none !important;
        pointer-events: none !important;
        overflow: visible !important;
      }

      .${BADGE_CLASS}[data-gsf-kind="person"],
      .${BADGE_CLASS}[data-gsf-kind="org"] {
        width: 18px !important;
        min-width: 18px !important;
        overflow: hidden !important;
      }

      .${BADGE_IMG_CLASS} {
        display: block !important;
        width: 18px !important;
        height: 18px !important;
        border-radius: 4px !important;
        object-fit: contain !important;
      }

      .${OVERLAY_CLASS} {
        position: absolute !important;
        right: 0 !important;
        bottom: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 12px !important;
        height: 12px !important;
        border-radius: 999px !important;
        color: #fff !important;
        font-weight: 800 !important;
        font-size: 8px !important;
        line-height: 12px !important;
        text-align: center !important;
        text-shadow: 0 1px 2px rgba(0,0,0,.65) !important;
        box-shadow: 0 0 0 1px rgba(255,255,255,.95), 0 1px 2px rgba(0,0,0,.35) !important;
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

  function normalizeProjectDomain(domain) {
    const d = String(domain || '').trim().toLowerCase();
    if (!d) return '';

    for (const [key, projectDomain] of PROJECT_DOMAIN_ENTRIES) {
      if (d === key || d.endsWith(`.${key}`)) {
        return projectDomain;
      }
    }

    return '';
  }

  function normalizeMailProvider(domain) {
    const d = String(domain || '').trim().toLowerCase();
    if (!d) return '';

    // Важно: только точное совпадение.
    // uslugi.yandex.ru не должен превращаться в личный ящик yandex.ru.
    return MAIL_PROVIDERS[d] || '';
  }

  function unique(arr) {
    return [...new Set(arr.filter(Boolean))];
  }

  function stableColor(seed) {
    const s = String(seed || '?');

    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }

    return `hsl(${Math.abs(h) % 360}, 68%, 40%)`;
  }

  function pickLetter(senderText, fallback) {
    const fromName = String(senderText || '').match(/[a-z0-9а-яё]/i);
    if (fromName) return fromName[0].toUpperCase();

    const fromFallback = String(fallback || '').match(/[a-z0-9а-яё]/i);
    if (fromFallback) return fromFallback[0].toUpperCase();

    return '?';
  }

  function encodePath(path) {
    return String(path)
      .split('/')
      .map(part => encodeURIComponent(part))
      .join('/');
  }

  function getGoogleFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(domain)}`;
  }

  function getDuckDuckGoFaviconUrl(domain) {
    return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
  }

  function getLocalImageUrl(domain) {
    const file = LOCAL_IMAGES[domain];
    if (!file) return '';

    return `${IMAGE_BASE}/${encodePath(file)}`;
  }

  function buildIconSources(iconDomain) {
    const domain = String(iconDomain || '').trim().toLowerCase();
    const urls = [];

    if (!domain) return urls;

    const localUrl = USE_LOCAL_IMAGES ? getLocalImageUrl(domain) : '';
    const localFirst = LOCAL_IMAGE_FIRST_DOMAINS.has(domain);

    if (localFirst && localUrl) {
      urls.push(localUrl);
    }

    if (USE_GOOGLE_FAVICONS) {
      urls.push(getGoogleFaviconUrl(domain));
    }

    if (USE_DUCKDUCKGO_FAVICONS) {
      urls.push(getDuckDuckGoFaviconUrl(domain));
    }

    if (!localFirst && localUrl) {
      urls.push(localUrl);
    }

    return unique(urls).filter(url => !FAILED_ICON_URLS.has(url));
  }

  function getSenderModel(info) {
    const email = info.email;
    const rawDomain = getDomainFromEmail(email);

    const projectDomain = normalizeProjectDomain(rawDomain);

    if (projectDomain) {
      return {
        kind: 'org',
        email,
        rawDomain,
        iconDomain: projectDomain,
        mainDomain: projectDomain,
        baseLetter: pickLetter(info.senderText, projectDomain),
        overlayLetter: '',
        senderText: info.senderText || email
      };
    }

    const mailProvider = normalizeMailProvider(rawDomain);

    if (mailProvider) {
      return {
        kind: 'person',
        email,
        rawDomain,
        iconDomain: mailProvider,
        mainDomain: mailProvider,
        baseLetter: pickLetter(mailProvider, mailProvider),
        overlayLetter: pickLetter(info.senderText, email),
        senderText: info.senderText || email
      };
    }

    const fixedDomain = normalizeDomain(rawDomain);
    const mainDomain = getBaseDomain(fixedDomain);

    return {
      kind: 'org',
      email,
      rawDomain,
      iconDomain: mainDomain,
      mainDomain,
      baseLetter: pickLetter(info.senderText, mainDomain),
      overlayLetter: '',
      senderText: info.senderText || email
    };
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

  function setBaseFallback(badge, model) {
    const letter = model.baseLetter || '?';
    const size = '18px';

    badge.textContent = letter;

    Object.assign(badge.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      flex: '0 0 auto',
      width: size,
      height: '18px',
      minWidth: size,
      marginRight: '8px',
      borderRadius: '4px',
      color: '#fff',
      fontWeight: '700',
      fontSize: '11px',
      lineHeight: '18px',
      textAlign: 'center',
      textShadow: '0 1px 2px rgba(0,0,0,.45)',
      backgroundColor: stableColor(model.iconDomain || model.email || letter),
      userSelect: 'none',
      pointerEvents: 'none',
      verticalAlign: 'middle',
      overflow: 'hidden'
    });

    if (model.kind === 'person') {
      badge.appendChild(makeOverlay(model.overlayLetter, model.email));
    }
  }

  function makeOverlay(letter, seed) {
    const overlay = document.createElement('span');
    overlay.className = OVERLAY_CLASS;
    overlay.textContent = letter || '?';

    Object.assign(overlay.style, {
      position: 'absolute',
      right: '0',
      bottom: '0',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '12px',
      height: '12px',
      borderRadius: '999px',
      color: '#fff',
      fontWeight: '800',
      fontSize: '8px',
      lineHeight: '12px',
      textAlign: 'center',
      textShadow: '0 1px 2px rgba(0,0,0,.65)',
      backgroundColor: stableColor(seed || letter),
      boxShadow: '0 0 0 1px rgba(255,255,255,.95), 0 1px 2px rgba(0,0,0,.35)'
    });

    return overlay;
  }

  function makeImage(url) {
    const img = document.createElement('img');
    img.className = BADGE_IMG_CLASS;
    img.alt = '';
    img.decoding = 'async';

    Object.assign(img.style, {
      display: 'block',
      width: '18px',
      height: '18px',
      borderRadius: '4px',
      objectFit: 'contain'
    });

    img.src = url;

    return img;
  }

  function applyImageBadge(badge, img, model) {
    badge.textContent = '';
    badge.style.backgroundColor = 'transparent';
    badge.style.textShadow = 'none';
    badge.replaceChildren(img);

    if (model.kind === 'person') {
      badge.appendChild(makeOverlay(model.overlayLetter, model.email));
    }
  }

  function makeBadge(model) {
    const badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    badge.dataset.gsfKind = model.kind;
    badge.dataset.gsfEmail = model.email || '';
    badge.dataset.gsfDomain = model.iconDomain || '';
    badge.dataset.gsfLetter = model.overlayLetter || model.baseLetter || '?';
    badge.title = model.kind === 'person'
      ? `${model.senderText} • ${model.iconDomain}`
      : model.iconDomain;
    badge.setAttribute('aria-hidden', 'true');

    // Сначала всегда показываем fallback, чтобы никогда не было пустого места.
    setBaseFallback(badge, model);

    const sources = buildIconSources(model.iconDomain);
    let index = 0;

    const tryNext = () => {
      if (index >= sources.length) return;

      const url = sources[index];
      const img = makeImage(url);

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

        applyImageBadge(badge, img, model);
      };
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

    const target = getTargetNode(row, info);
    if (!target) return;

    const model = getSenderModel(info);
    if (!model.iconDomain) return;

    const currentBadge = target.querySelector(`.${BADGE_CLASS}`);

    // Gmail переиспользует DOM-строки. Поэтому проверяем, тот ли это отправитель.
    if (
      currentBadge &&
      currentBadge.dataset.gsfEmail === model.email &&
      currentBadge.dataset.gsfDomain === model.iconDomain &&
      currentBadge.dataset.gsfKind === model.kind &&
      currentBadge.dataset.gsfLetter === (model.overlayLetter || model.baseLetter || '?')
    ) {
      return;
    }

    const newBadge = makeBadge(model);

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

    // Gmail иногда меняет существующие строки без добавления новых узлов.
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
