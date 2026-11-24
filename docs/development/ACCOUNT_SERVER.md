# Запуск аккаунтов Sophia

## Публичный VPS

Используйте один экземпляр Next.js на актуальном Node.js 24 LTS с постоянным локальным диском. Закройте прямой доступ к порту Node.js и принимайте трафик через HTTPS-прокси. Для аккаунтов выберите отдельный SQLite-файл, расположенный вне публичной директории, например `/var/lib/sophia/accounts/accounts.sqlite`. Каталог принадлежит сервисному пользователю с правами 0700, файл имеет права 0600.

| Переменная | Публичное значение |
| --- | --- |
| `ACCOUNT_MODE` | `proxy` |
| `ACCOUNT_ORIGIN` | Точный HTTPS-origin Sophia без завершающего слеша |
| `ACCOUNT_DB_PATH` | Абсолютный путь к постоянной базе аккаунтов |
| `ACCOUNT_MAIL_TRANSPORT` | `smtp` |
| `SMTP_HOST` | `postbox.cloud.yandex.net` |
| `SMTP_PORT` | `587` |
| `SMTP_FROM` | `noreply@sophialearn.ru` |
| `SMTP_USER` | Идентификатор статического ключа доступа сервисного аккаунта |
| `SMTP_PASSWORD` | SMTP-пароль, вычисленный из секретной части статического ключа |
| `CHAT_PROXY_SECRET` | Общий с HTTPS-прокси секрет из 64 шестнадцатеричных символов |

Сервисный аккаунт должен быть в том же каталоге Yandex Cloud, что и адрес Postbox, и иметь роль `postbox.sender`. Преобразуйте секретную часть статического ключа локально по инструкции Yandex Cloud, в разделе SMTP → «Статический ключ доступа». Передайте приложению полученный SMTP-пароль через серверное окружение. Переменные SMTP хранятся вне Git и без префикса `NEXT_PUBLIC_`. Серверу нужен исходящий доступ к порту 587. Nodemailer требует STARTTLS с TLS 1.2 или выше и проверяет сертификат сервера. [Инструкция Yandex Cloud](https://yandex.cloud/ru/docs/postbox/operations/send-email).

Примените миграции перед запуском от имени сервисного пользователя с этим окружением.

```bash
npm run accounts:migrate
npm run build
npm run start
```

Если переменные хранятся в локальном файле, CLI можно запустить командой `node --env-file=.env.local scripts/accounts/cli.ts migrate`. Перед обновлением, меняющим схему, сохраните резервную копию базы. Миграции повторяемы и приложение также проверяет версию при открытии файла.

Пример маршрута Nginx дополняет [настройку чата](CHAT_SERVER.md). Файл с директивой `proxy_set_header X-Sophia-Proxy-Token "...";` должен быть доступен только администратору и прокси. Заменяйте входящие доверенные заголовки на прокси. Если есть CDN, получайте адрес посетителя только от проверенных сетей CDN. Исключите кэширование аутентифицированных HTML и API, тела запросов и cookies из журналов. `/api/progress` также передаётся в Next.js без кэширования.

```nginx
location ^~ /api/account/ {
    client_max_body_size 8k;
    client_body_timeout 5s;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Sophia-Client-IP $remote_addr;
    include /etc/nginx/private/sophia-chat-token.conf;
    proxy_cache off;
    proxy_pass http://127.0.0.1:3000;
}
```

Проверьте cookie `__Host-sophia-session` через публичный HTTPS. В обычном браузере должна появляться cookie с `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` без `Domain`. Проверьте вход и выход, две вкладки, переход из письма и отказ запросов с чужим Origin.

### Проверка доставки после подтверждения DKIM

1. Убедитесь, что у домена в консоли Postbox статус проверки DKIM `Success`. Запустите или перезапустите Sophia с публичными настройками из таблицы на HTTPS-адресе из `ACCOUNT_ORIGIN`. [Проверка домена в Postbox](https://yandex.cloud/ru/docs/postbox/quickstart).
2. На `/register` зарегистрируйте новый подконтрольный адрес. Проверьте получение письма от `noreply@sophialearn.ru`, при необходимости проверьте папку «Спам». Если проверяете повторную отправку, нажмите «Отправить повторно» до активации и используйте ссылку из последнего письма. Установите пароль по ссылке и войдите.
3. На `/forgot-password` запросите письмо на тот же адрес. Откройте полученную ссылку, измените пароль и проверьте вход с новым паролем.
4. При сбое регистрации приложение возвращает `503`. Запросы восстановления и повторной отправки сохраняют нейтральный ответ. Для подтверждения доставки проверяйте фактическое получение писем. Если письмо отсутствует, проверьте SMTP-пароль, роль отправителя, статус DKIM и исходящую доступность порта 587.

### Резервная копия

Используйте SQLite online backup на том же хосте. Он переносит согласованное состояние при работающем WAL. Ограничьте доступ к каталогу резервных копий и храните их зашифрованными.

```bash
umask 077
sqlite3 /var/lib/sophia/accounts/accounts.sqlite ".backup /private/backups/sophia-accounts.sqlite"
sqlite3 /private/backups/sophia-accounts.sqlite "PRAGMA integrity_check;"
```

Восстанавливайте сначала в отдельный каталог, проверяйте миграции и целостность. Перед заменой рабочего файла остановите приложение. После отката на старую копию удалите восстановленные записи `account_sessions` и `account_challenges` в транзакции, чтобы старые cookies и ссылки не ожили. Отдельно сверьте список прав `ai_chat` и проверьте, какие обновления прогресса произошли после снимка.

### Тестовый чат

После подтверждения аккаунта владелец сервера может выдать или отозвать право. CLI должен работать с тем же путём к базе, что и приложение.

```bash
npm run accounts:grant-chat -- test-user@example.com
npm run accounts:revoke-chat -- test-user@example.com
```

Чтобы увидеть обновлённое состояние интерфейса, обновите вкладку. Сервер проверяет отзыв на каждом запросе. Использование OpenAI требует отдельной настройки корпуса, ключа и бюджета по [руководству чата](CHAT_SERVER.md).

## Локальная проверка

Укажите `ACCOUNT_MODE=local`, loopback-origin, абсолютные пути к отдельной тестовой базе и файлу исходящих сообщений, затем `ACCOUNT_MAIL_TRANSPORT=test`. Родительский каталог базы создаётся при миграции или запуске локального сценария. Тестовый транспорт пишет ссылку в JSONL локально. Храните файл вне публичных каталогов. Автоматический Playwright запускает собственный loopback-сервер с отдельной временной базой и тестовым исходящим файлом в `artifacts/playwright-accounts/`.

Для локальной копии в `D:/Sophia` добавьте в существующий `.env.local` следующие настройки и откройте приложение по `http://127.0.0.1:3000`. Без настроенного транспорта запрос регистрации возвращает `503`.

```dotenv
ACCOUNT_MODE=local
ACCOUNT_ORIGIN=http://127.0.0.1:3000
ACCOUNT_DB_PATH=D:/Sophia/storage/accounts/accounts.sqlite
ACCOUNT_MAIL_TRANSPORT=test
ACCOUNT_TEST_OUTBOX=D:/Sophia/storage/accounts/dev-outbox.jsonl
```

После регистрации скопируйте ссылку из последней записи тестового почтового ящика и откройте её в том же браузере.

```powershell
(Get-Content -LiteralPath storage/accounts/dev-outbox.jsonl -Tail 1 | ConvertFrom-Json).url
```

```powershell
npm.cmd run test:accounts
npm.cmd run test:progress
npm.cmd run build
npm.cmd test -- tests/account.spec.ts
```

Правила синхронизации и перечень сохраняемых данных описаны в [архитектуре](../architecture/ACCOUNTS_AND_PROGRESS.md).
