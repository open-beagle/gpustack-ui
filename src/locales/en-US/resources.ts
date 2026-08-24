export default {
  'resources.title': 'Resources',
  'resources.nodes': 'Nodes',
  'resources.button.create': 'Add Worker',
  'resources.button.edit': 'Edit Worker',
  'resources.button.edittags': 'Edit Labels',
  'resources.button.update': 'Update Labels',
  'resources.table.labels': 'Labels',
  'resources.table.hostname': 'Hostname',
  'resources.table.key.tips': 'The same key exists.',
  'resources.form.label': 'Label',
  'resources.form.advanced': 'Advanced',
  'resources.form.enablePartialOffload': 'Allow CPU Offloading',
  'resources.form.placementStrategy': 'Placement Strategy',
  'resources.form.workerSelector': 'Worker Selector',
  'resources.form.enableDistributedInferenceAcrossWorkers':
    'Allow Distributed Inference Across Workers',
  'resources.form.spread.tips':
    'Make the resources of the entire cluster relatively evenly distributed among all workers. It may produce more resource fragmentation on a single worker.',
  'resources.form.binpack.tips':
    'Prioritize the overall utilization of cluster resources, reducing resource fragmentation on GPUs/Workers.',
  'resources.form.workerSelector.description':
    'The system selects the most suitable Worker for deploying model instances based on predefined labels.',
  'resources.table.ip': 'IP',
  'resources.table.cpu': 'CPU',
  'resources.table.memory': 'RAM',
  'resources.table.gpu': 'GPU',
  'resources.table.disk': 'Storage',
  'resources.table.vram': 'VRAM',
  'resources.table.index': 'Index',
  'resources.table.workername': 'Worker Name',
  'resources.table.vender': 'Vendor',
  'resources.table.temperature': 'Temperature',
  'resources.table.core': 'Cores',
  'resources.table.utilization': 'Utilization',
  'resources.table.gpuutilization': 'GPU Utilization',
  'resources.table.vramutilization': 'VRAM Utilization',
  'resources.table.total': 'Total',
  'resources.table.used': 'Used',
  'resources.table.allocated': 'Allocated',
  'resources.table.wokers': 'workers',
  'resources.worker.linuxormaxos': 'Linux or macOS',
  'resources.table.unified': 'Unified Memory',
  'resources.worker.add.step1':
    'Get Token <span class="note-text">(Run on the server)</span>',
  'resources.worker.add.step2': 'Register Worker',
  'resources.worker.add.step2.tips':
    '(Run on the worker to be added, <span class="bold-text">token</span> is the value obtained in the first step.)',
  'resources.worker.add.step3':
    'After success, refresh the workers list to view the new worker.',
  'resources.worker.container.supported': 'Do not support macOS or Windows.',
  'resources.worker.current.version': 'Current version is {version}.',
  'resources.worker.driver.install':
    'Install <a href="https://www.bc-cloud.com/latest/installation/installation-requirements/" target="_blank">required drivers and libraries</a> prior to GPUStack installation.',
  'resources.worker.select.command':
    'Select a label to generate the command and copy it using the copy button.',
  'resources.worker.script.install': 'Script Installation',
  'resources.worker.container.install': 'Container Installation(Linux Only)',
  'resources.worker.cann.tips': `Set <span class="bold-text">--device /dev/davinci{index}</span> according to the required NPU index. For example, to mount NPU0 and NPU1, add <span class="bold-text">--device /dev/davinci0 --device /dev/davinci1</span>.`,
  'resources.modelfiles.form.path': 'Storage Path',
  'resources.modelfiles.modelfile': 'Model Files',
  'resources.modelfiles.download': 'Add Model File',
  'resources.modelfiles.size': 'Size',
  'resources.modelfiles.selecttarget': 'Select Target',
  'resources.modelfiles.form.localdir': 'Local Directory',
  'resources.modelfiles.form.localdir.tips':
    'The default storage directory is <span class="desc-block">/var/lib/gpustack/cache</span>, or the directory specified by <span class="desc-block">--cache-dir</span> (preferred) or <span class="desc-block">--data-dir</span>.',
  'resources.modelfiles.retry.download': 'Retry Download',
  'resources.modelfiles.storagePath.holder':
    'Waiting for the download to complete...',
  'resources.filter.worker': 'Filter by worker',
  'resources.filter.source': 'Filter by Source',
  'resources.modelfiles.delete.tips': 'Also delete the file from disk',
  'resources.modelfiles.copy.tips': 'Copy Full Path',
  'resources.modelcache.title': 'Model Archive',
  'resources.modelcache.description':
    'Archive verified ModelScope models from a worker to the built-in Local S3 for later ModelScope downloads or preheat reuse. This does not actively distribute models to target workers.',
  'resources.modelcache.cached': 'Archived Models',
  'resources.modelcache.tasks': 'Archive Tasks',
  'resources.modelcache.cache': 'Archive to S3',
  'resources.modelcache.model': 'Model',
  'resources.modelcache.sourceFile': 'Local Model File',
  'resources.modelcache.sourceWorker': 'Source Worker',
  'resources.modelcache.target': 'Target Local S3',
  'resources.modelcache.filesAndSize': 'Files and Size',
  'resources.modelcache.s3Path': 'S3 Path',
  'resources.modelcache.capacity': 'Capacity',
  'resources.modelcache.fileCount': 'Files',
  'resources.modelcache.updatedAt': 'Updated At',
  'resources.modelcache.progress': 'Progress',
  'resources.modelcache.search': 'Search organization or model',
  'resources.modelcache.refresh': 'Refresh',
  'resources.modelcache.state.pending': 'Pending',
  'resources.modelcache.state.uploading': 'Uploading',
  'resources.modelcache.state.ready': 'Completed',
  'resources.modelcache.state.error': 'Failed',
  'resources.modelcache.deleteCache': 'Delete Archived Model',
  'resources.modelcache.deleteCache.content':
    '{model} · {files} files · {size}',
  'resources.modelcache.deleteTask': 'Delete Archive Task',
  'resources.modelcache.deleteTask.running':
    'Deleting task #{id} stops the upload and removes files uploaded by this task.',
  'resources.modelcache.deleteTask.finished':
    'Only task #{id} is deleted. The archived model files are not removed.',
  'resources.filter.path': 'Filter by path',
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
  'resources.preheat.title': 'Model Preheat',
  'resources.preheat.description':
    'Prepare models on target workers with policies and schedules. Trusted files verified by Model Files or Model Archive on any worker are reused first; a download starts only when no worker has a usable copy.',
  'resources.preheat.localModels': 'Local Model Files',
  'resources.preheat.archive': 'Local S3 Archive',
  'resources.preheat.s3Models': 'S3 Models',
  'resources.preheat.tasks': 'Preheat Tasks',
  'resources.preheat.policies': 'Sync Policies',
  'resources.preheat.worker': 'Worker',
  'resources.preheat.model': 'Model ID',
  'resources.preheat.revision': 'Revision',
  'resources.preheat.attempt': 'Attempt',
  'resources.preheat.targetCount': 'Targets',
  'resources.preheat.targetScope': 'Target Scope',
  'resources.preheat.targetWorkers': 'Target Workers',
  'resources.preheat.seedWorker': 'Seed Worker',
  'resources.preheat.includePatterns': 'Include Patterns',
  'resources.preheat.excludePatterns': 'Exclude Patterns',
  'resources.preheat.backfillPolicy': 'S3 Backfill Policy',
  'resources.preheat.keepInSync': 'Keep New Workers in Sync',
  'resources.preheat.fileCount': 'Files',
  'resources.preheat.lastVerified': 'Last Verified',
  'resources.preheat.dependencies.loadFailed':
    'Failed to load S3 profiles or workers. Try again.',
  'resources.preheat.singleWorker':
    'Only one worker is online. It acts as both seed and target without downloading the model again.',
  'resources.preheat.scope.selected_workers': 'Selected Workers',
  'resources.preheat.scope.seed_worker': 'Seed Worker Only',
  'resources.preheat.scope.same_gpu_model': 'Workers with the Same GPU Model',
  'resources.preheat.backfill.always': 'Always',
  'resources.preheat.backfill.when_missing': 'When Missing from S3',
  'resources.preheat.backfill.never': 'Never',
  'resources.preheat.state.no_workers': 'No Workers',
  'resources.preheat.state.not_ready': 'Not Ready',
  'resources.preheat.state.unreachable': 'Unreachable',
  'resources.preheat.state.pending': 'Pending',
  'resources.preheat.state.checking': 'Checking',
  'resources.preheat.state.available': 'Available',
  'resources.preheat.state.partial': 'Partially Available',
  'resources.preheat.state.unavailable': 'Unavailable',
  'resources.preheat.state.stale': 'Stale',
  'resources.preheat.state.running': 'Running',
  'resources.preheat.state.resolving': 'Resolving',
  'resources.preheat.state.scanning': 'Scanning',
  'resources.preheat.state.staging': 'Staging',
  'resources.preheat.state.publishing': 'Publishing to S3',
  'resources.preheat.state.distributing': 'Distributing',
  'resources.preheat.state.paused': 'Paused',
  'resources.preheat.state.ready': 'Ready',
  'resources.preheat.state.error': 'Error',
  'resources.preheat.state.canceled': 'Canceled',
  'resources.preheat.state.valid': 'Valid',
  'resources.preheat.state.missing': 'Missing',
  'resources.preheat.state.invalid': 'Invalid',
  'resources.preheat.state.enabled': 'Enabled',
  'resources.preheat.state.disabled': 'Disabled',
  'resources.preheat.state.configured': 'Configured',
  'resources.preheat.state.unconfigured': 'Not Configured',
  'resources.preheat.state.skipped_worker_removed': 'Worker Removed',
  'resources.preheat.profile.title': 'S3 Profiles',
  'resources.preheat.profile.select': 'Select an S3 profile',
  'resources.preheat.profile.create': 'Add S3 Profile',
  'resources.preheat.profile.edit': 'Edit S3 Profile',
  'resources.preheat.profile.name': 'Name',
  'resources.preheat.profile.description': 'Description',
  'resources.preheat.profile.endpoint': 'Endpoint',
  'resources.preheat.profile.bucket': 'Bucket',
  'resources.preheat.profile.prefix': 'Prefix',
  'resources.preheat.profile.accessKey': 'Access Key',
  'resources.preheat.profile.secretKey': 'Secret Key',
  'resources.preheat.profile.credential': 'Credentials',
  'resources.preheat.profile.credentialUnchanged':
    'Leave blank to keep unchanged',
  'resources.preheat.profile.region': 'Region',
  'resources.preheat.profile.tlsEnabled': 'Enable TLS',
  'resources.preheat.profile.tlsVerify': 'Verify TLS Certificate',
  'resources.preheat.profile.virtualHosted': 'Virtual-hosted Style',
  'resources.preheat.profile.default': 'Default',
  'resources.preheat.profile.maintenance': 'Maintenance',
  'resources.preheat.profile.maintenanceHint':
    'Lifecycle is independent of connection health. Maintenance profiles are excluded from new download, sync, preheat, policy, and schedule selections.',
  'resources.preheat.profile.maintenanceAction': 'Enter Maintenance',
  'resources.preheat.profile.maintenanceActionHint':
    'Stops new work from using this profile without deleting S3 data.',
  'resources.preheat.profile.restoreAction': 'Restore Use',
  'resources.preheat.profile.restoreActionHint':
    'Makes the profile available for new work again without making it the default.',
  'resources.preheat.profile.maintenanceConfirm': 'Enter Maintenance Mode',
  'resources.preheat.profile.maintenanceContent':
    'Put S3 profile "{name}" into maintenance? It will be excluded from download, sync, preheat, policy, and schedule selections. S3 data is not deleted, and existing tasks continue with their fixed configuration.',
  'resources.preheat.profile.restoreConfirm': 'Restore S3 Profile',
  'resources.preheat.profile.restoreContent':
    'Restore use of S3 profile "{name}"? It will not become the default automatically.',
  'resources.preheat.profile.credentialUnavailableHint':
    'When the connection is unavailable, update Access Key and Secret Key in the manual profile. This does not enter maintenance automatically.',
  'resources.preheat.profile.systemCredentialUnavailableHint':
    'When the connection is unavailable, update system credentials through startup arguments and restart. This does not enter maintenance automatically.',
  'resources.preheat.profile.connectivityUnavailableHint':
    'A connection failure can involve DNS, TLS, network, authentication, or the bucket. Open connection details to confirm the failed stage; then update credentials, TLS, or addressing in a manual profile. It does not enter maintenance automatically.',
  'resources.preheat.profile.systemConnectivityUnavailableHint':
    'A connection failure can involve DNS, TLS, network, authentication, or the bucket. Open connection details to confirm the failed stage; update managed fields through startup arguments and restart, while editable runtime switches remain available here. It does not enter maintenance automatically.',
  'resources.preheat.profile.version': 'Profile Version',
  'resources.preheat.profile.deleteConfirm': 'Delete S3 Profile',
  'resources.preheat.profile.deleteContent':
    'Delete S3 profile "{name}"? Profiles in use cannot be deleted.',
  'resources.preheat.connectivity.title': '{name} Worker Connectivity',
  'resources.preheat.connectivity.detail': 'View connectivity details',
  'resources.preheat.connectivity.status': 'Connectivity',
  'resources.preheat.connectivity.success': 'Successful',
  'resources.preheat.connectivity.failed': 'Failed',
  'resources.preheat.connectivity.notChecked': 'Not Checked',
  'resources.preheat.connectivity.checkedAt': 'Last Checked',
  'resources.preheat.connectivity.read': 'Read',
  'resources.preheat.connectivity.write': 'Write',
  'resources.preheat.connectivity.delete': 'Delete',
  'resources.preheat.connectivity.cleanup': 'Probe Cleanup',
  'resources.preheat.connectivity.latency': 'Latency',
  'resources.preheat.connectivity.failedStage': 'Failed Stage',
  'resources.preheat.connectivity.result': 'Result',
  'resources.preheat.connectivity.recheck': 'Run Check Again',
  'resources.preheat.connectivity.recheckConfirm': 'Check Online Workers Again',
  'resources.preheat.connectivity.recheckContent':
    'Run S3 profile "{name}" connectivity checks on all online workers?',
  'resources.preheat.inventory.refresh': 'Refresh Inventory',
  'resources.preheat.inventory.refreshConfirm': 'Refresh S3 Inventory',
  'resources.preheat.inventory.refreshContent':
    'Start refreshing the S3 cache inventory?',
  'resources.preheat.inventory.gc': 'Clean Orphaned Objects',
  'resources.preheat.inventory.gcConfirm': 'Clean Orphaned S3 Objects',
  'resources.preheat.inventory.gcContent':
    'Start safe cleanup? Only objects the server considers collectible are processed.',
  'resources.preheat.task.create': 'Create Preheat Task',
  'resources.preheat.task.submit': 'Start Preheat',
  'resources.preheat.task.detail': 'Preheat Task #{id}',
  'resources.preheat.action.pause': 'Pause',
  'resources.preheat.action.resume': 'Resume',
  'resources.preheat.action.cancel': 'Cancel',
  'resources.preheat.action.retry': 'Retry',
  'resources.preheat.action.pauseConfirm': 'Pause Preheat Task',
  'resources.preheat.action.resumeConfirm': 'Resume Preheat Task',
  'resources.preheat.action.cancelConfirm': 'Cancel Preheat Task',
  'resources.preheat.action.retryConfirm': 'Retry Preheat Task',
  'resources.preheat.action.content':
    'Perform this action on task #{id} ({model})?',
  'resources.preheat.policy.name': 'Policy Name',
  'resources.preheat.policy.selector': 'Worker Selector',
  'resources.preheat.policy.lastReconciled': 'Last Synced',
  'resources.preheat.policy.enable': 'Enable',
  'resources.preheat.policy.disable': 'Disable',
  'resources.preheat.policy.reconcile': 'Sync Now',
  'resources.preheat.policy.enableConfirm': 'Enable Sync Policy',
  'resources.preheat.policy.disableConfirm': 'Disable Sync Policy',
  'resources.preheat.policy.reconcileConfirm': 'Sync Policy Now',
  'resources.preheat.policy.deleteConfirm': 'Delete Sync Policy',
  'resources.preheat.policy.actionContent':
    'Perform this action on sync policy "{name}"? Existing worker caches are not deleted.',
  'resources.preheat.policy.create': 'New Strategy',
  'resources.preheat.policy.createContinuous': 'Create Continuous Strategy',
  'resources.preheat.policy.continuous': 'Distribution Policies (Continuous)',
  'resources.preheat.policy.scheduled': 'Preheat Policies (Manual / Cron)',
  'resources.preheat.schedule.create': 'New Scheduled Strategy',
  'resources.preheat.schedule.edit': 'Edit Scheduled Strategy',
  'resources.preheat.schedule.triggerMode': 'Trigger Mode',
  'resources.preheat.schedule.triggerMode.manual': 'Manual',
  'resources.preheat.schedule.triggerMode.scheduled': 'Scheduled',
  'resources.preheat.schedule.cron': 'Cron Expression',
  'resources.preheat.schedule.timezone': 'Time Zone',
  'resources.preheat.schedule.window': 'Execution Window (minutes)',
  'resources.preheat.schedule.concurrency': 'Maximum Concurrency',
  'resources.preheat.schedule.bandwidth': 'Bandwidth Limit (Mbps)',
  'resources.preheat.schedule.nextRun': 'Next Run',
  'resources.preheat.schedule.lastRun': 'Last Run',
  'resources.preheat.schedule.runNow': 'Run Once Now',
  'resources.preheat.schedule.enableConfirm': 'Enable Scheduled Strategy',
  'resources.preheat.schedule.disableConfirm': 'Disable Scheduled Strategy',
  'resources.preheat.schedule.runConfirm': 'Run Scheduled Strategy Now',
  'resources.preheat.schedule.deleteConfirm': 'Delete Scheduled Strategy',
  'resources.preheat.schedule.actionContent':
    'Perform this action on scheduled strategy "{name}"?',
  'resources.preheat.block.profile_required': 'Select a valid S3 profile.',
  'resources.preheat.block.target_workers_required':
    'Select at least one target worker.',
  'resources.preheat.block.seed_worker_not_ready':
    'Select an online seed worker.',
  'resources.preheat.block.seed_worker_gpu_required':
    'Seed worker "{worker}" has no usable GPU model.',
  'resources.preheat.block.seed_worker_not_in_target_scope':
    'Seed worker "{worker}" is outside the selected target scope.',
  'resources.preheat.block.target_worker_not_found':
    'Target worker "{worker}" no longer exists.',
  'resources.preheat.block.target_worker_not_ready':
    'Target worker "{worker}" is not ready.',
  'resources.preheat.block.connectivity_check_required':
    'This S3 profile has no usable worker connectivity result.',
  'resources.preheat.block.connectivity_config_stale':
    'The connectivity result belongs to an older profile version. Run the check again.',
  'resources.preheat.block.profile_connectivity_stale':
    'The S3 connectivity result has expired. Run the check again.',
  'resources.preheat.block.worker_connectivity_missing':
    'Target worker "{worker}" has no S3 connectivity result.',
  'resources.preheat.block.worker_connectivity_unavailable':
    'Target worker “{worker}” did not pass S3 read, write, and delete checks.',
  'resources.storage.title': 'Model Storage',
  'resources.storage.description':
    'Verified node models and the shared S3 model library are reused by sync, regular downloads, and preheat.',
  'resources.storage.nodeModels': 'Node Models',
  'resources.storage.library': 'S3 Model Library',
  'resources.storage.syncTasks': 'Sync Tasks',
  'resources.storage.preheatTasks': 'Preheat Tasks',
  'resources.storage.policies': 'Task Policies',
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
  'resources.storage.refreshContent':
    'Scan models with valid manifests in the selected S3 profile?',
  'resources.storage.cancelSync': 'Cancel Sync',
  'resources.storage.cancelSyncConfirm': 'Cancel Sync Task',
  'resources.storage.cancelSyncContent': 'Cancel or delete sync task #{id}?',
  'resources.storage.systemProfile': 'System Configuration',
  'resources.storage.setDefault': 'Set Default',
  'resources.storage.setDefaultConfirm': 'Switch Default S3 Profile',
  'resources.storage.setDefaultContent':
    'Only new downloads and tasks are affected; running tasks keep their current profile.',
  'resources.storage.checkWorkers': 'Check Workers',
  'resources.storage.connectionScope':
    'Test Connection checks Server to S3; Check Workers checks Worker to S3.',
  'resources.storage.testConnection': 'Test Connection',
  'resources.storage.testResult': 'Server Connection Test',
  'resources.storage.encryptionUnavailable':
    'Server credential encryption is unavailable. Contact an administrator to check the data directory or key configuration.',
  'resources.storage.endpointTlsMismatch':
    'The endpoint protocol and TLS switch do not match.',
  'resources.storage.sourceFallback':
    'Allow download from model source when missing',
  'resources.storage.sourceFallbackHint':
    'This switch affects regular model downloads only when this profile is the default.',
  'resources.storage.testCredentialsRequired':
    'Re-enter Access Key and Secret Key before testing.',
  'resources.storage.refreshSubmitted':
    'Inventory refresh was submitted and is waiting for scan results.',
  'resources.storage.checkWorkersConfirm': 'Check Worker Connectivity',
  'resources.storage.checkWorkersContent':
    'Check Worker connectivity to S3 profile “{name}”?',
  'resources.storage.transferMethod': 'Transfer Method',
  'resources.storage.syncTaskDetail': 'Sync Task Detail',
  'resources.storage.refreshCompleted': 'Inventory refresh completed.',
  'resources.storage.refreshFailed': 'Inventory refresh failed.',
  'resources.storage.transfer.current_node': 'Current node ({worker})',
  'resources.storage.transfer.peer_via_s3':
    'Another node ({worker}) via S3 model library {profile}',
  'resources.storage.transfer.s3': 'S3 model library ({profile})',
  'resources.storage.transfer.modelscope': 'Downloaded from ModelScope',
  'resources.storage.transfer.huggingface': 'Downloaded from Hugging Face',
  'resources.storage.transfer.unknown': 'Unknown transfer method',
  'resources.storage.workerUnavailable':
    'The original worker is unavailable. This model cannot be synced or deployed.',
  'resources.storage.deletedWorker': 'Original worker deleted (Worker #{id})',
  'resources.storage.syncPolicy.create': 'New Sync Policy',
  'resources.storage.syncPolicy.tab': 'Sync Policies (Worker → S3)',
  'resources.storage.preheatDistributionPolicy.tab':
    'Preheat / Distribution Policies',
  'resources.storage.syncPolicy.edit': 'Edit Sync Policy',
  'resources.storage.syncPolicy.confirmTitle': 'Confirm Sync Policy Action',
  'resources.storage.syncPolicy.confirmContent':
    'Apply this action to sync policy “{name}”?',
  'resources.storage.syncPolicy.maintenanceReadonly':
    'The current S3 profile is in maintenance mode. Only the policy name can be changed; a disabled policy cannot be re-enabled or run.',
  'resources.storage.distributionPolicy.tab':
    'Distribution Policies (Continuous)',
  'resources.storage.preheatPolicy.tab': 'Preheat Policies (Manual / Cron)',
  'resources.storage.distributionPolicy.kind': 'Distribute Existing S3 Model',
  'resources.storage.distributionPolicy.create': 'New Distribution Policy',
  'resources.storage.distributionPolicy.hint':
    'Distribution policies only use valid models already stored in S3 and continuously fill target workers.',
  'resources.storage.distributionPolicy.source': 'S3 Model Source',
  'resources.storage.distributionPolicy.artifact': 'S3 Model',
  'resources.storage.distributionPolicy.syncTask': 'Completed Sync Record',
  'resources.storage.syncTask.errorCode': 'Failure Reason',
  'resources.storage.syncTask.error.worker_execution_failed':
    'Worker failed to execute the sync task',
  'resources.storage.syncTask.error.manifest_invalid':
    'The model manifest is invalid',
  'resources.storage.syncTask.error.s3_object_conflict':
    'The model object conflicts with an existing S3 object',
  'resources.storage.tlsEnabledHint':
    'Controls whether transfers to S3 use TLS encryption. Turning it off uses an unencrypted connection.',
  'resources.storage.tlsVerifyHint':
    'Turn this off only for private CA or self-signed certificates. Certificates will not be verified, which creates a man-in-the-middle risk.',
  'resources.storage.virtualHostedHint':
    'Uses bucket.endpoint virtual-hosted addressing when enabled, or endpoint/bucket path-style addressing when disabled. Choose the mode supported by the S3 service.',
  'resources.storage.sourceFallbackDetail':
    'Applies only when this profile is the default. When S3 has no cached model, enabling this allows the download to continue from the original model source; disabling it makes that download fail.',
  'resources.preheat.profile.deleteContent.default':
    'Delete S3 profile "{name}"? After deletion, new downloads use the model source directly until another default S3 profile is configured.',
  'resources.preheat.profile.deleteContent.system':
    'Delete S3 profile "{name}"? After deletion, the system stops using this S3 profile. If local S3 remains configured in the Server or Docker startup arguments, the profile will be created again after restart.',
  'resources.preheat.profile.deleteContent.systemDefault':
    'Delete S3 profile "{name}"? After deletion, the system stops using this S3 profile and new downloads use the model source directly until another default S3 profile is configured. If local S3 remains configured in the Server or Docker startup arguments, the profile will be created again after restart.',
  'resources.storage.sync.noDefault':
    'No active default S3 profile is available. Set a default profile first.',
  'resources.storage.sync.alreadyFromDefault':
    'This model already comes from the default S3 model library and does not need to be synced again.',
  'resources.storage.sync.missingRevision':
    'This legacy model has no trusted revision metadata. Download it again before syncing it to S3.',
  'resources.storage.revision.modelscopeFilelist':
    'File-list fingerprint {fingerprint}',
  'resources.preheat.noReadyWorkers':
    'No Ready workers are available for connectivity checking.',
  'resources.storage.syncBatch.create': 'Create Sync Task',
  'resources.storage.syncBatch.scope': 'Sync Scope',
  'resources.storage.syncBatch.scope.single_model': 'Single Model',
  'resources.storage.syncBatch.scope.selected_workers': 'Selected Workers',
  'resources.storage.syncBatch.scope.all_ready_workers': 'All Ready Workers',
  'resources.storage.syncBatch.description.single_model':
    'Upload one existing model on the selected Ready worker to the target S3. It will not be distributed to other workers.',
  'resources.storage.syncBatch.description.selected_workers':
    'Upload existing models on the selected Ready workers to the target S3. They will not be distributed to other workers.',
  'resources.storage.syncBatch.description.all_ready_workers':
    'Upload existing models on all Ready workers to the target S3. They will not be distributed to other workers.',
  'resources.storage.syncBatch.selectWorker': 'Select Worker',
  'resources.storage.syncBatch.selectModel': 'Select Model',
  'resources.storage.syncBatch.noSyncableModels':
    'This worker has no syncable Ready models.',
  'resources.storage.syncBatch.planned': 'Planned',
  'resources.storage.syncBatch.created': 'Created',
  'resources.storage.syncBatch.skipped': 'Skipped',
  'resources.storage.syncBatch.failed': 'Failed',
  'resources.storage.syncBatch.result': 'Creation Result',
  'resources.storage.syncBatch.reason': 'Reason',
  'resources.storage.syncBatch.reason.model_file_not_ready':
    'Model is not Ready',
  'resources.storage.syncBatch.reason.worker_not_ready': 'Worker is not Ready',
  'resources.storage.syncBatch.reason.duplicate_artifact_identity':
    'The same model version is already planned from another Ready worker',
  'resources.storage.syncBatch.reason.active_task_exists':
    'A sync task is already active',
  'resources.storage.syncBatch.reason.model_file_not_found':
    'Model does not exist',
  'resources.storage.syncBatch.reason.no_ready_workers':
    'No Ready workers are available',
  'resources.storage.deleteSync': 'Delete Sync Record',
  'resources.storage.deleteSyncConfirm': 'Delete Sync Record',
  'resources.storage.deleteSyncContent':
    'Delete sync record #{id}? This cannot be undone.',
  'resources.storage.syncTask.time': 'Sync Time',
  'resources.storage.syncTask.from': 'Source Worker',
  'resources.storage.syncTask.to': 'Target S3',
  'resources.storage.syncTask.state.pending': 'Pending',
  'resources.storage.syncTask.state.scanning': 'Scanning',
  'resources.storage.syncTask.state.publishing': 'Uploading to S3',
  'resources.storage.syncTask.state.ready': 'Completed',
  'resources.storage.syncTask.state.error': 'Failed',
  'resources.storage.syncTask.state.canceled': 'Canceled',
  'resources.storage.createStrategy': 'Create Strategy from This Sync Record'
};
