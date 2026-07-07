(function registerCourseSchedule(globalScope) {
  const COURSE_SCHEDULE = {
    start: '08:30',
    end: '16:30',
    breaks: [
      { id: 'break-1000', label: 'Vormittagspause', start: '10:00', end: '10:15' },
      { id: 'break-1145', label: 'Mittagspause', start: '11:45', end: '12:15' },
      { id: 'break-1345', label: 'Nachmittagspause', start: '13:45', end: '14:00' },
      { id: 'break-1530', label: 'Nachmittagspause', start: '15:30', end: '15:45' }
    ]
  };

  const MAX_TOTAL_BREAK_MINUTES = 75;

  function parseTimeToMinutes(timeText) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(timeText || ''));
    if (!match) {
      return 0;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) {
      return 0;
    }
    return (hours * 60) + minutes;
  }

  function normalizeBreaks(breaksInput) {
    if (!Array.isArray(breaksInput)) {
      return [];
    }

    const normalizedBreaks = breaksInput
      .map((breakData, index) => {
        const start = String(breakData?.start || '').trim();
        const end = String(breakData?.end || '').trim();
        const startMinutes = parseTimeToMinutes(start);
        const endMinutes = parseTimeToMinutes(end);
        if (!start || !end || endMinutes <= startMinutes) {
          return null;
        }
        const duration = endMinutes - startMinutes;
        return {
          id: String(breakData?.id || `custom-break-${index + 1}`),
          label: String(breakData?.label || `Pause ${index + 1}`).trim() || `Pause ${index + 1}`,
          start,
          end,
          duration
        };
      })
      .filter(Boolean);

    const totalMinutes = normalizedBreaks.reduce((sum, breakData) => sum + breakData.duration, 0);
    if (totalMinutes > MAX_TOTAL_BREAK_MINUTES) {
      return [];
    }

    return normalizedBreaks
      .map(({ duration, ...breakData }) => breakData)
      .sort((first, second) => parseTimeToMinutes(first.start) - parseTimeToMinutes(second.start));
  }

  function createSchedule(settings = {}) {
    const breaks = normalizeBreaks(settings.breaks);
    return {
      ...COURSE_SCHEDULE,
      breaks: breaks.length ? breaks : COURSE_SCHEDULE.breaks
    };
  }

  function minutesFromDate(date) {
    return (date.getHours() * 60) + date.getMinutes();
  }

  function enrichBreak(breakData, nowMinutes) {
    const startMinutes = parseTimeToMinutes(breakData.start);
    const endMinutes = parseTimeToMinutes(breakData.end);
    return {
      ...breakData,
      startMinutes,
      endMinutes,
      remainingMinutes: Math.max(0, endMinutes - nowMinutes)
    };
  }

  function getActiveBreakAt(date = new Date(), schedule = COURSE_SCHEDULE) {
    const nowMinutes = minutesFromDate(date);
    const activeBreak = schedule.breaks.find((breakData) => {
      const startMinutes = parseTimeToMinutes(breakData.start);
      const endMinutes = parseTimeToMinutes(breakData.end);
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    });
    return activeBreak ? enrichBreak(activeBreak, nowMinutes) : null;
  }

  function getUpcomingBreakWarning(date = new Date(), schedule = COURSE_SCHEDULE, warningMinutes = 5) {
    const nowMinutes = minutesFromDate(date);
    const upcomingBreak = schedule.breaks.find((breakData) => {
      const startMinutes = parseTimeToMinutes(breakData.start);
      return nowMinutes < startMinutes && startMinutes - nowMinutes <= warningMinutes;
    });
    return upcomingBreak ? enrichBreak(upcomingBreak, nowMinutes) : null;
  }

  function createBreakPopupState() {
    return {
      activeBreakId: null,
      dismissedBreakId: null,
      hiddenUntilEndBreakId: null,
      lastEndedBreakId: null
    };
  }

  function findBreakById(schedule, breakId) {
    return schedule.breaks.find((breakData) => breakData.id === breakId) || null;
  }

  function updateBreakPopupState(state = createBreakPopupState(), date = new Date(), schedule = COURSE_SCHEDULE) {
    const activeBreak = getActiveBreakAt(date, schedule);
    const nextState = {
      ...state,
      lastEndedBreakId: null
    };

    if (!activeBreak) {
      const endedBreak = state.activeBreakId ? findBreakById(schedule, state.activeBreakId) : null;
      return {
        state: {
          ...nextState,
          activeBreakId: null,
          dismissedBreakId: null,
          hiddenUntilEndBreakId: null,
          lastEndedBreakId: endedBreak?.id || null
        },
        activeBreak: null,
        endedBreak,
        shouldShow: false
      };
    }

    if (state.activeBreakId !== activeBreak.id) {
      nextState.activeBreakId = activeBreak.id;
      nextState.dismissedBreakId = null;
      nextState.hiddenUntilEndBreakId = null;
    }

    return {
      state: nextState,
      activeBreak,
      endedBreak: null,
      shouldShow: nextState.dismissedBreakId !== activeBreak.id && nextState.hiddenUntilEndBreakId !== activeBreak.id
    };
  }

  function dismissBreakPopup(state, breakId, mode = 'close') {
    if (mode === 'hide-until-end') {
      return {
        ...state,
        hiddenUntilEndBreakId: breakId
      };
    }
    return {
      ...state,
      dismissedBreakId: breakId
    };
  }

  const api = {
    COURSE_SCHEDULE,
    MAX_TOTAL_BREAK_MINUTES,
    createSchedule,
    createBreakPopupState,
    dismissBreakPopup,
    getActiveBreakAt,
    getUpcomingBreakWarning,
    minutesFromDate,
    parseTimeToMinutes,
    updateBreakPopupState
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.LFZQ8aCourseSchedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
