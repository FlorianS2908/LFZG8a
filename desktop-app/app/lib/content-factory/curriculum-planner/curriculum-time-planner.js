function normalizeDuration(input = {}) {
  const durationMode = input.durationMode || 'days';
  const hoursPerDay = Number(input.hoursPerDay || 8);
  const uePerDay = Number(input.uePerDay || 9);
  const ueMinutes = Number(input.ueMinutes || 45);
  let numberOfDays = Number(input.numberOfDays || 5);
  let totalHours = Number(input.totalHours || 0);
  let totalUE = Number(input.totalUE || 0);
  if (durationMode === 'hours' && totalHours > 0) {
    numberOfDays = Math.max(1, Math.ceil(totalHours / hoursPerDay));
    totalUE = Math.ceil((totalHours * 60) / ueMinutes);
  } else if (durationMode === 'ue' && totalUE > 0) {
    numberOfDays = Math.max(1, Math.ceil(totalUE / uePerDay));
    totalHours = Math.round((totalUE * ueMinutes / 60) * 10) / 10;
  } else {
    totalUE = numberOfDays * uePerDay;
    totalHours = numberOfDays * hoursPerDay;
  }
  return {
    durationMode,
    numberOfDays,
    hoursPerDay,
    uePerDay,
    ueMinutes,
    totalHours,
    totalUE,
    pauseModel: input.pauseModel || 'default'
  };
}

function distributeTopics(topics = [], duration = {}) {
  const normalized = normalizeDuration(duration);
  const days = Array.from({ length: normalized.numberOfDays }, (_, index) => ({
    dayNumber: index + 1,
    title: `Tag ${index + 1}`,
    mainTopic: '',
    estimatedUE: 0,
    estimatedHours: normalized.hoursPerDay,
    learningGoals: [],
    topics: [],
    practiceBlocks: [],
    quizPlanned: true,
    projectContextPlanned: false,
    warnings: []
  }));
  topics.forEach((topic, index) => {
    const day = days[index % days.length];
    const order = day.topics.length + 1;
    day.topics.push({ ...topic, order });
    day.estimatedUE += Number(topic.estimatedUE || 1);
    if (!day.mainTopic) day.mainTopic = topic.title;
    day.learningGoals.push(`${topic.title} verstehen und anwenden.`);
  });
  days.forEach((day) => {
    if (!day.topics.length) day.warnings.push('Tag ist noch leer.');
    if (day.estimatedUE > normalized.uePerDay) day.warnings.push('Tag ist moeglicherweise ueberladen.');
    day.title = `Tag ${day.dayNumber} - ${day.mainTopic || 'Thema ergaenzen'}`;
  });
  return { duration: normalized, days };
}

module.exports = {
  normalizeDuration,
  distributeTopics
};
