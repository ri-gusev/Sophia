# Развёртывание Sophia на Ubuntu в Yandex Cloud

Шаблоны рассчитаны на одну ВМ и один процесс Next.js за Nginx, без CDN перед ним. Параметры квот и cgroups являются стартовыми для 2 vCPU / 4 ГБ. Применение и нагрузочная приёмка выполняются на закрытом стенде. Перед любым открытием учётных записей должны быть выполнены условия из [DATA_PROCESSING.md](../docs/legal/DATA_PROCESSING.md) и [SECURITY_REMEDIATION.md](../SECURITY_REMEDIATION.md).

## Поставка и системный пользователь

1. Обновите Ubuntu и Nginx из поддерживаемых источников. Поставьте исправленный Node.js 24 LTS из официальной поставки с проверкой подписи манифеста и SHA-256 архива. Шаблон unit использует конкретный путь к 24.22.3. При обновлении измените `ExecStart` и повторите проверки. [Бюллетень Node.js](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases)
2. На чистой Linux-среде соответствующей архитектуры соберите доверенный SHA через `npm ci` и `npm run build`. Для сборки используйте синтетическое или пустое окружение без production-секретов. Сохраните `.next`, `public`, `package*.json`, `next.config.ts`, код для SQL-миграций и CLI и установите в дерево релиза runtime-зависимости через `npm ci --omit=dev`. Запишите версии, SHA релиза, вывод `npm ls --omit=dev` и полный и production-аудиты. Исключите `.env*`, SQLite, журналы, outbox и тестовые артефакты из поставки и web root.
3. Создайте системного пользователя и группу `sophia` с `/usr/sbin/nologin`. Владелец кода, Node и симлинка `/srv/sophia/current` — root. Процессу нужны права чтения и прохода до файлов. Свяжите `/srv/sophia/current/.next/cache` с `/var/cache/sophia` при подготовке релиза. Создайте `/var/lib/sophia` и `/var/cache/sophia` с владельцем `sophia:sophia` и режимом 0700. Постоянные базы размещайте на локальной файловой системе. Корпус для будущего локального RAG храните отдельно с доступом чтения, пока публичный чат выключен, его можно исключить из поставки.
4. Установите unit из [deploy/systemd](systemd/sophia.service) и создайте `/etc/sophia/production.env` на основе [шаблона](systemd/production.env.example), root:root 0600. Подготовьте отдельный случайный секрет прокси из 32 байт в hex. Запишите одинаковый секрет в окружение и в `/etc/nginx/sophia-private/proxy-token.conf` с директивой `proxy_set_header X-Sophia-Proxy-Token "<hex>";`. Каталоги секретов root:root 0700, файлы 0600. Не выводите значения и полный `nginx -T` в тикеты или терминальные записи. Не задавайте файловый транспорт, outbox или ключ OpenAI в production. Настройте Postbox и минимальную роль `postbox.sender` для доступного восстановления. DKIM, TLS и фактическую доставку подтвердите отдельно на подконтрольном синтетическом ящике.
5. Сначала сохраните и проверьте копию БД. На стенде мигрируйте её под сервисным пользователем через `node scripts/accounts/cli.ts migrate` с целевым `ACCOUNT_DB_PATH`. Для новой пустой БД используйте тот же CLI. В production выполняйте миграцию с остановленным приложением, через одноразовый unit с теми же User, Group, WorkingDirectory и EnvironmentFile. Проверьте SQLite файл и sidecar-файлы (0700 каталог, 0600 файлы). Подключение включает `foreign_keys`, `secure_delete`, WAL и ожидание блокировки 250 мс.

```bash
sudo systemd-analyze verify /etc/systemd/system/sophia.service
sudo systemctl daemon-reload
sudo systemctl enable --now sophia
sudo systemctl status --no-pager sophia
/opt/node-v24.22.3/bin/node -p 'JSON.stringify({node:process.version, sqlite:process.versions.sqlite})'
sudo ss -ltnp
```

Сверьте реальный путь executable работающего PID с проверенным `ExecStart`. Подтвердите запись только в state/cache, оптимизацию изображений и перезапуск. На стенде убедитесь, что рестарт сохраняет состояние и поднимает плановую очистку, а таймер мониторинга сигнализирует о сбоях очистки и роста WAL. [systemd.exec](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)

## Сеть, TLS и ingress

1. Проверьте DNS, включая AAAA. Настройте Yandex VPC security group и firewall ОС с входящим запретом по умолчанию. Разрешите TCP/443, TCP/80 для редиректа и HTTP-01 и TCP/22 только из утверждённых административных CIDR IPv4 и IPv6. Сохраните открытый административный сеанс, проверьте консоль восстановления и новый SSH-сеанс перед применением запрета. Используйте SSH-ключи и запретите логин паролями и root после проверки доступа. Оставьте только необходимый исходящий трафик для DNS, синхронизации времени, обновлений, ACME и SMTP 587. Порт 3000 снаружи закрыт во всех группах и на ОС. [Группы безопасности Yandex Cloud](https://yandex.cloud/ru/docs/vpc/concepts/security-groups) · [Ubuntu Firewall](https://documentation.ubuntu.com/server/how-to/security/firewalls/)

```bash
sudo ufw default deny incoming
sudo ufw allow from "$SOPHIA_ADMIN_CIDR" to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

Повторите правило SSH отдельно для каждого утверждённого CIDR и проверьте итоговую политику IPv6. Перед `ufw enable` проверьте существующие правила, включая прежние разрешения SSH для всех.

2. Выпустите сертификат для `sophialearn.ru` выбранным ACME-клиентом. Для HTTP-01 сначала временно загрузите только HTTP vhost с webroot `/var/lib/letsencrypt`. Затем подключите [sophia.conf](nginx/sophia.conf) из `sites-enabled` внутри `http {}`, отключив штатный default vhost. Проверьте `sudo nginx -t`, перезагрузите конфигурацию, проверьте редирект, TLS 1.2/1.3, отказ для чужого SNI и Host и `certbot renew --dry-run`. После этого включите HSTS в шаблоне и перепроверьте HTTPS. Увеличивайте max-age после успешной эксплуатации. Используйте includeSubDomains только после проверки всех поддоменов.
3. Снаружи подтвердите невозможность прямого доступа к Node по IPv4 и IPv6. Через закрытый ingress подайте синтетические значения во входных `X-Sophia-*`, `Forwarded`, `X-Forwarded-*` и проверьте на стенде, что Node получает значения только от прокси. При появлении CDN пересмотрите realip и разрешённые сети, закройте прямой обход CDN и повторите приёмку. [Nginx proxy](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
4. Прогон на закрытом стенде должен включать две вкладки аккаунта, гостя и второй аккаунт. Проверьте отсутствие общего кэша для HTML, RSC, API, ошибок и редиректов, включая RSC prefetch, и сохранение `Vary`. Сверьте заголовки и secure/host-only cookie. Сравните работу Atlas и навигации до и после заголовков. Действующий CSP ограничивает фреймы, объекты, base и отправку форм. Дополнительные правила скриптов и CSS сначала проверяйте в Report-Only без внешнего сбора персональных данных. [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy) · [Nginx headers](https://nginx.org/en/docs/http/ngx_http_headers_module.html)
5. Синтетической нагрузкой проверьте маршруты аккаунта, GET/HEAD/POST прогресса, публичные страницы и холодный `/_next/image`. Проверьте отказы 413/429, `Retry-After`, соблюдение пределов параллельности и отсутствие вытеснения обычных клиентов. Проверьте тайм-аут на неполных заголовках, медленные тела и пределы дескрипторов и RSS. `client_body_timeout` проверяет паузы между чтениями. При недостаточной устойчивости на допустимом профиле трафика скорректируйте ограничения на стенде и повторите замеры. [Nginx rate limits](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html) · [Nginx connection limits](https://nginx.org/en/docs/http/ngx_http_limit_conn_module.html)
6. При закрытых флагах проверьте через HTTPS серверные отказы register/resend/verify для корректных синтетических данных и 503 чата. Дополнительно подтвердите 503 у Node на loopback с тем же production-окружением и отсутствие доступа к ledger и OpenAI. Отдельно проверьте версии `privacy` и `consent` и поведение приложения без SMTP-конфигурации. Флаги оставьте выключенными до решения о релизе.

## Журналы и обслуживание

Access log содержит только время, нормализованный метод, класс маршрута, статус, объём и длительность. Ошибки vhost в шаблоне отбрасываются, поскольку обычный error log Nginx может содержать исходные URL. Для диагностики используйте коды HTTP, агрегированное наблюдение, системные события запуска и стенд без реальных данных. Проверьте также глобальный error log Ubuntu, охват ранних ошибок TLS/HTTP, journald, ротацию Nginx и правила облачного мониторинга. Подтвердите отсутствие синтетических маркеров в эффективных журналах, включая ошибки. Согласуйте срок, объём и круг доступа, затем проверьте ротацию и удаление на практике.

Наблюдайте свободные байты и inode, RSS, CPU, задержки, WAL и SQLite busy, 429/503 по классу маршрута, сбои почты, очистки и бэкапов. Статусы приложения внутреннего уровня можно собирать без email, ID, токенов и тел. Настройте внешние HTTPS-проверки с тайм-аутом и оповещением. Числа в конфигурации требуют проверки на фактической ВМ. Выполните [регламент копий и удаления](DATA_LIFECYCLE.md) и приложите протокол к допуску.
