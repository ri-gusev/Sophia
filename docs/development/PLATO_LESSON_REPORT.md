# Первый полноценный урок Платона — результат

Последнее уточнение изображений: девять новых панорам 3:1 в `headers-v2` заменили кадрирование больших картин; desktop показывает их целиком, мобильное окно сохраняет центральные фигуры и предметы. Промпты и происхождение — [здесь](../../public/images/lessons/plato/headers-v2/README.md). Проверки: 24 профильных passed; полный набор 133 passed / 7 skipped / 2 прежних failed в атласе. Контактный лист реальных кадров: `test-results/plato-header-contact-sheet.png`.

Последнее визуальное уточнение: картинки переведены в узкую шапку слева от названия, текст и задания — ниже на белом фоне. Сохранено прохождение девяти сцен. Прокрутка открывает шапку текущей сцены под site-header. Актуальная проверка и снимки находятся в CURRENT_STATE; остальные сведения ниже описывают реализацию полного урока и её первоначальный прогон.

Проверка последней компоновки: 130 passed, 7 skipped, 3 failed (3.2m), exit 1; все 22 сочетания урока прошли. Три ошибки — прежние проверки портретов/вращения атласа. Актуальный снимок шапки: `test-results/plato-header-layout/plato-scene-reading-scene--6e635-bove-the-plain-reading-area-desktop/compact-scene-header.png` (и папка `-mobile`).

Дата: 2026-11-15. Урок `plato-introduction` проходит девять утверждённых сцен через существующий каталог `/learn`. Сохранены карта и семь блоков. Есть три вопроса, перестановка философов, объяснения, навигация, прогресс и завершение с возвратом в каталог. Тексты дословно сверены с заданием.

## Изменённые и добавленные файлы этой задачи

- `src/features/course-lesson/lesson-data.ts` — типы и полный утверждённый сценарий, изображения и источники.
- `src/features/course-lesson/lesson-state.ts` — ответы, порядок, проверка URL и локального состояния.
- `src/features/course-lesson/lesson-exercise.tsx` — два вида доступных заданий.
- `src/features/course-lesson/lesson-introduction.tsx`, `lesson-introduction.module.css` — ход урока, toolbar/progress, источники, tab-local состояние.
- `src/features/course-lesson/lesson-scene.tsx`, `lesson-scene.module.css` — общая композиция, смена фона, контент и навигация.
- `src/features/course-map/course-map.tsx` — восстановление точной сцены и возврат в каталог; уточнена подпись о готовности остальных уроков.
- `tests/plato-full-lesson.spec.ts`, `tests/plato-lesson-state.spec.ts`, `tests/plato-lesson.spec.ts` — полный проход, крайние состояния, чистые правила, интеграционные регрессии.
- `public/images/lessons/plato/*.webp` — девять иллюстраций; `README.md`, `generation.json` — происхождение и промпты. `public/images/lessons/README.md` уточняет активные ресурсы.
- `docs/architecture/DECISIONS.md`, `STRUCTURE.md`, `docs/design/DESIGN_SYSTEM.md`, `docs/development/CURRENT_STATE.md`, `TESTING.md` — актуальное устройство и результаты.
- `docs/references/PLATO_LESSON_SOURCES.md`, `docs/superpowers/specs/2026-11-15-plato-full-lesson-design.md`, `docs/superpowers/plans/2026-11-15-plato-full-lesson.md`, этот отчёт — источники, план и доставка.

Изменения карты каталога, токена фона и старого одиночного вступления из предыдущих запросов сохранены в общем worktree; этот список описывает именно расширение до полноценного урока.

## Проверки

| Команда / сценарий | Результат |
| --- | --- |
| `npm.cmd run typecheck` | Успешно |
| `npm.cmd run lint` | Успешно |
| `npm.cmd run build` | Успешно |
| `git -c safe.directory=D:/Sophia diff --check` | Успешно |
| `$env:SOPHIA_TEST_PORT='3202'; npm.cmd test -- --output=test-results/plato-full-final` | 129 passed, 7 skipped, 2 failed, 3.1m; exit 1 |
| Три файла урока, 20 сочетаний desktop/mobile | Все прошли |

Оба сбоя полного набора — прежняя проверка `tests/atlas-modern.spec.ts:19` в двух профилях: ожидались только Прокл/Виреду без портретов, фактически отсутствуют изображения ещё девяти средневековых философов. Код атласа и этот тест не изменялись.

Проверены: все сцены, правильные и неправильные ответы, запрет продолжения до проверки, отсутствие немедленной оценки, объяснения, keyboard-перестановка, назад/reload, точная сцена в URL, отсутствие/повреждение sessionStorage, закрытие/финал в каталог, отсутствие API-запросов, axe и reduced motion, 320/390/768/1440 px. Независимое read-only ревью не нашло важных дефектов; обработка повреждённого порядка и prefetch дополнительно уточнены.

## Иллюстрации и источники

[Происхождение девяти оригиналов и точные промпты](../../public/images/lessons/plato/README.md), [исторические источники и оговорки](../references/PLATO_LESSON_SOURCES.md). Все изображения созданы встроенным image_gen; WebP 1536 × 1024, всего 1,885,164 байта. Нет сторонних stock-изображений с непроверенными правами. Фраза восьмой сцены подписана Sophia.

## Снимки

Снимки находятся в `test-results/plato-full-final/plato-full-lesson-complete-1758f--and-returns-to-the-catalog-desktop/`: `01-journey.png`, `03-question.png`, `09-completion.png`. Аналогичная папка `-mobile/` содержит мобильные версии. Кадры 320/390/768/1440 px — в outputPath сценария `lesson scene keeps text on a clear background...`.

Просмотрены финальные desktop кадры всех трёх ключевых сцен, mobile-вопрос и адаптивная композиция. Sticky-шапка и skip-link скрыты только при захвате снимка, чтобы не перекрывать длинную сцену; приложение при проверках не изменяется.

## Ограничения

Реальные устройства, Safari/Firefox, проверка живым экранным диктором и измерение фактического времени чтения не выполнялись. Длительность 6–8 минут — ориентир утверждённого сценария. Прогресс и ответы принадлежат текущей вкладке; серверного сохранения завершённости или аккаунтов нет.
