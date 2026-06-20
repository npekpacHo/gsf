// ==UserScript==
// @name           GSF (ИПИГ) - Иконки для писем в Gmail
// @namespace      https://github.com/npekpacHo/gsf
// @version        1.84
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
  const USE_BIMI = true;

  const ICON_CACHE_KEY = 'gsf.iconSourceCache.v4';
  const ICON_CACHE_MAX_ITEMS = 500;
  const ICON_CACHE_TTL_SUCCESS = 1000 * 60 * 60 * 24 * 30;
  const ICON_CACHE_TTL_EMPTY = 1000 * 60 * 60 * 24 * 7;
  const ICON_CACHE_TTL_ERROR = 1000 * 60 * 60 * 24;
  const IMAGE_PROBE_TIMEOUT_MS = 5000;
  const BIMI_DNS_TIMEOUT_MS = 5000;

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

  // Отдельные сервисы, которые присылают письма с общего домена.
  // Например, у Google много уведомлений приходит с @google.com,
  // но визуально это разные продукты: Chat, Alerts, Search Console и т.п.
  // key используется для локальной картинки из /images, iconDomain — для favicon/BIMI.
  const SERVICE_SENDERS = [
    {
      domain: 'google.com',
      local: 'chat-noreply',
      key: 'google-chat',
      iconDomain: 'chat.google.com',
      label: 'Google Chat'
    },
    {
      domain: 'google.com',
      local: 'googlealerts-noreply',
      key: 'google-alerts',
      iconDomain: 'www.google.com/alerts',
      label: 'Google Alerts'
    },
    {
      domain: 'google.com',
      local: 'sc-noreply',
      key: 'google-search-console',
      iconDomain: 'search.google.com/search-console',
      label: 'Google Search Console'
    },
    {
      domain: 'google.com',
      prefix: 'drive-',
      key: 'google-drive',
      iconDomain: 'drive.google.com',
      label: 'Google Drive'
    },
    {
      domain: 'google.com',
      local: 'docs-noreply',
      key: 'google-docs',
      iconDomain: 'docs.google.com',
      label: 'Google Docs'
    },
    {
      domain: 'google.com',
      prefix: 'docs-',
      key: 'google-docs',
      iconDomain: 'docs.google.com',
      label: 'Google Docs'
    },
    {
      domain: 'google.com',
      local: 'calendar-notification',
      key: 'google-calendar',
      iconDomain: 'calendar.google.com',
      label: 'Google Calendar'
    },
    {
      domain: 'google.com',
      prefix: 'calendar-',
      key: 'google-calendar',
      iconDomain: 'calendar.google.com',
      label: 'Google Calendar'
    },
    {
      domain: 'google.com',
      prefix: 'forms-',
      key: 'google-forms',
      iconDomain: 'forms.google.com',
      label: 'Google Forms'
    },
    {
      domain: 'google.com',
      local: 'googleplay-noreply',
      key: 'google-play',
      iconDomain: 'play.google.com',
      label: 'Google Play'
    },
    {
      domain: 'google.com',
      prefix: 'play-',
      key: 'google-play',
      iconDomain: 'play.google.com',
      label: 'Google Play'
    },
    {
      domain: 'google.com',
      local: 'payments-noreply',
      key: 'google-payments',
      iconDomain: 'payments.google.com',
      label: 'Google Payments'
    },
    {
      domain: 'google.com',
      local: 'noreply-accounts',
      key: 'google-account',
      iconDomain: 'myaccount.google.com',
      label: 'Google Account'
    },
    {
      domain: 'google.com',
      local: 'workspace-noreply',
      key: 'google-workspace',
      iconDomain: 'workspace.google.com',
      label: 'Google Workspace'
    },
    {
      domain: 'google.com',
      local: 'groups-noreply',
      key: 'google-groups',
      iconDomain: 'groups.google.com',
      label: 'Google Groups'
    },
    {
      domain: 'google.com',
      local: 'classroom-noreply',
      key: 'google-classroom',
      iconDomain: 'classroom.google.com',
      label: 'Google Classroom'
    },
    {
      domain: 'google.com',
      local: 'photos-noreply',
      key: 'google-photos',
      iconDomain: 'photos.google.com',
      label: 'Google Photos'
    },
    {
      domain: 'youtube.com',
      prefix: 'noreply',
      key: 'youtube',
      iconDomain: 'youtube.com',
      label: 'YouTube'
    },
    {
      domain: 'youtube.com',
      prefix: 'no-reply',
      key: 'youtube',
      iconDomain: 'youtube.com',
      label: 'YouTube'
    }
  ];

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
    'kinopoisk.ru': 'kinopoisk.png',

    'google-chat': 'google-chat.png',
    'google-alerts': 'google-alerts.png',
    'google-search-console': 'google-search-console.png',
    'google-drive': 'google-drive.png',
    'google-docs': 'google-docs.png',
    'google-calendar': 'google-calendar.png',
    'google-forms': 'google-forms.png',
    'google-play': 'google-play.png',
    'google-payments': 'google-payments.png',
    'google-account': 'google-account.png',
    'google-workspace': 'google-workspace.png',
    'google-groups': 'google-groups.png',
    'google-classroom': 'google-classroom.png',
    'google-photos': 'google-photos.png',
    'youtube': 'youtube.png'
  };

  // Для этих доменов локальная картинка из /images идёт перед Google/DuckDuckGo.
  // Это нужно как раз для отдельных проектов на поддоменах.
  const LOCAL_IMAGE_FIRST_DOMAINS = new Set([
    ...Object.keys(PROJECT_DOMAINS),
    ...SERVICE_SENDERS.map(rule => rule.key)
  ]);

  const DOMAIN_FIX_ENTRIES = Object.entries(DOMAIN_FIXES)
    .sort((a, b) => b[0].length - a[0].length);

  const PROJECT_DOMAIN_ENTRIES = Object.entries(PROJECT_DOMAINS)
    .sort((a, b) => b[0].length - a[0].length);

  const PENDING_ICON_RESOLVES = new Map();
  let iconSourceCache = loadIconSourceCache();

  let observer = null;
  let debounceTimer = null;
  let rafId = null;

  function loadIconSourceCache() {
    try {
      const raw = localStorage.getItem(ICON_CACHE_KEY);
      if (!raw) return {};

      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveIconSourceCache() {
    try {
      localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(iconSourceCache));
    } catch {
      // localStorage can be full or disabled. The script still works without cache.
    }
  }

  function getCachedIconSource(domain) {
    const key = String(domain || '').toLowerCase();
    const cached = iconSourceCache[key];

    if (!cached) return null;

    if (!cached.expires || cached.expires < Date.now()) {
      delete iconSourceCache[key];
      saveIconSourceCache();
      return null;
    }

    return cached;
  }

  function setCachedIconSource(domain, source, url, ttl) {
    const key = String(domain || '').toLowerCase();
    if (!key) return;

    iconSourceCache[key] = {
      source: source || 'none',
      url: url || '',
      expires: Date.now() + ttl
    };

    pruneIconSourceCache();
    saveIconSourceCache();
  }

  function deleteCachedIconSource(domain) {
    const key = String(domain || '').toLowerCase();
    if (!key) return;

    delete iconSourceCache[key];
    saveIconSourceCache();
  }

  function pruneIconSourceCache() {
    const entries = Object.entries(iconSourceCache);
    const now = Date.now();

    for (const [key, value] of entries) {
      if (!value || !value.expires || value.expires < now) {
        delete iconSourceCache[key];
      }
    }

    const freshEntries = Object.entries(iconSourceCache);
    if (freshEntries.length <= ICON_CACHE_MAX_ITEMS) return;

    freshEntries
      .sort((a, b) => (a[1].expires || 0) - (b[1].expires || 0))
      .slice(0, freshEntries.length - ICON_CACHE_MAX_ITEMS)
      .forEach(([key]) => delete iconSourceCache[key]);
  }

  function exposeDebugApi() {
    window.GSF = Object.assign(window.GSF || {}, {
      clearIconCache() {
        iconSourceCache = {};
        saveIconSourceCache();
        return 'GSF icon cache cleared';
      },
      getIconCache() {
        return { ...iconSourceCache };
      }
    });
  }

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

  function getLocalPartFromEmail(email) {
    const at = String(email || '').lastIndexOf('@');
    if (at === -1) return '';

    return email
      .slice(0, at)
      .trim()
      .toLowerCase();
  }

  function matchServiceSender(email, rawDomain) {
    const domain = String(rawDomain || '').trim().toLowerCase();
    const local = getLocalPartFromEmail(email);

    if (!domain || !local) return null;

    for (const rule of SERVICE_SENDERS) {
      if (rule.domain !== domain) continue;
      if (rule.local && rule.local === local) return rule;
      if (rule.prefix && local.startsWith(rule.prefix)) return rule;
      if (rule.includes && local.includes(rule.includes)) return rule;
      if (rule.pattern && rule.pattern.test && rule.pattern.test(local)) return rule;
    }

    return null;
  }

  function getIconCacheKey(model) {
    return String(model.cacheKey || model.imageKey || model.iconDomain || '')
      .trim()
      .toLowerCase();
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
    const host = String(domain || '').replace(/^https?:\/\//i, '').split('/')[0];
    return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`;
  }

  function getHostFromDomainLike(domain) {
    return String(domain || '')
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .trim()
      .toLowerCase();
  }

  function getLocalImageUrl(domain) {
    const file = LOCAL_IMAGES[domain];
    if (!file) return '';

    return `${IMAGE_BASE}/${encodePath(file)}`;
  }

  function cleanDnsTxtValue(value) {
    const text = String(value || '').trim();
    const quotedParts = text.match(/"(?:\\.|[^"\\])*"/g);

    if (quotedParts && quotedParts.length) {
      return quotedParts
        .map(part => part.slice(1, -1).replace(/\\"/g, '"'))
        .join('');
    }

    return text.replace(/^"|"$/g, '');
  }

  function parseBimiLogoUrl(txt) {
    const record = String(txt || '').trim();
    if (!/\bv\s*=\s*BIMI1\b/i.test(record)) return '';

    const match = record.match(/(?:^|;)\s*l\s*=\s*([^;\s]+)/i);
    if (!match) return '';

    const url = match[1].trim();
    return /^https:\/\//i.test(url) ? url : '';
  }

  async function getBimiLogoUrl(domain) {
    if (!USE_BIMI) return '';

    const cleanDomain = String(domain || '').trim().toLowerCase();
    if (!cleanDomain) return '';

    const name = `default._bimi.${cleanDomain}`;
    const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=TXT`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BIMI_DNS_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });

      if (!response.ok) return '';

      const data = await response.json();
      const answers = Array.isArray(data.Answer) ? data.Answer : [];

      for (const answer of answers) {
        const txt = cleanDnsTxtValue(answer.data);
        const logoUrl = parseBimiLogoUrl(txt);
        if (logoUrl) return logoUrl;
      }

      return '';
    } catch {
      return '';
    } finally {
      clearTimeout(timeout);
    }
  }

  async function buildIconCandidates(model) {
    const domain = String(model.iconDomain || '').trim().toLowerCase();
    const imageKey = String(model.imageKey || domain).trim().toLowerCase();
    const candidates = [];

    if (!domain && !imageKey) return candidates;

    const localUrl = USE_LOCAL_IMAGES && imageKey ? getLocalImageUrl(imageKey) : '';
    const localFirst = imageKey && LOCAL_IMAGE_FIRST_DOMAINS.has(imageKey);

    if (localFirst && localUrl) {
      candidates.push({ source: 'local', url: localUrl });
    }

    // BIMI проверяем только по настоящему домену, а не по внутреннему ключу картинки.
    const bimiDomain = getHostFromDomainLike(domain);

    if (USE_BIMI && model.kind !== 'person' && bimiDomain && bimiDomain.includes('.')) {
      const bimiUrl = await getBimiLogoUrl(bimiDomain);
      if (bimiUrl) {
        candidates.push({ source: 'bimi', url: bimiUrl });
      }
    }

    if (domain) {
      if (USE_GOOGLE_FAVICONS) {
        candidates.push({ source: 'google', url: getGoogleFaviconUrl(domain) });
      }

      if (USE_DUCKDUCKGO_FAVICONS) {
        candidates.push({ source: 'duckduckgo', url: getDuckDuckGoFaviconUrl(domain) });
      }
    }

    if (!localFirst && localUrl) {
      candidates.push({ source: 'local', url: localUrl });
    }

    const seen = new Set();
    return candidates.filter(candidate => {
      if (!candidate.url || seen.has(candidate.url)) return false;
      seen.add(candidate.url);
      return true;
    });
  }

  function probeImage(url) {
    return new Promise(resolve => {
      if (!url) {
        resolve(false);
        return;
      }

      const img = new Image();
      let done = false;

      const finish = ok => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        resolve(Boolean(ok));
      };

      const timeout = setTimeout(() => finish(false), IMAGE_PROBE_TIMEOUT_MS);

      img.onload = () => finish(Boolean(img.naturalWidth && img.naturalHeight));
      img.onerror = () => finish(false);
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async';
      img.src = url;
    });
  }

  async function resolveIconSource(model) {
    const cacheKey = getIconCacheKey(model);
    if (!cacheKey) return null;

    const cached = getCachedIconSource(cacheKey);
    if (cached) {
      return cached.url ? cached : null;
    }

    if (PENDING_ICON_RESOLVES.has(cacheKey)) {
      return PENDING_ICON_RESOLVES.get(cacheKey);
    }

    const pending = (async () => {
      try {
        const candidates = await buildIconCandidates(model);

        for (const candidate of candidates) {
          const ok = await probeImage(candidate.url);
          if (!ok) continue;

          setCachedIconSource(cacheKey, candidate.source, candidate.url, ICON_CACHE_TTL_SUCCESS);
          return candidate;
        }

        setCachedIconSource(cacheKey, 'none', '', ICON_CACHE_TTL_EMPTY);
        return null;
      } catch {
        setCachedIconSource(cacheKey, 'error', '', ICON_CACHE_TTL_ERROR);
        return null;
      } finally {
        PENDING_ICON_RESOLVES.delete(cacheKey);
      }
    })();

    PENDING_ICON_RESOLVES.set(cacheKey, pending);
    return pending;
  }

  function getSenderModel(info) {
    const email = info.email;
    const rawDomain = getDomainFromEmail(email);

    const serviceSender = matchServiceSender(email, rawDomain);

    if (serviceSender) {
      return {
        kind: 'org',
        email,
        rawDomain,
        iconDomain: serviceSender.iconDomain,
        imageKey: serviceSender.key,
        cacheKey: serviceSender.key,
        mainDomain: serviceSender.iconDomain,
        baseLetter: pickLetter(serviceSender.label, serviceSender.iconDomain),
        overlayLetter: '',
        senderText: serviceSender.label || info.senderText || email
      };
    }

    const projectDomain = normalizeProjectDomain(rawDomain);

    if (projectDomain) {
      return {
        kind: 'org',
        email,
        rawDomain,
        iconDomain: projectDomain,
        imageKey: projectDomain,
        cacheKey: projectDomain,
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
        imageKey: mailProvider,
        cacheKey: mailProvider,
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
      imageKey: mainDomain,
      cacheKey: mainDomain,
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
      backgroundColor: stableColor(getIconCacheKey(model) || model.email || letter),
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

  function makeImage(url = '') {
    const img = document.createElement('img');
    img.className = BADGE_IMG_CLASS;
    img.alt = '';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';

    Object.assign(img.style, {
      display: 'block',
      width: '18px',
      height: '18px',
      borderRadius: '4px',
      objectFit: 'contain'
    });

    if (url) img.src = url;

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

  function sameBadgeModel(badge, model) {
    return Boolean(
      badge &&
      badge.dataset.gsfEmail === model.email &&
      badge.dataset.gsfDomain === getIconCacheKey(model) &&
      badge.dataset.gsfKind === model.kind &&
      badge.dataset.gsfLetter === (model.overlayLetter || model.baseLetter || '?')
    );
  }

  function applyResolvedIcon(badge, model, resolved) {
    if (!resolved || !resolved.url || !sameBadgeModel(badge, model)) return;

    const img = makeImage();

    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        deleteCachedIconSource(getIconCacheKey(model));
        return;
      }

      if (!sameBadgeModel(badge, model)) return;

      badge.dataset.gsfIconSource = resolved.source || 'unknown';
      badge.title = model.kind === 'person'
        ? `${model.senderText} • ${model.iconDomain}
icon: ${badge.dataset.gsfIconSource}`
        : `${model.senderText || model.iconDomain} • ${model.iconDomain}
icon: ${badge.dataset.gsfIconSource}`;

      applyImageBadge(badge, img, model);
    };

    img.onerror = () => {
      deleteCachedIconSource(getIconCacheKey(model));
    };

    img.src = resolved.url;
  }

  function makeBadge(model) {
    const badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    badge.dataset.gsfKind = model.kind;
    badge.dataset.gsfEmail = model.email || '';
    badge.dataset.gsfDomain = getIconCacheKey(model);
    badge.dataset.gsfLetter = model.overlayLetter || model.baseLetter || '?';
    badge.title = model.kind === 'person'
      ? `${model.senderText} • ${model.iconDomain}`
      : `${model.senderText || model.iconDomain} • ${model.iconDomain}`;
    badge.setAttribute('aria-hidden', 'true');

    // Сначала всегда показываем fallback, чтобы никогда не было пустого места.
    setBaseFallback(badge, model);

    resolveIconSource(model).then(resolved => {
      applyResolvedIcon(badge, model, resolved);
    });

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
    if (currentBadge && sameBadgeModel(currentBadge, model)) {
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
    exposeDebugApi();
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
