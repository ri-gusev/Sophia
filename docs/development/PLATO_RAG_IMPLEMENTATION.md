# Отчёт: исторический AI-Платон — 2026-11-02

Реализован существующий чат, без изменения карты/курса/маршрутов. Архитектура, system prompt, конфигурация, эксплуатационные ограничения и команды: [PLATO_RAG.md](../architecture/PLATO_RAG.md). Компактная persona находится в server/plato-persona.ts, отдельно от данных.

## База и retrieval

Одна приватная SQLite, миграция 002-rag-index.sql: rag_documents, rag_chunks, rag_fts, user_version=2. Исходный BLOB/архив не изменён. Индекс создан через OpenAI с отдельного явного согласия пользователя после первоначального автоматического отказа: 133 фрагмента/1536 измерений, text-embedding-3-small, ready=true. Повтор embedded=0. Exact cosine + FTS5 + RRF, фильтр философа/статуса, дедупликация, соседний аргумент, ограниченный контекст. По небольшой реальной выборке: 5/5 философских запросов найдены, 3/3 посторонних исключены. Это не benchmark точности отдельных утверждений.

## Pipeline и память

Semantic safety/query/history analysis, bounded dialogue state, контекст, persona generation, программная evidence-проверка и модельная проверка всего текста, максимум одна перегенерация. Непроверенный черновик не показывается. Незнакомое современное понятие получает фиксированное приглашение дать определение; буквальные определения пользователя сохраняются и переживают compaction. Safety вне персонажа подписывается Sophia. SSE доставляет только готовый проверенный ответ. Память остаётся только во вкладке, без хранения переписки на сервере.

## Проверки и пределы готовности

- test:chat: 31 passed; test:knowledge: 4 passed.
- TypeScript, ESLint, production build: passed.
- Playwright production: 58 passed, 36,2 с, desktop/mobile Chromium, mock chat API.
- Реальные запросы подтвердили modern/introduced, прямое объяснение, сократический ход, противоречие, допустимую этику/отдельный отказ на вред. Проверка всей исторической достоверности НЕ пройдена: Сократ в финальном запросе получил 200/outcome=abstained, smoke exit1 по качеству. Не трактовать это как успешный содержательный ответ.
- Корпус имеет 19 LOCUS_TO_VERIFY/analytical_reconstruction и 114 unknown; проверенных metadata/Stephanus нет. Нужна редакционная верификация, а не автоматическое повышение доверия. После повторной ошибки ответ честно ограничивается; valid=false остаётся в метриках. Модельная самопроверка не доказывает истину и может ложно отклонять ответ.
- Ключ/серверный транспорт не обнаружены в 19 клиентских JS/CSS; env/данные игнорируются Git, хеши исходного корпуса совпадают. Не было коммита/push/deploy.
- Индексирование и проверка стоят дополнительных API-вызовов; обычный ход: анализ + query embedding + генерация + валидация; до одной пары повторов и compaction при необходимости. Валидация reasoning low, остальные запросы none. Нет авторизации/денежного бюджета/распределённого rate limit. Нет гарантии отсутствия хранения у провайдера.
- Первый sandbox browser run завис при завершении; повтор вне sandbox завершился. Реальные устройства/Safari/Firefox не проверены.

## Запуск

Node >=24, ключ только .env.local. `npm.cmd run knowledge:index-status`; при изменении корпуса/настроек `npm.cmd run knowledge:index` (с разрешения владельца, платная передача в OpenAI), затем `npm.cmd run dev`. Проверка retrieval: `npm.cmd run knowledge:check-retrieval`. Для платного live smoke запустить production на loopback 3102 и `npm.cmd run chat:check:live -- core`; вывод только счётчиков, abstained даёт exit1.

## Изменённые файлы

- [.env.example](../../.env.example)
- [README.md](../../README.md)
- [database/knowledge/002-rag-index.sql](../../database/knowledge/002-rag-index.sql)
- [docs/architecture/DECISIONS.md](../../docs/architecture/DECISIONS.md)
- [docs/architecture/KNOWLEDGE_STORAGE.md](../../docs/architecture/KNOWLEDGE_STORAGE.md)
- [docs/architecture/OVERVIEW.md](../../docs/architecture/OVERVIEW.md)
- [docs/architecture/PHILOSOPHER_CHAT.md](../../docs/architecture/PHILOSOPHER_CHAT.md)
- [docs/architecture/PLATO_RAG.md](../../docs/architecture/PLATO_RAG.md)
- [docs/architecture/STRUCTURE.md](../../docs/architecture/STRUCTURE.md)
- [docs/architecture/TECH_STACK.md](../../docs/architecture/TECH_STACK.md)
- [docs/design/DESIGN_SYSTEM.md](../../docs/design/DESIGN_SYSTEM.md)
- [docs/development/CURRENT_STATE.md](../../docs/development/CURRENT_STATE.md)
- [docs/development/PLATO_RAG_IMPLEMENTATION.md](../../docs/development/PLATO_RAG_IMPLEMENTATION.md)
- [docs/development/TESTING.md](../../docs/development/TESTING.md)
- [docs/superpowers/plans/2026-11-02-historical-plato.md](../../docs/superpowers/plans/2026-11-02-historical-plato.md)
- [package.json](../../package.json)
- [scripts/chat/chat.test.ts](../../scripts/chat/chat.test.ts)
- [scripts/chat/historical.test.ts](../../scripts/chat/historical.test.ts)
- [scripts/chat/live-check.ts](../../scripts/chat/live-check.ts)
- [scripts/chat/rag.test.ts](../../scripts/chat/rag.test.ts)
- [scripts/chat/stream.test.ts](../../scripts/chat/stream.test.ts)
- [scripts/knowledge/knowledge-store.ts](../../scripts/knowledge/knowledge-store.ts)
- [scripts/knowledge/rag-cli.ts](../../scripts/knowledge/rag-cli.ts)
- [scripts/knowledge/retrieval-check.ts](../../scripts/knowledge/retrieval-check.ts)
- [src/app/api/philosopher-chat/route.ts](../../src/app/api/philosopher-chat/route.ts)
- [src/features/philosopher-conversation/chat-contract.ts](../../src/features/philosopher-conversation/chat-contract.ts)
- [src/features/philosopher-conversation/chat-stream.ts](../../src/features/philosopher-conversation/chat-stream.ts)
- [src/features/philosopher-conversation/dialogue-state.ts](../../src/features/philosopher-conversation/dialogue-state.ts)
- [src/features/philosopher-conversation/philosopher-conversation.tsx](../../src/features/philosopher-conversation/philosopher-conversation.tsx)
- [src/features/philosopher-conversation/plato-chat-provider.tsx](../../src/features/philosopher-conversation/plato-chat-provider.tsx)
- [src/features/philosopher-conversation/server/chat-http.ts](../../src/features/philosopher-conversation/server/chat-http.ts)
- [src/features/philosopher-conversation/server/chat-service.ts](../../src/features/philosopher-conversation/server/chat-service.ts)
- [src/features/philosopher-conversation/server/historical-chat.ts](../../src/features/philosopher-conversation/server/historical-chat.ts)
- [src/features/philosopher-conversation/server/knowledge-retrieval.ts](../../src/features/philosopher-conversation/server/knowledge-retrieval.ts)
- [src/features/philosopher-conversation/server/openai-provider.ts](../../src/features/philosopher-conversation/server/openai-provider.ts)
- [src/features/philosopher-conversation/server/output-validation.ts](../../src/features/philosopher-conversation/server/output-validation.ts)
- [src/features/philosopher-conversation/server/plato-persona.ts](../../src/features/philosopher-conversation/server/plato-persona.ts)
- [src/features/philosopher-conversation/server/rag/chunking.ts](../../src/features/philosopher-conversation/server/rag/chunking.ts)
- [src/features/philosopher-conversation/server/rag/config.ts](../../src/features/philosopher-conversation/server/rag/config.ts)
- [src/features/philosopher-conversation/server/rag/embeddings.ts](../../src/features/philosopher-conversation/server/rag/embeddings.ts)
- [src/features/philosopher-conversation/server/rag/index-store.ts](../../src/features/philosopher-conversation/server/rag/index-store.ts)
- [src/features/philosopher-conversation/server/safety-handler.ts](../../src/features/philosopher-conversation/server/safety-handler.ts)
- [src/features/philosopher-conversation/server/structured.ts](../../src/features/philosopher-conversation/server/structured.ts)
- [tests/plato-chat.spec.ts](../../tests/plato-chat.spec.ts)
