import type { FileAnalysis, WizardGapItem, WizardState } from './types.ts';

export function validateCourseData(state: WizardState): string[] {
  const errors: string[] = [];
  if (!state.course.courseName.trim()) errors.push('Kursname fehlt.');
  if (!state.course.courseId.trim()) errors.push('Kurs-ID fehlt.');
  if (state.course.courseId && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.course.courseId)) {
    errors.push('Kurs-ID darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
  }
  if (!state.course.department) errors.push('Fachbereich fehlt.');
  return errors;
}

export function hasCoursePlan(state: WizardState): boolean {
  return Boolean(state.coursePlan && state.coursePlan.days.length > 0);
}

export function hasMaterialUploads(state: WizardState): boolean {
  return state.uploadedFiles.some((file) => file.contentCategory !== 'course-plan' && !file.ignored);
}

export function getOpenReviewFiles(state: WizardState): FileAnalysis[] {
  return state.uploadedFiles.filter((file) => (
    !file.ignored
    && (file.blocked || file.needsReview)
    && !['confirmed', 'ignored', 'corrected'].includes(state.reviewStates[file.fileId])
  ));
}

export function reviewIsComplete(state: WizardState): boolean {
  return getOpenReviewFiles(state).length === 0;
}

export function getCriticalOpenGaps(state: WizardState): WizardGapItem[] {
  return state.gaps.filter((gap) => gap.severity === 'critical' && gap.state === 'open');
}

export function allNecessaryDaysReleased(state: WizardState): boolean {
  if (!state.mappings.length) return false;
  return state.mappings.every((mapping) => ['confirmed', 'skipped', 'released'].includes(state.dayApproval[mapping.dayNumber]));
}

export function allMappingDaysHandled(state: WizardState): boolean {
  if (!state.mappings.length) return false;
  return state.mappings.every((mapping) => ['confirmed', 'skipped'].includes(state.dayApproval[mapping.dayNumber]));
}

export function getExportWarnings(state: WizardState): string[] {
  const warnings: string[] = [];
  const openWarnings = state.gaps.filter((gap) => gap.state === 'open' && gap.severity !== 'critical');
  if (openWarnings.length) warnings.push('Es gibt noch offene Warnungen. Der Export erzeugt nur einen Draft.');
  if (!allNecessaryDaysReleased(state)) warnings.push('Nicht alle Tage wurden fuer den Draft bestaetigt.');
  return warnings;
}

export function validateParticipantAreaDoesNotContainSolutions(paths: string[]): string[] {
  return paths.filter((path) => /^teilnehmer[\\/].*loes|^teilnehmer[\\/].*lösung|^teilnehmer[\\/].*solution/i.test(path))
    .map((path) => `Loesung darf nicht im Teilnehmerbereich liegen: ${path}`);
}
