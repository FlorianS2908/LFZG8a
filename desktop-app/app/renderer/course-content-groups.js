(function registerCourseContentGroups(global) {
  function getTeacherTools(catalog) {
    return catalog.teacher.quickLinks.filter((item) => item.kind === 'Tool');
  }

  function getTeacherSupportItems(catalog) {
    return [...catalog.teacher.guides, ...getTeacherTools(catalog)];
  }

  function getTeacherProjects(catalog) {
    return catalog.teacher.projects;
  }

  function getParticipantProjects(catalog) {
    return catalog.participant.projects;
  }

  function getTeacherDays(catalog) {
    return catalog.teacher.days;
  }

  global.LFZQ8aCourseContent = {
    getParticipantProjects,
    getTeacherDays,
    getTeacherProjects,
    getTeacherSupportItems,
    getTeacherTools
  };
})(window);
