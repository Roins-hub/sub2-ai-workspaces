// Model positioning: https://developers.openai.com/api/docs/guides/image-prompting
export const IMAGE_MODEL_OPTIONS = [
  {
    id: 'gpt-image-2.5-flare',
    tag: '速度优先',
    description: '适合日常生图、快速试稿和批量探索；想更快看到效果，优先选 Flare。',
  },
  {
    id: 'gpt-image-2.5-sunburst',
    tag: '画质优先',
    description: '适合高要求成图、精细编辑和主体保留；更重视画质与修改准确性，选 Sunburst。',
  },
  {
    id: 'gpt-image-2.5',
    tag: '中转站别名',
    description: '按原始模型 ID 直接请求；只有在中转站明确支持此别名时才可使用。',
  },
  {
    id: 'gpt-image-2',
    tag: '原有模型',
    description: '适合继续使用已有提示词和工作流；需要保持原来的模型选择时使用。',
  },
] as const
