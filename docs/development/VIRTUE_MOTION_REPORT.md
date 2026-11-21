# Полировка движения блока добродетели — 2026-11-21

Изменены только анимации четырёх существующих слайдов и их сопровождение прокруткой. Тексты, ответы, изображения, данные урока, ID сцен, навигационные действия и схема хранения прогресса не менялись. Пятого слайда нет. Новых зависимостей нет; первый блок не подключается к новым примитивам.

## Что воспроизведено и исправлено

| Наблюдение | Исправление |
| --- | --- |
| Открытие объяснения меняло dependency общего layout effect и отменяло ещё идущую FLIP мозаики. Диагностический браузерный тест подтвердил исчезновение animation object. | FLIP отделён от фокуса/раскрытия; unrelated feedback не отменяет перестройку. Отмена происходит при новой геометрии, скрытии, unmount и включении reduced motion. |
| При смене режима `animation-duration` полёта менялся с 13 до 22.1/26 секунд у первой пчелы, меняя положение внутри цикла. | Длительность и currentTime полёта сохраняются; режим меняет масштаб и визуальный акцент. Крылья и покачивание имеют индивидуальные фазы. |
| CSS-вход табличек анимировал `translate` на том же узле, которым двигал FLIP `transform`. | Вход таблички использует только opacity; пространственным преобразованием управляет один FLIP. Геометрия читается целиком перед записью анимаций. |
| Варианты Менона переходили в `position:absolute`, сразу меняя естественную высоту области. | Варианты и вопрос занимают одну Grid-область, сохраняя место во время мягкого отступления. Убрана blur-обработка и сокращена прежняя длинная цепочка задержек. |
| Снятие CSS reveal могло заменять `translateX(-50%)` маркера пчелы. Условное удаление DOM не давало fade-out. | Центрирование маркера независимо от opacity-перехода. Маркеры/вопрос остаются в DOM, но неактивные скрыты через visibility и aria-hidden. |
| Обратная связь появлялась с мгновенным изменением высоты; на ревью дополнительно найден пропуск анимации при сворачивании до 0. | `MotionRegion` анимирует конечные численные высоты в обе стороны, затем возвращает auto. Observer смотрит на внутреннее естественное содержимое, не на анимируемую оболочку. |
| Badge менял высоту определения при переключении проверочного случая; `scrollIntoView(nearest)` длинной секции мог выравнивать её нижний край. | Для отметки зарезервировано место; переход смотрит на текущую ситуацию и не прокручивает, если её начало уже в области чтения. Все запросы учитывают высоту sticky-шапки. |

Исходный `fly` уже имел совпадающие transform в 0% и 100%. Разрыв значений на стыке не обнаружен; траектории не переписывались. Регрессия проверяет соседние значения по обе стороны цикла. Не все возможные проблемы из задания объявлены существовавшими.

## Согласованные параметры

- Hover — 160 мс, выделение — около 240 мс.
- Текст — 320 мс, раскрытие — 400 мс, смысловой этап — 440 мс.
- Сортировка табличек — 560 мс; большая мозаика — 760 мс.
- Появление вопроса Менона начинается после начала отступления вариантов; элементы не ждут завершения движения, чтобы стать доступными.
- Выход текста и layout используют разные easing; общее мягкое появление — `cubic-bezier(.22,1,.36,1)`.
- Сближение роя — transform 1200 мс на внешнем слое; цикл полёта продолжает работать на внутреннем.

## Изменённые файлы

- `src/features/course-lesson/virtue-motion.ts` — параметры и ограниченная прокрутка к видимой области чтения.
- `src/features/course-lesson/use-flip-layout.ts` — общий для двух существующих FLIP-переходов захват текущей геометрии, пакетные чтения, анимация и очистка.
- `src/features/course-lesson/motion-region.tsx` — конечные анимации изменения высоты, включая закрытие; очистка при скрытии/unmount/reduced motion.
- `virtue-intro-scene.tsx` и его CSS module — сохранение footprint вариантов, последовательность вопроса и высота текста перед навигацией.
- `virtue-gallery-scene.tsx` и его CSS module — независимая мозаика, раскрытие карточек/объяснения и снятие конкурирующего scale.
- `virtue-swarm-scene.tsx` и его CSS module — отдельные слои позиции/масштаба/полёта, постоянная фаза, fade маркеров и высота речи.
- `virtue-definition-practice-scene.tsx` и его CSS module — единственный пространственный FLIP табличек, обратная связь, резерв отметки и переходы ситуаций.
- `lesson-introduction.tsx` — только передача `active` первым двум сценам, чтобы скрытые компоненты отключали визуальные эффекты.
- `tests/plato-motion.spec.ts` — диагностика реальных конфликтов, быстрые действия и видеозаписи.
- `tests/plato-virtue-swarm.spec.ts` — проверка невидимости маркера вместо отсутствия DOM-узла: сохранение узла необходимо для fade-out.
- `docs/development/CURRENT_STATE.md`, `TESTING.md`, этот отчёт — состояние и доказательства.

## Проверки

До исправлений четыре целевых desktop-проверки завершились ожидаемым провалом; артефакты — `artifacts/motion-before/`. После первого исправления все восемь diagnostic checks desktop/mobile прошли. Отдельный тест закрытия объяснения воспроизвёл пропуск zero-height collapse и прошёл после исправления.

Основной итоговый набор: **104 passed (2.6m), exit 0**, production 3295, Chromium desktop/mobile:

```powershell
npm.cmd run start -- --port 3295
# В другом терминале:
$env:SOPHIA_TEST_PORT='3295'
npx.cmd playwright test tests/plato-motion.spec.ts tests/plato-virtue-definition-practice.spec.ts tests/plato-virtue.spec.ts tests/plato-virtue-gallery.spec.ts tests/plato-virtue-swarm.spec.ts tests/plato-resume.spec.ts tests/plato-lesson-state.spec.ts --output=artifacts/virtue-motion-final
```

Проверены четыре ширины 390/768/1024/1440, завершение FLIP с расхождением координат/ширины <0.2 px, быстрые последовательные сортировки, уход во время движения, отсутствие оставшегося transform, повтор/reload, переключение вкладок, изменение reduced motion во время FLIP, сохранение позиции определения при смене ситуации, отсутствие pageerror, axe и клавиатура в профильных сценариях всех четырёх слайдов. Дополнительный первый видеопроход Менона — 2 passed (5.5s), exit 0.

`typecheck`, production `build`, lint исходников с `--ignore-pattern '.upgrade-security/**'` и `git diff --check` прошли. Обычный lint по-прежнему захватывает `.upgrade-security/.next`: 276 errors / 7726 warnings, лог `artifacts/motion-lint.log`. Правила ESLint не менялись.

## Записи движения

Записи получены Playwright в normal motion. Просмотрены **последовательности реальных кадров из записей**, извлечённые Chromium video decoder и собранные локальным Sharp; это не проверка только конечных screenshots и не воспроизведение видео в реальном времени.

Все финальные записи — в `artifacts/virtue-motion-recordings/`. Рядом с каждым `video.webm` находятся `motion-frames.png` и JSON с временами кадров после извлечения. Запись прогонов с геометрической диагностикой также сохранена в `artifacts/virtue-motion-final/`; там некоторые анимации намеренно останавливаются для измерения, поэтому для оценки естественного движения используйте отдельные записи ниже.

| Переход | Desktop WebM | Mobile WebM | Кадры |
| --- | --- | --- | --- |
| Варианты → вопрос → ἀρετή | [Видео](../../artifacts/virtue-motion-recordings/plato-motion-record-Meno-q-4f4e2-d-the-following-explanation-desktop/video.webm) | [Видео](../../artifacts/virtue-motion-recordings/plato-motion-record-Meno-q-4f4e2-d-the-following-explanation-mobile/video.webm) | [Desktop](../../artifacts/virtue-motion-recordings/plato-motion-record-Meno-q-4f4e2-d-the-following-explanation-desktop/motion-frames.png), [mobile](../../artifacts/virtue-motion-recordings/plato-motion-record-Meno-q-4f4e2-d-the-following-explanation-mobile/motion-frames.png) |
| Мозаика и объяснение | [Видео](../../artifacts/virtue-motion-recordings/plato-motion-record-mosaic-956cd--and-explanation-disclosure-desktop/video.webm) | [Видео](../../artifacts/virtue-motion-recordings/plato-motion-record-mosaic-956cd--and-explanation-disclosure-mobile/video.webm) | [Desktop](../../artifacts/virtue-motion-recordings/plato-motion-record-mosaic-956cd--and-explanation-disclosure-desktop/motion-frames.png), [mobile](../../artifacts/virtue-motion-recordings/plato-motion-record-mosaic-956cd--and-explanation-disclosure-mobile/motion-frames.png) |
| Рой и режимы | [Видео](../../artifacts/virtue-motion-recordings/plato-motion-record-bee-fl-265bc-without-resetting-the-cycle-desktop/video.webm) | [Видео](../../artifacts/virtue-motion-recordings/plato-motion-record-bee-fl-265bc-without-resetting-the-cycle-mobile/video.webm) | [Desktop](../../artifacts/virtue-motion-recordings/plato-motion-record-bee-fl-265bc-without-resetting-the-cycle-desktop/motion-frames.png), [mobile](../../artifacts/virtue-motion-recordings/plato-motion-record-bee-fl-265bc-without-resetting-the-cycle-mobile/motion-frames.png) |
| Таблички, feedback, ситуации | [Видео](../../artifacts/virtue-motion-recordings/plato-motion-record-tablet-ec28b-edback-and-case-transitions-desktop/video.webm) | [Видео](../../artifacts/virtue-motion-recordings/plato-motion-record-tablet-ec28b-edback-and-case-transitions-mobile/video.webm) | [Desktop](../../artifacts/virtue-motion-recordings/plato-motion-record-tablet-ec28b-edback-and-case-transitions-desktop/motion-frames.png), [mobile](../../artifacts/virtue-motion-recordings/plato-motion-record-tablet-ec28b-edback-and-case-transitions-mobile/motion-frames.png) |

Отдельный финальный видеопрогон всех четырёх переходов: **8 passed (24.5s), exit 0**. Для мобильного роя mode-click выполняется без автоматической прокрутки Playwright к кнопке, чтобы сад оставался в кадре. Обычный пользовательский click отдельно проверен функциональными тестами.

```powershell
$env:SOPHIA_TEST_PORT='3295'
npx.cmd playwright test tests/plato-motion.spec.ts --grep 'record ' --output=artifacts/virtue-motion-recordings
```

## Практические пределы

CSS/WAAPI и lifecycle проверены в Chromium и мобильной эмуляции. Полный набор сайта, Safari и физические смартфоны не проверялись. FPS, GPU/CPU profile и субъективная плавность на физическом устройстве не измерялись; достижение 60 FPS не заявляется. Новые измерения DOM выполняются при изменении композиции, а не каждый кадр; ResizeObserver использует готовые entries, без наблюдения за собственной анимируемой высотой.
