const options = [
  {
    label: '--uvicorn-log-level',
    value: '--uvicorn-log-level',
    options: ['debug', 'info', 'warning', 'error', 'critical', 'trace']
  },
  {
    label: '--disable-uvicorn-access-log',
    value: '--disable-uvicorn-access-log',
    options: []
  },
  {
    label: '--allow-credentials',
    value: '--allow-credentials',
    options: []
  },
  {
    label: '--allowed-origins',
    value: '--allowed-origins',
    options: []
  },
  {
    label: '--allowed-methods',
    value: '--allowed-methods',
    options: []
  },
  {
    label: '--allowed-headers',
    value: '--allowed-headers',
    options: []
  },
  {
    label: '--api-key',
    value: '--api-key',
    options: []
  },
  {
    label: '--lora-modules',
    value: '--lora-modules',
    options: []
  },
  {
    label: '--prompt-adapters',
    value: '--prompt-adapters',
    options: []
  },
  {
    label: '--chat-template',
    value: '--chat-template',
    options: []
  },
  {
    label: '--response-role',
    value: '--response-role',
    options: []
  },
  {
    label: '--ssl-keyfile',
    value: '--ssl-keyfile',
    options: []
  },
  {
    label: '--ssl-certfile',
    value: '--ssl-certfile',
    options: []
  },
  {
    label: '--enable-ssl-refresh',
    value: '--enable-ssl-refresh',
    options: []
  },
  {
    label: '--ssl-ca-certs',
    value: '--ssl-ca-certs',
    options: []
  },
  {
    label: '--ssl-cert-reqs',
    value: '--ssl-cert-reqs',
    options: []
  },
  {
    label: '--root-path',
    value: '--root-path',
    options: []
  },
  {
    label: '--middleware',
    value: '--middleware',
    options: []
  },
  {
    label: '--return-tokens-as-token-ids',
    value: '--return-tokens-as-token-ids',
    options: []
  },
  {
    label: '--disable-frontend-multiprocessing',
    value: '--disable-frontend-multiprocessing',
    options: []
  },
  {
    label: '--enable-request-id-headers',
    value: '--enable-request-id-headers',
    options: []
  },
  {
    label: '--enable-auto-tool-choice',
    value: '--enable-auto-tool-choice',
    options: []
  },
  {
    label: '--tool-call-parser',
    value: '--tool-call-parser',
    options: [
      'phi4_mini_json',
      'llama3_json',
      'llama4_json',
      'pythonic',
      'jamba',
      'xlam',
      'llama4_pythonic',
      'hunyuan_a13b',
      'mistral',
      'deepseek_v3',
      'kimi_k2',
      'step3',
      'qwen3_coder',
      'hermes',
      'glm45',
      'granite',
      'minimax',
      'granite-20b-fc',
      'internlm'
    ]
  },
  {
    label: '--task',
    value: '--task',
    options: [
      'auto',
      'generate',
      'embedding',
      'embed',
      'classify',
      'score',
      'reward',
      'transcription'
    ]
  },
  {
    label: '--allowed-local-media-path',
    value: '--allowed-local-media-path',
    options: []
  },
  {
    label: '--tool-parser-plugin',
    value: '--tool-parser-plugin',
    options: []
  },
  {
    label: '--model',
    value: '--model',
    options: []
  },
  {
    label: '--tokenizer',
    value: '--tokenizer',
    options: []
  },
  {
    label: '--hf-config-path',
    value: '--hf-config-path',
    options: []
  },
  {
    label: '--skip-tokenizer-init',
    value: '--skip-tokenizer-init',
    options: []
  },
  {
    label: '--revision',
    value: '--revision',
    options: []
  },
  {
    label: '--code-revision',
    value: '--code-revision',
    options: []
  },
  {
    label: '--tokenizer-revision',
    value: '--tokenizer-revision',
    options: []
  },
  {
    label: '--tokenizer-mode',
    value: '--tokenizer-mode',
    options: ['auto', 'slow', 'mistral', 'custom']
  },
  {
    label: '--trust-remote-code',
    value: '--trust-remote-code',
    options: []
  },
  {
    label: '--download-dir',
    value: '--download-dir',
    options: []
  },
  {
    label: '--load-format',
    value: '--load-format',
    options: [
      'auto',
      'pt',
      'safetensors',
      'npcache',
      'dummy',
      'tensorizer',
      'sharded_state',
      'gguf',
      'bitsandbytes',
      'mistral',
      'runai_streamer',
      'fastsafetensors'
    ]
  },
  {
    label: '--chat-template-content-format',
    value: '--chat-template-content-format',
    options: ['auto', 'string', 'openai']
  },
  {
    label: '--enable-reasoning',
    value: '--enable-reasoning',
    options: []
  },
  {
    label: '--reasoning-parser',
    value: '--reasoning-parser',
    options: [
      'deepseek_r1',
      'glm45',
      'GptOss',
      'granite',
      'hunyuan_a13b',
      'mistral',
      'qwen3',
      'step3'
    ]
  },
  {
    label: '--config-format',
    value: '--config-format',
    options: ['auto', 'hf', 'mistral']
  },
  {
    label: '--disable-cascade-attn',
    value: '--disable-cascade-attn',
    options: []
  },
  {
    label: '--dtype',
    value: '--dtype',
    options: ['auto', 'half', 'float16', 'bfloat16', 'float', 'float32']
  },
  {
    label: '--kv-cache-dtype',
    value: '--kv-cache-dtype',
    options: ['auto', 'fp8', 'fp8_e5m2', 'fp8_e4m3']
  },
  {
    label: '--disable-chunked-mm-input',
    value: '--disable-chunked-mm-input',
    options: []
  },
  {
    label: 'DISABLE_CHUNKED_MM_INPUT',
    value: 'DISABLE_CHUNKED_MM_INPUT',
    options: []
  },
  {
    label: '--quantization-param-path',
    value: '--quantization-param-path',
    options: []
  },
  {
    label: '--max-model-len',
    value: '--max-model-len',
    options: []
  },
  {
    label: '--guided-decoding-backend',
    value: '--guided-decoding-backend',
    options: ['outlines', 'lm-format-enforcer', 'xgrammar']
  },
  {
    label: '--logits-processor-pattern',
    value: '--logits-processor-pattern',
    options: []
  },

  {
    label: '--model-impl',
    value: '--model-impl',
    options: ['auto', 'vllm', 'transformers']
  },
  {
    label: '--distributed-executor-backend',
    value: '--distributed-executor-backend',
    options: ['ray', 'mp', 'uni', 'external_launcher']
  },
  {
    label: '--worker-use-ray',
    value: '--worker-use-ray',
    options: []
  },
  {
    label: '--data-parallel-size',
    value: '--data-parallel-size',
    options: []
  },
  {
    label: '--enable-expert-parallel',
    value: '--enable-expert-parallel',
    options: []
  },
  {
    label: '--pipeline-parallel-size',
    value: '--pipeline-parallel-size',
    options: []
  },
  {
    label: '--tensor-parallel-size',
    value: '--tensor-parallel-size',
    options: []
  },
  {
    label: '--max-parallel-loading-workers',
    value: '--max-parallel-loading-workers',
    options: []
  },
  {
    label: '--ray-workers-use-nsight',
    value: '--ray-workers-use-nsight',
    options: []
  },
  {
    label: '--block-size',
    value: '--block-size',
    options: ['8', '16', '32', '64', '128']
  },
  {
    label: '--enable-prefix-caching',
    value: '--enable-prefix-caching',
    options: []
  },
  {
    label: '--prefix-caching-hash-algo',
    value: '--prefix-caching-hash-algo',
    options: ['builtin', 'sha256']
  },
  {
    label: '--disable-sliding-window',
    value: '--disable-sliding-window',
    options: []
  },
  {
    label: '--use-v2-block-manager',
    value: '--use-v2-block-manager',
    options: []
  },
  {
    label: '--num-lookahead-slots',
    value: '--num-lookahead-slots',
    options: []
  },
  {
    label: '--seed',
    value: '--seed',
    options: []
  },
  {
    label: '--swap-space',
    value: '--swap-space',
    options: []
  },
  {
    label: '--cpu-offload-gb',
    value: '--cpu-offload-gb',
    options: []
  },
  {
    label: '--gpu-memory-utilization',
    value: '--gpu-memory-utilization',
    options: []
  },
  {
    label: '--num-gpu-blocks-override',
    value: '--num-gpu-blocks-override',
    options: []
  },
  {
    label: '--max-num-batched-tokens',
    value: '--max-num-batched-tokens',
    options: []
  },
  {
    label: '--max-num-partial-prefills',
    value: '--max-num-partial-prefills',
    options: []
  },

  {
    label: '--max-long-partial-prefills',
    value: '--max-long-partial-prefills',
    options: []
  },

  {
    label: '--long-prefill-token-threshold',
    value: '--long-prefill-token-threshold',
    options: []
  },
  {
    label: '--max-num-seqs',
    value: '--max-num-seqs',
    options: []
  },
  {
    label: '--max-logprobs',
    value: '--max-logprobs',
    options: []
  },
  {
    label: '--disable-log-stats',
    value: '--disable-log-stats',
    options: []
  },
  {
    label: '--hf-overrides',
    value: '--hf-overrides',
    options: []
  },
  {
    label: '--hf-token',
    value: '--hf-token',
    options: []
  },

  {
    label: 'HF_TOKEN',
    value: 'HF_TOKEN',
    options: []
  },
  {
    label: '--disable-mm-preprocessor-cache',
    value: '--disable-mm-preprocessor-cache',
    options: []
  },
  {
    label: '--quantization',
    value: '--quantization',
    options: [
      'aqlm',
      'awq',
      'deepspeedfp',
      'tpu_int8',
      'fp8',
      'ptpc_fp8',
      'fbgemm_fp8',
      'modelopt',
      'nvfp4',
      'marlin',
      'gguf',
      'gptq_marlin_24',
      'gptq_marlin',
      'awq_marlin',
      'gptq',
      'compressed-tensors',
      'bitsandbytes',
      'qqq',
      'hqq',
      'experts_int8',
      'neuron_quant',
      'ipex',
      'quark',
      'moe_wna16',
      'torchao',
      'None'
    ]
  },
  {
    label: '--enable-lora-bias',
    value: '--enable-lora-bias',
    options: []
  },
  {
    label: '--rope-scaling',
    value: '--rope-scaling',
    options: []
  },
  {
    label: '--rope-theta',
    value: '--rope-theta',
    options: []
  },
  {
    label: '--enforce-eager',
    value: '--enforce-eager',
    options: []
  },
  {
    label: '--max-context-len-to-capture',
    value: '--max-context-len-to-capture',
    options: []
  },
  {
    label: '--max-seq-len-to-capture',
    value: '--max-seq-len-to-capture',
    options: []
  },
  {
    label: '--disable-custom-all-reduce',
    value: '--disable-custom-all-reduce',
    options: []
  },
  {
    label: '--tokenizer-pool-size',
    value: '--tokenizer-pool-size',
    options: []
  },
  {
    label: '--tokenizer-pool-type',
    value: '--tokenizer-pool-type',
    options: []
  },
  {
    label: '--tokenizer-pool-extra-config',
    value: '--tokenizer-pool-extra-config',
    options: []
  },
  {
    label: '--limit-mm-per-prompt',
    value: '--limit-mm-per-prompt',
    options: []
  },
  {
    label: '--mm-processor-kwargs',
    value: '--mm-processor-kwargs',
    options: []
  },
  {
    label: '--enable-lora',
    value: '--enable-lora',
    options: []
  },
  {
    label: '--max-loras',
    value: '--max-loras',
    options: []
  },
  {
    label: '--max-lora-rank',
    value: '--max-lora-rank',
    options: []
  },
  {
    label: '--lora-extra-vocab-size',
    value: '--lora-extra-vocab-size',
    options: []
  },
  {
    label: '--lora-dtype',
    value: '--lora-dtype',
    options: ['auto', 'float16', 'bfloat16']
  },
  {
    label: '--long-lora-scaling-factors',
    value: '--long-lora-scaling-factors',
    options: []
  },
  {
    label: '--max-cpu-loras',
    value: '--max-cpu-loras',
    options: []
  },
  {
    label: '--fully-sharded-loras',
    value: '--fully-sharded-loras',
    options: []
  },
  {
    label: '--enable-prompt-adapter',
    value: '--enable-prompt-adapter',
    options: []
  },
  {
    label: '--max-prompt-adapters',
    value: '--max-prompt-adapters',
    options: []
  },
  {
    label: '--max-prompt-adapter-token',
    value: '--max-prompt-adapter-token',
    options: []
  },
  {
    label: '--device',
    value: '--device',
    options: ['auto', 'cuda', 'neuron', 'cpu', 'tpu', 'xpu', 'hpu']
  },
  {
    label: '--speculative-config',
    value: '--speculative-config',
    options: []
  },
  {
    label: '--num-scheduler-steps',
    value: '--num-scheduler-steps',
    options: []
  },
  {
    label: '--multi-step-stream-outputs',
    value: '--multi-step-stream-outputs',
    options: []
  },
  {
    label: '--scheduler-delay-factor',
    value: '--scheduler-delay-factor',
    options: []
  },
  {
    label: '--enable-chunked-prefill',
    value: '--enable-chunked-prefill',
    options: []
  },
  {
    label: '--model-loader-extra-config',
    value: '--model-loader-extra-config',
    options: []
  },
  {
    label: '--scheduler-cls',
    value: '--scheduler-cls',
    options: []
  },
  {
    label: '--use-tqdm-on-load',
    value: '--use-tqdm-on-load',
    options: []
  },
  {
    label: '--ignore-patterns',
    value: '--ignore-patterns',
    options: []
  },
  {
    label: '--show-hidden-metrics-for-version',
    value: '--show-hidden-metrics-for-version',
    options: []
  },
  {
    label: '--preemption-mode',
    value: '--preemption-mode',
    options: []
  },
  {
    label: '--served-model-name',
    value: '--served-model-name',
    options: []
  },
  {
    label: '--qlora-adapter-name-or-path',
    value: '--qlora-adapter-name-or-path',
    options: []
  },
  {
    label: '--otlp-traces-endpoint',
    value: '--otlp-traces-endpoint',
    options: []
  },
  {
    label: '--collect-detailed-traces',
    value: '--collect-detailed-traces',
    options: []
  },
  {
    label: '--disable-async-output-proc',
    value: '--disable-async-output-proc',
    options: []
  },
  {
    label: '--override-neuron-config',
    value: '--override-neuron-config',
    options: []
  },
  {
    label: '--compilation-config',
    value: '--compilation-config',
    options: []
  },
  {
    label: '--override-pooler-config',
    value: '--override-pooler-config',
    options: []
  },
  {
    label: '--kv-transfer-config',
    value: '--kv-transfer-config',
    options: []
  },
  {
    label: '--worker-cls',
    value: '--worker-cls',
    options: []
  },
  {
    label: '--override-generation-config',
    value: '--override-generation-config',
    options: []
  },
  {
    label: '--enable-sleep-mode',
    value: '--enable-sleep-mode',
    options: []
  },

  {
    label: '--calculate-kv-scales',
    value: '--calculate-kv-scales',
    options: []
  },
  {
    label: '--generation-config',
    value: '--generation-config',
    options: []
  },
  {
    label: '--scheduling-policy',
    value: '--scheduling-policy',
    options: ['fcfs', 'priority']
  },
  {
    label: '--disable-log-requests',
    value: '--disable-log-requests',
    options: []
  },
  {
    label: '--additional-config',
    value: '--additional-config',
    options: []
  },
  {
    label: '--max-log-len',
    value: '--max-log-len',
    options: []
  },
  {
    label: '--disable-fastapi-docs',
    value: '--disable-fastapi-docs',
    options: []
  },
  {
    label: '--enable-prompt-tokens-details',
    value: '--enable-prompt-tokens-details',
    options: []
  },
  {
    label: '--enable-server-load-tracking',
    value: '--enable-server-load-tracking',
    options: []
  }
];

type BackendParameterOption = (typeof options)[number];

const vllmAdditionalFlags = `
--aggregate-engine-logging
--all2all-backend
--allow-deprecated-quantization
--allowed-media-domains
--api-server-count
--async-scheduling
--attention-backend
--attention-config
--config
--convert
--cp-kv-cache-interleave-size
--cpu-distributed-timeout-seconds
--cpu-offload-params
--cudagraph-capture-sizes
--cudagraph-metrics
--data-parallel-address
--data-parallel-backend
--data-parallel-external-lb
--data-parallel-hybrid-lb
--data-parallel-multi-port-external-lb
--data-parallel-rank
--data-parallel-rpc-port
--data-parallel-size-local
--data-parallel-start-rank
--data-parallel-supervisor-port
--dbo-decode-token-threshold
--dbo-prefill-token-threshold
--dcp-comm-backend
--dcp-kv-cache-interleave-size
--decode-context-parallel-size
--default-chat-template-kwargs
--default-mm-loras
--device-ids
--diffusion-config
--disable-access-log-for-endpoints
--disable-hybrid-kv-cache-manager
--disable-nccl-for-dp-synchronization
--distributed-timeout-seconds
--dp-supervisor-probe-failure-threshold
--dp-supervisor-probe-interval-s
--dp-supervisor-probe-timeout-s
--ec-transfer-config
--enable-bf16x3-router-gemm
--enable-cumem-allocator
--enable-dbo
--enable-elastic-ep
--enable-ep-weight-filter
--enable-eplb
--enable-flash-late-interaction
--enable-flashinfer-autotune
--enable-force-include-usage
--enable-layerwise-nvtx-tracing
--enable-log-deltas
--enable-log-outputs
--enable-log-requests
--enable-logging-iteration-details
--enable-mamba-cache-stochastic-rounding
--enable-mfu-metrics
--enable-mixed-moe-lora-format
--enable-mm-embeds
--enable-mm-processor-stats
--enable-moe-shared-loras
--enable-offline-docs
--enable-per-request-metrics
--enable-prompt-embeds
--enable-return-routed-experts
--enable-tokenizer-info-endpoint
--enable-tower-connector-lora
--eplb-config
--exclude-tools-when-tool-choice-none
--expert-placement-strategy
--fail-on-environ-validation
--fingerprint-mode
--fingerprint-value
--gdn-prefill-backend
--grpc
--h11-max-header-count
--h11-max-incomplete-event-size
--headless
--host
--interleave-mm-strings
--io-processor-plugin
--ir-op-priority
--jit-monitor-mode
--jit-monitor-verbose
--kernel-config
--kv-cache-dtype-skip-layers
--kv-cache-memory-bytes
--kv-cache-metrics
--kv-cache-metrics-sample
--kv-events-config
--kv-offloading-backend
--kv-offloading-size
--kv-sharing-fast-prefill
--language-model-only
--linear-backend
--log-config-file
--log-error-stack
--logits-processors
--logprobs-mode
--lora-target-modules
--mamba-backend
--mamba-block-size
--mamba-cache-dtype
--mamba-cache-mode
--mamba-cache-philox-rounds
--mamba-config
--mamba-ssm-cache-dtype
--master-addr
--master-port
--max-cudagraph-capture-size
--max-num-scheduled-tokens
--media-io-kwargs
--mm-encoder-attn-backend
--mm-encoder-attn-dtype
--mm-encoder-fp8-scale-path
--mm-encoder-fp8-scale-save-margin
--mm-encoder-fp8-scale-save-path
--mm-encoder-only
--mm-encoder-tp-mode
--mm-ipc-gpu-memory-gb
--mm-processor-cache-gb
--mm-processor-cache-type
--mm-shm-cache-max-object-size-mb
--mm-tensor-ipc
--model-class-overrides
--model-weights
--moe-backend
--nnodes
--no-aggregate-engine-logging
--no-allow-credentials
--no-allow-deprecated-quantization
--no-async-scheduling
--no-calculate-kv-scales
--no-cudagraph-metrics
--no-data-parallel-external-lb
--no-data-parallel-hybrid-lb
--no-data-parallel-multi-port-external-lb
--no-disable-cascade-attn
--no-disable-chunked-mm-input
--no-disable-custom-all-reduce
--no-disable-fastapi-docs
--no-disable-hybrid-kv-cache-manager
--no-disable-log-stats
--no-disable-nccl-for-dp-synchronization
--no-disable-sliding-window
--no-disable-uvicorn-access-log
--no-enable-auto-tool-choice
--no-enable-bf16x3-router-gemm
--no-enable-chunked-prefill
--no-enable-cumem-allocator
--no-enable-dbo
--no-enable-elastic-ep
--no-enable-ep-weight-filter
--no-enable-eplb
--no-enable-expert-parallel
--no-enable-flash-late-interaction
--no-enable-flashinfer-autotune
--no-enable-force-include-usage
--no-enable-layerwise-nvtx-tracing
--no-enable-log-deltas
--no-enable-log-outputs
--no-enable-log-requests
--no-enable-logging-iteration-details
--no-enable-lora
--no-enable-mamba-cache-stochastic-rounding
--no-enable-mfu-metrics
--no-enable-mixed-moe-lora-format
--no-enable-mm-embeds
--no-enable-mm-processor-stats
--no-enable-moe-shared-loras
--no-enable-offline-docs
--no-enable-per-request-metrics
--no-enable-prefix-caching
--no-enable-prompt-embeds
--no-enable-prompt-tokens-details
--no-enable-request-id-headers
--no-enable-return-routed-experts
--no-enable-server-load-tracking
--no-enable-sleep-mode
--no-enable-ssl-refresh
--no-enable-tokenizer-info-endpoint
--no-enable-tower-connector-lora
--no-enforce-eager
--no-exclude-tools-when-tool-choice-none
--no-fail-on-environ-validation
--no-fully-sharded-loras
--no-interleave-mm-strings
--no-jit-monitor-verbose
--no-kv-cache-metrics
--no-kv-sharing-fast-prefill
--no-language-model-only
--no-log-error-stack
--no-mm-encoder-only
--no-numa-bind
--no-ray-workers-use-nsight
--no-return-tokens-as-token-ids
--no-scheduler-reserve-full-isl
--no-skip-mm-profiling
--no-skip-tokenizer-init
--no-specialize-active-lora
--no-tokens-only
--no-trust-remote-code
--no-trust-request-chat-template
--no-use-fp64-gumbel
--no-use-tqdm-on-load
--node-rank
--numa-bind
--numa-bind-cpus
--numa-bind-nodes
--offload-backend
--offload-group-size
--offload-num-in-group
--offload-params
--offload-prefetch-step
--optimization-level
--override-attention-dtype
--performance-mode
--pooler-config
--port
--prefill-context-parallel-size
--prefill-schedule-interval
--prefix-match-unit
--profiler-config
--pt-load-map-location
--reasoning-config
--reasoning-parser-plugin
--quantization-config
--renderer-num-workers
--runner
--safetensors-load-strategy
--safetensors-prefetch-block-size
--safetensors-prefetch-num-threads
--scheduler-reserve-full-isl
--shutdown-timeout
--skip-mm-profiling
--spec-method
--spec-model
--spec-tokens
--specialize-active-lora
--ssl-ciphers
--stream-interval
--structured-outputs-config
--tokens-only
--tool-server
--trust-request-chat-template
--ubatch-size
--uds
--use-fp64-gumbel
--video-pruning-rate
--watermark
--weight-transfer-config
--worker-extension-cls
`;

const formatOptions = (items: BackendParameterOption[]) => {
  return items.map((option) => {
    return {
      label: option.label,
      value: option.value,
      opts: option.options.map((opt) => {
        return {
          label: opt,
          value: opt
        };
      })
    };
  });
};

const splitFlags = (flags: string) => {
  return flags.trim().split(/\s+/).filter(Boolean);
};

const vllmUnsupportedParams = new Set([
  '--async-chunk',
  '--auxiliary-text-encoder',
  '--boundary-ratio',
  '--cache-backend',
  '--cache-config',
  '--cfg-parallel-size',
  '--default-sampling-params',
  '--deploy-config',
  '--device',
  '--diffusers-call-kwargs',
  '--diffusers-load-kwargs',
  '--diffusion-attention-backend',
  '--diffusion-attention-config',
  '--diffusion-kv-cache-dtype',
  '--diffusion-kv-cache-skip-layers',
  '--diffusion-kv-cache-skip-steps',
  '--diffusion-load-format',
  '--diffusion-quantization-config',
  '--diffusion-streaming-output',
  '--disable-async-output-proc',
  '--disable-frontend-multiprocessing',
  '--disable-log-requests',
  '--disable-mm-preprocessor-cache',
  '--disable-multithread-weight-load',
  '--enable-ar-profiler',
  '--enable-cache-dit-summary',
  '--enable-cpu-offload',
  '--enable-diffusion-pipeline-profiler',
  '--enable-layerwise-offload',
  '--enable-lora-bias',
  '--enable-orch-monitor',
  '--enable-prompt-adapter',
  '--enable-reasoning',
  '--flow-shift',
  '--force-cutlass-fp8',
  '--forced-aligner',
  '--forced-aligner-config',
  '--guidance-scale',
  '--guidance-scale-2',
  '--guided-decoding-backend',
  '--hsdp-replicate-size',
  '--hsdp-shard-size',
  '--init-timeout',
  '--log-file',
  '--log-stats',
  '--logits-processor-pattern',
  '--long-lora-scaling-factors',
  '--lora-extra-vocab-size',
  '--max-context-len-to-capture',
  '--max-generated-image-size',
  '--max-prompt-adapter-token',
  '--max-prompt-adapters',
  '--max-seq-len-to-capture',
  '--model-class-name',
  '--multi-step-stream-outputs',
  '--no-guardrails',
  '--num-gpus',
  '--num-inference-steps',
  '--num-lookahead-slots',
  '--num-scheduler-steps',
  '--num-weight-load-threads',
  '--omni-dp-size-local',
  '--omni-heartbeat-timeout',
  '--omni-lb-policy',
  '--override-neuron-config',
  '--override-pooler-config',
  '--preemption-mode',
  '--prompt-adapters',
  '--qlora-adapter-name-or-path',
  '--quantization-param-path',
  '--request-batch-max-wait-ms',
  '--ring',
  '--rope-scaling',
  '--rope-theta',
  '--scheduler-delay-factor',
  '--stage-configs-path',
  '--stage-id',
  '--stage-init-timeout',
  '--stage-overrides',
  '--step-execution',
  '--swap-space',
  '--task',
  '--task-type',
  '--tokenizer-pool-extra-config',
  '--tokenizer-pool-size',
  '--tokenizer-pool-type',
  '--tts-max-instructions-length',
  '--ulysses-mode',
  '--use-hsdp',
  '--use-v2-block-manager',
  '--usp',
  '--vae-parallel-mode',
  '--vae-patch-parallel-size',
  '--vae-use-slicing',
  '--vae-use-tiling',
  '--worker-backend',
  '--worker-use-ray'
]);

const formatFlagOptions = (flags: string[]): BackendParameterOption[] => {
  return flags.map((flag) => {
    return {
      label: flag,
      value: flag,
      options: []
    };
  });
};

const vllmOmniUnsupportedParams = new Set([
  '--data-parallel-size',
  '--data-parallel-size-local',
  '--data-parallel-address',
  '--data-parallel-rpc-port',
  '--data-parallel-start-rank',
  '--data-parallel-backend',
  '--api-server-count',
  '--enable-expert-parallel',
  '--no-enable-expert-parallel',
  '--device',
  '--disable-async-output-proc',
  '--disable-frontend-multiprocessing',
  '--disable-log-requests',
  '--disable-mm-preprocessor-cache',
  '--enable-lora-bias',
  '--enable-prompt-adapter',
  '--enable-reasoning',
  '--guidance-scale',
  '--guidance-scale-2',
  '--guided-decoding-backend',
  '--logits-processor-pattern',
  '--long-lora-scaling-factors',
  '--lora-extra-vocab-size',
  '--max-context-len-to-capture',
  '--max-prompt-adapter-token',
  '--max-prompt-adapters',
  '--max-seq-len-to-capture',
  '--multi-step-stream-outputs',
  '--num-inference-steps',
  '--num-lookahead-slots',
  '--num-scheduler-steps',
  '--override-neuron-config',
  '--override-pooler-config',
  '--preemption-mode',
  '--prompt-adapters',
  '--qlora-adapter-name-or-path',
  '--quantization-param-path',
  '--rope-scaling',
  '--rope-theta',
  '--scheduler-delay-factor',
  '--swap-space',
  '--task',
  '--tokenizer-pool-extra-config',
  '--tokenizer-pool-size',
  '--tokenizer-pool-type',
  '--use-v2-block-manager',
  '--worker-use-ray'
]);

const omniSpecificOptions: BackendParameterOption[] = [
  {
    label: '--num-gpus',
    value: '--num-gpus',
    options: []
  },
  {
    label: '--use-hsdp',
    value: '--use-hsdp',
    options: []
  },
  {
    label: '--hsdp-shard-size',
    value: '--hsdp-shard-size',
    options: []
  },
  {
    label: '--hsdp-replicate-size',
    value: '--hsdp-replicate-size',
    options: []
  },
  {
    label: '--vae-use-slicing',
    value: '--vae-use-slicing',
    options: []
  },
  {
    label: '--vae-use-tiling',
    value: '--vae-use-tiling',
    options: []
  },
  {
    label: '--vae-patch-parallel-size',
    value: '--vae-patch-parallel-size',
    options: []
  },
  {
    label: '--vae-parallel-mode',
    value: '--vae-parallel-mode',
    options: ['tile', 'spatial_shard_height', 'spatial_shard_width']
  },
  {
    label: '--enable-cpu-offload',
    value: '--enable-cpu-offload',
    options: []
  },
  {
    label: '--enable-layerwise-offload',
    value: '--enable-layerwise-offload',
    options: []
  },
  {
    label: '--disable-multithread-weight-load',
    value: '--disable-multithread-weight-load',
    options: []
  },
  {
    label: '--num-weight-load-threads',
    value: '--num-weight-load-threads',
    options: []
  },
  {
    label: '--diffusion-load-format',
    value: '--diffusion-load-format',
    options: ['default', 'custom_pipeline', 'dummy', 'diffusers']
  },
  {
    label: '--diffusers-load-kwargs',
    value: '--diffusers-load-kwargs',
    options: []
  },
  {
    label: '--diffusers-call-kwargs',
    value: '--diffusers-call-kwargs',
    options: []
  },
  {
    label: '--diffusion-quantization-config',
    value: '--diffusion-quantization-config',
    options: []
  },
  {
    label: '--diffusion-attention-backend',
    value: '--diffusion-attention-backend',
    options: []
  },
  {
    label: '--diffusion-attention-config',
    value: '--diffusion-attention-config',
    options: []
  },
  {
    label: '--diffusion-kv-cache-dtype',
    value: '--diffusion-kv-cache-dtype',
    options: []
  },
  {
    label: '--diffusion-kv-cache-skip-steps',
    value: '--diffusion-kv-cache-skip-steps',
    options: []
  },
  {
    label: '--diffusion-kv-cache-skip-layers',
    value: '--diffusion-kv-cache-skip-layers',
    options: []
  },
  {
    label: '--force-cutlass-fp8',
    value: '--force-cutlass-fp8',
    options: []
  },
  {
    label: '--cache-backend',
    value: '--cache-backend',
    options: ['none', 'tea_cache', 'cache_dit', 'mag_cache', 'step_cache']
  },
  {
    label: '--cache-config',
    value: '--cache-config',
    options: []
  },
  {
    label: '--enable-cache-dit-summary',
    value: '--enable-cache-dit-summary',
    options: []
  },
  {
    label: '--step-execution',
    value: '--step-execution',
    options: []
  },
  {
    label: '--request-batch-max-wait-ms',
    value: '--request-batch-max-wait-ms',
    options: []
  },
  {
    label: '--cfg-parallel-size',
    value: '--cfg-parallel-size',
    options: ['1', '2']
  },
  {
    label: '--usp',
    value: '--usp',
    options: []
  },
  {
    label: '--ulysses-mode',
    value: '--ulysses-mode',
    options: ['strict', 'advanced_uaa']
  },
  {
    label: '--ring',
    value: '--ring',
    options: []
  },
  {
    label: '--default-sampling-params',
    value: '--default-sampling-params',
    options: []
  },
  {
    label: '--num-inference-steps',
    value: '--num-inference-steps',
    options: []
  },
  {
    label: '--guidance-scale',
    value: '--guidance-scale',
    options: []
  },
  {
    label: '--guidance-scale-2',
    value: '--guidance-scale-2',
    options: []
  },
  {
    label: '--max-generated-image-size',
    value: '--max-generated-image-size',
    options: []
  },
  {
    label: '--diffusion-streaming-output',
    value: '--diffusion-streaming-output',
    options: []
  },
  {
    label: '--boundary-ratio',
    value: '--boundary-ratio',
    options: []
  },
  {
    label: '--flow-shift',
    value: '--flow-shift',
    options: []
  },
  {
    label: '--model-class-name',
    value: '--model-class-name',
    options: []
  },
  {
    label: '--stage-configs-path',
    value: '--stage-configs-path',
    options: []
  },
  {
    label: '--deploy-config',
    value: '--deploy-config',
    options: []
  },
  {
    label: '--stage-overrides',
    value: '--stage-overrides',
    options: []
  },
  {
    label: '--async-chunk',
    value: '--async-chunk',
    options: []
  },
  {
    label: '--stage-id',
    value: '--stage-id',
    options: []
  },
  {
    label: '--stage-init-timeout',
    value: '--stage-init-timeout',
    options: []
  },
  {
    label: '--init-timeout',
    value: '--init-timeout',
    options: []
  },
  {
    label: '--worker-backend',
    value: '--worker-backend',
    options: ['multi_process', 'ray']
  },
  {
    label: '--omni-dp-size-local',
    value: '--omni-dp-size-local',
    options: []
  },
  {
    label: '--omni-lb-policy',
    value: '--omni-lb-policy',
    options: ['random', 'round-robin', 'least-queue-length']
  },
  {
    label: '--omni-heartbeat-timeout',
    value: '--omni-heartbeat-timeout',
    options: []
  },
  {
    label: '--dtype',
    value: '--dtype',
    options: ['auto', 'bfloat16', 'float', 'float16', 'float32', 'half']
  },
  {
    label: '--gpu-memory-utilization',
    value: '--gpu-memory-utilization',
    options: []
  },
  {
    label: '--max-num-seqs',
    value: '--max-num-seqs',
    options: []
  },
  {
    label: '--max-model-len',
    value: '--max-model-len',
    options: []
  },
  {
    label: '--cpu-offload-gb',
    value: '--cpu-offload-gb',
    options: []
  },
  {
    label: '--enforce-eager',
    value: '--enforce-eager',
    options: []
  },
  {
    label: '--trust-remote-code',
    value: '--trust-remote-code',
    options: []
  },
  {
    label: '--download-dir',
    value: '--download-dir',
    options: []
  },
  {
    label: '--hf-token',
    value: '--hf-token',
    options: []
  },
  {
    label: 'HF_TOKEN',
    value: 'HF_TOKEN',
    options: []
  },
  {
    label: '--quantization',
    value: '--quantization',
    options: [
      'aqlm',
      'awq',
      'bitsandbytes',
      'compressed-tensors',
      'fp8',
      'gguf',
      'gptq',
      'gptq_marlin',
      'modelopt',
      'None'
    ]
  },
  {
    label: '--quantization-config',
    value: '--quantization-config',
    options: []
  },
  {
    label: '--seed',
    value: '--seed',
    options: []
  },
  {
    label: '--enable-sleep-mode',
    value: '--enable-sleep-mode',
    options: []
  },
  {
    label: '--log-stats',
    value: '--log-stats',
    options: []
  },
  {
    label: '--log-file',
    value: '--log-file',
    options: []
  },
  {
    label: '--forced-aligner',
    value: '--forced-aligner',
    options: []
  },
  {
    label: '--forced-aligner-config',
    value: '--forced-aligner-config',
    options: []
  },
  {
    label: '--task-type',
    value: '--task-type',
    options: ['CustomVoice', 'VoiceDesign', 'Base']
  },
  {
    label: '--tts-max-instructions-length',
    value: '--tts-max-instructions-length',
    options: []
  },
  {
    label: '--no-guardrails',
    value: '--no-guardrails',
    options: []
  },
  {
    label: '--enable-diffusion-pipeline-profiler',
    value: '--enable-diffusion-pipeline-profiler',
    options: []
  },
  {
    label: '--enable-ar-profiler',
    value: '--enable-ar-profiler',
    options: []
  },
  {
    label: '--enable-orch-monitor',
    value: '--enable-orch-monitor',
    options: []
  },
  {
    label: '--auxiliary-text-encoder',
    value: '--auxiliary-text-encoder',
    options: []
  }
];

const vllmOmniAdditionalFlags = `
--allgather-degree
--batch-timeout
--diffusion-compile-dynamic
--diffusion-compile-granularity
--dlo-no-use-allgather
--dlo-use-allgather
--enable-distributed-layerwise-offload
--no-async-chunk
--no-diffusion-compile-dynamic
--omni
--omni-master-address
--omni-master-port
--omni-replica-address
--ray-address
--replica-id
--ring-degree
--shm-threshold-bytes
--strategy-config
--text-encoder-tp-size
--ulysses-degree
`;

const mergeOptions = (items: BackendParameterOption[]) => {
  const exists = new Set<string>();
  return items.filter((item) => {
    if (exists.has(item.value)) {
      return false;
    }
    exists.add(item.value);
    return true;
  });
};

const vllmOptions = mergeOptions([
  ...options.filter((option) => !vllmUnsupportedParams.has(option.value)),
  ...formatFlagOptions(splitFlags(vllmAdditionalFlags))
]);

const vllmOmniOptions = mergeOptions([
  ...vllmOptions.filter(
    (option) => !vllmOmniUnsupportedParams.has(option.value)
  ),
  ...options.filter((option) => !vllmOmniUnsupportedParams.has(option.value)),
  ...omniSpecificOptions.filter(
    (option) => !vllmOmniUnsupportedParams.has(option.value)
  ),
  ...formatFlagOptions(splitFlags(vllmOmniAdditionalFlags)).filter(
    (option) => !vllmOmniUnsupportedParams.has(option.value)
  )
]);

const resultList = formatOptions(vllmOptions);

export const vllmOmniConfig = formatOptions(vllmOmniOptions);

export default resultList;
