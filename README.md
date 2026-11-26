# Sophia

Образовательная платформа для интерактивного изучения философии. Принцип: **Learn to think, not what to think.**

На `/` три секции — Hero с «Вопросом дня» и ежедневной серией, превью основного курса и выбор направления. На `/learn` — интерактивная горизонтальная карта курса с пятью эпохами, рисованными пейзажами и уроками Платона. Проверенное состояние — в [CURRENT_STATE.md](docs/development/CURRENT_STATE.md).

## Стек и окружение

Атлас доступен на `/atlas` через существующий пункт верхнего меню. Историческая шкала **650 до н. э. — 2026 н. э.** показывает 80 философов в годы их жизни. Есть семь быстрых переходов по эпохам, точный ввод года с выбором эры и общий ползунок; исторического нуля нет. Близкие портреты раскрываются списком, карточки содержат даты, традицию, биографию и тип географической связи. Датировки и точки городов могут быть приблизительными ([прежние записи](docs/references/ATLAS_HISTORY.md), [новые биографии](docs/references/ATLAS_MODERN_HISTORY.md)). Живущие имеют открытые даты жизни. Поддерживаются мышь, сенсорные жесты и клавиатура (стрелки, `+`/`-`, `Home` после фокуса на глобусе). Светлое оформление Sophia и глобус без рамки сохранены. Текстура NASA и 78 портретов локальны; два отсутствующих портрета и ошибки загрузки заменяются инициалами. [Текстура](public/textures/earth/README.md), [изображения и лицензии](public/images/philosophers/README.md).

Стек: Next.js App Router, React, TypeScript strict, Tailwind CSS, кнопка на основе shadcn/ui, Lucide Icons, Motion, встроенный SQLite; Three.js, React Three Fiber и Drei для атласа. Требуется Node.js >=24.7.0 и npm; для VPS используйте актуальный Node.js 24 LTS. Точные версии закреплены в `package.json` и `package-lock.json`. Подробности — в [TECH_STACK.md](docs/architecture/TECH_STACK.md).

## Установка и запуск

Из корня проекта:

```powershell
npm.cmd ci
npm.cmd run dev
```

Открыть [http://127.0.0.1:3000](http://127.0.0.1:3000). На Windows команды используют `npm.cmd`, чтобы не зависеть от политики запуска PowerShell-скриптов. В других оболочках можно использовать `npm`.

Для production-режима: `npm.cmd run build`, затем `npm.cmd run start`. Сервер по умолчанию доступен только на этом компьютере. Для просмотра страниц внешние сервисы не требуются; для ответов Платона нужны серверный ключ OpenAI и локальная база корпуса. Шрифт и изображения поставляются локально.

## Аккаунты и прогресс

Гостям доступны карта, Атлас и бесплатные уроки. Аккаунт открывает профиль и синхронизацию подтверждений слайдов, завершений и мест возобновления. Подтверждение email и восстановление пароля требуют настроенной почты. Для локальной проверки доступен файловый тестовый транспорт. [Миграции, HTTPS, почта и резервные копии](docs/development/ACCOUNT_SERVER.md).

## Разговор с философом

Публичный чат временно закрыт. Окно открывается рядом с картой `/learn` и из средней карточки на главной. Статус Платона также доступен по адресу `/chat`. Отправку можно включить на закрытом локальном экземпляре. Для неё нужен аккаунт с подтверждённой почтой и серверным правом `ai_chat`, которое владелец выдаёт через CLI. Платон отвечает через серверный OpenAI API с выдержками из общей базы.

Для закрытой локальной разработки в **`.env.local` в корне проекта** укажите:

```dotenv
AI_CHAT_ENABLED=true
OPENAI_API_KEY=ваш_ключ
OPENAI_MODEL=gpt-5.4-mini-2026-03-17
CHAT_ACCESS_MODE=local
CHAT_ALLOWED_ORIGINS=http://127.0.0.1:3000
```

В [.env.example](.env.example) задано `AI_CHAT_ENABLED=false`. `.env.local` исключён из Git. Ключ и флаг доступны только серверу. После изменения окружения перезапустите сервер. `OPENAI_MODEL` необязателен. [Запуск сервера чата](docs/development/CHAT_SERVER.md) · [Безопасность чата](docs/architecture/PLATO_CHAT_SECURITY.md).

Память существует только в открытой вкладке: закрытие окна и переходы между страницами сохраняют её, reload очищает. Сервер использует ограниченную историю, структурированное состояние и до шести найденных фрагментов. Переписка не пишется в БД/browser storage. На этой машине корпус проиндексирован с разрешения пользователя; после переноса потребуется `npm.cmd run knowledge:index` (платная отправка корпуса в OpenAI с согласия владельца). Статус: `npm.cmd run knowledge:index-status`. Без индекса — 503; без достаточного подтверждения ответ может быть ограничен. Архитектура, запуск и ограничения — в [PLATO_RAG.md](docs/architecture/PLATO_RAG.md).

## Проверки

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run test:chat
npm.cmd run test:chat:integration
npm.cmd run test:knowledge
npm.cmd run test:accounts
npm.cmd run test:progress
npx.cmd playwright install chromium
npm.cmd test
```

Браузерные тесты запускают два локальных production-сервера с включённым и выключенным чатом. Перед ними нужна сборка. Playwright проверяет Chromium в настольном и мобильном профилях. Проверки и параметры запуска описаны в [TESTING.md](docs/development/TESTING.md).

## Контакты

Официальная почта поддержки Sophia и обращений по персональным данным — [support.sophia@ro.ru](mailto:support.sophia@ro.ru).

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
| [ACCOUNTS_AND_PROGRESS.md](docs/architecture/ACCOUNTS_AND_PROGRESS.md) | Авторизация, схема аккаунтов и правила синхронизации |
| [CROSS_BORDER_DATA_TRANSFERS.md](docs/audits/CROSS_BORDER_DATA_TRANSFERS.md) | Проверка почтовых доменов и аудит потенциальных трансграничных передач |
| [DATA_PROCESSING.md](docs/legal/DATA_PROCESSING.md) | Аудит персональных данных, сроки хранения и условия публичной регистрации |
| [PHILOSOPHER_CHAT.md](docs/architecture/PHILOSOPHER_CHAT.md) | API чата, память вкладки, лимиты и безопасность |
| [PLATO_RAG.md](docs/architecture/PLATO_RAG.md) | Историческая роль, семантический индекс, safety, проверка ответов и запуск |
| [PLATO_DIALOGUE.md](docs/architecture/PLATO_DIALOGUE.md) | Первое лицо, сократическая беседа, generation policy, проверка стиля и реальные сценарии |
| [DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md) | Визуальный язык и палитра |
| [UX_GUIDELINES.md](docs/design/UX_GUIDELINES.md) | Правила взаимодействия и доступности |
| [CONVENTIONS.md](docs/development/CONVENTIONS.md) | Именование и организация кода |
| [TESTING.md](docs/development/TESTING.md) | Стратегия и доступность проверок |
| [READER_IMPLEMENTATION.md](docs/development/READER_IMPLEMENTATION.md) | Библиотека, читалка, источники корпуса и проверки |
| [DAILY_QUESTIONS_AUDIT.md](docs/development/DAILY_QUESTIONS_AUDIT.md) | Сверка 250 ежедневных вопросов и ссылки на источники |
| [CURRENT_STATE.md](docs/development/CURRENT_STATE.md) | Реализованное, планы, проблемы и следующий шаг |
| [references/README.md](docs/references/README.md) | Учёт исходных материалов и референсов |

Начало новой сессии: `AGENTS.md` → `CURRENT_STATE.md` → профильные документы → соответствующий код. Каждый документ отвечает за свою тему; ссылки заменяют копирование правил.
