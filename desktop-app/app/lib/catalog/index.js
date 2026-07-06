const { participantProjects, participantQuickLinks } = require('./participant-content');
const { teacherDays } = require('./teacher-days');
const { teacherProjects } = require('./teacher-projects');
const { teacherGuides, teacherQuickLinks } = require('./teacher-tools');

const courseCatalog = {
  teacher: {
    quickLinks: teacherQuickLinks,
    days: teacherDays,
    projects: teacherProjects,
    guides: teacherGuides
  },
  participant: {
    quickLinks: participantQuickLinks,
    projects: participantProjects
  }
};

function flattenCatalog(catalog = courseCatalog) {
  const teacher = catalog.teacher;
  const participant = catalog.participant;
  return [
    ...teacher.quickLinks.map((item) => item.path),
    ...teacher.days.flatMap((day) => [day.web, day.tasks, day.solutions, day.quiz25, day.quiz50]),
    ...teacher.projects.flatMap((project) => [project.overview, project.workspace, project.solution]),
    ...teacher.guides.map((item) => item.path),
    ...participant.quickLinks.map((item) => item.path),
    ...participant.projects.flatMap((project) => [project.overview, project.workspace])
  ].filter(Boolean);
}

module.exports = {
  courseCatalog,
  flattenCatalog
};
