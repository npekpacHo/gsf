// ==UserScript==
// @name         GSF (ИПИГ) - Иконки для писем в GMAIL
// @namespace    local
// @version      1.45
// @icon         https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico
// @author       westakof, npekpacHo
// @description  Добавляет иконки отправителей в Gmail. Оптимизировано для AdGuard.
// @homepageURL    https://npekpacho.ru/
// @updateURL      https://npekpacho.ru/downloads/gmail_sender_favicon.js
// @downloadURL    https://npekpacho.ru/downloads/gmail_sender_favicon.js
// @match        https://mail.google.com/*
// @run-at       document-end
// ==/UserScript==

(() => {
  'use strict';

  const STYLE_ID = 'gm-sender-favicon-style-final';
  const BADGE_CLASS = 'gm-sender-badge-final';

  // --- НАСТРОЙКИ: ИСПРАВЛЕНИЕ ДОМЕНОВ ---
  // Если иконка не находится, добавьте сюда правило.
  // Ключ: часть домена отправителя. Значение: домен, с которого брать иконку.
  const DOMAIN_FIXES = {
      'ozon.ru': 'ozon.ru',           // Письма с mailer.ozon.ru -> иконка от ozon.ru
      'vk.com': 'vk.com',             // notify.vk.com -> vk.com
      'dom.ru': 'dom.ru',             // b2b.dom.ru -> dom.ru
      'gosuslugi.ru': 'gosuslugi.ru', // gosuslugi.ru -> gosuslugi.ru
      'wildberries.ru': 'wildberries.ru',
      'wb.ru': 'wildberries.ru',      // wb.ru -> wildberries.ru
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

  // Внедрение стилей
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${BADGE_CLASS} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-right: 8px;
        vertical-align: middle;
        flex: 0 0 auto;
        width: 16px;
        height: 16px;
      }
      .${BADGE_CLASS} img {
        width: 16px;
        height: 16px;
        border-radius: 3px;
        display: block;
        object-fit: contain;
      }
      .${BADGE_CLASS} .gm-letter {
        font-weight: 700;
        font-size: 11px;
        line-height: 16px;
        text-align: center;
        width: 100%;
        height: 100%;
        display: block;
        border-radius: 3px;
        color: #fff;
        text-shadow: 0 0 2px rgba(0,0,0,0.3);
        background-color: #ccc;
      }
    `;
    document.documentElement.appendChild(style);
  }

  // ---------- Хелперы ----------

  function extractEmailLike(str) {
    if (!str) return '';
    const s = String(str);
    const m1 = s.match(/<\s*([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\s*>/i);
    if (m1) return m1[1];
    const m2 = s.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
    if (m2) return m2[1];
    return '';
  }

  function getDomainFromEmail(email) {
    const at = (email || '').indexOf('@');
    if (at === -1) return '';
    return email.slice(at + 1).trim().toLowerCase();
  }

  // Функция для нормализации домена (исправление "пустых" иконок)
  function normalizeDomain(originalDomain) {
      if (!originalDomain) return '';
      
      // Проверяем точное совпадение или окончание
      for (const [key, fix] of Object.entries(DOMAIN_FIXES)) {
          if (originalDomain === key || originalDomain.endsWith('.' + key)) {
              return fix;
          }
      }
      return originalDomain;
  }

  function stableColor(seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return `hsl(${Math.abs(h) % 360}, 65%, 45%)`;
  }

  function pickLetter(senderText, domain) {
    const m = (senderText || '').match(/[a-z0-9а-яё]/i);
    if (m) return m[0].toUpperCase();
    if (domain) return domain[0].toUpperCase();
    return '?';
  }

  // ---------- Поиск данных в строке ----------
  function findSenderInfo(row) {
    const emailSpan = row.querySelector('span[email]');
    if (emailSpan) {
      return {
        email: emailSpan.getAttribute('email'),
        senderText: emailSpan.innerText || emailSpan.getAttribute('name'),
        node: emailSpan
      };
    }
    const hcSpan = row.querySelector('span[data-hovercard-id]');
    if (hcSpan) {
        const raw = hcSpan.getAttribute('data-hovercard-id');
        return {
            email: extractEmailLike(raw),
            senderText: hcSpan.innerText,
            node: hcSpan
        };
    }
    return null;
  }

  // ---------- Создание значка ----------
  function makeBadge(rawDomain, letter) {
    const badge = document.createElement('span');
    badge.className = BADGE_CLASS;

    // Применяем исправление домена (например, mailer.ozon.ru -> ozon.ru)
    const domain = normalizeDomain(rawDomain);

    const sources = domain
      ? [
          `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(domain)}`,
          `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`
        ]
      : [];

    const img = document.createElement('img');
    let idx = 0;

    const showLetter = () => {
      badge.innerHTML = '';
      const span = document.createElement('span');
      span.className = 'gm-letter';
      span.textContent = letter;
      span.style.backgroundColor = stableColor(domain || letter);
      badge.appendChild(span);
    };

    img.onerror = () => {
      idx++;
      if (idx < sources.length) {
        img.src = sources[idx];
      } else {
        showLetter();
      }
    };

    if (sources.length) {
      img.src = sources[0];
      badge.appendChild(img);
    } else {
      showLetter();
    }

    return badge;
  }

  // ---------- Обработка одной строки ----------
  function enhanceRow(row) {
    if (row.querySelector(`.${BADGE_CLASS}`)) return;

    const info = findSenderInfo(row);
    if (!info || !info.email) return;

    const rawDomain = getDomainFromEmail(info.email);
    const letter = pickLetter(info.senderText, rawDomain);

    let target = row.querySelector('.yX') || info.node.parentElement;
    
    if (target) {
        if (target.querySelector(`.${BADGE_CLASS}`)) return;

        const badge = makeBadge(rawDomain, letter);
        
        if (target.firstChild) {
            target.insertBefore(badge, target.firstChild);
        } else {
            target.appendChild(badge);
        }
    }
  }

  function enhanceAll() {
    const rows = document.querySelectorAll('.zA');
    rows.forEach(enhanceRow);
  }

  // ---------- Запуск и наблюдение ----------
  
  let timeoutId = null;
  function schedule() {
    if (timeoutId) return;
    timeoutId = requestAnimationFrame(() => {
      timeoutId = null;
      enhanceAll();
    });
  }

  function init() {
    injectStyles();
    
    const obs = new MutationObserver(() => schedule());
    obs.observe(document.body, { childList: true, subtree: true });
    
    setInterval(() => schedule(), 2000);

    enhanceAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();