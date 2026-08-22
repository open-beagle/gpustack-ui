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
  'resources.storage.title': 'Model Storage', 'resources.storage.description': 'Verified node models and the shared S3 model library are reused by sync, downloads, and preheat.', 'resources.storage.nodeModels': 'Node Models', 'resources.storage.library': 'S3 Model Library', 'resources.storage.syncTasks': 'Sync Tasks', 'resources.storage.preheatTasks': 'Preheat Tasks', 'resources.storage.policies': 'Distribution Policies', 'resources.storage.profiles': 'S3 Profiles', 'resources.storage.artifacts': 'Synced Models', 'resources.storage.connectivity': 'Worker Connectivity', 'resources.storage.model': 'Model', 'resources.storage.modelSource': 'Model Source', 'resources.storage.sourceWorker': 'Source Worker', 'resources.storage.version': 'Version', 'resources.storage.fileCount': 'Files', 'resources.storage.capacity': 'Capacity', 'resources.storage.targetProfile': 'Target S3 Profile', 'resources.storage.sync': 'Sync to S3 Model Library', 'resources.storage.sync.confirmTitle': 'Sync to S3 Model Library', 'resources.storage.sync.submit': 'Start Sync', 'resources.storage.refresh': 'Refresh Inventory', 'resources.storage.refreshConfirm': 'Refresh S3 Inventory', 'resources.storage.refreshContent': 'Scan valid manifests?', 'resources.storage.cancelSync': 'Cancel Sync', 'resources.storage.cancelSyncConfirm': 'Cancel Sync Task', 'resources.storage.cancelSyncContent': 'Cancel or delete sync task #{id}?', 'resources.storage.systemProfile': 'System Configuration', 'resources.storage.setDefault': 'Set Default', 'resources.storage.setDefaultConfirm': 'Switch Default S3 Profile', 'resources.storage.setDefaultContent': 'Only new downloads and tasks are affected.', 'resources.storage.checkWorkers': 'Check Workers', 'resources.storage.connectionScope': 'Test Connection checks Server; Check Workers checks Worker.', 'resources.storage.testConnection': 'Test Connection', 'resources.storage.testResult': 'Server Connection Test', 'resources.storage.encryptionUnavailable': 'Server credential encryption is unavailable. Contact an administrator.', 'resources.storage.endpointTlsMismatch': 'The endpoint protocol and TLS switch do not match.', 'resources.storage.sourceFallback': 'Allow download from model source when missing', 'resources.storage.sourceFallbackHint': 'この設定がデフォルトの場合にのみ、通常のモデルダウンロードに影響します。', 'resources.storage.testCredentialsRequired': '接続テストの前に Access Key と Secret Key を再入力してください。', 'resources.storage.refreshSubmitted': 'インベントリの更新を送信しました。スキャン結果を待機しています。', 'resources.storage.checkWorkersConfirm': 'ワーカー接続を確認', 'resources.storage.checkWorkersContent': 'S3 プロファイル「{name}」へのワーカー接続を確認しますか？', 'resources.storage.transferMethod': '取得方法', 'resources.storage.syncTaskDetail': '同期タスクの詳細', 'resources.storage.refreshCompleted': 'インベントリの更新が完了しました。', 'resources.storage.refreshFailed': 'インベントリの更新に失敗しました。', 'resources.storage.transfer.current_node': '現在のノード（{worker}）', 'resources.storage.transfer.peer_via_s3': '別のノード（{worker}、S3 モデルライブラリ {profile} 経由）', 'resources.storage.transfer.s3': 'S3 モデルライブラリ（{profile}）', 'resources.storage.transfer.modelscope': 'ModelScope から取得', 'resources.storage.transfer.huggingface': 'Hugging Face から取得', 'resources.storage.transfer.unknown': '不明な取得方法'
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
