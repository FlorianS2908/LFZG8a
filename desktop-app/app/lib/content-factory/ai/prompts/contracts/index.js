const { curriculumPlanContract } = require('./curriculum-plan-contract');
const { dayDraftContract } = require('./day-draft-contract');
const { artifactSuggestionContract } = require('./artifact-suggestion-contract');
const { artifactContentContract } = require('./artifact-content-contract');
const { revisionContract } = require('./revision-contract');
const { reviewerContract } = require('./reviewer-contract');
const { jsonRepairContract } = require('./json-repair-contract');

const contracts = [
  curriculumPlanContract,
  dayDraftContract,
  artifactSuggestionContract,
  artifactContentContract,
  revisionContract,
  reviewerContract,
  jsonRepairContract
];

function getPromptContract(purpose) {
  return contracts.find((contract) => contract.purpose === purpose) || dayDraftContract;
}

module.exports = {
  contracts,
  getPromptContract
};
