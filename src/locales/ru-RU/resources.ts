export default {
  'resources.title': 'Ресурсы',
  'resources.nodes': 'Ноды',
  'resources.button.create': 'Добавить воркер',
  'resources.button.edit': 'Редактировать воркер',
  'resources.button.edittags': 'Редактировать метки',
  'resources.button.update': 'Обновить метки',
  'resources.table.labels': 'Метки',
  'resources.table.hostname': 'Хостнейм',
  'resources.table.key.tips': 'Метка с таким ключом уже существует',
  'resources.form.label': 'Метка',
  'resources.form.advanced': 'Дополнительно',
  'resources.form.enablePartialOffload': 'Разрешить оффлоуд на CPU',
  'resources.form.placementStrategy': 'Стратегия размещения',
  'resources.form.workerSelector': 'Селектор воркеров',
  'resources.form.enableDistributedInferenceAcrossWorkers':
    'Разрешить распределённый инференс между воркерами',
  'resources.form.spread.tips':
    'Равномерно распределяет ресурсы между воркерами. Может увеличить фрагментацию ресурсов на отдельных воркерах.',
  'resources.form.binpack.tips':
    'Максимизирует утилизацию ресурсов, уменьшая фрагментацию на воркерах/GPU.',
  'resources.form.workerSelector.description':
    'Система выбирает подходящие воркеры для развертывания моделей на основе меток.',
  'resources.table.ip': 'IP-адрес',
  'resources.table.cpu': 'CPU',
  'resources.table.memory': 'ОЗУ',
  'resources.table.gpu': 'GPU',
  'resources.table.disk': 'Хранилище',
  'resources.table.vram': 'VRAM',
  'resources.table.index': 'Индекс',
  'resources.table.workername': 'Имя воркера',
  'resources.table.vender': 'Производитель',
  'resources.table.temperature': 'Температура',
  'resources.table.core': 'Ядра',
  'resources.table.utilization': 'Использование',
  'resources.table.gpuutilization': 'Использование GPU',
  'resources.table.vramutilization': 'Использование VRAM',
  'resources.table.total': 'Всего',
  'resources.table.used': 'Использовано',
  'resources.table.allocated': 'Выделено',
  'resources.table.wokers': 'воркеры',
  'resources.worker.linuxormaxos': 'Linux или macOS',
  'resources.table.unified': 'Объединённая память',
  'resources.worker.add.step1':
    'Получить токен <span class="note-text">(Запустить на сервере)</span>',
  'resources.worker.add.step2': 'Зарегистрировать воркер',
  'resources.worker.add.step2.tips':
    '(Запустить на добавляемом воркере, <span class="bold-text">token</span> — это значение, полученное на первом шаге.)', // Translated
  'resources.worker.add.step3':
    'После успешной регистрации обновите список воркеров.',
  'resources.worker.container.supported': 'Только для Linux.',
  'resources.worker.current.version': 'Текущая версия: {version}',
  'resources.worker.driver.install':
    'Установите <a href="https://www.bc-cloud.com/latest/installation/installation-requirements/" target="_blank">необходимые драйверы и библиотеки</a> перед установкой GPUStack.', // Translated
  'resources.worker.select.command':
    'Выберите метку для генерации команды и скопируйте её.',
  'resources.worker.script.install': 'Установка скриптом',
  'resources.worker.container.install': 'Установка контейнером (только Linux)',
  'resources.worker.cann.tips': `Установите <span class="bold-text">--device /dev/davinci{index}</span> в соответствии с требуемым индексом NPU. Например, чтобы подключить NPU0 и NPU1, добавьте <span class="bold-text">--device /dev/davinci0 --device /dev/davinci1</span>.`, // Translated
  'resources.modelfiles.form.path': 'Путь хранения',
  'resources.modelfiles.modelfile': 'Файлы моделей',
  'resources.modelfiles.download': 'Добавить файл модели',
  'resources.modelfiles.size': 'Размер',
  'resources.modelfiles.selecttarget': 'Выбрать назначение',
  'resources.modelfiles.form.localdir': 'Локальный каталог',
  'resources.modelfiles.form.localdir.tips':
    'Каталог хранения по умолчанию — <span class="desc-block">/var/lib/gpustack/cache</span>, или каталог, указанный с помощью <span class="desc-block">--cache-dir</span> (предпочтительно) или <span class="desc-block">--data-dir</span>.', // Translated
  'resources.modelfiles.retry.download': 'Повторить загрузку',
  'resources.modelfiles.storagePath.holder': 'Ожидание завершения загрузки...',
  'resources.filter.worker': 'Фильтровать по узлу',
  'resources.filter.source': 'Фильтровать по источнику',
  'resources.modelfiles.delete.tips': 'Также удалить файл с диска',
  'resources.modelfiles.copy.tips': 'Скопировать полный путь',
  'resources.modelcache.title': 'Архив моделей',
  'resources.modelcache.description':
    'Архивирует загруженные модели ModelScope в Local S3. Архивные данные не добавляются автоматически в инвентарь предварительной загрузки.',
  'resources.modelcache.cached': 'Архивные модели',
  'resources.modelcache.tasks': 'Задачи архивации',
  'resources.modelcache.cache': 'Архивировать в S3',
  'resources.modelcache.model': 'Модель',
  'resources.modelcache.sourceFile': 'Локальный файл модели',
  'resources.modelcache.sourceWorker': 'Исходный воркер',
  'resources.modelcache.target': 'Целевой Local S3',
  'resources.modelcache.filesAndSize': 'Файлы и размер',
  'resources.modelcache.s3Path': 'Путь S3',
  'resources.modelcache.capacity': 'Объём',
  'resources.modelcache.fileCount': 'Файлы',
  'resources.modelcache.updatedAt': 'Обновлено',
  'resources.modelcache.progress': 'Прогресс',
  'resources.modelcache.search': 'Поиск организации или модели',
  'resources.modelcache.refresh': 'Обновить',
  'resources.modelcache.state.pending': 'Ожидание',
  'resources.modelcache.state.uploading': 'Загрузка',
  'resources.modelcache.state.ready': 'Готово',
  'resources.modelcache.state.error': 'Ошибка',
  'resources.modelcache.deleteCache': 'Удалить архивную модель',
  'resources.modelcache.deleteCache.content':
    '{model} · файлов: {files} · {size}',
  'resources.modelcache.deleteTask': 'Удалить задачу архивации',
  'resources.modelcache.deleteTask.running':
    'Удаление задачи #{id} остановит загрузку и удалит загруженные ею файлы.',
  'resources.modelcache.deleteTask.finished':
    'Будет удалена только запись задачи #{id}. Архивные файлы модели сохранятся.',
  'resources.preheat.archive': 'Архив Local S3',
  'resources.filter.path': 'Фильтрация по пути',
  'resources.register.worker.step1':
    'В меню выберите <span class="bold-text">Скопировать токен</span>.',
  'resources.register.worker.step2':
    'В меню выберите <span class="bold-text">Быстрая настройка</span>.',
  'resources.register.worker.step3':
    'Перейдите на вкладку <span class="bold-text">Общие</span>.',
  'resources.register.worker.step4':
    'Выберите роль сервиса: <span class="bold-text">Воркер</span>.',
  'resources.register.worker.step5':
    'Введите <span class="bold-text">URL сервера</span>: {url}.',
  'resources.register.worker.step6':
    'Вставьте <span class="bold-text">Токен</span>.',
  'resources.register.worker.step7':
    'Нажмите <span class="bold-text">Перезапуск</span> для применения настроек.',
  'resources.register.install.title': 'Установка GPUStack на {os}',
  'resources.register.download':
    'Скачайте и установите <a href={url} target="_blank">инсталлятор</a>. Поддерживаемые версии: {versions}.',
  'resource.register.maos.support': 'Apple Silicon (серия M), macOS 14+',
  'resource.register.windows.support': 'Windows 10, Windows 11',
  'resources.storage.title': 'Model Storage',
  'resources.storage.description':
    'Verified node models and the shared S3 model library are reused by sync, downloads, and preheat.',
  'resources.storage.nodeModels': 'Node Models',
  'resources.storage.library': 'S3 Model Library',
  'resources.storage.syncTasks': 'Sync Tasks',
  'resources.storage.preheatTasks': 'Preheat Tasks',
  'resources.storage.policies': 'Distribution Policies',
  'resources.storage.profiles': 'S3 Profiles',
  'resources.storage.artifacts': 'Synced Models',
  'resources.storage.connectivity': 'Worker Connectivity',
  'resources.storage.model': 'Model',
  'resources.storage.modelSource': 'Model Source',
  'resources.storage.sourceWorker': 'Source Worker',
  'resources.storage.version': 'Version',
  'resources.storage.fileCount': 'Files',
  'resources.storage.capacity': 'Capacity',
  'resources.storage.targetProfile': 'Target S3 Profile',
  'resources.storage.sync': 'Sync to S3 Model Library',
  'resources.storage.sync.confirmTitle': 'Sync to S3 Model Library',
  'resources.storage.sync.submit': 'Start Sync',
  'resources.storage.refresh': 'Refresh Inventory',
  'resources.storage.refreshConfirm': 'Refresh S3 Inventory',
  'resources.storage.refreshContent': 'Scan valid manifests?',
  'resources.storage.cancelSync': 'Cancel Sync',
  'resources.storage.cancelSyncConfirm': 'Cancel Sync Task',
  'resources.storage.cancelSyncContent': 'Cancel or delete sync task #{id}?',
  'resources.storage.systemProfile': 'System Configuration',
  'resources.storage.setDefault': 'Set Default',
  'resources.storage.setDefaultConfirm': 'Switch Default S3 Profile',
  'resources.storage.setDefaultContent':
    'Only new downloads and tasks are affected.',
  'resources.storage.checkWorkers': 'Check Workers',
  'resources.storage.connectionScope':
    'Test Connection checks Server; Check Workers checks Worker.',
  'resources.storage.testConnection': 'Test Connection',
  'resources.storage.testResult': 'Server Connection Test',
  'resources.storage.encryptionUnavailable':
    'Server credential encryption is unavailable. Contact an administrator.',
  'resources.storage.endpointTlsMismatch':
    'The endpoint protocol and TLS switch do not match.',
  'resources.storage.sourceFallback':
    'Allow download from model source when missing',
  'resources.storage.sourceFallbackHint':
    'Этот переключатель влияет на обычную загрузку моделей, только если профиль выбран по умолчанию.',
  'resources.storage.testCredentialsRequired':
    'Перед проверкой повторно введите Access Key и Secret Key.',
  'resources.storage.refreshSubmitted':
    'Обновление инвентаря отправлено, ожидается результат сканирования.',
  'resources.storage.checkWorkersConfirm': 'Проверка подключения воркеров',
  'resources.storage.checkWorkersContent':
    'Проверить подключение воркеров к S3-профилю «{name}»?',
  'resources.storage.transferMethod': 'Способ получения',
  'resources.storage.syncTaskDetail': 'Сведения о задаче синхронизации',
  'resources.storage.refreshCompleted': 'Обновление инвентаря завершено.',
  'resources.storage.refreshFailed': 'Не удалось обновить инвентарь.',
  'resources.storage.transfer.current_node': 'Текущий воркер ({worker})',
  'resources.storage.transfer.peer_via_s3':
    'Другой воркер ({worker}) через S3-хранилище {profile}',
  'resources.storage.transfer.s3': 'S3-хранилище ({profile})',
  'resources.storage.transfer.modelscope': 'Загружено из ModelScope',
  'resources.storage.transfer.huggingface': 'Загружено из Hugging Face',
  'resources.storage.transfer.unknown': 'Неизвестный способ получения',
  'resources.storage.syncTask.errorCode': 'Причина ошибки',
  'resources.storage.syncTask.error.worker_execution_failed':
    'Воркер не смог выполнить задачу синхронизации',
  'resources.storage.syncTask.error.manifest_invalid':
    'Недопустимый манифест модели',
  'resources.storage.syncTask.error.s3_object_conflict':
    'Объект модели конфликтует с существующим объектом в S3',
  'resources.storage.tlsEnabledHint':
    'Определяет, используется ли TLS-шифрование при передаче данных в S3. При отключении используется незашифрованное соединение.',
  'resources.storage.tlsVerifyHint':
    'Отключайте только для частного CA или самоподписанных сертификатов. Сертификат не будет проверяться, что создаёт риск атаки посредника.',
  'resources.storage.virtualHostedHint':
    'При включении используется виртуальный хост bucket.endpoint, при отключении - путь endpoint/bucket. Выберите режим, совместимый с S3-сервисом.',
  'resources.storage.sourceFallbackDetail':
    'Действует, только когда этот профиль выбран по умолчанию. Если модели нет в кэше S3, включение продолжает загрузку из исходного источника модели, отключение приводит к ошибке загрузки.',
  'resources.preheat.profile.deleteConfirm': 'Удалить профиль S3',
  'resources.preheat.profile.maintenance': 'Обслуживание',
  'resources.preheat.profile.maintenanceHint':
    'Жизненный цикл не зависит от состояния подключения. Профили на обслуживании исключаются из выбора для новых загрузок, синхронизаций, прогрева, политик и расписаний.',
  'resources.preheat.profile.maintenanceAction': 'Перевести в обслуживание',
  'resources.preheat.profile.maintenanceActionHint':
    'Исключает профиль из новых задач без удаления данных S3.',
  'resources.preheat.profile.restoreAction': 'Восстановить использование',
  'resources.preheat.profile.restoreActionHint':
    'Снова разрешает использовать профиль для новых задач, но не назначает его по умолчанию.',
  'resources.preheat.profile.maintenanceConfirm':
    'Перевести в режим обслуживания',
  'resources.preheat.profile.maintenanceContent':
    'Перевести S3-профиль «{name}» в обслуживание? Он не будет доступен для выбора в загрузках, синхронизациях, прогреве, политиках и расписаниях. Данные S3 не удаляются, а существующие задачи продолжают работу с фиксированной конфигурацией.',
  'resources.preheat.profile.restoreConfirm': 'Восстановить S3-профиль',
  'resources.preheat.profile.restoreContent':
    'Восстановить использование S3-профиля «{name}»? Он не будет автоматически назначен профилем по умолчанию.',
  'resources.preheat.profile.credentialUnavailableHint':
    'При недоступном подключении обновите Access Key и Secret Key в ручном профиле. Это не переводит профиль в обслуживание автоматически.',
  'resources.preheat.profile.systemCredentialUnavailableHint':
    'При недоступном подключении обновите учетные данные системной конфигурации через параметры запуска и перезапустите сервис. Это не переводит профиль в обслуживание автоматически.',
  'resources.preheat.profile.connectivityUnavailableHint':
    'Сбой подключения может быть связан с DNS, TLS, сетью, аутентификацией или Bucket. Откройте сведения о подключении и проверьте этап сбоя; затем обновите учетные данные, TLS или адресацию ручного профиля. Профиль не переводится в обслуживание автоматически.',
  'resources.preheat.profile.systemConnectivityUnavailableHint':
    'Сбой подключения может быть связан с DNS, TLS, сетью, аутентификацией или Bucket. Откройте сведения о подключении и проверьте этап сбоя; управляемые поля обновите через параметры запуска и перезапустите сервис, а доступные переключатели можно изменить на этой странице. Профиль не переводится в обслуживание автоматически.',
  'resources.preheat.profile.deleteContent':
    'Удалить профиль S3 «{name}»? Используемый профиль удалить нельзя.',
  'resources.preheat.profile.deleteContent.default':
    'Удалить профиль S3 «{name}»? После удаления новые загрузки будут выполняться напрямую из источника модели, пока не будет назначен другой профиль S3 по умолчанию.',
  'resources.preheat.profile.deleteContent.system':
    'Удалить профиль S3 «{name}»? После удаления система перестанет использовать этот S3. Если локальный S3 остаётся в параметрах запуска Server или Docker, профиль будет создан заново после перезапуска.',
  'resources.preheat.profile.deleteContent.systemDefault':
    'Удалить профиль S3 «{name}»? После удаления система перестанет использовать этот S3, а новые загрузки будут выполняться напрямую из источника модели, пока не будет назначен другой профиль S3 по умолчанию. Если локальный S3 остаётся в параметрах запуска Server или Docker, профиль будет создан заново после перезапуска.',
  'resources.storage.sync.noDefault':
    'Нет доступного активного профиля S3 по умолчанию. Сначала назначьте профиль по умолчанию.',
  'resources.storage.sync.alreadyFromDefault':
    'Эта модель уже получена из S3-библиотеки моделей по умолчанию, повторная синхронизация не требуется.',
  'resources.storage.sync.missingRevision':
    'У этой устаревшей модели нет доверенных данных о версии. Загрузите ее повторно перед синхронизацией с S3.',
  'resources.storage.revision.modelscopeFilelist':
    'Отпечаток списка файлов {fingerprint}',
  'resources.preheat.noReadyWorkers':
    'Нет Ready-воркеров для проверки подключения.',
  'resources.storage.syncBatch.create': 'Создать задачу синхронизации',
  'resources.storage.syncBatch.scope': 'Область синхронизации',
  'resources.storage.syncBatch.scope.single_model': 'Одна модель',
  'resources.storage.syncBatch.scope.selected_models': 'Выбранные модели',
  'resources.storage.syncBatch.scope.selected_workers': 'Выбранные воркеры',
  'resources.storage.syncBatch.scope.all_ready_workers': 'Все Ready-воркеры',
  'resources.storage.syncBatch.description.single_model':
    'Загрузить существующую модель выбранного Ready-воркера в целевой S3. Модель не будет разослана на другие воркеры.',
  'resources.storage.syncBatch.description.selected_models':
    'Создать задачи синхронизации для выбранных моделей одним пакетом.',
  'resources.storage.syncBatch.description.selected_workers':
    'Загрузить существующие модели выбранных Ready-воркеров в целевой S3. Они не будут разосланы на другие воркеры.',
  'resources.storage.syncBatch.description.all_ready_workers':
    'Загрузить существующие модели всех Ready-воркеров в целевой S3. Они не будут разосланы на другие воркеры.',
  'resources.storage.syncBatch.selectWorker': 'Выберите воркер',
  'resources.storage.syncBatch.selectModel': 'Выберите модель',
  'resources.storage.syncBatch.noSyncableModels':
    'На этом воркере нет готовых к синхронизации моделей.',
  'resources.storage.syncBatch.selectedModelCount': 'Выбрано моделей: {count}',
  'resources.storage.syncBatch.selectionLimit':
    'За один раз можно выбрать не более 500 моделей.',
  'resources.storage.syncBatch.syncSelected': 'Синхронизировать выбранные',
  'resources.storage.syncBatch.planned': 'Запланировано',
  'resources.storage.syncBatch.created': 'Создано',
  'resources.storage.syncBatch.skipped': 'Пропущено',
  'resources.storage.syncBatch.failed': 'Ошибка',
  'resources.storage.syncBatch.result': 'Результат создания',
  'resources.storage.syncBatch.reason': 'Причина',
  'resources.storage.syncBatch.reason.model_file_not_ready': 'Модель не готова',
  'resources.storage.syncBatch.reason.worker_not_ready': 'Воркер не готов',
  'resources.storage.syncBatch.reason.duplicate_artifact_identity':
    'Та же версия модели уже запланирована с другого Ready-воркера',
  'resources.storage.syncBatch.reason.active_task_exists':
    'Задача синхронизации уже выполняется',
  'resources.storage.syncBatch.reason.model_file_not_found':
    'Модель не существует',
  'resources.storage.syncBatch.reason.no_ready_workers':
    'Нет доступных Ready-воркеров',
  'resources.storage.deleteSync': 'Удалить запись синхронизации',
  'resources.storage.deleteSyncConfirm': 'Удалить запись синхронизации',
  'resources.storage.deleteSyncContent':
    'Удалить запись синхронизации #{id}? Это действие нельзя отменить; артефакт S3 и локальные файлы модели не будут удалены.',
  'resources.storage.syncTask.time': 'Время синхронизации',
  'resources.storage.syncTask.from': 'Исходный воркер',
  'resources.storage.syncTask.to': 'Целевой S3',
  'resources.storage.syncTask.state.pending': 'Ожидание',
  'resources.storage.syncTask.state.scanning': 'Сканирование',
  'resources.storage.syncTask.state.publishing': 'Загрузка в S3',
  'resources.storage.syncTask.state.ready': 'Завершено',
  'resources.storage.syncTask.state.error': 'Ошибка',
  'resources.storage.syncTask.state.canceled': 'Отменено',
  'resources.storage.syncTask.batch.selectedCount': 'Выбрано задач: {count}',
  'resources.storage.syncTask.batch.action': 'Обработать выбранные',
  'resources.storage.syncTask.batch.confirmTitle':
    'Пакетная обработка задач синхронизации',
  'resources.storage.syncTask.batch.confirmContent':
    'Обработать все выбранные задачи синхронизации ({total})?',
  'resources.storage.syncTask.batch.confirmCounts':
    'Будет отменено активных задач: {cancel}; удалено завершённых: {delete}.',
  'resources.storage.syncTask.batch.failedSummary':
    'Не удалось обработать {failed} из {total} задач; они остались выбранными.',
  'resources.storage.createStrategy':
    'Создать стратегию из этой записи синхронизации',
  'resources.preheat.policy.create': 'Новая стратегия',
  'resources.preheat.policy.createContinuous': 'Создать непрерывную стратегию',
  'resources.preheat.policy.continuous': 'Непрерывная синхронизация',
  'resources.preheat.policy.scheduled': 'По расписанию',
  'resources.preheat.schedule.create': 'Новая стратегия по расписанию',
  'resources.preheat.schedule.edit': 'Изменить стратегию по расписанию',
  'resources.preheat.schedule.triggerMode': 'Режим запуска',
  'resources.preheat.schedule.triggerMode.manual': 'Вручную',
  'resources.preheat.schedule.triggerMode.scheduled': 'По расписанию',
  'resources.preheat.schedule.cron': 'Выражение Cron',
  'resources.preheat.schedule.timezone': 'Часовой пояс',
  'resources.preheat.schedule.window': 'Окно выполнения (минуты)',
  'resources.preheat.schedule.concurrency': 'Максимальная параллельность',
  'resources.preheat.schedule.bandwidth':
    'Лимит пропускной способности (Мбит/с)',
  'resources.preheat.schedule.nextRun': 'Следующий запуск',
  'resources.preheat.schedule.lastRun': 'Последний запуск',
  'resources.preheat.schedule.runNow': 'Выполнить сейчас',
  'resources.preheat.schedule.enableConfirm':
    'Включить стратегию по расписанию',
  'resources.preheat.schedule.disableConfirm':
    'Отключить стратегию по расписанию',
  'resources.preheat.schedule.runConfirm':
    'Выполнить стратегию по расписанию сейчас',
  'resources.preheat.schedule.deleteConfirm': 'Удалить стратегию по расписанию',
  'resources.preheat.schedule.actionContent':
    'Выполнить это действие для стратегии по расписанию «{name}»?',
  'resources.storage.taskRecords': 'Записи задач',
  'resources.storage.distributionTasks': 'Записи распространения',
  'resources.storage.retry': 'Повторить',
  'resources.storage.repository.exactInput': 'Введите точное имя модели',
  'resources.storage.state.loading': 'Загрузка',
  'resources.storage.state.refreshing':
    'Обновление с сохранением текущих данных',
  'resources.storage.state.error':
    'Не удалось загрузить данные. Повторите попытку.',
  'resources.storage.state.empty': 'Нет данных',
  'resources.storage.state.noMatch': 'Нет совпадений',
  'resources.storage.loadMore': 'Загрузить ещё',
  'resources.storage.artifact.profileRequired':
    'Сначала выберите конфигурацию S3.',
  'resources.storage.distributionTasks.unavailable':
    'Сервер не предоставляет записи выполнения распространения.',
  'resources.storage.repository.advanced': 'Расширенные настройки',
  'resources.storage.flow.workerToProfile': '{worker} -> {profile}',
  'resources.storage.flow.workerToProfileToWorker':
    '{worker} -> {profile} -> {targetWorker}',
  'resources.storage.status.pending': 'Ожидание',
  'resources.storage.status.running': 'Выполняется',
  'resources.storage.status.ready': 'Готово',
  'resources.storage.status.error': 'Ошибка',
  'resources.storage.status.canceled': 'Отменено',
  'resources.storage.status.valid': 'Действительно',
  'resources.storage.status.invalid': 'Недействительно',
  'resources.storage.status.missing': 'Отсутствует',
  'resources.storage.status.stale': 'Устарело',
  'resources.storage.status.unknown': 'Неизвестное состояние',
  'resources.storage.error.artifactNotReady': 'Модель ещё не готова',
  'resources.storage.error.profileMaintenance':
    'Конфигурация S3 на обслуживании',
  'resources.storage.error.objectConflict': 'Конфликт объекта S3',
  'resources.storage.error.manifestInvalid': 'Недействительный манифест модели',
  'resources.storage.error.manifestInvalid.actionHint':
    'Проверьте соответствие файлов модели манифесту, исправьте их и повторите задачу.',
  'resources.storage.error.workerUnavailable': 'Узел недоступен',
  'resources.storage.error.workerExecutionFailed': 'Сбой выполнения на узле',
  'resources.storage.error.workerExecutionFailed.actionHint':
    'Проверьте журналы Worker, место на диске, сеть и доступ к S3, затем повторите попытку.',
  'resources.storage.error.syncSourceNotFound':
    'Исходная модель не найдена или удалена',
  'resources.storage.error.syncSourceNotFound.actionHint':
    'Обновите список моделей узла, проверьте исходную модель и создайте задачу заново.',
  'resources.storage.error.syncSourceFilesMissing':
    'Файлы исходной модели отсутствуют',
  'resources.storage.error.syncSourceFilesMissing.actionHint':
    'Восстановите или повторно загрузите файлы модели на исходном Worker и повторите синхронизацию.',
  'resources.storage.error.localManifestInvalid':
    'Недействительный манифест модели на Worker',
  'resources.storage.error.localManifestInvalid.actionHint':
    'Проверьте файлы исходной модели, исправьте или загрузите их заново и повторите попытку.',
  'resources.storage.error.s3ManifestInvalid':
    'Недействительный манифест модели в S3',
  'resources.storage.error.s3ManifestInvalid.actionHint':
    'Обновите инвентарь S3; если ошибка останется, синхронизируйте модель заново.',
  'resources.storage.error.unknown': 'Неизвестная ошибка',
  'resources.storage.error.unknown.actionHint':
    'Проверьте сведения о задаче и журналы Worker, найдите исходный код ошибки и повторите попытку.',
  'resources.storage.updateCredentials': 'Обновить учетные данные',
  'resources.storage.updateCredentialsContent':
    'Текущие учетные данные доступа к S3 будут заменены.',
  'resources.storage.artifactDetail': 'Сведения об артефакте',
  'resources.preheat.profile.lifecycle': 'Жизненный цикл',
  'resources.preheat.profile.active': 'Активен',
  'resources.storage.inventoryRefreshInterval':
    'Интервал автоматического сканирования (секунды)',
  'resources.storage.inventorySource': 'Источник инвентаря',
  'resources.storage.inventorySource.task': 'Локальная задача',
  'resources.storage.inventorySource.scan': 'Обнаружено сканированием S3',
  'resources.storage.lastVerifiedAt': 'Последняя проверка',
  'resources.storage.lastScan': 'Последнее сканирование',
  'resources.storage.scanAttemptAt': 'Последняя попытка',
  'resources.storage.scanSucceededAt': 'Последний успех',
  'resources.storage.scanResult': 'Результат',
  'resources.storage.scanResult.success': 'Просканировано моделей: {count}',
  'resources.storage.artifactId': 'ID модели',
  'resources.storage.manifestDigest': 'Хеш манифеста',
  'resources.storage.manifestPath': 'Путь манифеста',
  'resources.storage.includePatterns': 'Включаемые шаблоны',
  'resources.storage.excludePatterns': 'Исключаемые шаблоны',
  'resources.storage.artifact.filterSummary':
    'Включено: {include}, исключено: {exclude}',
  'resources.storage.createdAt': 'Создано',
  'resources.storage.updatedAt': 'Обновлено',
  'resources.storage.profile': 'Профиль S3',
  'resources.storage.testCredentialsRequiredHint':
    'Перед проверкой подключения обновите учетные данные и заполните оба ключа.',
  'resources.storage.sync.confirmSummary':
    'Совпадающее содержимое модели пропускается, а файлы с другим хешем заменяются.',
  'resources.storage.sync.unsupportedSource':
    'Этот источник не поддерживается для синхронизации с S3.',
  'resources.storage.sync.modelNotReady':
    'Модель еще не готова к синхронизации.',
  'resources.storage.workerNotCurrent': 'Это не последняя регистрация Worker.',
  'resources.storage.workerProtocolIncompatible':
    'Протокол синхронизации Worker несовместим.',
  'resources.storage.workerProtocolMissing':
    'Worker не сообщает версию протокола синхронизации.',
  'resources.storage.syncPolicy.disabled.profileMaintenance':
    'Целевой профиль S3 находится на обслуживании.',
  'resources.preheat.deliveryMode': 'Режим доставки',
  'resources.preheat.delivery.s3_only': 'Публиковать только в S3',
  'resources.preheat.delivery.s3_and_workers': 'Публиковать в S3 и воркеры',
  'resources.preheat.connectivity.createAnyway': 'Всё равно создать',
  'resources.storage.syncPolicy.disabled.policyDisabled': 'Политика отключена.',
  'resources.storage.syncPolicy.windowStart': 'Окно запуска',
  'resources.storage.syncPolicy.modelFile': 'Файл модели',
  'resources.preheat.policy.disabled.profileStale':
    'Версия профиля S3 изменилась. Сначала выполните повторное согласование политики.',
  'resources.preheat.policy.disabled.blocked':
    'Сервер сейчас блокирует включение: {reason}',
  'resources.storage.deleteModelBlocked': 'Невозможно удалить запись модели',
  'resources.storage.deleteModelBlockedContent':
    'У модели «{name}» есть активная задача синхронизации. Дождитесь ее завершения или отмените задачу перед удалением записи.',
  'resources.storage.deleteModelBlockedBatchName': 'Выбранные модели: {count}',
  'resources.preheat.confirm.title': 'Подтверждение создания',
  'resources.preheat.confirm.flow': 'Итоговый маршрут',
  'resources.preheat.confirm.flow.s3Only': '{model} -> S3-профиль {profile}',
  'resources.preheat.confirm.flow.workers':
    '{model} -> S3-профиль {profile} -> целевые воркеры',
  'resources.preheat.confirm.flow.artifact':
    'Фиксированный S3 Artifact {model} -> целевые воркеры этого кластера',
  'resources.preheat.confirm.targetCount': 'Целевые воркеры',
  'resources.preheat.confirm.targetPending':
    'Определяется при выполнении по диапазону GPU',
  'resources.preheat.confirm.capacity': 'Доступная ёмкость',
  'resources.preheat.confirm.capacityUnavailable':
    'Воркеры не передали сведения о ёмкости',
  'resources.preheat.confirm.artifactSize': 'Размер модели S3',
  'resources.preheat.confirm.skipRule': 'Правило пропуска',
  'resources.preheat.confirm.skipRuleValue':
    'Файлы с тем же хешем пропускаются.',
  'resources.preheat.confirm.conflictRule': 'Правило замены/конфликта',
  'resources.preheat.confirm.conflictRuleValue':
    'Файлы с другим хешем заменяются; сервер обрабатывает конфликты по правилам идемпотентности и lease.',
  'resources.preheat.confirm.conflictRuleValue.s3_only':
    'Конфликтующее содержимое с тем же Artifact ID изолируется или отклоняется; общий S3 Artifact не перезаписывается.',
  'resources.preheat.confirm.conflictRuleValue.workers':
    'Файлы с другим хешем на целевых воркерах заменяются по правилам идемпотентности и lease сервера.',
  'resources.preheat.confirm.conflictRuleValue.artifact':
    'Фиксированный Artifact устанавливается только на целевые воркеры; конфликты файлов обрабатываются по правилам идемпотентности и lease сервера.',
  'resources.storage.taskProgress': 'Ход выполнения',
  'resources.storage.startedAt': 'Начато',
  'resources.storage.finishedAt': 'Завершено',
  'resources.storage.taskTimeline': 'Хронология',
  'resources.preheat.schedule.preset.manual': 'Вручную',
  'resources.preheat.schedule.preset.hourly': 'Каждый час',
  'resources.preheat.schedule.preset.daily': 'Каждый день',
  'resources.preheat.schedule.preset.weekly': 'Каждую неделю',
  'resources.preheat.schedule.preset.custom': 'Пользовательский Cron',
  'resources.preheat.schedule.time': 'Время запуска',
  'resources.preheat.schedule.weekday': 'День недели',
  'resources.preheat.schedule.weekday.0': 'Воскресенье',
  'resources.preheat.schedule.weekday.1': 'Понедельник',
  'resources.preheat.schedule.weekday.2': 'Вторник',
  'resources.preheat.schedule.weekday.3': 'Среда',
  'resources.preheat.schedule.weekday.4': 'Четверг',
  'resources.preheat.schedule.weekday.5': 'Пятница',
  'resources.preheat.schedule.weekday.6': 'Суббота',
  'resources.preheat.schedule.preset.continuous': 'Непрерывное заполнение',
  'resources.preheat.schedule.summary.label': 'Сводка расписания',
  'resources.preheat.schedule.summary.manual': 'Запуск вручную',
  'resources.preheat.schedule.summary.continuous': 'Непрерывная сверка',
  'resources.preheat.schedule.summary.hourly': 'Запуск каждый час',
  'resources.preheat.schedule.summary.daily': 'Запуск каждый день в {time}',
  'resources.preheat.schedule.summary.weekly':
    'Запуск каждый {weekday} в {time}',
  'resources.preheat.schedule.summary.custom': 'Пользовательский Cron: {cron}',
  'resources.preheat.schedule.nextRuns': 'Следующие три запуска',
  'resources.preheat.schedule.nextRunsUnavailable':
    'Предпросмотр в клиенте недоступен',
  'resources.storage.totalSize': 'Общий размер',
  'resources.storage.stateMessage': 'Сообщение состояния',
  'resources.storage.taskState.paused': 'Приостановлено',
  'resources.storage.taskState.partial': 'Частично завершено',
  'resources.storage.taskState.unknown': 'Неизвестное состояние',
  'resources.storage.syncTask.state.running': 'Выполняется',
  'resources.storage.distributionPolicy.tab': 'Политики доставки',
  'resources.storage.distributionPolicy.kind': 'Непрерывная доставка',
  'resources.storage.distributionPolicy.create': 'Создать политику доставки',
  'resources.storage.distributionPolicy.hint':
    'Выберите модель S3 и настройте её непрерывную доставку на целевые узлы.',
  'resources.storage.distributionPolicy.source': 'Исходная модель',
  'resources.storage.distributionPolicy.artifact': 'Модель S3',
  'resources.storage.distributionPolicy.syncTask': 'Задача синхронизации',
  'resources.storage.distributionPolicy.selectedCount':
    'Выбрано моделей: {count}',
  'resources.storage.distributionPolicy.createSelected':
    'Создать политику из выбранных',
  'resources.storage.distributionPolicy.createAllCurrent':
    'Все текущие допустимые модели',
  'resources.storage.pagination.total': 'Всего: {total}',
  'resources.storage.distributionPolicy.edit': 'Изменить политику доставки',
  'resources.storage.distributionPolicy.selectionMode': 'Выбор моделей',
  'resources.storage.distributionPolicy.selectionMode.fixed': 'Одна модель',
  'resources.storage.distributionPolicy.selectionMode.selected':
    'Выбранные модели',
  'resources.storage.distributionPolicy.selectionMode.all_current':
    'Все текущие допустимые модели',
  'resources.storage.distributionPolicy.artifacts': 'Модели S3',
  'resources.storage.distributionPolicy.structureLocked':
    'Эта политика уже выполнялась. Набор моделей, профиль и целевые узлы заблокированы; имя и расписание можно изменить.',
  'resources.storage.distributionPolicy.confirm.allCurrent':
    'Использовать все текущие допустимые модели из {profile}',
  'resources.storage.distributionPolicy.confirm.selected':
    'Использовать выбранные модели из {profile}: {count}',
  'resources.storage.distributionPolicy.latestRun': 'Последний запуск',
  'resources.storage.distributionPolicy.notExecuted': 'Ещё не запускалась',
  'resources.storage.distributionPolicy.execution.waiting': 'Ожидание',
  'resources.storage.distributionPolicy.execution.running': 'Выполняется',
  'resources.storage.distributionPolicy.execution.paused': 'Приостановлено',
  'resources.storage.distributionPolicy.execution.ready': 'Завершено',
  'resources.storage.distributionPolicy.execution.partial_error':
    'Частично завершено с ошибкой',
  'resources.storage.distributionPolicy.execution.error': 'Ошибка',
  'resources.storage.distributionPolicy.execution.skipped': 'Пропущено',
  'resources.storage.distributionPolicy.progress': 'Ход выполнения',
  'resources.storage.distributionPolicy.progressCount':
    'Завершено {completed}/{total}',
  'resources.storage.distributionPolicy.latestError': 'Последняя ошибка',
  'resources.storage.distributionPolicy.runTimes': 'Время запуска',
  'resources.storage.distributionPolicy.lastRunAt': 'Последний запуск',
  'resources.storage.distributionPolicy.nextRunAt': 'Следующий запуск',
  'resources.storage.distributionPolicy.runDetail': 'Сведения о запуске',
  'resources.storage.distributionPolicy.executionState': 'Состояние выполнения',
  'resources.storage.distributionPolicy.startedAt': 'Время начала',
  'resources.storage.distributionPolicy.finishedAt': 'Время завершения',
  'resources.storage.distributionPolicy.worker': 'Узел',
  'resources.storage.distributionPolicy.failureReason': 'Причина ошибки',
  'resources.storage.distributionPolicy.taskState.pending': 'Ожидание',
  'resources.storage.distributionPolicy.taskState.running': 'Выполняется',
  'resources.storage.distributionPolicy.taskState.paused': 'Приостановлено',
  'resources.storage.distributionPolicy.taskState.ready': 'Завершено',
  'resources.storage.distributionPolicy.taskState.error': 'Ошибка',
  'resources.storage.distributionPolicy.taskState.canceled': 'Отменено',
  'resources.storage.distributionPolicy.taskState.skipped': 'Пропущено',
  'resources.storage.distributionPolicy.taskState.skipped_worker_removed':
    'Пропущено (узел удалён)',
  'resources.storage.distributionPolicy.taskState.unknown':
    'Неизвестное состояние'
};

// ========== To-Do: Translate Keys (Remove After Translation) ==========

// ========== End of To-Do List ==========
