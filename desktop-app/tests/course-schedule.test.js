const assert = require('node:assert/strict');
const {
  COURSE_SCHEDULE,
  createBreakPopupState,
  dismissBreakPopup,
  getActiveBreakAt,
  updateBreakPopupState
} = require('../app/renderer/course-schedule');

function atTime(timeText) {
  const [hours, minutes] = timeText.split(':').map(Number);
  return new Date(2026, 0, 1, hours, minutes, 0, 0);
}

test('course schedule detects active breaks by local time', () => {
  assert.equal(getActiveBreakAt(atTime('09:59')), null);
  assert.equal(getActiveBreakAt(atTime('10:00')).id, 'break-1000');
  assert.equal(getActiveBreakAt(atTime('10:10')).id, 'break-1000');
  assert.equal(getActiveBreakAt(atTime('10:15')), null);
  assert.equal(getActiveBreakAt(atTime('11:45')).id, 'break-1145');
  assert.equal(getActiveBreakAt(atTime('12:14')).id, 'break-1145');
  assert.equal(getActiveBreakAt(atTime('12:15')), null);
  assert.equal(getActiveBreakAt(atTime('15:30')).id, 'break-1530');
});

test('course break popup state stays dismissed during one break and resets for the next break', () => {
  let popupState = createBreakPopupState();
  let result = updateBreakPopupState(popupState, atTime('10:00'), COURSE_SCHEDULE);
  assert.equal(result.activeBreak.id, 'break-1000');
  assert.equal(result.shouldShow, true);

  popupState = dismissBreakPopup(result.state, result.activeBreak.id, 'close');
  result = updateBreakPopupState(popupState, atTime('10:01'), COURSE_SCHEDULE);
  assert.equal(result.activeBreak.id, 'break-1000');
  assert.equal(result.shouldShow, false);

  result = updateBreakPopupState(result.state, atTime('10:15'), COURSE_SCHEDULE);
  assert.equal(result.activeBreak, null);
  assert.equal(result.endedBreak.id, 'break-1000');

  result = updateBreakPopupState(result.state, atTime('11:45'), COURSE_SCHEDULE);
  assert.equal(result.activeBreak.id, 'break-1145');
  assert.equal(result.shouldShow, true);
});
