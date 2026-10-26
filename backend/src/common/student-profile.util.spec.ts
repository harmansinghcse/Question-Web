import {
  parseStudentEmail,
  DEFAULT_ACADEMIC_CALENDAR_CONFIG,
} from './student-profile.util';

describe('parseStudentEmail', () => {
  it('correctly calculates semester 3 for U25CS044 in October 2026', () => {
    const testDate = new Date('2026-10-26T12:00:00Z');
    const result = parseStudentEmail('U25CS044@coed.svnit.ac.in', testDate);

    expect(result).not.toBeNull();
    expect(result?.isUndergraduate).toBe(true);
    expect(result?.admissionYear).toBe(2025);
    expect(result?.deptCode).toBe('CS');
    expect(result?.deptId).toBe(1);
    expect(result?.rollNumber).toBe('044');
    expect(result?.currentSemester).toBe(3);
    expect(result?.isOddSemester).toBe(true);
    expect(result?.isGraduated).toBe(false);
  });

  it('correctly calculates semester 2 for U25CS044 in Spring (March) 2026', () => {
    const testDate = new Date('2026-03-15T12:00:00Z');
    const result = parseStudentEmail('u25cs044@coed.svnit.ac.in', testDate);

    expect(result).not.toBeNull();
    expect(result?.currentSemester).toBe(2);
    expect(result?.isOddSemester).toBe(false);
  });

  it('correctly calculates semester 1 for incoming freshman in August 2025', () => {
    const testDate = new Date('2025-08-10T12:00:00Z');
    const result = parseStudentEmail('U25CS044@coed.svnit.ac.in', testDate);

    expect(result).not.toBeNull();
    expect(result?.currentSemester).toBe(1);
    expect(result?.isOddSemester).toBe(true);
  });

  it('correctly calculates semester 7 for batch 2023 in October 2026', () => {
    const testDate = new Date('2026-10-26T12:00:00Z');
    const result = parseStudentEmail('U23EC010@ece.svnit.ac.in', testDate);

    expect(result).not.toBeNull();
    expect(result?.admissionYear).toBe(2023);
    expect(result?.deptCode).toBe('EC');
    expect(result?.currentSemester).toBe(7);
    expect(result?.isOddSemester).toBe(true);
  });

  it('correctly identifies graduated status when beyond regular 8 semesters', () => {
    const testDate = new Date('2030-10-26T12:00:00Z');
    const result = parseStudentEmail('U22CS001@coed.svnit.ac.in', testDate);

    expect(result).not.toBeNull();
    expect(result?.isGraduated).toBe(true);
    expect(result?.currentSemester).toBe(8); // Clamped to 8
  });

  it('returns null for non-UG or unsupported email formats', () => {
    expect(parseStudentEmail('admin@svnit.ac.in')).toBeNull();
    expect(parseStudentEmail('p24cs001@coed.svnit.ac.in')).toBeNull();
    expect(parseStudentEmail('test.student@gmail.com')).toBeNull();
    expect(parseStudentEmail('')).toBeNull();
    expect(parseStudentEmail(null)).toBeNull();
    expect(parseStudentEmail(undefined)).toBeNull();
  });
});
