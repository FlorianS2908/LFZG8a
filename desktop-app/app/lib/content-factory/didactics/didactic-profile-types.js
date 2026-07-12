const DIDACTIC_PROFILE_IDS = [
  'explain-demo-practice',
  'problem-first',
  'project-based',
  'worked-example-fading',
  'exam-training',
  'station-learning',
  'flipped-classroom',
  'guided-coding'
];

const DIDACTIC_REQUIRED_FIELDS = [
  'id',
  'label',
  'description',
  'teachingModel',
  'lessonFlow',
  'demoStrategy',
  'releaseStrategy',
  'taskProgression',
  'supportLevel',
  'assessmentMode',
  'reflectionMode',
  'socialForm'
];

module.exports = {
  DIDACTIC_PROFILE_IDS,
  DIDACTIC_REQUIRED_FIELDS
};
