# Sophia

Образовательная платформа для интерактивного изучения философии. Принцип: **Learn to think, not what to think.**

На `/` ровно три секции — Hero с самостоятельным философским вопросом, превью основного курса и выбор направления. На `/learn` — интерактивная горизонтальная карта курса: пять эпох: четыре основных узла Античности с веткой Платона и по пять шагов в остальных эпохах; мир 5900 × 650 px, пять детальных рисованных эпох шириной 1180 px с узнаваемыми архитектурными символами и встроенной тропой и объёмные кнопки из материалов своей эпохи. Карта показывает структуру будущего курса; полные уроки, аккаунты и сохранение прогресса ещё не реализованы. Проверенное состояние — в [CURRENT_STATE.md](docs/development/CURRENT_STATE.md).

## Стек и окружение

Атлас доступен на `/atlas` через существующий пункт верхнего меню. На первом этапе это только интерактивная Земля: вращение, масштаб и исходный вид, без географических подписей, маркеров и учебного контента. Поддерживаются мышь, сенсорные жесты и клавиатура (стрелки, `+`/`-`, `Home` после фокуса на области глобуса). UI сохраняет оформление Sophia, тёмной остаётся область сцены. Текстура NASA поставляется локально; [источник и условия использования](public/textures/earth/README.md).

Стек: Next.js App Router, React, TypeScript strict, Tailwind CSS, кнопка на основе shadcn/ui, Lucide Icons, Motion, встроенный SQLite; Three.js, React Three Fiber и Drei для атласа. Требуется Node.js >=24.0.0 и npm; проверено на Node.js 24.22.1 и npm 11.19.1. Точные версии закреплены в `package.json` и `package-lock.json`. Подробности — в [TECH_STACK.md](docs/architecture/TECH_STACK.md).

## Установка и запуск

Из корня проекта:

```powershell
npm.cmd ci
npm.cmd run dev
```

Открыть [http://127.0.0.1:3000](http://127.0.0.1:3000). На Windows команды используют `npm.cmd`, чтобы не зависеть от политики запуска PowerShell-скриптов. В других оболочках можно использовать `npm`.

Для production-режима: `npm.cmd run build`, затем `npm.cmd run start`. Сервер по умолчанию доступен только на этом компьютере. Для просмотра страниц внешние сервисы не требуются; для ответов Платона нужны серверный ключ OpenAI и локальная база корпуса. Шрифт и изображения поставляются локально.

## Разговор с философом

Кнопка доступна рядом с картой `/learn` и в средней карточке на главной. Платон отвечает через серверный OpenAI API с выдержками из общей базы. Аристотель и Марк Аврелий пока помечены «Скоро». Есть отправка по Enter (Shift+Enter — новая строка), отмена, новый разговор и восстановление вопроса при ошибке. Это учебный ИИ-собеседник, который может ошибаться.

В **`.env.local` в корне проекта** (`D:\Sophia\.env.local`) укажите:

```dotenv
OPENAI_API_KEY=ваш_ключ
OPENAI_MODEL=gpt-5.4-mini
```

Шаблон — [.env.example](.env.example). `.env.local` исключён из Git. Не используйте префикс `NEXT_PUBLIC_`: ключ используется только сервером и не передаётся браузеру. После изменения окружения перезапустите сервер. `OPENAI_MODEL` необязателен; значение по умолчанию указано выше.

Память существует только в открытой вкладке: закрытие окна и переходы между страницами сохраняют её, reload очищает. Сервер использует ограниченную историю, структурированное состояние и до шести найденных фрагментов. Переписка не пишется в БД/browser storage. На этой машине корпус проиндексирован с разрешения пользователя; после переноса потребуется `npm.cmd run knowledge:index` (платная отправка корпуса в OpenAI с согласия владельца). Статус: `npm.cmd run knowledge:index-status`. Без индекса — 503; без достаточного подтверждения ответ может быть ограничен. Архитектура, запуск и ограничения — в [PLATO_RAG.md](docs/architecture/PLATO_RAG.md).

## Проверки

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:chat
npm.cmd run test:knowledge
npx.cmd playwright install chromium
npm.cmd test
```

Браузерные тесты запускают production-сервер, поэтому перед ними нужна сборка. Playwright проверяет Chromium в настольном и мобильном профилях; отдельная установка Chromium нужна один раз на машине. Проверки и их ограничения — в [TESTING.md](docs/development/TESTING.md).

## Документация

Для базы корпусов: `npm.cmd run knowledge:status`, `npm.cmd run knowledge:verify -- --document plato-corpus`, `npm.cmd run test:knowledge`. Импорт, связи философов/тем и бэкап — в [KNOWLEDGE_STORAGE.md](docs/architecture/KNOWLEDGE_STORAGE.md). База и исходники в `storage/knowledge/` исключены из Git; чат читает их только на сервере. Клонирование репозитория не переносит корпус.

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
| [KNOWLEDGE_STORAGE.md](docs/architecture/KNOWLEDGE_STORAGE.md) | Единая база корпусов, импорт, версии и сохранность |
| [PHILOSOPHER_CHAT.md](docs/architecture/PHILOSOPHER_CHAT.md) | API чата, память вкладки, лимиты и безопасность |
| [PLATO_RAG.md](docs/architecture/PLATO_RAG.md) | Историческая роль, семантический индекс, safety, проверка ответов и запуск |
| [PLATO_DIALOGUE.md](docs/architecture/PLATO_DIALOGUE.md) | Первое лицо, сократическая беседа, generation policy, проверка стиля и реальные сценарии |
| [DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md) | Визуальный язык и палитра |
| [UX_GUIDELINES.md](docs/design/UX_GUIDELINES.md) | Правила взаимодействия и доступности |
| [CONVENTIONS.md](docs/development/CONVENTIONS.md) | Именование и организация кода |
| [TESTING.md](docs/development/TESTING.md) | Стратегия и доступность проверок |
| [CURRENT_STATE.md](docs/development/CURRENT_STATE.md) | Реализованное, планы, проблемы и следующий шаг |
| [references/README.md](docs/references/README.md) | Учёт исходных материалов и референсов |

Начало новой сессии: `AGENTS.md` → `CURRENT_STATE.md` → профильные документы → соответствующий код. Каждый документ отвечает за свою тему; ссылки заменяют копирование правил.
