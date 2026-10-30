# Текущее состояние

Обновлено: **2026-10-30**, после реализации задания «Sophia — Phase 2: Landing Refinement & Multi-Page Architecture». Это снимок локального проекта `D:\Sophia`; обновлять после существенных изменений.

## Реализовано

- Система документации, десять инвариантов и журнал архитектурных решений; документы актуализированы под приложение.
- Next.js App Router, React, TypeScript strict, Tailwind/PostCSS, ESLint, точные зависимости и npm lock-файл.
- Главная `/`: ровно три секции — Hero с вопросом, превью курса и выбор направления. Сохранены существующие палитра, типографика, вертикальный маршрут и три пастельные карточки.
- Самостоятельный вопрос о корабле Тесея в Hero: три равноправных ответа, одно объяснение без оценки правильности, повтор с возвратом фокуса. Выбор только в React state.
- `/learn`: название курса, статус разработки и кнопка возврата; компактная шапка с логотипом и переходом к третьей секции главной. Учебного интерфейса пока нет.
- Route groups `(marketing)` и `(learning)` с самостоятельными layouts; единый root layout со шрифтом и глобальными стилями. Вопрос и данные вынесены в feature, данные маршрута/направления остаются отдельно от UI.
- Локальный кириллический Manrope, общая кнопка на основе shadcn/ui, иконки Lucide, анимации Motion с reduced motion, семантические секции и skip-link.
- Все CTA курса ведут через `next/link` на `/learn`; возвраты — на `/`, «Как это работает» — на `/#how-it-works`. Атлас и вход отключены с пометкой «Скоро». Два будущих направления содержат только прочерк и статус, без кнопок.

## В разработке

Phase 2 реализована и проверена локально. Базовый коммит пользователя — `c761f5a`; изменения этой задачи не коммитились и не отправлялись в GitHub. Независимое read-only ревью Phase 2 не выявило блокирующих замечаний.

## Запланировано

Следующие этапы перечислены в [ROADMAP.md](../product/ROADMAP.md) и не считаются начатыми. Маршрут остаётся презентационным превью, `/learn` — архитектурным каркасом; полные уроки не доступны.

Идея «Вопроса дня» сохранена в [дорожной карте](../product/ROADMAP.md#отложенное-изменение-вопрос-дня). Последующее задание Phase 2 заменило прежний отдельный блок новым вопросом в Hero; добавлять четвёртую секцию ради этой идеи сейчас не требуется.

## Известные ограничения

- Авторизация, база данных, платежи, личный кабинет, полноценные уроки, ИИ, админка и картографический движок не реализованы согласно границам этапа.
- Выбор в демо сбрасывается при перезагрузке; персонального прогресса нет. Атлас-превью Phase 1 удалён из интерфейса вместе с отдельным quiz, лентой вопросов, финальным CTA и footer.
- Проверены Chromium и его мобильная эмуляция; реальные телефоны, Safari, Firefox и экранный диктор вручную не проверялись.
- npm сообщает о завершении поддержки ESLint 9; текущий набор Next.js/плагинов проходит линтинг. Миграция на следующий major требует отдельной проверки совместимости.
- В PowerShell следует использовать `npm.cmd`/`npx.cmd`, если выполнение `.ps1` запрещено политикой окружения.

## Последний завершённый этап

Локальная реализация Phase 2: трёхсекционная главная, самостоятельное демо и минимальный `/learn`. Развёртывание этой версии не выполнялось.

## Результаты проверок

- `npm.cmd run typecheck` — успешно.
- `npm.cmd run lint` — успешно, 0 ошибок и предупреждений ESLint.
- `npm.cmd run build` — успешно; `/` и `/learn` статически пререндерены. После перемещения маршрута удалён устаревший генерируемый `.next/dev/types/validator.ts`, ссылавшийся на прежний `src/app/page.tsx`; проверки не отключались.
- `npm.cmd test` — **12 passed** (desktop/mobile Chromium): три секции, равноправные ответы и повтор, пять ссылок на курс, прямое открытие `/learn`, оба возврата, якоря с обеих страниц, мобильное меню, адаптивность, axe WCAG A/AA и отсутствие ошибок выполнения/консоли.
- Проверка ровно трёх секций сначала запущена на Phase 1 и корректно упала (ожидалось 3, было 6), затем прошла на Phase 2.
- Скриншоты главной 1440/390 px и каркаса `/learn` просмотрены. Ширины 320/390/768/1440 px проверяются автоматически на обеих страницах.
- Зависимости не менялись. npm audit в Phase 2 повторно не запускался. В тестовом окружении есть служебное предупреждение о сочетании `NO_COLOR` и `FORCE_COLOR`, на результат проверок не влияет.
- Проверка документации Python — 18 Markdown-файлов, 55 корректных локальных ссылок и якорей, UTF-8 и парные блоки кода. `git diff --check` — без ошибок; в `src/` и тестах нет `any` или директив отключения ESLint/TypeScript.

Команды и сценарии воспроизведения — в [TESTING.md](TESTING.md). Эти результаты не означают проверку на реальных мобильных устройствах или полную сертификацию доступности.

## Файлы Phase 1 (исторический состав)

- Конфигурации: `.gitignore`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`, `playwright.config.ts`.
- Приложение: `src/app/page.tsx`, `layout.tsx`, `globals.css`, `icon.svg`.
- Секции в `src/components/landing/`: `header.tsx`, `hero.tsx`, `philosophy-quiz.tsx`, `how-it-works.tsx`, `learning-path-preview.tsx`, `atlas-preview.tsx`, `final-cta.tsx`, `footer.tsx`, `reveal.tsx`.
- Общие модули: `src/components/ui/button.tsx`, `src/lib/utils.ts`, `src/content/landing.ts`.
- Тесты: `tests/landing.spec.ts`.
- Обновлена документация: корневой `README.md`; `docs/architecture/{OVERVIEW,STRUCTURE,TECH_STACK,DECISIONS}.md`; `docs/design/DESIGN_SYSTEM.md`; `docs/development/{CONVENTIONS,TESTING,CURRENT_STATE}.md`; `docs/references/README.md`. Добавлен план `docs/superpowers/plans/2026-10-30-landing-page.md`.

## Следующий рекомендуемый шаг

Согласовать следующий небольшой этап страницы `/learn`; до этого сохранить её минимальной. Получить обратную связь по трёхсекционной главной на реальном телефоне.

## Файлы Phase 2

- Добавлены `src/app/(marketing)/layout.tsx`, `src/app/(marketing)/page.tsx`, `src/app/(learning)/layout.tsx`, `src/app/(learning)/learn/page.tsx`.
- Добавлены `src/features/philosophy-question/philosophy-question.tsx`, `src/features/philosophy-question/question.ts`, `src/components/landing/direction-choice.tsx`.
- Обновлены `src/app/globals.css`, `src/components/landing/header.tsx`, `src/components/landing/hero.tsx`, `src/components/landing/learning-path-preview.tsx`, `src/content/landing.ts`.
- Удалены прежний `src/app/page.tsx` и компоненты `src/components/landing/{philosophy-quiz,how-it-works,atlas-preview,final-cta,footer}.tsx`.
- Сценарии `tests/landing.spec.ts` заменены на `tests/phase-two.spec.ts`; добавлен план `docs/superpowers/plans/2026-10-30-phase-2.md`.
- Актуализированы `README.md`, `docs/architecture/{STRUCTURE,OVERVIEW,DECISIONS}.md`, `docs/product/{MVP,ROADMAP}.md`, `docs/design/DESIGN_SYSTEM.md`, `docs/development/{CURRENT_STATE,TESTING}.md`, `docs/references/README.md`.
