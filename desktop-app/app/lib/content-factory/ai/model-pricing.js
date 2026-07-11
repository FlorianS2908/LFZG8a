const MODEL_PRICING = {
  'gpt-5.4-mini': { inputPer1kUsd: 0.00015, outputPer1kUsd: 0.0006 },
  'gpt-4.1-mini': { inputPer1kUsd: 0.0004, outputPer1kUsd: 0.0016 },
  default: { inputPer1kUsd: 0.0005, outputPer1kUsd: 0.002 }
};

module.exports = {
  MODEL_PRICING
};
