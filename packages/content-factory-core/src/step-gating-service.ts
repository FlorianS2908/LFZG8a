import type { StepGateResult, WizardState, WizardStepId, WizardStepStatus } from './types.ts';
import { wizardStepLabels, wizardStepOrder } from './wizard-state-service.ts';
import {
  allMappingDaysHandled,
  allNecessaryDaysReleased,
  getCriticalOpenGaps,
  getOpenReviewFiles,
  hasCoursePlan,
  reviewIsComplete,
  validateCourseData
} from './validation-service.ts';

export function getStepGate(state: WizardState, step: WizardStepId): StepGateResult {
  const missing = getMissingRequirements(state, step);
  const accessible = missing.length === 0;
  return {
    step,
    label: wizardStepLabels[step],
    accessible,
    missing,
    status: getStepStatus(state, step, accessible)
  };
}

export function getAllStepGates(state: WizardState): StepGateResult[] {
  return wizardStepOrder.map((step) => getStepGate(state, step));
}

export function getMissingRequirements(state: WizardState, step: WizardStepId): string[] {
  const missing: string[] = [];
  if (step === 'course-data') return missing;
  if (validateCourseData(state).length) missing.push('Bitte Kursname, Kurs-ID und Fachbereich vollstaendig ausfuellen.');
  if (step === 'course-plan') return missing;
  if (!hasCoursePlan(state)) missing.push('Bitte laden Sie zuerst einen gueltigen Unterrichtsplan hoch.');
  if (!state.coursePlanConfirmed) missing.push('Bitte bestaetigen Sie den Unterrichtsplan.');
  if (step === 'uploads') return missing;
  if (step === 'review') return missing;
  if (!state.analysisCompleted) missing.push('Bitte fuehren Sie zuerst die Dateianalyse aus.');
  if (step === 'day-mapping') return missing;
  if (!reviewIsComplete(state)) missing.push(`${getOpenReviewFiles(state).length} unklare oder blockierte Datei(en) muessen bestaetigt, korrigiert oder ignoriert werden.`);
  if (!allMappingDaysHandled(state)) missing.push('Bitte bestaetigen Sie alle Tageszuordnungen oder markieren Sie einzelne Tage bewusst als spaeter pruefen.');
  if (step === 'gap-analysis') return missing;
  if (getCriticalOpenGaps(state).length) missing.push('Bitte behandeln Sie zuerst alle kritischen Luecken.');
  if (step === 'day-preview') return missing;
  if (!state.previews.length) missing.push('Bitte erzeugen Sie mindestens einen Tagesentwurf.');
  if (step === 'approval') return missing;
  if (!allNecessaryDaysReleased(state) && !state.allowDraftWithOpenWarnings) {
    missing.push('Bitte geben Sie alle notwendigen Tage frei oder waehlen Sie bewusst Draft mit offenen Punkten exportieren.');
  }
  return missing;
}

function getStepStatus(state: WizardState, step: WizardStepId, accessible: boolean): WizardStepStatus {
  if (!accessible) return 'locked';
  if (state.activeStep === step) return 'active';
  if (step === 'course-data' && validateCourseData(state).length) return 'error';
  if (step === 'review' && getOpenReviewFiles(state).length) return 'warning';
  if (step === 'gap-analysis' && getCriticalOpenGaps(state).length) return 'error';
  if (step === 'gap-analysis' && state.gaps.length && !getCriticalOpenGaps(state).length) return 'done';
  if (step === 'export' && state.allowDraftWithOpenWarnings) return 'warning';
  return isDone(state, step) ? 'done' : 'open';
}

function isDone(state: WizardState, step: WizardStepId): boolean {
  if (step === 'course-data') return validateCourseData(state).length === 0;
  if (step === 'course-plan') return hasCoursePlan(state) && state.coursePlanConfirmed;
  if (step === 'uploads') return hasCoursePlan(state) && state.coursePlanConfirmed;
  if (step === 'review') return state.analysisCompleted && reviewIsComplete(state);
  if (step === 'day-mapping') return allMappingDaysHandled(state);
  if (step === 'gap-analysis') return state.gaps.every((gap) => gap.state !== 'open' || gap.severity !== 'critical');
  if (step === 'day-preview') return state.previews.length > 0;
  if (step === 'approval') return allNecessaryDaysReleased(state);
  if (step === 'export') return Boolean(state.draft);
  return false;
}
