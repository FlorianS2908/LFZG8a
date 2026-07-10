export type LegacyNameFinding = {
  value: string;
  index: number;
  reason: string;
};

const legacyPatterns: Array<{ value: string; pattern: RegExp; reason: string }> = [
  { value: 'LFZQ8a', pattern: /LFZQ8a/g, reason: 'Legacy-Kurskennung aus der alten HTML/CSS-Kachel.' },
  { value: 'LFZG8a', pattern: /LFZG8a/g, reason: 'Legacy-Kurskennung aus frueheren Arbeitsstaenden.' },
  { value: 'LF10a', pattern: /LF10a/g, reason: 'Alter Kursname darf sichtbar nicht erhalten bleiben.' },
  { value: 'LF05', pattern: /LF05/g, reason: 'Alter Kursname darf sichtbar nicht erhalten bleiben, wenn der neue Kursname abweicht.' },
  { value: 'HTML/CSS', pattern: /HTML\/CSS/g, reason: 'Generischer HTML/CSS-Titel ohne Kurskontext.' }
];

export function detectLegacyNames(content: string, courseName: string): LegacyNameFinding[] {
  const findings: LegacyNameFinding[] = [];
  legacyPatterns.forEach((entry) => {
    if (entry.value === courseName || courseName.includes(entry.value)) return;
    for (const match of content.matchAll(entry.pattern)) {
      findings.push({ value: entry.value, index: match.index || 0, reason: entry.reason });
    }
  });
  return findings;
}

export function hasLegacyName(content: string, courseName: string): boolean {
  return detectLegacyNames(content, courseName).length > 0;
}
