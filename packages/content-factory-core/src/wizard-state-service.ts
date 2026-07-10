import type { CourseMetadata, WizardState } from './types.ts';

export const wizardStepOrder = [
  'course-data',
  'course-plan',
  'uploads',
  'review',
  'day-mapping',
  'gap-analysis',
  'day-preview',
  'approval',
  'export'
] as const;

export const wizardStepLabels: Record<(typeof wizardStepOrder)[number], string> = {
  'course-data': 'Kursdaten',
  'course-plan': 'Unterrichtsplan',
  uploads: 'Uploads',
  review: 'Pruefung',
  'day-mapping': 'Zuordnung',
  'gap-analysis': 'Luecken',
  'day-preview': 'Vorschau',
  approval: 'Freigabe',
  export: 'Export'
};

export function createEmptyWizardState(course: Partial<CourseMetadata> = {}): WizardState {
  return {
    activeStep: 'course-data',
    course: {
      courseName: course.courseName || '',
      courseId: course.courseId || '',
      department: course.department,
      mode: course.mode || 'daily',
      description: course.description || ''
    },
    coursePlanConfirmed: false,
    uploadedFiles: [],
    analysisCompleted: false,
    reviewStates: {},
    mappings: [],
    dayApproval: {},
    gaps: [],
    previews: [],
    allowDraftWithOpenWarnings: false
  };
}

export function createCourseIdSuggestion(courseName: string): string {
  return courseName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'kurscontainer';
}
