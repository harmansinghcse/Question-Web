/**
 * Dynamic semester calculation and student email parser for SVNIT.
 *
 * College Email Format:
 *   U25CS044@coed.svnit.ac.in
 *   - U: Undergraduate student
 *   - 25: Year of admission (2025)
 *   - CS: Department code (Computer Science)
 *   - 044: Roll number digits
 */

export interface StudentProfile {
  isUndergraduate: boolean;
  admissionYear: number;
  deptCode: string;
  deptId?: number;
  rollNumber: string;
  rawSemester: number;
  currentSemester: number;
  isOddSemester: boolean;
  isGraduated: boolean;
  academicYearLabel: string;
}

export const DEPT_CODE_TO_ID: Record<string, number> = {
  CS: 1,
  CO: 1,
  AI: 2,
  DS: 2,
};

/**
 * Calculates current semester dynamically from admission year and current date.
 *
 * Calendar assumptions:
 * - Odd Semesters (1, 3, 5, 7): July 1 – December 31
 * - Even Semesters (2, 4, 6, 8): January 1 – June 30
 */
export function parseStudentEmail(
  email?: string | null,
  referenceDate: Date = new Date(),
): StudentProfile | null {
  if (!email || typeof email !== 'string') return null;

  const trimmed = email.trim();
  const match = trimmed.match(/^[uU](\d{2})([a-zA-Z]{2,4})(\d+)?@/);
  if (!match) return null;

  const rawYear = parseInt(match[1], 10);
  if (Number.isNaN(rawYear)) return null;

  const admissionYear = 2000 + rawYear;
  const deptCode = match[2].toUpperCase();
  const rollNumber = match[3] || '';

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0 = Jan, 6 = July

  const isOddSemester = currentMonth >= 6;
  const yearDiff = currentYear - admissionYear;

  let calculatedSemester: number;

  if (yearDiff < 0 || (yearDiff === 0 && !isOddSemester)) {
    calculatedSemester = 1;
  } else if (isOddSemester) {
    calculatedSemester = yearDiff * 2 + 1;
  } else {
    calculatedSemester = yearDiff * 2;
  }

  const isGraduated = calculatedSemester > 8;
  const currentSemester = Math.max(1, Math.min(8, calculatedSemester));

  const startYear = isOddSemester ? currentYear : currentYear - 1;
  const academicYearLabel = `${startYear}–${startYear + 1}`;

  return {
    isUndergraduate: true,
    admissionYear,
    deptCode,
    deptId: DEPT_CODE_TO_ID[deptCode],
    rollNumber,
    rawSemester: calculatedSemester,
    currentSemester,
    isOddSemester,
    isGraduated,
    academicYearLabel,
  };
}
