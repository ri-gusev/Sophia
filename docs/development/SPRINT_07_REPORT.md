# Sophia Sprint 07

Изменения подготовлены в рабочей копии `Main` от `f767426f37c515dd884fe566300c333cd810e600`. Production-сборка проверена с Node.js 24.22.1, Next.js 16.4.6 и React 19.3.1.

## Маршруты

| Маршрут | Поведение |
| --- | --- |
| `/register` | Форма регистрации и запрос письма |
| `/verify-email` | Подтверждение адреса и установка пароля владельцем почты |
| `/login` | Вход с безопасным путём возвращения |
| `/forgot-password`, `/reset-password` | Запрос письма и установка нового пароля с отзывом сессий |
| `/profile` | Серверная проверка сессии, изменение имени, выход, достижения и продолжение урока |
| `POST /api/account/{register,login,logout,verify,forgot,reset,profile}` | Действия аккаунта с проверкой Origin и входных данных |
| `GET /api/progress`, `POST /api/progress` | Чтение собственного прогресса, подтверждение слайда, завершение, возобновление и перенос |
| `POST /api/philosopher-chat` | Проверка действующей сессии и права `ai_chat` перед платными операциями |

## Сессии и прогресс

Встроенные криптографические примитивы Node.js дают Argon2id для паролей и SHA-256 для случайных токенов. Сессии на 30 дней и операции с токенами управляются через отдельную SQLite с миграциями. Ссылки подтверждения и восстановления действуют 24 часа и 30 минут соответственно. Публичная cookie защищена `Secure`, `HttpOnly` и префиксом `__Host-`. Подтверждение пароля владельцем почты предотвращает установку пароля по чужому запросу регистрации. [Полная схема и причины выбора](../architecture/ACCOUNTS_AND_PROGRESS.md).

Карта, Атлас и бесплатные уроки доступны гостям с прежними локальными данными. После входа сервер сохраняет зачёт слайдов, завершения и позиции возобновления. Явный перенос объединяет подтверждения и сохраняет уже имеющиеся позиции аккаунта. Тексты ответов, этапы упражнений и прокрутка хранятся на устройстве в области аккаунта. Сервер определяет владельца по сессии. Смена аккаунта сбрасывает просроченное представление вкладки, а неподтверждённые из-за сбоя базы данные не записываются в гостевой прогресс.

Публичный AI-чат закрыт до получения `ai_chat` через CLI. Разрешённому аккаунту продолжают применяться доверенная сетевая идентификация, ограничения частоты и бюджет Sprint 06. Проверка production-маршрута использовала синтетический корпус и фиктивные Responses и Embeddings.

## Настройка владельцем

Требуются постоянный каталог базы, миграции, доверенный HTTPS-прокси и настроенная почта. Актуальные параметры отправителя и проверка доставки приведены в руководстве по запуску. Для тестового чата необходимы настроенный индекс, бюджет, OpenAI-проект и выдача `ai_chat` конкретному аккаунту. Для SQLite описано онлайн-копирование и восстановление. [Пошаговый запуск](ACCOUNT_SERVER.md) · [Запуск чата](CHAT_SERVER.md).

## Проверки

- `typecheck`, `lint`, `build` и `git diff --check`.
- Авторизация и HTTP-граница — 14 проверок. Прогресс — 5. Корпус — 4. Чат — 57.
- Production-интеграция — 2 проверки. Подтверждены сетевые квоты, бюджет, SSE, отмена, запрет платного вызова без доступа и безопасное поведение при сбое чтения сессии.
- Проверено 15 манифестов трассировки Next.js. Пути базы аккаунтов, журнала тестов и фиктивных писем отсутствуют.
- Полный Playwright на production-сборке со штатными двумя воркерами — 333 успешно, 7 штатных пропусков, 0 падений. Профили Chromium desktop и mobile проверили авторизацию, сессии, перенос и изоляцию данных. Для регистрации, входа и профиля проверены ширины 320, 390, 768 и 1440 px, клавиатура, фокус, сообщения об ошибках, переполнение и axe WCAG A/AA.
- При пробном прогоне с четырьмя воркерами одна активация получила 429 от ограничения параллельных Argon2id-операций. Этот сценарий прошёл в штатном прогоне. На Windows выделенный тестовый процесс Next.js остановлен после завершения всех сценариев, после чего Playwright вернул код 0.

## Изменённые файлы

- `.env.example`
- `.gitignore`
- `docs/architecture/ACCOUNTS_AND_PROGRESS.md`
- `docs/architecture/DECISIONS.md`
- `docs/architecture/OVERVIEW.md`
- `docs/architecture/PLATO_CHAT_SECURITY.md`
- `docs/architecture/TECH_STACK.md`
- `docs/development/ACCOUNT_SERVER.md`
- `docs/development/CHAT_SERVER.md`
- `docs/development/CURRENT_STATE.md`
- `docs/development/SPRINT_07_REPORT.md`
- `docs/development/TESTING.md`
- `docs/product/MVP.md`
- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `README.md`
- `scripts/accounts/auth.test.ts`
- `scripts/accounts/cli.ts`
- `scripts/accounts/progress.test.ts`
- `scripts/chat/chat.test.ts`
- `scripts/chat/chat-security.test.ts`
- `scripts/chat/fake-openai.mjs`
- `scripts/chat/live-check.ts`
- `scripts/chat/live-session.ts`
- `scripts/chat/persona-eval.ts`
- `scripts/chat/route.integration.ts`
- `src/app/(account)/forgot-password/page.tsx`
- `src/app/(account)/layout.tsx`
- `src/app/(account)/login/page.tsx`
- `src/app/(account)/profile/page.tsx`
- `src/app/(account)/register/page.tsx`
- `src/app/(account)/reset-password/page.tsx`
- `src/app/(account)/verify-email/page.tsx`
- `src/app/(learning)/layout.tsx`
- `src/app/api/account/[action]/route.ts`
- `src/app/api/philosopher-chat/route.ts`
- `src/app/api/progress/route.ts`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/landing/header.tsx`
- `src/features/account/account.module.css`
- `src/features/account/account-client.ts`
- `src/features/account/account-contract.ts`
- `src/features/account/account-display.ts`
- `src/features/account/account-form.tsx`
- `src/features/account/account-navigation.tsx`
- `src/features/account/account-viewer.tsx`
- `src/features/account/profile-name.tsx`
- `src/features/account/progress/client/guest-progress.ts`
- `src/features/account/progress/client/guest-progress-transfer.module.css`
- `src/features/account/progress/client/guest-progress-transfer.tsx`
- `src/features/account/progress/client/lesson-progress-provider.tsx`
- `src/features/account/progress/contract.ts`
- `src/features/account/progress/server/schema.ts`
- `src/features/account/progress/server/store.ts`
- `src/features/account/return-path.ts`
- `src/features/account/server/account-http.ts`
- `src/features/account/server/config.ts`
- `src/features/account/server/credentials.ts`
- `src/features/account/server/database.ts`
- `src/features/account/server/errors.ts`
- `src/features/account/server/http.ts`
- `src/features/account/server/mail.ts`
- `src/features/account/server/rate-limits.ts`
- `src/features/account/server/session.ts`
- `src/features/account/server/store.ts`
- `src/features/account/server/viewer.ts`
- `src/features/course-lesson/lesson-data.ts`
- `src/features/course-lesson/lesson-introduction.tsx`
- `src/features/course-lesson/lesson-progress.ts`
- `src/features/course-lesson/lesson-resume.ts`
- `src/features/course-lesson/lesson-slide-progress.ts`
- `src/features/course-lesson/mentor-data.ts`
- `src/features/course-lesson/practice-data.ts`
- `src/features/course-lesson/use-scene-state.ts`
- `src/features/course-map/course-map.tsx`
- `src/features/course-map/philosopher-catalog.tsx`
- `src/features/philosopher-conversation/chat-contract.ts`
- `src/features/philosopher-conversation/philosopher-conversation.module.css`
- `src/features/philosopher-conversation/philosopher-conversation.tsx`
- `src/features/philosopher-conversation/plato-chat-provider.tsx`
- `src/features/philosopher-conversation/server/chat-http.ts`
- `src/features/philosophy-atlas/atlas-view.tsx`
- `src/features/philosophy-atlas/philosophy-atlas.module.css`
- `tests/account.spec.ts`
- `tests/account-progress.spec.ts`
- `tests/phase-two.spec.ts`
- `tests/philosopher-conversation.spec.ts`
- `tests/plato-chat.spec.ts`
- `tests/support/accounts.ts`
- `tests/support/account-test-settings.ts`
- `tests/support/chat-account.ts`
