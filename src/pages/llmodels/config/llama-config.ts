const options = [
  {
    label: '--verbose',
    value: '--verbose'
  },
  {
    label: '--verbosity',
    value: '--verbosity'
  },
  {
    label: '--host',
    value: '--host'
  },
  {
    label: '--timeout',
    value: '--timeout'
  },
  {
    label: '--threads-http',
    value: '--threads-http'
  },
  {
    label: '--conn-idle',
    value: '--conn-idle'
  },
  {
    label: '--lora',
    value: '--lora'
  },
  {
    label: '--lora-scaled',
    value: '--lora-scaled'
  },
  {
    label: '--conn-keepalive',
    value: '--conn-keepalive'
  },
  {
    label: '--lora-init-without-apply',
    value: '--lora-init-without-apply'
  },
  {
    label: '--seed',
    value: '--seed'
  },
  {
    label: '--main-gpu',
    value: '--main-gpu'
  },
  {
    label: '--flash-attn',
    value: '--flash-attn'
  },
  {
    label: '--metrics',
    value: '--metrics'
  },
  {
    label: '--slots',
    value: '--slots'
  },
  {
    label: '--no-warmup',
    value: '--no-warmup'
  },
  {
    label: '--device',
    value: '--device'
  },
  {
    label: '--gpu-layers',
    value: '--gpu-layers'
  },
  {
    label: '--split-mode',
    value: '--split-mode'
  },
  {
    label: '--tensor-split',
    value: '--tensor-split'
  },
  {
    label: '--override-kv',
    value: '--override-kv'
  },
  {
    label: '--chat-template',
    value: '--chat-template',
    options: [
      'chatglm3',
      'chatglm4',
      'chatml',
      'command-r',
      'deepseek',
      'deepseek2',
      'deepseek3',
      'exaone3',
      'falcon',
      'falcon3',
      'gemma',
      'gigachat',
      'granite',
      'llama2',
      'llama2-sys',
      'llama2-sys-bos',
      'llama2-sys-strip',
      'llama3',
      'llava',
      'llava-mistral',
      'megrez',
      'minicpm',
      'mistral-v1',
      'mistral-v3',
      'mistral-v3-tekken',
      'mistral-v7',
      'monarch',
      'openchat',
      'orion',
      'phi3',
      'phi4',
      'rwkv-world',
      'vicuna',
      'vicuna-orca',
      'zephyr'
    ]
  },
  {
    label: '--chat-template-file',
    value: '--chat-template-file'
  },
  {
    label: '--slot-save-path',
    value: '--slot-save-path'
  },
  {
    label: '--slot-prompt-similarity',
    value: '--slot-prompt-similarity'
  },
  {
    label: '--tokens-per-second',
    value: '--tokens-per-second'
  },
  {
    label: '--threads',
    value: '--threads'
  },
  {
    label: '--cpu-mask',
    value: '--cpu-mask'
  },
  {
    label: '--cpu-range',
    value: '--cpu-range'
  },
  {
    label: '--cpu-strict',
    value: '--cpu-strict',
    options: ['0', '1']
  },
  {
    label: '--prio',
    value: '--prio',
    options: ['0', '1', '2', '3']
  },
  {
    label: '--poll',
    value: '--poll'
  },
  {
    label: '--threads-batch',
    value: '--threads-batch'
  },
  {
    label: '--cpu-mask-batch',
    value: '--cpu-mask-batch'
  },
  {
    label: '--cpu-range-batch',
    value: '--cpu-range-batch'
  },
  {
    label: '--cpu-strict-batch',
    value: '--cpu-strict-batch',
    options: ['0', '1']
  },
  {
    label: '--prio-batch',
    value: '--prio-batch',
    options: ['0', '1', '2', '3']
  },
  {
    label: '--poll-batch',
    value: '--poll-batch'
  },
  {
    label: '--ctx-size',
    value: '--ctx-size',
    options: []
  },
  {
    label: '--no-context-shift',
    value: '--no-context-shift'
  },
  {
    label: '--predict',
    value: '--predict',
    options: ['-1', '-2']
  },
  {
    label: '--parallel',
    value: '--parallel'
  },
  {
    label: '--batch-size',
    value: '--batch-size'
  },
  {
    label: '--ubatch-size',
    value: '--ubatch-size'
  },
  {
    label: '--keep',
    value: '--keep',
    options: ['0', '-1']
  },
  {
    label: '--escape',
    value: '--escape'
  },
  {
    label: '--samplers',
    value: '--samplers',
    options: []
  },
  {
    label: '--sampling-seq',
    value: '--sampling-seq'
  },
  {
    label: '--temp',
    value: '--temp'
  },
  {
    label: '--no-escape',
    value: '--no-escape'
  },
  {
    label: '--top-k',
    value: '--top-k'
  },
  {
    label: '--top-p',
    value: '--top-p'
  },
  {
    label: '--min-p',
    value: '--min-p'
  },
  {
    label: '--typical',
    value: '--typical'
  },
  {
    label: '--xtc-probability',
    value: '--xtc-probability'
  },
  {
    label: '--xtc-threshold',
    value: '--xtc-threshold'
  },
  {
    label: '--repeat-last-n',
    value: '--repeat-last-n'
  },
  {
    label: '--repeat-penalty',
    value: '--repeat-penalty'
  },
  {
    label: '--presence-penalty',
    value: '--presence-penalty'
  },
  {
    label: '--frequency-penalty',
    value: '--frequency-penalty'
  },
  {
    label: '--dry-multiplier',
    value: '--dry-multiplier'
  },
  {
    label: '--dry-base',
    value: '--dry-base'
  },
  {
    label: '--dry-allowed-length',
    value: '--dry-allowed-length'
  },
  {
    label: '--dry-penalty-last-n',
    value: '--dry-penalty-last-n'
  },
  {
    label: '--dry-sequence-breaker',
    value: '--dry-sequence-breaker'
  },
  {
    label: '--dynatemp-range',
    value: '--dynatemp-range'
  },
  {
    label: '--dynatemp-exp',
    value: '--dynatemp-exp'
  },
  {
    label: '--mirostat',
    value: '--mirostat',
    options: ['0', '1', '2']
  },
  {
    label: '--mirostat-lr',
    value: '--mirostat-lr'
  },
  {
    label: '--mirostat-ent',
    value: '--mirostat-ent'
  },
  {
    label: '--logit-bias',
    value: '--logit-bias'
  },
  {
    label: '--grammar',
    value: '--grammar'
  },
  {
    label: '--grammar-file',
    value: '--grammar-file'
  },
  {
    label: '--json-schema',
    value: '--json-schema'
  },
  {
    label: '--rope-scaling',
    value: '--rope-scaling',
    options: ['linear', 'yarn']
  },
  {
    label: '--rope-scale',
    value: '--rope-scale'
  },
  {
    label: '--rope-freq-base',
    value: '--rope-freq-base'
  },
  {
    label: '--rope-freq-scale',
    value: '--rope-freq-scale'
  },
  {
    label: '--yarn-orig-ctx',
    value: '--yarn-orig-ctx'
  },
  {
    label: '--yarn-ext-factor',
    value: '--yarn-ext-factor'
  },
  {
    label: '--yarn-attn-factor',
    value: '--yarn-attn-factor'
  },
  {
    label: '--yarn-beta-fast',
    value: '--yarn-beta-fast'
  },
  {
    label: '--yarn-beta-slow',
    value: '--yarn-beta-slow'
  },
  {
    label: '--no-kv-offload',
    value: '--no-kv-offload'
  },
  {
    label: '--no-cache-prompt',
    value: '--no-cache-prompt'
  },
  {
    label: '--cache-reuse',
    value: '--cache-reuse'
  },
  {
    label: '--cache-type-k',
    value: '--cache-type-k',
    options: [
      'f32',
      'f16',
      'bf16',
      'q8_0',
      'q4_0',
      'q4_1',
      'iq4_nl',
      'q5_0',
      'q5_1'
    ]
  },
  {
    label: '--cache-type-v',
    value: '--cache-type-v',
    options: [
      'f32',
      'f16',
      'bf16',
      'q8_0',
      'q4_0',
      'q4_1',
      'iq4_nl',
      'q5_0',
      'q5_1'
    ]
  },
  {
    label: '--defrag-thold',
    value: '--defrag-thold'
  },
  {
    label: '--no-cont-batching',
    value: '--no-cont-batching'
  },
  {
    label: '--mlock',
    value: '--mlock'
  },
  {
    label: '--no-mmap',
    value: '--no-mmap'
  },
  {
    label: '--mmap',
    value: '--mmap'
  },
  {
    label: '--visual-max-image-size',
    value: '--visual-max-image-size'
  },
  {
    label: '--images',
    value: '--images'
  },
  {
    label: '--model',
    value: '--model'
  },
  {
    label: '--image-max-batch',
    value: '--image-max-batch'
  },
  {
    label: '--image-max-height',
    value: '--image-max-height'
  },
  {
    label: '--image-max-width',
    value: '--image-max-width'
  },
  {
    label: '--image-guidance',
    value: '--image-guidance'
  },
  {
    label: '--image-strength',
    value: '--image-strength'
  },
  {
    label: '--image-sample-method',
    value: '--image-sample-method',
    options: [
      'euler_a',
      'euler',
      'heun',
      'dpm2',
      'dpm++2s_a',
      'dpm++2m',
      'dpm++2mv2',
      'ipndm',
      'ipndm_v',
      'lcm'
    ]
  },
  {
    label: '--image-sampling-steps',
    value: '--image-sampling-steps'
  },
  {
    label: '--image-cfg-scale',
    value: '--image-cfg-scale'
  },
  {
    label: '--image-slg-scale',
    value: '--image-slg-scale'
  },
  {
    label: '--image-slg-skip-layer',
    value: '--image-slg-skip-layer'
  },
  {
    label: '--image-slg-end',
    value: '--image-slg-end'
  },
  {
    label: '--image-clip-l-model',
    value: '--image-clip-l-model'
  },
  {
    label: '--image-clip-g-model',
    value: '--image-clip-g-model'
  },
  {
    label: '--image-t5xxl-model',
    value: '--image-t5xxl-model'
  },
  {
    label: '--image-schedule-method',
    value: '--image-schedule-method',
    options: ['default', 'discrete', 'karras', 'exponential', 'ays', 'gits']
  },
  {
    label: '--image-no-text-encoder-model-offload',
    value: '--image-no-text-encoder-model-offload'
  },
  {
    label: '--image-vae-model',
    value: '--image-vae-model'
  },
  {
    label: '--image-no-vae-model-offload',
    value: '--image-no-vae-model-offload'
  },
  {
    label: '--image-vae-tiling',
    value: '--image-vae-tiling'
  },
  {
    label: '--image-no-vae-tiling',
    value: '--image-no-vae-tiling'
  },
  {
    label: '--mmproj',
    value: '--mmproj'
  },
  {
    label: '--image-taesd-model',
    value: '--image-taesd-model'
  },
  {
    label: '--image-upscale-model',
    value: '--image-upscale-model'
  },
  {
    label: '--image-upscale-repeats',
    value: '--image-upscale-repeats'
  },
  {
    label: '--image-no-control-net-model-offload',
    value: '--image-no-control-net-model-offload'
  },
  {
    label: '--image-control-net-model',
    value: '--image-control-net-model'
  },
  {
    label: '--image-control-strength',
    value: '--image-control-strength'
  },
  {
    label: '--image-control-canny',
    value: '--image-control-canny'
  },
  {
    label: '--image-free-compute-memory-immediately',
    value: '--image-free-compute-memory-immediately'
  },
  {
    label: '--jinja',
    value: '--jinja'
  },
  {
    label: '--context-shift',
    value: '--context-shift'
  },
  {
    label: '--visual-max-image-cache',
    value: '--visual-max-image-cache'
  },
  {
    label: '--max-projected-cache',
    value: '--max-projected-cache'
  },
  {
    label: '--swa-full',
    value: '--swa-full'
  },
  {
    label: '--no-enable-reasoning',
    value: '--no-enable-reasoning'
  },
  {
    label: '--override-tensor',
    value: '--override-tensor'
  }
];

type LlamaParameterOption = (typeof options)[number];

const optionMap = new Map<string, LlamaParameterOption>(
  options.map((option) => [option.value, option])
);

const commonUnsupportedFlags = new Set([
  '--cache-list',
  '--completion-bash',
  '--help',
  '--list-buffer-types',
  '--list-devices',
  '--system-info',
  '--usage',
  '--version'
]);

const llamaBoxUnsupportedFlags = new Set([
  ...commonUnsupportedFlags,
  '--no-cont-batching',
  '--predict',
  '--sampling-seq',
  '--slot-prompt-similarity',
  '--slots',
  '--visual-max-image-cache'
]);

const llamaCppUnsupportedFlags = new Set([
  ...commonUnsupportedFlags,
  '--defrag-thold',
  '--draft',
  '--draft-max',
  '--draft-min',
  '--draft-n',
  '--draft-n-min',
  '--embeddings',
  '--image-cfg-scale',
  '--image-clip-g-model',
  '--image-clip-l-model',
  '--image-control-canny',
  '--image-control-net-model',
  '--image-control-strength',
  '--image-free-compute-memory-immediately',
  '--image-guidance',
  '--image-max-batch',
  '--image-max-height',
  '--image-max-width',
  '--image-no-control-net-model-offload',
  '--image-no-text-encoder-model-offload',
  '--image-no-vae-model-offload',
  '--image-no-vae-tiling',
  '--image-sample-method',
  '--image-sampling-steps',
  '--image-schedule-method',
  '--image-slg-end',
  '--image-slg-scale',
  '--image-slg-skip-layer',
  '--image-strength',
  '--image-t5xxl-model',
  '--image-taesd-model',
  '--image-upscale-model',
  '--image-upscale-repeats',
  '--image-vae-model',
  '--image-vae-tiling',
  '--images',
  '--max-projected-cache',
  '--no-enable-reasoning',
  '--no-warmup',
  '--rpc',
  '--spec-ngram-min-hits',
  '--spec-ngram-size-m',
  '--spec-ngram-size-n',
  '--tokens-per-second',
  '--visual-max-image-cache',
  '--visual-max-image-size'
]);

const llamaBoxAdditionalFlags = `
--alias
--attention
--chat-template-kwargs
--control-vector
--control-vector-layer-range
--control-vector-scaled
--cpu-moe
--cpu-moe-draft
--device-draft
--draft
--draft-max
--draft-min
--draft-n
--draft-n-min
--draft-p-min
--embeddings
--enable-reasoning
--gpu-layers-draft
--image-sample-steps
--image-sampler
--image-schedule
--image-slg-start
--kv-unified
--log-colors
--log-verbose
--log-verbosity
--lookup-ngram-min
--model-draft
--n-cpu-moe
--n-cpu-moe-draft
--n-gpu-layers
--n-gpu-layers-draft
--no-flash-attn
--no-reasoning-in-content
--no-repack
--numa
--override-tensor-draft
--pooling
--port
--priority
--reasoning-in-content
--rerank
--reverse-prompt
--rpc
--rpc-server-cache
--rpc-server-cache-dir
--rpc-server-host
--rpc-server-main-gpu
--rpc-server-port
--rpc-server-reserve-memory
--rpc-server-threads
--special
--top-nsigma
--warmup
`;

const llamaCppAdditionalFlags = `
--adaptive-decay
--adaptive-target
--agent
--alias
--api-key
--api-key-file
--api-prefix
--backend-sampling
--cache-idle-slots
--cache-prompt
--cache-ram
--cache-type-k-draft
--cache-type-v-draft
--chat-template-kwargs
--check-tensors
--checkpoint-min-step
--cont-batching
--control-vector
--control-vector-layer-range
--control-vector-scaled
--cpu-mask-batch-draft
--cpu-mask-draft
--cpu-moe
--cpu-moe-draft
--cpu-range-draft
--cpu-strict-batch-draft
--cpu-strict-draft
--ctx-checkpoints
--device-draft
--direct-io
--docker-repo
--draft-p-min
--draft-p-split
--embd-gemma-default
--embd-normalize
--embedding
--fim-qwen-1
--fim-qwen-14b-spec
--fim-qwen-30b-default
--fim-qwen-3b-default
--fim-qwen-7b-default
--fim-qwen-7b-spec
--fit
--fit-ctx
--fit-target
--gpt-oss-120b-default
--gpt-oss-20b-default
--gpu-layers-draft
--hf-file
--hf-file-v
--hf-repo
--hf-repo-draft
--hf-repo-v
--hf-token
--ignore-eos
--image-max-tokens
--image-min-tokens
--json-schema-file
--kv-offload
--kv-unified
--log-colors
--log-disable
--log-file
--log-prefix
--log-prompts-dir
--log-timestamps
--log-verbose
--log-verbosity
--lookup-cache-dynamic
--lookup-cache-static
--media-path
--mmproj-auto
--mmproj-offload
--mmproj-url
--model-draft
--model-url
--model-vocoder
--models-autoload
--models-dir
--models-max
--models-preset
--mtmd-batch-max-tokens
--n-cpu-moe
--n-cpu-moe-draft
--n-gpu-layers
--n-gpu-layers-draft
--n-predict
--no-agent
--no-cache-idle-slots
--no-direct-io
--no-host
--no-jinja
--no-kv-unified
--no-log-prefix
--no-log-timestamps
--no-mmproj
--no-mmproj-auto
--no-mmproj-offload
--no-models-autoload
--no-op-offload
--no-perf
--no-prefill-assistant
--no-reasoning-preserve
--no-repack
--no-skip-chat-parsing
--no-slots
--no-spec-draft-backend-sampling
--no-ui
--no-ui-mcp-proxy
--no-webui
--no-webui-mcp-proxy
--numa
--offline
--op-offload
--override-tensor-draft
--path
--perf
--poll-batch-draft
--poll-draft
--pooling
--port
--prefill-assistant
--prio-batch-draft
--prio-draft
--props
--reasoning
--reasoning-budget
--reasoning-budget-message
--reasoning-format
--reasoning-preserve
--repack
--rerank
--reranking
--reuse-port
--reverse-prompt
--sampler-seq
--skip-chat-parsing
--sleep-idle-seconds
--slot-prompt-similarity
--slot-save-path
--slots
--spec-default
--spec-draft-backend-sampling
--spec-draft-cpu-mask
--spec-draft-cpu-mask-batch
--spec-draft-cpu-moe
--spec-draft-cpu-range
--spec-draft-cpu-strict
--spec-draft-cpu-strict-batch
--spec-draft-device
--spec-draft-hf
--spec-draft-model
--spec-draft-n-cpu-moe
--spec-draft-n-max
--spec-draft-n-min
--spec-draft-ncmoe
--spec-draft-ngl
--spec-draft-override-tensor
--spec-draft-p-min
--spec-draft-p-split
--spec-draft-poll
--spec-draft-poll-batch
--spec-draft-prio
--spec-draft-prio-batch
--spec-draft-threads
--spec-draft-threads-batch
--spec-draft-type-k
--spec-draft-type-v
--spec-ngram-map-k-min-hits
--spec-ngram-map-k-size-m
--spec-ngram-map-k-size-n
--spec-ngram-map-k4v-min-hits
--spec-ngram-map-k4v-size-m
--spec-ngram-map-k4v-size-n
--spec-ngram-mod-n-match
--spec-ngram-mod-n-max
--spec-ngram-mod-n-min
--spec-ngram-simple-min-hits
--spec-ngram-simple-size-m
--spec-ngram-simple-size-n
--spec-type
--special
--spm-infill
--sse-ping-interval
--ssl-cert-file
--ssl-key-file
--swa-checkpoints
--tags
--temperature
--threads-batch-draft
--threads-draft
--tools
--top-n-sigma
--top-nsigma
--tts-use-guide-tokens
--typical-p
--ui
--ui-config
--ui-config-file
--ui-mcp-proxy
--vision-gemma-12b-default
--vision-gemma-4b-default
--warmup
--webui
--webui-config
--webui-config-file
--webui-mcp-proxy
`;

const splitFlags = (flags: string) => {
  return flags.trim().split(/\s+/).filter(Boolean);
};

const mergeFlags = (...flagGroups: string[][]) => {
  return Array.from(new Set(flagGroups.flat()));
};

const formatOptions = (
  flags: string[],
  unsupportedFlags: Set<string>
): Global.HintOptions[] => {
  return flags
    .filter((flag) => !unsupportedFlags.has(flag))
    .filter((flag) => !flag.endsWith('-'))
    .sort()
    .map((flag) => {
      const option = optionMap.get(flag);
      return {
        label: option?.label || flag,
        value: flag,
        opts: option?.options?.map((opt) => {
          return {
            label: opt,
            value: opt
          };
        })
      };
    });
};

const baseFlags = options.map((option) => option.value);

const llamaBoxConfig = formatOptions(
  mergeFlags(baseFlags, splitFlags(llamaBoxAdditionalFlags)),
  llamaBoxUnsupportedFlags
);

export const llamaCppConfig = formatOptions(
  mergeFlags(baseFlags, splitFlags(llamaCppAdditionalFlags)),
  llamaCppUnsupportedFlags
);

export default llamaBoxConfig;
