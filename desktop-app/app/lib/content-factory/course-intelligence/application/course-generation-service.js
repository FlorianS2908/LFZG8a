'use strict';

const { compilePrompt } = require('../prompts/prompt-compiler');
const { getPromptContract } = require('../prompts/prompt-registry');

function createCourseGenerationService({ pipeline }) {
  if (!pipeline || typeof pipeline.execute !== 'function') throw new TypeError('GenerationPipeline fehlt.');
  return Object.freeze({
    async generateCoursePlan(input, options = {}) {
      const immutableInput = clone(input);
      const compiledPrompt = compilePrompt(getPromptContract('course_plan'), immutableInput);
      return pipeline.execute({
        compiledPrompt,
        responseSchema: { name: 'CoursePlanDraft', version: 'course-plan-v2' },
        abortSignal: options.signal,
        timeout: options.timeoutMs,
        operationId: options.operationId,
        model: options.model,
        metadata: { input: immutableInput, repairAttempt: Number(input?.repairAttempt || 0) }
      });
    }
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

module.exports = { createCourseGenerationService };
