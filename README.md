# GSF (ИПИГ) — иконки отправителей в Gmail

![AdGuard](https://img.shields.io/badge/AdGuard-userscript-66b574)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-compatible-222222)
![Gmail](https://img.shields.io/badge/Gmail-web-D14836)
![Version](https://img.shields.io/badge/version-1.82-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**GSF (ИПИГ)** «Иконки Писем в Гуглопочте» — userscript для веб-интерфейса Gmail. Добавляет маленькие иконки рядом с отправителями писем, чтобы список входящих был нагляднее и быстрее читался.

## Что делает

* Для писем от сайтов и организаций показывает favicon основного домена.
* Для обычных почтовых ящиков (`gmail.com`, `yandex.ru`, `mail.ru` и т.п.) показывает иконку почтового сервиса и букву отправителя поверх неё.
* Поддерживает сопоставления доменов, например `sber.ru → sberbank.ru`.
* Умеет отдельно обрабатывать проекты на поддоменах, например `uslugi.yandex.ru` и `webmaster.yandex.ru`.
* Может использовать свои PNG-иконки из папки `images` подгружая их в интерфейс Gmail прямо с Гитхаба
* Если иконка не загрузилась, показывает цветную буквенную заглушку.

## Установка

### AdGuard

Добавьте userscript по ссылке:

```text
https://npekpacho.github.io/gsf/gsf.user.js
```

После установки откройте или перезагрузите Gmail.

### Tampermonkey

Откройте ссылку в браузере с установленным Tampermonkey:

```text
https://npekpacho.github.io/gsf/gsf.user.js
```

Tampermonkey предложит установить скрипт.



Обновления идут через GitHub Pages. Новая версия при проверке обновлений сама подтянется.


## Приватность

Скрипт работает локально в браузере. Содержимое писем никуда не отправляется.

Для загрузки favicon внешним сервисам может передаваться только домен отправителя, например `example.com`, но не полный email и не текст письма.



## Дисклеймер

Проект не связан с Google, Gmail, DuckDuckGo, Яндексом, Mail.ru, AdGuard или другими сервисами. Все названия и товарные знаки принадлежат их владельцам.


