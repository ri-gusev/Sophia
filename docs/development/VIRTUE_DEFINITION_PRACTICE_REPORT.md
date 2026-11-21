# «Пример или определение?» — 2026-11-21

Реализован исключительно четвёртый слайд первого урока блока «Добродетель и правильная жизнь». На финале третьего добавлено «Продолжить урок». Доступны четыре слайда из пяти; пятый не создавался, completion не записывается. Содержание первых трёх сохранено.

## Поведение

Сократ передаёт инициативу пользователю. Четыре таблички нужно распределить между конкретным примером и попыткой определения. Ошибка оставляет карточку нераспределённой и предлагает исследовать формулировку ещё раз. Правильный выбор сопровождается объяснением; распределённую карточку можно выбрать повторно, чтобы перечитать его. Все четыре карточки нужны для перехода к проверке.

Две придуманные ситуации проверяют охват определения Менона и достаточность способности управлять без исследования справедливости управления. Ошибки допускают повтор, правильный ответ раскрывает соответствующее ограничение и меняет соединительную линию на пунктир. Только после обеих ситуаций доступен итог: «Пример → Определение → Проверка». Явно указано, что окончательное определение добродетели не найдено.

Кнопки карточек и категорий работают мышью, касанием и клавиатурой; drag-and-drop не требуется. FLIP использует существующий подход Web Animations API, анимации отменяются при изменении/скрытии сцены. Reduced motion отключает движение. На телефоне завершённая классификация выстраивается вертикально по категориям.

Восемь сохраняемых полей подключены через существующий `useSceneState`: этап, вступительная реплика, распределение, выбранная карточка, попытка категории, текущая ситуация, её ответы, финальная реплика. Сохраняются также объяснения и итог, поскольку они выводятся из этих полей. Возврат и reload сохраняют состояние и место чтения; «Повторить практику» сбрасывает только четвёртый слайд. Заголовки не получают фокус.

## Изменённые файлы

- `src/features/course-lesson/virtue-definition-practice-data.ts` — учебные тексты, типы карточек/категорий/ситуаций и проверка сохраняемых данных.
- `src/features/course-lesson/virtue-definition-practice-scene.tsx` — последовательность мастерской, сортировка, обратная связь, проверки, финал, FLIP и повтор.
- `src/features/course-lesson/virtue-definition-practice-scene.module.css` — стол, таблички, адаптивность и анимации.
- `src/features/course-lesson/virtue-definition-situation-art.tsx` — две оригинальные SVG-миниатюры учебных ситуаций.
- `src/features/course-lesson/lesson-data.ts` — новый вариант сцены, четвёртый слайд и диапазон источника.
- `src/features/course-lesson/lesson-introduction.tsx` — подключение сцены к существующей навигации и сохранению смонтированного состояния; прежний подход к прогрессу частичного урока.
- `src/features/course-lesson/virtue-swarm-scene.tsx` — только переход к четвёртому слайду после финального объяснения.
- `tests/plato-virtue-definition-practice.spec.ts` — профильные проверки, screenshots, axe, keyboard, reduced motion и ширины 390/768/1024/1440.
- `tests/plato-virtue.spec.ts`, `tests/plato-virtue-swarm.spec.ts` — ожидание ровно четырёх незавершающих слайдов.
- `docs/development/CURRENT_STATE.md`, `TESTING.md`, этот отчёт — состояние проекта и проверок.

## Источники и изображения

[Платон, «Менон», 73c–73e](https://classics.mit.edu/Plato/meno.html): попытка определения через управление и вопросы об охвате и справедливости. Реплики — учебная адаптация. Ситуации с признанием ошибки и несправедливым приказом придуманы для Sophia, не являются историческими эпизодами; формулировка про качество характера тоже обозначена как учебная, а не правильное определение.

Портрет Сократа переиспользован из `public/images/lessons/dialogue/socrates.webp`, происхождение описано в соседнем README. Две SVG-миниатюры нарисованы в коде для этого слайда; это условные учебные образы. Новых внешних изображений, зависимостей, API или инфраструктуры нет.

## Проверки

- `npm.cmd run typecheck` — exit 0.
- `npm.cmd run build` — exit 0, Next.js 16.4.6 production.
- `npm.cmd run lint -- --ignore-pattern '.upgrade-security/**'` — exit 0.
- Обычный `npm.cmd run lint` — прежние 276 ошибок / 7726 предупреждений в `.upgrade-security/.next`; конфигурация не менялась, лог `artifacts/virtue-definition-lint.log`.
- `git -c safe.directory=D:/Sophia diff --check` — exit 0.
- Первоначальная проверка отсутствующего слайда завершилась ожидаемым провалом до реализации; профильный набор после реализации — **14 passed (58.2s), exit 0**, Chromium desktop/mobile. После него улучшено вертикальное размещение распределённых карточек на телефоне.

Итоговый объединённый прогон после мобильного уточнения: **76 passed (2.6m), exit 0**, Chromium desktop/mobile, production 3292. Включает новый слайд, регрессии первых трёх, восстановление всех типов сцен и валидаторы существующих уроков:

```powershell
npm.cmd run start -- --port 3292
# В другом терминале:
$env:SOPHIA_TEST_PORT='3292'
npx.cmd playwright test tests/plato-virtue-definition-practice.spec.ts tests/plato-virtue.spec.ts tests/plato-virtue-gallery.spec.ts tests/plato-virtue-swarm.spec.ts tests/plato-resume.spec.ts tests/plato-lesson-state.spec.ts --output=artifacts/virtue-definition-final
```

Независимое ревью кода не выявило замечаний. Полный набор сайта, Safari и физические телефоны не проверялись; это профильный набор Chromium, а не подтверждение всех функций проекта. Проверка производительности ограничена небольшим фиксированным числом анимаций без покадрового React state; инструментальный профиль мобильного CPU не снимался.

## Просмотренные снимки

Основные состояния сохранены в `artifacts/virtue-definition-final/`:

- [Вступление Сократа](../../artifacts/virtue-definition-final/plato-virtue-definition-pr-9b1e2-reserves-the-whole-practice-desktop/01-intro.png)
- [Четыре утверждения](../../artifacts/virtue-definition-final/plato-virtue-definition-pr-9b1e2-reserves-the-whole-practice-desktop/02-statements.png)
- [Распределение карточек](../../artifacts/virtue-definition-final/plato-virtue-definition-pr-9b1e2-reserves-the-whole-practice-desktop/03-partly-sorted.png)
- [Правильная классификация](../../artifacts/virtue-definition-final/plato-virtue-definition-pr-9b1e2-reserves-the-whole-practice-desktop/04-classified.png)
- [Определение Менона](../../artifacts/virtue-definition-final/plato-virtue-definition-pr-9b1e2-reserves-the-whole-practice-desktop/05-definition.png)
- [Человек без власти](../../artifacts/virtue-definition-final/plato-virtue-definition-pr-9b1e2-reserves-the-whole-practice-desktop/06-without-power.png)
- [Власть без справедливости](../../artifacts/virtue-definition-final/plato-virtue-definition-pr-9b1e2-reserves-the-whole-practice-desktop/07-unjust-power.png)
- [Итоговая схема](../../artifacts/virtue-definition-final/plato-virtue-definition-pr-9b1e2-reserves-the-whole-practice-desktop/08-final-schema.png)
- [Мобильная классификация](../../artifacts/virtue-definition-final/plato-virtue-definition-pr-1406f-s-accessible-without-motion-desktop/390-classified.png)
