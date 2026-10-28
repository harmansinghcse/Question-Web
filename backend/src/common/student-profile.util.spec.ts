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
    expect(result?.rollNumber).toBe('044');
    expect(result?.currentSemester).toBe(3);
    expect(result?.isOddSemester).toBe(true);
    expect(result?.isGraduated).toBe(false);
  });

  it('correctly maps CSE and COED alias to CS department code', () => {
    const testDate = new Date('2026-10-26T12:00:00Z');
    const res1 = parseStudentEmail('u25cse099@coed.svnit.ac.in', testDate);
    expect(res1?.deptCode).toBe('CS');

    const res2 = parseStudentEmail('u25coed100@svnit.ac.in', testDate);
    expect(res2?.deptCode).toBe('CS');
  });

  it('correctly maps ECE alias to EC department code', () => {
    const testDate = new Date('2026-10-26T12:00:00Z');
    const result = parseStudentEmail('U23ECE010@ece.svnit.ac.in', testDate);
    expect(result?.deptCode).toBe('EC');
    expect(result?.admissionYear).toBe(2023);
    expect(result?.currentSemester).toBe(7);
  });

  it('correctly calculates semester 2 for U25CS044 in March 2026', () => {
    const testDate = new Date('2026-03-15T12:00:00Z');
    const result = parseStudentEmail('u25cs044@coed.svnit.ac.in', testDate);
    expect(result?.currentSemester).toBe(2);
    expect(result?.isOddSemester).toBe(false);
  });

  it('returns null for non-UG or unsupported email formats', () => {
    expect(parseStudentEmail('admin@svnit.ac.in')).toBeNull();
    expect(parseStudentEmail('test.student@gmail.com')).toBeNull();
    expect(parseStudentEmail('')).toBeNull();
    expect(parseStudentEmail(null)).toBeNull();
  });
});
