'use strict';

const contracts = Object.freeze({
  course_plan: Object.freeze({
    id: 'course-plan',
    version: '2.0.0',
    schemaName: 'CoursePlanDraft',
    system: 'Du erzeugst ausschließlich valides JSON für einen Unterrichtsplan.',
    rules: Object.freeze([
      'Halte Tage, Unterrichtseinheiten, IDs, Nummerierungen und Dauer des ueScaffold exakt ein.',
      'Fülle topic, content, competencyGoal, workFormat, sourceReferences, warnings, assumptions, originStatus, confidence und reviewStatus.',
      'workFormat ist ein Objekt {key,label}. key ist genau einer von lecture, demonstration, guided_practice, individual, pair, group, project, self_study oder assessment.',
      'Unterrichtsmodus (online, praesenz, hybrid), Betreuung, Arbeitsform und Methode sind getrennte Angaben; verwende für workFormat ausschließlich die konkrete Sozial- oder Arbeitsform der UE.',
      'materialRequirements bleiben fachneutral und beschreiben Materialart, Herkunft, Zielformat, Werkzeugbedarf, Automatisierbarkeit und Prüfbedarf.',
      'Kennzeichne Ergänzungen als generated und löse Konflikte nicht stillschweigend.',
      'Teilnehmermaterial darf keine Lösungen enthalten.',
      'Gib summary, days, excludedTopics, unscheduledTopics, conflicts, missingInformation, warnings und reviewItems zurück.'
    ])
  })
});

function getPromptContract(id) {
  const contract = contracts[id];
  if (!contract) throw new Error(`Unbekannter Prompt-Contract: ${id}`);
  return contract;
}

module.exports = { getPromptContract };
