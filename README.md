# GSF (ИПИГ) — иконки отправителей в Gmail

![AdGuard](https://img.shields.io/badge/AdGuard-userscript-66b574)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-compatible-222222)
![Gmail](https://img.shields.io/badge/Gmail-web-D14836)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**GSF (ИПИГ)** — userscript для веб-интерфейса Gmail, который добавляет маленькие иконки сайтов рядом с отправителями писем.

Скрипт делает список писем нагляднее: письма от банков, магазинов, сервисов, маркетплейсов, соцсетей и других отправителей легче отличать друг от друга с первого взгляда.

> ИПИГ — «Иконки Писем в Gmail». Да, название максимально серьёзное. Почти как комитет по табличкам.

---

## Что умеет

* Добавляет иконку рядом с именем отправителя в списке писем Gmail.
* Берёт favicon сайта по домену отправителя.
* Сначала использует **Google favicon service**.
* Затем пробует **DuckDuckGo favicon service**.
* Поддерживает ручные исправления доменов.
* Поддерживает свои иконки из папки `icons` через GitHub Pages.
* Если иконка не загрузилась, показывает цветную буквенную заглушку.
* Не оставляет пустых мест вместо иконок.
* Учитывает динамическую подгрузку писем в Gmail.
* Оптимизирован для AdGuard, но может работать и в Tampermonkey.

---

## Установка

### AdGuard

1. Откройте настройки AdGuard.
2. Перейдите в раздел **Расширения** / **Userscripts**.
3. Добавьте новый userscript по ссылке:

```text
https://npekpacho.github.io/gsf/gsf.user.js
```

4. Откройте или перезагрузите Gmail.

---

### Tampermonkey

Откройте ссылку в браузере с установленным Tampermonkey:

```text
https://npekpacho.github.io/gsf/gsf.user.js
```

Tampermonkey должен предложить установить скрипт.

---

## Как это работает

Скрипт ищет строки писем в веб-интерфейсе Gmail, определяет email отправителя, извлекает домен и добавляет перед именем отправителя маленькую иконку.

Порядок источников иконок:

1. Google favicon service.
2. DuckDuckGo favicon service.
3. Ручная иконка из GitHub Pages, если она указана в настройках.
4. Цветная буква, если ничего не загрузилось.

Пример:

```text
news@example.com → example.com → favicon example.com
```

Если отправитель использует технический поддомен, его можно привести к нормальному домену:

```text
mailer.ozon.ru → ozon.ru
```

---

## Исправление доменов

Некоторые письма приходят с технических доменов, которые плохо подходят для поиска favicon.

Например:

```text
mailer.ozon.ru
notify.vk.com
pofd.ru
checkkontur.ru
```

Для таких случаев в скрипте есть объект `DOMAIN_FIXES`:

```js
const DOMAIN_FIXES = {
  'mailer.ozon.ru': 'ozon.ru',
  'notify.vk.com': 'vk.com',
  'pofd.ru': 'platformaofd.ru',
  'checkkontur.ru': 'platformaofd.ru'
};
```

Слева указывается домен отправителя или его часть, справа — домен сайта, favicon которого нужно показать.

---

## Свои иконки

Если favicon у сервиса плохой, пустой или неправильный, можно добавить свою иконку.

### 1. Положите файл в папку `icons`

Например:

```text
icons/platformaofd.png
```

После публикации через GitHub Pages файл будет доступен примерно так:

```text
https://npekpacho.github.io/gsf/icons/platformaofd.png
```

### 2. Добавьте домен в `CUSTOM_ICON_FILES`

```js
const CUSTOM_ICON_FILES = {
  'platformaofd.ru': 'platformaofd.png'
};
```

По умолчанию ручная иконка используется после Google и DuckDuckGo.

### 3. Сделайте ручную иконку приоритетной, если нужно

Если favicon-сервисы стабильно показывают неправильную иконку, добавьте домен в `CUSTOM_ICON_FIRST_DOMAINS`:

```js
const CUSTOM_ICON_FIRST_DOMAINS = new Set([
  'platformaofd.ru'
]);
```

Тогда скрипт сначала попробует вашу иконку, а уже потом внешние favicon-сервисы.

---

## Настройки источников

В начале скрипта есть переключатели:

```js
const USE_GOOGLE_FAVICONS = true;
const USE_DUCKDUCKGO_FAVICONS = true;
const USE_CUSTOM_ICONS = true;
```

Их можно отключать, если нужно изменить поведение.

Например, если вы хотите использовать только свои иконки и буквенные заглушки:

```js
const USE_GOOGLE_FAVICONS = false;
const USE_DUCKDUCKGO_FAVICONS = false;
const USE_CUSTOM_ICONS = true;
```

---

## Приватность

Скрипт работает локально в браузере и не отправляет содержимое писем куда-либо.

Но для загрузки favicon используются внешние сервисы:

* Google favicon service;
* DuckDuckGo favicon service;
* GitHub Pages для ручных иконок.

При запросе favicon внешнему сервису передаётся домен отправителя, например:

```text
example.com
```

Полный email-адрес и текст письма скрипт этим сервисам не отправляет.

Если это нежелательно, можно отключить внешние favicon-сервисы и оставить только свои иконки и буквенные заглушки.

---

## Известные ограничения

* Скрипт работает только в веб-интерфейсе Gmail.
* В мобильном приложении Gmail он работать не будет.
* Gmail периодически меняет DOM, поэтому скрипт может потребовать доработки после очередного «улучшения» интерфейса.
* Google или DuckDuckGo могут вернуть стандартную или неправильную favicon.
* Некоторые favicon могут блокироваться настройками браузера, AdGuard или сетью.

---

## Обновление

Скрипт обновляется через GitHub Pages:

```text
https://npekpacho.github.io/gsf/gsf.user.js
```

При изменении скрипта нужно повышать значение `@version` в шапке userscript.

Пример:

```js
// @version        1.70
```

---

## Структура проекта

```text
gsf/
├─ gsf.user.js
├─ icons/
│  ├─ platformaofd.png
│  ├─ cloudpayments.png
│  └─ aliexpress.png
├─ README.md
└─ LICENSE
```

---

## Лицензия

MIT License.

---

## Дисклеймер

Проект не связан с Google, Gmail, DuckDuckGo или AdGuard.

Gmail является товарным знаком Google LLC. Все названия компаний, сервисов и брендов принадлежат их владельцам.

