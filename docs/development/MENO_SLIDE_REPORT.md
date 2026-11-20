# Первый слайд «Можно ли научиться быть хорошим?» — 2026-11-20

Реализован урок `plato-virtue-definition` с единственным слайдом `meno-question`. Второй блок каталога — `partial`. Пять этапов: реплика Менона, нейтральное предположение, вопрос Сократа, объяснение ἀρετή, итоговая мысль. Выбор сохраняется при возврате, повтор очищает его; выход открывает каталог. Завершение урока не записывается. Остальные слайды отсутствуют, заглушек нет. Первый блок и его контент сохранены.

## Изменённые файлы

- `src/features/course-lesson/virtue-intro-data.ts` — типизированный сценарий и варианты предположений.
- `src/features/course-lesson/virtue-intro-scene.tsx` — пять этапов, локальное состояние, фокус и навигация.
- `src/features/course-lesson/virtue-intro-scene.module.css` — композиция, адаптивность, анимации и reduced motion.
- `src/features/course-lesson/lesson-data.ts` — тип сцены и регистрация урока.
- `src/features/course-lesson/lesson-introduction.tsx` — подключение сцены, честный заголовок частичного урока без 100% прогресса.
- `src/features/course-map/philosopher-catalog-data.ts` — доступный урок во втором блоке.
- `public/images/lessons/virtue/socrates-meno.webp` и `README.md` — единая оригинальная иллюстрация, происхождение и полный промпт встроенного image_gen. Образ Сократа взят как референс из первого блока.
- `tests/plato-virtue.spec.ts` — сценарий выбора/возврата/повтора/выхода, отсутствие завершения, четыре ширины, axe и reduced motion.
- `tests/plato-catalog.spec.ts` — ожидания нового доступного урока и пяти оставшихся пустых блоков; поиск подзаголовка уточнён из-за совпадения с названием урока.
- `docs/architecture/DECISIONS.md`, `docs/development/CURRENT_STATE.md`, `docs/development/TESTING.md`, этот отчёт и `docs/superpowers/plans/2026-11-20-meno-question.md` — решение, план и результаты.

## Проверки

- Регистрационный тест до реализации отказал ожидаемо: URL нового урока не распознавался. После реализации проходит.
- `npm.cmd run typecheck` — exit 0.
- `npm.cmd run build` — exit 0, включая итоговую сборку после проверки ссылки на источник.
- `npm.cmd run lint` — exit 1: 276 errors и 7726 warnings в уже существующей вложенной `.upgrade-security/.next`. Правила ESLint не менялись.
- `npm.cmd run lint -- --ignore-pattern '.upgrade-security/**'` — exit 0.
- `git diff --check` — без ошибок.
- `$env:SOPHIA_TEST_PORT='3263'; npx.cmd playwright test tests/plato-virtue.spec.ts --output=artifacts/meno-delivery` — **12 passed (35.9s), exit 0**. Все четыре предположения без оценки, возврат с сохранением, повтор со сбросом, выход в каталог, отсутствие записи localStorage, пять этапов × четыре ширины 390/768/1024/1440 в двух профилях, axe WCAG A/AA и reduced motion.
- Независимое статическое ревью — замечаний не найдено; оно не заменяет запуск тестов.

Итоговый объединённый прогон: **54 passed (2.0m), exit 0** на production 3264, после окончательной замены ссылки источника на доступный MIT Classics. Новые проверки, регрессии обоих уроков первого блока и обновлённый сценарий каталога прошли. Явно исключены два сценария каталога с указанными ниже прежними расхождениями; тесты всей карты сюда не входят.

```powershell
$env:SOPHIA_TEST_PORT='3264'
npx.cmd playwright test tests/plato-virtue.spec.ts tests/plato-dialogue.spec.ts tests/plato-mentor.spec.ts tests/plato-practice.spec.ts tests/plato-workshop.spec.ts tests/plato-reflection.spec.ts tests/plato-full-lesson.spec.ts tests/plato-lesson-state.spec.ts tests/plato-lesson.spec.ts tests/plato-catalog.spec.ts --grep-invert 'antiquity has four|Plato opens a responsive' --output=artifacts/meno-final-validation
```

Полный промежуточный `npm.cmd test -- --output=artifacts/meno-verification` на порту 3263: **155 passed, 7 skipped, 10 failed (5.5m)**. Его нельзя считать зелёным итоговым прогоном. Восемь ошибок — четыре сценария в двух профилях, вне нового слайда:

1. `learning-map.spec.ts:25`: ожидает прежнюю кнопку «Вернуться к карте» в каталоге Платона.
2. `learning-map.spec.ts:47`: то же ожидание при проверке демонстрации.
3. `plato-catalog.spec.ts:9`: ожидает четыре основных узла Античности; текущая неизменённая карта содержит пять.
4. `plato-catalog.spec.ts:26`: ожидает scrollLeft 120, получает 99 после закрытия каталога.

Две остальные ошибки относились к промежуточной версии нашего теста ширин: повторный вход в тот же URL не сбрасывал этап; изменение названия теста во время полного прогона также дало `Test not found in the worker process` на mobile. Исправлены независимыми тестами каждой ширины; итоговые 12 проверок прошли. Остальные старые тесты не переписаны ради зелёного полного набора. Полный набор после этой коррекции повторно не запускался.

## Снимки

Все основные состояния просмотрены. Снимки под `artifacts/` локальные и не являются snapshot-тестами. На обычном движении перед снимками начальной реплики, объяснения и финала завершаются анимации; поворот дополнительно ждёт фактической видимости вопроса и реплики.

- [Встреча с Меноном](../../artifacts/meno-reviewed/plato-virtue-catalog-opens-2351b-and-survive-back-navigation-desktop/01-meeting.png)
- [Выбор предположения](../../artifacts/meno-reviewed/plato-virtue-catalog-opens-2351b-and-survive-back-navigation-desktop/02-choice-1.png)
- [Вопрос Сократа](../../artifacts/meno-reviewed/plato-virtue-catalog-opens-2351b-and-survive-back-navigation-desktop/03-turn.png)
- [Объяснение ἀρετή](../../artifacts/meno-reviewed/plato-virtue-catalog-opens-2351b-and-survive-back-navigation-desktop/04-arete.png)
- [Итоговая мысль](../../artifacts/meno-reviewed/plato-virtue-catalog-opens-2351b-and-survive-back-navigation-desktop/05-thought.png)
- [390 px](../../artifacts/meno-reviewed/plato-virtue-Meno-layout-3-bffde-ed-motion-remain-accessible-desktop/390-stage-2.png)
- [768 px](../../artifacts/meno-reviewed/plato-virtue-Meno-layout-7-7b9e8-ed-motion-remain-accessible-desktop/768-stage-2.png)
- [1024 px](../../artifacts/meno-reviewed/plato-virtue-Meno-layout-1-584df-ed-motion-remain-accessible-desktop/1024-stage-1.png)
- [1440 px](../../artifacts/meno-reviewed/plato-virtue-Meno-layout-1-efd49-ed-motion-remain-accessible-desktop/1440-stage-4.png)

Проверены Chromium desktop и мобильная эмуляция; реальные устройства, Safari и экранный диктор не проверялись. Ссылка на полный текст «Менона» в MIT Classics проверена чтением; русские реплики остаются явно обозначенной учебной адаптацией из задания.
