# Sophia

Образовательная SaaS-платформа для интерактивного изучения философии. Принцип: **Learn to think, not what to think.**

На `/` ровно три секции — Hero с самостоятельным философским вопросом, превью основного курса и выбор направления. На `/learn` — интерактивная горизонтальная карта курса: пять эпох по пять шагов, мир 5900 × 650 px, пять детальных рисованных эпох шириной 1180 px с узнаваемыми архитектурными символами и встроенной тропой и объёмные кнопки из материалов своей эпохи. Карта показывает структуру будущего курса; полные уроки, аккаунты и сохранение прогресса ещё не реализованы. Проверенное состояние — в [CURRENT_STATE.md](docs/development/CURRENT_STATE.md).

## Стек и окружение

Стек: Next.js App Router, React, TypeScript strict, Tailwind CSS, кнопка на основе shadcn/ui, Lucide Icons, Motion. Требуется Node.js >=20.9.0 и npm; проверено на Node.js 24.22.1 и npm 11.19.1. Точные версии закреплены в `package.json` и `package-lock.json`. Подробности — в [TECH_STACK.md](docs/architecture/TECH_STACK.md).

## Установка и запуск

Из корня проекта:

```powershell
npm.cmd ci
npm.cmd run dev
```

Открыть [http://127.0.0.1:3000](http://127.0.0.1:3000). На Windows команды используют `npm.cmd`, чтобы не зависеть от политики запуска PowerShell-скриптов. В других оболочках можно использовать `npm`.

Для production-режима: `npm.cmd run build`, затем `npm.cmd run start`. Сервер по умолчанию доступен только на этом компьютере. Переменные окружения, секреты и внешние сервисы не требуются; шрифт поставляется локально.

## Проверки

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd test
```

Браузерные тесты запускают production-сервер, поэтому перед ними нужна сборка. Playwright проверяет Chromium в настольном и мобильном профилях; отдельная установка Chromium нужна один раз на машине. Проверки и их ограничения — в [TESTING.md](docs/development/TESTING.md).

## Документация

| Документ | Ответственность |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Порядок работы Codex и ограничения изменений |
| [PRODUCT.md](docs/product/PRODUCT.md) | Концепция и принципы продукта |
| [MVP.md](docs/product/MVP.md) | Границы и критерии первого этапа |
| [ROADMAP.md](docs/product/ROADMAP.md) | Предварительные этапы развития |
| [OVERVIEW.md](docs/architecture/OVERVIEW.md) | Архитектура и взаимодействие слоёв |
| [STRUCTURE.md](docs/architecture/STRUCTURE.md) | Фактические каталоги и размещение новых модулей |
| [TECH_STACK.md](docs/architecture/TECH_STACK.md) | Статусы технологий и окружения |
| [INVARIANTS.md](docs/architecture/INVARIANTS.md) | Постоянные ограничения и способы проверки |
| [DECISIONS.md](docs/architecture/DECISIONS.md) | Журнал принятых архитектурных решений |
| [DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md) | Визуальный язык и палитра |
| [UX_GUIDELINES.md](docs/design/UX_GUIDELINES.md) | Правила взаимодействия и доступности |
| [CONVENTIONS.md](docs/development/CONVENTIONS.md) | Именование и организация кода |
| [TESTING.md](docs/development/TESTING.md) | Стратегия и доступность проверок |
| [CURRENT_STATE.md](docs/development/CURRENT_STATE.md) | Реализованное, планы, проблемы и следующий шаг |
| [references/README.md](docs/references/README.md) | Учёт исходных материалов и референсов |

Начало новой сессии: `AGENTS.md` → `CURRENT_STATE.md` → профильные документы → соответствующий код. Каждый документ отвечает за свою тему; ссылки заменяют копирование правил.
