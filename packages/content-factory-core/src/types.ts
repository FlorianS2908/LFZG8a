export type DepartmentKey = 'FIAE' | 'FISI' | 'KABUE' | 'KITS' | 'ALLGEMEIN';

export type TechnicalType =
  | 'course-plan'
  | 'document'
  | 'presentation'
  | 'spreadsheet'
  | 'notebook'
  | 'web-document'
  | 'source-code'
  | 'database'
  | 'quiz'
  | 'image'
  | 'media'
  | 'archive'
  | 'asset'
  | 'unknown';

export type CodeLanguage =
  | 'html'
  | 'css'
  | 'javascript'
  | 'typescript'
  | 'php'
  | 'java'
  | 'csharp'
  | 'sql'
  | 'markdown'
  | 'json'
  | 'xml'
  | 'python'
  | 'unknown';

export type ContentCategory =
  | 'course-plan'
  | 'webvariant'
  | 'task'
  | 'solution'
  | 'handout'
  | 'presentation'
  | 'quiz'
  | 'project-scenario'
  | 'project-starter'
  | 'project-solution'
  | 'source-code'
  | 'database-schema'
  | 'database-seed'
  | 'database-query'
  | 'database-solution'
  | 'asset'
  | 'tool'
  | 'trainer-info'
  | 'participant-material'
  | 'other';

export type UploadArea =
  | 'course-plan'
  | 'ai-materials'
  | 'zip-package'
  | 'materials'
  | 'tasks'
  | 'solutions'
  | 'quiz'
  | 'project'
  | 'source-code'
  | 'database'
  | 'assets'
  | 'other';

export type UploadedFileDescriptor = {
  fileId?: string;
  fileName: string;
  relativePath?: string;
  size?: number;
  uploadArea?: UploadArea;
  contentText?: string;
};

export type CoursePlanDay = {
  dayNumber: number;
  title: string;
  mainTopic: string;
  subTopics: string[];
  learningGoals: string[];
  ue?: number;
  projectContext?: string;
  requiredOutputs?: string[];
  notes?: string;
};

export type CoursePlan = {
  courseTitle: string;
  courseId?: string;
  department?: DepartmentKey;
  days: CoursePlanDay[];
  warnings: string[];
  unclearRows: string[];
};

export type FileAnalysis = {
  fileId: string;
  fileName: string;
  sourcePath?: string;
  extension: string;
  technicalType: TechnicalType;
  language?: CodeLanguage;
  contentCategory: ContentCategory;
  detectedDay?: number;
  detectedTopics: string[];
  confidence: number;
  needsReview: boolean;
  warnings: string[];
  ignored?: boolean;
  blocked?: boolean;
};

export type DayMapping = {
  dayNumber: number;
  planDay: CoursePlanDay;
  files: FileAnalysis[];
  tasks: FileAnalysis[];
  solutions: FileAnalysis[];
  quizzes: FileAnalysis[];
  projectFiles: FileAnalysis[];
  sourceCode: FileAnalysis[];
  databaseFiles: FileAnalysis[];
  assets: FileAnalysis[];
  unclearFiles: FileAnalysis[];
  conflicts: string[];
};

export type GapAnalysis = {
  warnings: string[];
  conflicts: string[];
  gaps: string[];
  riskFiles: FileAnalysis[];
};

export type DayPreview = {
  dayNumber: number;
  title: string;
  html: string;
  warnings: string[];
  correctionText?: string;
};

export type VirtualFile = {
  path: string;
  content: string;
};

export type DraftContainer = {
  containerId: string;
  files: VirtualFile[];
  analysisReport: {
    importTime: string;
    courseName: string;
    courseId: string;
    department: DepartmentKey;
    fileCount: number;
    dayCount: number;
    taskCount: number;
    solutionCount: number;
    quizCount: number;
    projectFileCount: number;
    warnings: string[];
    conflicts: string[];
    gaps: string[];
    exportedPath: string;
  };
};

export type CourseMode = 'daily' | 'project';

export type CourseMetadata = {
  courseName: string;
  courseId: string;
  department?: DepartmentKey;
  mode: CourseMode;
  description?: string;
};

export type WizardStepId =
  | 'course-data'
  | 'course-plan'
  | 'uploads'
  | 'review'
  | 'day-mapping'
  | 'gap-analysis'
  | 'day-preview'
  | 'approval'
  | 'export';

export type WizardStepStatus = 'open' | 'active' | 'done' | 'warning' | 'error' | 'locked';

export type WizardFileReviewState = 'open' | 'confirmed' | 'ignored' | 'corrected';

export type WizardGapState = 'open' | 'ignored' | 'later' | 'reassigned' | 'fallback-allowed' | 'material-needed';

export type WizardGapSeverity = 'critical' | 'important' | 'info' | 'auto' | 'review';

export type WizardGapItem = {
  id: string;
  message: string;
  severity: WizardGapSeverity;
  state: WizardGapState;
  dayNumber?: number;
  fileId?: string;
};

export type DayApprovalState = 'open' | 'confirmed' | 'skipped' | 'released';

export type WizardState = {
  activeStep: WizardStepId;
  course: CourseMetadata;
  coursePlan?: CoursePlan;
  coursePlanConfirmed: boolean;
  uploadedFiles: FileAnalysis[];
  analysisCompleted: boolean;
  reviewStates: Record<string, WizardFileReviewState>;
  mappings: DayMapping[];
  dayApproval: Record<number, DayApprovalState>;
  gaps: WizardGapItem[];
  previews: DayPreview[];
  draft?: DraftContainer;
  allowDraftWithOpenWarnings: boolean;
};

export type StepGateResult = {
  step: WizardStepId;
  label: string;
  status: WizardStepStatus;
  accessible: boolean;
  missing: string[];
};

export type UploadCategoryDefinition = {
  area: UploadArea;
  title: string;
  description: string;
  examples: string[];
  accept: string[];
  safetyNote?: string;
};
