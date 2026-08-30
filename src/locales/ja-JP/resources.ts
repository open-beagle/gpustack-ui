export default {
  'resources.title': 'リソース',
  'resources.nodes': 'ノード',
  'resources.button.create': 'ワーカーを追加',
  'resources.button.edit': 'ワーカーを編集',
  'resources.button.edittags': 'ラベルを編集',
  'resources.button.update': 'ラベルを更新',
  'resources.table.labels': 'ラベル',
  'resources.table.hostname': 'ホスト名',
  'resources.table.key.tips': '同じキーが存在します。',
  'resources.form.label': 'ラベル',
  'resources.form.advanced': '詳細設定',
  'resources.form.enablePartialOffload': 'CPUオフロードを許可',
  'resources.form.placementStrategy': '配置戦略',
  'resources.form.workerSelector': 'ワーカーセレクター',
  'resources.form.enableDistributedInferenceAcrossWorkers':
    'ワーカー間の分散推論を許可',
  'resources.form.spread.tips':
    'クラスター全体のリソースをすべてのワーカー間で比較的均等に分配します。これにより、単一のワーカーでリソースの断片化が発生する可能性があります。',
  'resources.form.binpack.tips':
    'クラスターリソースの全体的な利用率を優先し、ワーカー/GPU上のリソース断片化を減らします。',
  'resources.form.workerSelector.description':
    'システムは、事前定義されたラベルに基づいてモデルインスタンスをデプロイするために最適なワーカーを選択します。',
  'resources.table.ip': 'IP',
  'resources.table.cpu': 'CPU',
  'resources.table.memory': 'メモリ',
  'resources.table.gpu': 'GPU',
  'resources.table.disk': 'ストレージ',
  'resources.table.vram': 'VRAM',
  'resources.table.index': 'インデックス',
  'resources.table.workername': 'ワーカー名',
  'resources.table.vender': 'ベンダー',
  'resources.table.temperature': '温度',
  'resources.table.core': 'コア数',
  'resources.table.utilization': '利用率',
  'resources.table.gpuutilization': 'GPU利用率',
  'resources.table.vramutilization': 'VRAM利用率',
  'resources.table.total': '合計',
  'resources.table.used': '使用済み',
  'resources.table.allocated': '割り当て済み',
  'resources.table.wokers': 'ワーカー',
  'resources.worker.linuxormaxos': 'LinuxまたはMacOS',
  'resources.table.unified': '統合メモリ',
  'resources.worker.add.step1':
    'トークンを取得 <span class="note-text">（サーバーで実行）</span>',
  'resources.worker.add.step2': 'ワーカーを登録',
  'resources.worker.add.step2.tips':
    '（追加するワーカーで実行し、<span class="bold-text">トークン</span> は最初のステップで取得した値です。）',
  'resources.worker.add.step3':
    '成功後、ワーカーリストを更新して新しいワーカーを確認してください。',
  'resources.worker.container.supported':
    'MacOSまたはWindowsはサポートされていません。',
  'resources.worker.current.version': '現在のバージョンは {version} です。',
  'resources.worker.driver.install':
    '<a href="https://www.bc-cloud.com/latest/installation/installation-requirements/" target="_blank">必要なドライバとライブラリ</a> をGPUStackのインストール前にインストールしてください。',
  'resources.worker.select.command':
    'ラベルを選択してコマンドを生成し、コピーを使用してコマンドをコピーします。',
  'resources.worker.script.install': 'スクリプトインストール',
  'resources.worker.container.install': 'コンテナインストール（Linuxのみ）',
  'resources.worker.cann.tips': `<span class="bold-text">--device /dev/davinci{index}</span> を必要なNPUインデックスに応じて設定します。例えば、NPU0とNPU1をマウントするには、<span class="bold-text">--device /dev/davinci0 --device /dev/davinci1</span> を追加します。`,
  'resources.modelfiles.form.path': 'ストレージパス',
  'resources.modelfiles.modelfile': 'モデルファイル',
  'resources.modelfiles.download': 'モデルファイルを追加',
  'resources.modelfiles.size': 'サイズ',
  'resources.modelfiles.selecttarget': 'ターゲットを選択',
  'resources.modelfiles.form.localdir': 'ローカルディレクトリ',
  'resources.modelfiles.form.localdir.tips':
    'デフォルトのストレージディレクトリは <span class="desc-block">/var/lib/gpustack/cache</span> または <span class="desc-block">--cache-dir</span>（優先）または <span class="desc-block">--data-dir</span> で指定されたディレクトリです。',
  'resources.modelfiles.retry.download': 'ダウンロードを再試行',
  'resources.modelfiles.storagePath.holder':
    'ダウンロード完了を待っています...',
  'resources.filter.worker': 'ワーカーでフィルタ',
  'resources.filter.source': 'ソースでフィルタ',
  'resources.modelfiles.delete.tips': 'ディスクからファイルも削除します',
  'resources.modelfiles.copy.tips': 'フルパスをコピー',
  'resources.modelcache.title': 'モデルアーカイブ',
  'resources.modelcache.description':
    'Worker にダウンロード済みの ModelScope モデルを Local S3 にアーカイブします。アーカイブデータはモデルプリヒートのインベントリには自動登録されません。',
  'resources.modelcache.cached': 'アーカイブ済みモデル',
  'resources.modelcache.tasks': 'アーカイブタスク',
  'resources.modelcache.cache': 'S3 にアーカイブ',
  'resources.modelcache.model': 'モデル',
  'resources.modelcache.sourceFile': 'ローカルモデルファイル',
  'resources.modelcache.sourceWorker': 'ソース Worker',
  'resources.modelcache.target': 'ターゲット Local S3',
  'resources.modelcache.filesAndSize': 'ファイル数とサイズ',
  'resources.modelcache.s3Path': 'S3 パス',
  'resources.modelcache.capacity': '容量',
  'resources.modelcache.fileCount': 'ファイル数',
  'resources.modelcache.updatedAt': '更新日時',
  'resources.modelcache.progress': '進捗',
  'resources.modelcache.search': '組織またはモデルを検索',
  'resources.modelcache.refresh': '更新',
  'resources.modelcache.state.pending': '待機中',
  'resources.modelcache.state.uploading': 'アップロード中',
  'resources.modelcache.state.ready': '完了',
  'resources.modelcache.state.error': '失敗',
  'resources.modelcache.deleteCache': 'アーカイブ済みモデルを削除',
  'resources.modelcache.deleteCache.content':
    '{model} · {files} ファイル · {size}',
  'resources.modelcache.deleteTask': 'アーカイブタスクを削除',
  'resources.modelcache.deleteTask.running':
    'タスク #{id} を削除すると、アップロードを停止してアップロード済みファイルを削除します。',
  'resources.modelcache.deleteTask.finished':
    'タスク #{id} の記録のみ削除し、アーカイブ済みモデルファイルは削除しません。',
  'resources.preheat.archive': 'Local S3 アーカイブ',
  'resources.filter.path': 'パスでフィルタ',
  'resources.register.worker.step1':
    'Click the <span class="bold-text">Copy Token</span> menu in the application.',
  'resources.register.worker.step2':
    'Click the <span class="bold-text">Quick Config</span> menu in the application.',
  'resources.register.worker.step3':
    'Click the <span class="bold-text">General</span> tab.',
  'resources.register.worker.step4':
    'Select <span class="bold-text">Worker</span> as the service role.',
  'resources.register.worker.step5':
    'Enter the <span class="bold-text">Server URL</span>: {url}.',
  'resources.register.worker.step6':
    'Paste the <span class="bold-text">Token</span>.',
  'resources.register.worker.step7':
    'Click <span class="bold-text">Restart</span> to apply the settings.',
  'resources.register.install.title': 'Install GPUStack on {os}',
  'resources.register.download':
    'Download and install the <a href={url} target="_blank">installer</a>. Only supported: {versions}.',
  'resource.register.maos.support': 'Apple Silicon (M series), macOS 14+',
  'resource.register.windows.support': 'win 10, win 11',
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
    'この設定がデフォルトの場合にのみ、通常のモデルダウンロードに影響します。',
  'resources.storage.testCredentialsRequired':
    '接続テストの前に Access Key と Secret Key を再入力してください。',
  'resources.storage.refreshSubmitted':
    'インベントリの更新を送信しました。スキャン結果を待機しています。',
  'resources.storage.checkWorkersConfirm': 'ワーカー接続を確認',
  'resources.storage.checkWorkersContent':
    'S3 プロファイル「{name}」へのワーカー接続を確認しますか？',
  'resources.storage.transferMethod': '取得方法',
  'resources.storage.syncTaskDetail': '同期タスクの詳細',
  'resources.storage.refreshCompleted': 'インベントリの更新が完了しました。',
  'resources.storage.refreshFailed': 'インベントリの更新に失敗しました。',
  'resources.storage.transfer.current_node': '現在のノード（{worker}）',
  'resources.storage.transfer.peer_via_s3':
    '別のノード（{worker}、S3 モデルライブラリ {profile} 経由）',
  'resources.storage.transfer.s3': 'S3 モデルライブラリ（{profile}）',
  'resources.storage.transfer.modelscope': 'ModelScope から取得',
  'resources.storage.transfer.huggingface': 'Hugging Face から取得',
  'resources.storage.transfer.unknown': '不明な取得方法',
  'resources.storage.syncTask.errorCode': '失敗理由',
  'resources.storage.syncTask.error.worker_execution_failed':
    'ワーカーで同期タスクの実行に失敗しました',
  'resources.storage.syncTask.error.manifest_invalid':
    'モデルマニフェストが無効です',
  'resources.storage.syncTask.error.s3_object_conflict':
    'S3 の既存モデルオブジェクトと競合しています',
  'resources.storage.tlsEnabledHint':
    'S3 との通信で TLS 暗号化を使用するかを制御します。無効にすると暗号化されない接続を使用します。',
  'resources.storage.tlsVerifyHint':
    'プライベート CA または自己署名証明書の場合にのみ無効にしてください。無効にすると証明書を検証しないため、中間者攻撃のリスクがあります。',
  'resources.storage.virtualHostedHint':
    '有効時は bucket.endpoint 形式の仮想ホスト形式、無効時は endpoint/bucket のパス形式を使用します。S3 サービスの互換性に応じて選択してください。',
  'resources.storage.sourceFallbackDetail':
    'この設定がデフォルトの場合にのみ有効です。S3 にモデルのキャッシュがないとき、有効なら元のモデルソースからダウンロードを続行し、無効ならダウンロードは失敗します。',
  'resources.preheat.profile.deleteConfirm': 'S3 プロファイルを削除',
  'resources.preheat.profile.maintenance': 'メンテナンス中',
  'resources.preheat.profile.maintenanceHint':
    'ライフサイクルは接続状態とは独立しています。メンテナンス中のプロファイルは、新しいダウンロード、同期、プリヒート、ポリシー、スケジュールの選択肢に表示されません。',
  'resources.preheat.profile.maintenanceAction': 'メンテナンスにする',
  'resources.preheat.profile.maintenanceActionHint':
    'S3 データを削除せず、このプロファイルを新しい処理で使わないようにします。',
  'resources.preheat.profile.restoreAction': '利用を再開',
  'resources.preheat.profile.restoreActionHint':
    '新しい処理で再び利用可能にしますが、自動的にデフォルトにはなりません。',
  'resources.preheat.profile.maintenanceConfirm': 'メンテナンスモードにする',
  'resources.preheat.profile.maintenanceContent':
    'S3 プロファイル「{name}」をメンテナンスにしますか？ダウンロード、同期、プリヒート、ポリシー、スケジュールの選択肢に表示されなくなります。S3 データは削除されず、既存タスクは固定された設定で継続します。',
  'resources.preheat.profile.restoreConfirm': 'S3 プロファイルの利用を再開',
  'resources.preheat.profile.restoreContent':
    'S3 プロファイル「{name}」の利用を再開しますか？自動的にデフォルトにはなりません。',
  'resources.preheat.profile.credentialUnavailableHint':
    '接続できない場合は、手動プロファイルで Access Key と Secret Key を更新してください。自動的にメンテナンスにはなりません。',
  'resources.preheat.profile.systemCredentialUnavailableHint':
    '接続できない場合は、起動引数でシステム設定の認証情報を更新して再起動してください。自動的にメンテナンスにはなりません。',
  'resources.preheat.profile.connectivityUnavailableHint':
    '接続失敗は DNS、TLS、ネットワーク、認証、または Bucket が原因の可能性があります。接続詳細で失敗段階を確認し、手動プロファイルの認証情報、TLS、またはアドレッシングを更新してください。自動的にメンテナンスにはなりません。',
  'resources.preheat.profile.systemConnectivityUnavailableHint':
    '接続失敗は DNS、TLS、ネットワーク、認証、または Bucket が原因の可能性があります。接続詳細で失敗段階を確認し、管理対象の項目は起動引数で更新して再起動してください。編集可能な実行時スイッチはこの画面で調整できます。自動的にメンテナンスにはなりません。',
  'resources.preheat.profile.deleteContent':
    'S3 プロファイル「{name}」を削除しますか？使用中のプロファイルは削除できません。',
  'resources.preheat.profile.deleteContent.default':
    'S3 プロファイル「{name}」を削除しますか？削除後、別のデフォルト S3 プロファイルを設定するまで、新しいダウンロードはモデルソースから直接取得されます。',
  'resources.preheat.profile.deleteContent.system':
    'S3 プロファイル「{name}」を削除しますか？削除後、システムはこの S3 を使用しなくなります。Server または Docker の起動引数にローカル S3 設定が残っている場合、再起動後にこのプロファイルが再作成されます。',
  'resources.preheat.profile.deleteContent.systemDefault':
    'S3 プロファイル「{name}」を削除しますか？削除後、システムはこの S3 を使用しなくなり、別のデフォルト S3 プロファイルを設定するまで新しいダウンロードはモデルソースから直接取得されます。Server または Docker の起動引数にローカル S3 設定が残っている場合、再起動後にこのプロファイルが再作成されます。',
  'resources.storage.sync.noDefault':
    '利用可能なデフォルト S3 プロファイルがありません。先にデフォルトを設定してください。',
  'resources.storage.sync.alreadyFromDefault':
    'このモデルはすでにデフォルトの S3 モデルライブラリから取得されているため、再同期は不要です。',
  'resources.storage.sync.missingRevision':
    'この旧モデルには信頼できるリビジョン情報がありません。再ダウンロードしてから S3 に同期してください。',
  'resources.storage.revision.modelscopeFilelist':
    'ファイル一覧指紋 {fingerprint}',
  'resources.preheat.noReadyWorkers':
    '接続確認に使用できる Ready 状態のワーカーがありません。',
  'resources.storage.syncBatch.create': '同期タスクを作成',
  'resources.storage.syncBatch.scope': '同期範囲',
  'resources.storage.syncBatch.scope.single_model': '単一モデル',
  'resources.storage.syncBatch.scope.selected_models': '指定したモデル',
  'resources.storage.syncBatch.scope.selected_workers': '指定ワーカー',
  'resources.storage.syncBatch.scope.all_ready_workers':
    'すべての Ready ワーカー',
  'resources.storage.syncBatch.description.single_model':
    '選択した Ready ワーカーの既存モデルを対象 S3 にアップロードします。他のワーカーには配布しません。',
  'resources.storage.syncBatch.description.selected_models':
    '選択したモデルの同期タスクを 1 つのバッチで作成します。',
  'resources.storage.syncBatch.description.selected_workers':
    '選択した Ready ワーカーの既存モデルを対象 S3 にアップロードします。他のワーカーには配布しません。',
  'resources.storage.syncBatch.description.all_ready_workers':
    'すべての Ready ワーカーの既存モデルを対象 S3 にアップロードします。他のワーカーには配布しません。',
  'resources.storage.syncBatch.selectWorker': 'ワーカーを選択',
  'resources.storage.syncBatch.selectModel': 'モデルを選択',
  'resources.storage.syncBatch.noSyncableModels':
    'このワーカーに同期可能な Ready モデルはありません。',
  'resources.storage.syncBatch.selectedModelCount':
    '{count} 件のモデルを選択済み',
  'resources.storage.syncBatch.selectionLimit':
    '一度に選択できるモデルは 500 件までです。',
  'resources.storage.syncBatch.syncSelected': '選択項目を一括同期',
  'resources.storage.syncBatch.planned': '予定',
  'resources.storage.syncBatch.created': '作成済み',
  'resources.storage.syncBatch.skipped': 'スキップ',
  'resources.storage.syncBatch.failed': '失敗',
  'resources.storage.syncBatch.result': '作成結果',
  'resources.storage.syncBatch.reason': '理由',
  'resources.storage.syncBatch.reason.model_file_not_ready':
    'モデルは Ready 状態ではありません',
  'resources.storage.syncBatch.reason.worker_not_ready':
    'ワーカーは Ready 状態ではありません',
  'resources.storage.syncBatch.reason.duplicate_artifact_identity':
    '同じモデルバージョンは別の Ready ワーカーからすでに計画されています',
  'resources.storage.syncBatch.reason.active_task_exists':
    '実行中の同期タスクがすでにあります',
  'resources.storage.syncBatch.reason.model_file_not_found':
    'モデルが存在しません',
  'resources.storage.syncBatch.reason.no_ready_workers':
    '利用可能な Ready ワーカーがありません',
  'resources.storage.deleteSync': '同期記録を削除',
  'resources.storage.deleteSyncConfirm': '同期記録を削除',
  'resources.storage.deleteSyncContent':
    '同期記録 #{id} を削除しますか？この操作は元に戻せず、S3 Artifact やローカルモデルファイルは削除されません。',
  'resources.storage.syncTask.time': '同期時刻',
  'resources.storage.syncTask.from': 'ソースワーカー',
  'resources.storage.syncTask.to': '対象 S3',
  'resources.storage.syncTask.state.pending': '待機中',
  'resources.storage.syncTask.state.scanning': 'スキャン中',
  'resources.storage.syncTask.state.publishing': 'S3 にアップロード中',
  'resources.storage.syncTask.state.ready': '完了',
  'resources.storage.syncTask.state.error': '失敗',
  'resources.storage.syncTask.state.canceled': 'キャンセル済み',
  'resources.storage.syncTask.batch.selectedCount':
    '{count} 件のタスクを選択済み',
  'resources.storage.syncTask.batch.action': '一括処理',
  'resources.storage.syncTask.batch.confirmTitle': '同期タスクを一括処理',
  'resources.storage.syncTask.batch.confirmContent':
    '選択した {total} 件の同期タスクを処理しますか？',
  'resources.storage.syncTask.batch.confirmCounts':
    '実行中の {cancel} 件をキャンセルし、完了済みの {delete} 件を削除します。',
  'resources.storage.syncTask.batch.failedSummary':
    '{total} 件中 {failed} 件が失敗し、選択状態を保持しました。',
  'resources.storage.createStrategy': 'この同期記録からポリシーを作成',
  'resources.preheat.policy.create': '新しいポリシー',
  'resources.preheat.policy.createContinuous': '継続ポリシーを作成',
  'resources.preheat.policy.continuous': '継続同期',
  'resources.preheat.policy.scheduled': 'スケジュール',
  'resources.preheat.schedule.create': 'スケジュールポリシーを作成',
  'resources.preheat.schedule.edit': 'スケジュールポリシーを編集',
  'resources.preheat.schedule.triggerMode': 'トリガーモード',
  'resources.preheat.schedule.triggerMode.manual': '手動実行',
  'resources.preheat.schedule.triggerMode.scheduled': '定時実行',
  'resources.preheat.schedule.cron': 'Cron 式',
  'resources.preheat.schedule.timezone': 'タイムゾーン',
  'resources.preheat.schedule.window': '実行ウィンドウ（分）',
  'resources.preheat.schedule.concurrency': '最大同時実行数',
  'resources.preheat.schedule.bandwidth': '帯域上限（Mbps）',
  'resources.preheat.schedule.nextRun': '次回実行',
  'resources.preheat.schedule.lastRun': '前回実行',
  'resources.preheat.schedule.runNow': '今すぐ 1 回実行',
  'resources.preheat.schedule.enableConfirm': 'スケジュールポリシーを有効化',
  'resources.preheat.schedule.disableConfirm': 'スケジュールポリシーを無効化',
  'resources.preheat.schedule.runConfirm': 'スケジュールポリシーを今すぐ実行',
  'resources.preheat.schedule.deleteConfirm': 'スケジュールポリシーを削除',
  'resources.preheat.schedule.actionContent':
    'スケジュールポリシー「{name}」にこの操作を実行しますか？',
  'resources.storage.taskRecords': 'タスク記録',
  'resources.storage.distributionTasks': '配布記録',
  'resources.storage.retry': '再試行',
  'resources.storage.repository.exactInput': '正確なモデル名を入力',
  'resources.storage.state.loading': '読み込み中',
  'resources.storage.state.refreshing': '現在のデータを保持して更新中',
  'resources.storage.state.error':
    '読み込みに失敗しました。再試行してください。',
  'resources.storage.state.empty': 'データがありません',
  'resources.storage.state.noMatch': '一致する結果がありません',
  'resources.storage.loadMore': 'さらに読み込む',
  'resources.storage.artifact.profileRequired':
    '先に S3 設定を選択してください。',
  'resources.storage.distributionTasks.unavailable':
    'このサーバーは配布実行記録を提供していません。',
  'resources.storage.repository.advanced': '詳細設定',
  'resources.storage.flow.workerToProfile': '{worker} -> {profile}',
  'resources.storage.flow.workerToProfileToWorker':
    '{worker} -> {profile} -> {targetWorker}',
  'resources.storage.status.pending': '待機中',
  'resources.storage.status.running': '実行中',
  'resources.storage.status.ready': '完了',
  'resources.storage.status.error': '失敗',
  'resources.storage.status.canceled': 'キャンセル済み',
  'resources.storage.status.valid': '有効',
  'resources.storage.status.invalid': '無効',
  'resources.storage.status.missing': '欠落',
  'resources.storage.status.stale': '期限切れ',
  'resources.storage.status.unknown': '不明な状態',
  'resources.storage.error.artifactNotReady': 'モデルはまだ準備できていません',
  'resources.storage.error.profileMaintenance': 'S3 設定はメンテナンス中です',
  'resources.storage.error.objectConflict': 'S3 オブジェクトの競合',
  'resources.storage.error.manifestInvalid': 'モデルマニフェストが無効です',
  'resources.storage.error.manifestInvalid.actionHint':
    'モデルファイルとマニフェストの整合性を確認し、修復後にタスクを再実行してください。',
  'resources.storage.error.workerUnavailable': 'ノードを利用できません',
  'resources.storage.error.workerExecutionFailed': 'ノード実行に失敗しました',
  'resources.storage.error.workerExecutionFailed.actionHint':
    'Worker ログ、ディスク容量、ネットワーク、S3 アクセスを確認してから再試行してください。',
  'resources.storage.error.syncSourceNotFound':
    '同期元モデルが存在しないか削除されています',
  'resources.storage.error.syncSourceNotFound.actionHint':
    'ノードモデル一覧を更新し、同期元モデルを確認してからタスクを再作成してください。',
  'resources.storage.error.syncSourceFilesMissing':
    '同期元モデルのファイルがありません',
  'resources.storage.error.syncSourceFilesMissing.actionHint':
    '同期元 Worker のモデルファイルを復元または再ダウンロードしてから再試行してください。',
  'resources.storage.error.localManifestInvalid':
    'Worker のモデルマニフェストが無効です',
  'resources.storage.error.localManifestInvalid.actionHint':
    '同期元のモデルファイルを確認し、修復または再ダウンロードしてから再試行してください。',
  'resources.storage.error.s3ManifestInvalid':
    'S3 モデルマニフェストが無効です',
  'resources.storage.error.s3ManifestInvalid.actionHint':
    'S3 在庫を更新し、解消しない場合はモデルを再同期して有効なマニフェストを作成してください。',
  'resources.storage.error.unknown': '不明なエラー',
  'resources.storage.error.unknown.actionHint':
    'タスク詳細と Worker ログで元のエラーコードを確認してから再試行してください。',
  'resources.storage.updateCredentials': '認証情報を更新',
  'resources.storage.updateCredentialsContent':
    '現在の S3 アクセス認証情報を置き換えます。',
  'resources.storage.artifactDetail': 'モデル詳細',
  'resources.preheat.profile.lifecycle': 'ライフサイクル',
  'resources.preheat.profile.active': '使用中',
  'resources.storage.inventoryRefreshInterval': '自動スキャン間隔（秒）',
  'resources.storage.inventorySource': '在庫の取得元',
  'resources.storage.inventorySource.task': 'ローカルタスク',
  'resources.storage.inventorySource.scan': 'S3 スキャンで検出',
  'resources.storage.lastVerifiedAt': '最終検証日時',
  'resources.storage.lastScan': '最終スキャン',
  'resources.storage.scanAttemptAt': '最終試行',
  'resources.storage.scanSucceededAt': '最終成功',
  'resources.storage.scanResult': '結果',
  'resources.storage.scanResult.success': '{count} 件のモデルをスキャン',
  'resources.storage.artifactId': 'モデル ID',
  'resources.storage.manifestDigest': 'マニフェストダイジェスト',
  'resources.storage.manifestPath': 'マニフェストパス',
  'resources.storage.includePatterns': '含めるパターン',
  'resources.storage.excludePatterns': '除外パターン',
  'resources.storage.artifact.filterSummary':
    '含む {include} 件、除外 {exclude} 件',
  'resources.storage.createdAt': '作成日時',
  'resources.storage.updatedAt': '更新日時',
  'resources.storage.profile': 'S3 プロファイル',
  'resources.storage.testCredentialsRequiredHint':
    '接続をテストする前に、認証情報を更新して両方のキーを入力してください。',
  'resources.storage.sync.confirmSummary':
    '同じダイジェストのモデル内容はスキップされ、異なるダイジェストのファイルは上書きされます。',
  'resources.preheat.deliveryMode': '配信方式',
  'resources.preheat.delivery.s3_only': 'S3 のみに公開',
  'resources.preheat.delivery.s3_and_workers': 'S3 と Worker に配信',
  'resources.preheat.connectivity.createAnyway': 'それでも作成',
  'resources.storage.sync.unsupportedSource':
    'このソースは S3 同期に対応していません。',
  'resources.storage.sync.modelNotReady':
    'モデルはまだ同期可能な状態ではありません。',
  'resources.storage.workerNotCurrent': '最新の Worker 登録ではありません。',
  'resources.storage.workerProtocolIncompatible':
    'Worker 同期プロトコルに互換性がありません。',
  'resources.storage.workerProtocolMissing':
    'Worker から同期プロトコルのバージョンが報告されていません。',
  'resources.storage.syncPolicy.disabled.profileMaintenance':
    '対象の S3 プロファイルはメンテナンス中です。',
  'resources.storage.syncPolicy.disabled.policyDisabled':
    'ポリシーは無効です。',
  'resources.storage.syncPolicy.windowStart': '実行ウィンドウ',
  'resources.storage.syncPolicy.modelFile': 'モデルファイル',
  'resources.preheat.policy.disabled.profileStale':
    'S3 プロファイルのバージョンが変更されています。先にポリシーを再調整してください。',
  'resources.preheat.policy.disabled.blocked':
    'サーバーが現在有効化をブロックしています: {reason}',
  'resources.storage.deleteModelBlocked': 'モデル記録を削除できません',
  'resources.storage.deleteModelBlockedContent':
    'モデル「{name}」には実行中の同期タスクがあります。終了を待つか、タスクをキャンセルしてから削除してください。',
  'resources.storage.deleteModelBlockedBatchName':
    '選択した {count} 件のモデル',
  'resources.preheat.confirm.title': '作成の確認',
  'resources.preheat.confirm.flow': '最終フロー',
  'resources.preheat.confirm.flow.s3Only':
    '{model} -> S3 プロファイル {profile}',
  'resources.preheat.confirm.flow.workers':
    '{model} -> S3 プロファイル {profile} -> 対象 Worker',
  'resources.preheat.confirm.flow.artifact':
    '固定 S3 Artifact {model} -> このクラスターの対象 Worker',
  'resources.preheat.confirm.targetCount': '対象 Worker 数',
  'resources.preheat.confirm.targetPending': 'GPU 範囲により実行時に決定',
  'resources.preheat.confirm.capacity': '利用可能容量',
  'resources.preheat.confirm.capacityUnavailable':
    'Worker から容量情報が報告されていません',
  'resources.preheat.confirm.artifactSize': 'S3 モデルサイズ',
  'resources.preheat.confirm.skipRule': 'スキップ規則',
  'resources.preheat.confirm.skipRuleValue':
    '同じダイジェストのファイルはスキップされます。',
  'resources.preheat.confirm.conflictRule': '上書き/競合規則',
  'resources.preheat.confirm.conflictRuleValue':
    '異なるダイジェストのファイルは置換され、競合はサーバーが冪等性と lease 規則で処理します。',
  'resources.preheat.confirm.conflictRuleValue.s3_only':
    '同じ Artifact ID の内容競合は隔離または失敗となり、共有 S3 Artifact は上書きされません。',
  'resources.preheat.confirm.conflictRuleValue.workers':
    '対象 Worker の異なるダイジェストのファイルは、サーバーの冪等性と lease 規則で置換されます。',
  'resources.preheat.confirm.conflictRuleValue.artifact':
    '固定 Artifact は対象 Worker にのみ導入され、ファイル競合はサーバーの冪等性と lease 規則で処理されます。',
  'resources.storage.taskProgress': '進捗',
  'resources.storage.startedAt': '開始時刻',
  'resources.storage.finishedAt': '完了時刻',
  'resources.storage.taskTimeline': 'タイムライン',
  'resources.preheat.schedule.preset.manual': '手動',
  'resources.preheat.schedule.preset.hourly': '毎時',
  'resources.preheat.schedule.preset.daily': '毎日',
  'resources.preheat.schedule.preset.weekly': '毎週',
  'resources.preheat.schedule.preset.custom': 'カスタム Cron',
  'resources.preheat.schedule.time': '実行時刻',
  'resources.preheat.schedule.weekday': '曜日',
  'resources.preheat.schedule.weekday.0': '日曜',
  'resources.preheat.schedule.weekday.1': '月曜',
  'resources.preheat.schedule.weekday.2': '火曜',
  'resources.preheat.schedule.weekday.3': '水曜',
  'resources.preheat.schedule.weekday.4': '木曜',
  'resources.preheat.schedule.weekday.5': '金曜',
  'resources.preheat.schedule.weekday.6': '土曜',
  'resources.preheat.schedule.preset.continuous': '継続補充',
  'resources.preheat.schedule.summary.label': 'スケジュール概要',
  'resources.preheat.schedule.summary.manual': '手動実行',
  'resources.preheat.schedule.summary.continuous': '継続的に調整',
  'resources.preheat.schedule.summary.hourly': '毎時実行',
  'resources.preheat.schedule.summary.daily': '毎日 {time} に実行',
  'resources.preheat.schedule.summary.weekly': '毎週 {weekday} {time} に実行',
  'resources.preheat.schedule.summary.custom': 'カスタム Cron: {cron}',
  'resources.preheat.schedule.nextRuns': '次の 3 回の実行',
  'resources.preheat.schedule.nextRunsUnavailable':
    'クライアントではプレビューできません',
  'resources.storage.totalSize': '合計容量',
  'resources.storage.stateMessage': '状態メッセージ',
  'resources.storage.taskState.paused': '一時停止',
  'resources.storage.taskState.partial': '一部完了',
  'resources.storage.taskState.unknown': '不明な状態',
  'resources.storage.syncTask.state.running': '実行中',
  'resources.storage.distributionPolicy.tab': '配布ポリシー',
  'resources.storage.distributionPolicy.kind': '継続配布',
  'resources.storage.distributionPolicy.create': '配布ポリシーを作成',
  'resources.storage.distributionPolicy.hint':
    'S3 モデルを選択し、対象ノードへの継続配布を設定します。',
  'resources.storage.distributionPolicy.source': 'ソースモデル',
  'resources.storage.distributionPolicy.artifact': 'S3 モデル',
  'resources.storage.distributionPolicy.syncTask': '同期タスク',
  'resources.storage.distributionPolicy.selectedCount':
    '{count} 件のモデルを選択済み',
  'resources.storage.distributionPolicy.createSelected':
    '選択したモデルからポリシーを作成',
  'resources.storage.distributionPolicy.createAllCurrent':
    '現在の有効なモデルをすべて選択',
  'resources.storage.pagination.total': '全 {total} 件',
  'resources.storage.distributionPolicy.edit': '配布ポリシーを編集',
  'resources.storage.distributionPolicy.selectionMode': 'モデルの選択方法',
  'resources.storage.distributionPolicy.selectionMode.fixed': '単一モデル',
  'resources.storage.distributionPolicy.selectionMode.selected':
    '指定したモデル',
  'resources.storage.distributionPolicy.selectionMode.all_current':
    '現在の有効なモデルすべて',
  'resources.storage.distributionPolicy.artifacts': 'S3 モデル',
  'resources.storage.distributionPolicy.structureLocked':
    'このポリシーは実行済みです。モデル範囲、プロファイル、対象ノードは変更できません。名前と実行スケジュールは変更できます。',
  'resources.storage.distributionPolicy.confirm.allCurrent':
    '{profile} にある現在の有効なモデルをすべて使用します',
  'resources.storage.distributionPolicy.confirm.selected':
    '{profile} で選択した {count} 件のモデルを使用します',
  'resources.storage.distributionPolicy.latestRun': '最新の実行',
  'resources.storage.distributionPolicy.notExecuted': '未実行',
  'resources.storage.distributionPolicy.execution.waiting': '待機中',
  'resources.storage.distributionPolicy.execution.running': '実行中',
  'resources.storage.distributionPolicy.execution.paused': '一時停止中',
  'resources.storage.distributionPolicy.execution.ready': '完了',
  'resources.storage.distributionPolicy.execution.partial_error': '一部失敗',
  'resources.storage.distributionPolicy.execution.error': '失敗',
  'resources.storage.distributionPolicy.execution.skipped': 'スキップ済み',
  'resources.storage.distributionPolicy.progress': '進捗',
  'resources.storage.distributionPolicy.progressCount':
    '完了 {completed}/{total}',
  'resources.storage.distributionPolicy.latestError': '最新のエラー',
  'resources.storage.distributionPolicy.runTimes': '実行日時',
  'resources.storage.distributionPolicy.lastRunAt': '前回の実行',
  'resources.storage.distributionPolicy.nextRunAt': '次回の実行',
  'resources.storage.distributionPolicy.runDetail': '実行詳細',
  'resources.storage.distributionPolicy.executionState': '実行状態',
  'resources.storage.distributionPolicy.startedAt': '開始日時',
  'resources.storage.distributionPolicy.finishedAt': '完了日時',
  'resources.storage.distributionPolicy.worker': 'ノード',
  'resources.storage.distributionPolicy.failureReason': '失敗理由',
  'resources.storage.distributionPolicy.taskState.pending': '待機中',
  'resources.storage.distributionPolicy.taskState.running': '実行中',
  'resources.storage.distributionPolicy.taskState.paused': '一時停止中',
  'resources.storage.distributionPolicy.taskState.ready': '完了',
  'resources.storage.distributionPolicy.taskState.error': '失敗',
  'resources.storage.distributionPolicy.taskState.canceled': 'キャンセル済み',
  'resources.storage.distributionPolicy.taskState.skipped': 'スキップ済み',
  'resources.storage.distributionPolicy.taskState.skipped_worker_removed':
    'スキップ済み（ノード削除）',
  'resources.storage.distributionPolicy.taskState.unknown': '不明な状態'
};

// ========== To-Do: Translate Keys (Remove After Translation) ==========
// 1. 'resources.register.worker.step1': 'Click the <span class="bold-text">Copy Token</span> menu in the application.',
// 2. 'resources.register.worker.step2': 'Click the <span class="bold-text">Quick Config</span> menu in the application.',
// 3. 'resources.register.worker.step3': 'Click the <span class="bold-text">General</span> tab.',
// 4. 'resources.register.worker.step4':  'Select <span class="bold-text">Worker</span> as the service role.',
// 5. 'resources.register.worker.step5': 'Enter the <span class="bold-text">Server URL</span>: {url}.',
// 6. 'resources.register.worker.step6': 'Paste the <span class="bold-text">Token</span>.',
// 7. 'resources.register.worker.step7': 'Click <span class="bold-text">Restart</span> to apply the settings.',
// 8. 'resources.register.install.title': 'Install GPUStack on {os}',
// 9. 'resources.register.download':'Download and install the <a>installer</a>. Only supported: {versions}.',
// 10. 'resource.register.maos.support': 'Apple Silicon (M series), macOS 14+',
// 11. 'resource.register.windows.support': 'win 10, win 11'
// ========== End of To-Do List ==========
