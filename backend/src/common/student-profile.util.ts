/**
 * Academic Calendar configuration and institutional student email parser.
 * Institutional Email Format:
 *   [U|u][2-digit admission year][2-4 letter department code][roll digits]@domain
 *   Example: U25CS044@coed.svnit.ac.in
 *     - U   = Undergraduate (B.Tech)
 *     - 25  = 2025 Admission batch
 *     - CS  = Computer Science and Engineering
 *     - 044 = Roll number portion
 */

export interface AcademicCalendarConfig {
  /** Month index (0 = Jan, 6 = July) when the Odd semester (Autumn term) begins. Default: 6 (July) */
  oddSemesterStartMonth: number;
  /** Month index (0 = Jan) when the Even semester (Spring term) begins. Default: 0 (January) */
  evenSemesterStartMonth: number;
  /** Maximum regular semesters for an undergraduate degree. Default: 8 */
  maxUndergraduateSemesters: number;
}

export const DEFAULT_ACADEMIC_CALENDAR_CONFIG: AcademicCalendarConfig = {
  oddSemesterStartMonth: 6, // July
  evenSemesterStartMonth: 0, // January
  maxUndergraduateSemesters: 8,
};

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

/**
 * Standard department code alias mapping to primary department code abbreviations.
 */
export const DEPARTMENT_CODE_ALIASES: Record<string, string> = {
  CS: 'CS',
  CSE: 'CS',
  CO: 'CS',
  COED: 'CS',
  AI: 'AI',
  AIDS: 'AI',
  DS: 'AI',
  EC: 'EC',
  ECE: 'EC',
  EE: 'EE',
  EEE: 'EE',
  ME: 'ME',
  MECH: 'ME',
  CE: 'CE',
  CIVIL: 'CE',
  CH: 'CH',
  CHEM: 'CH',
};

/**
 * Extracts student academic information from institutional email.
 * Preserves admission year, department code, and semester calculations.
 */
export function parseStudentEmail(
  email?: string | null,
  now: Date = new Date(),
  config: AcademicCalendarConfig = DEFAULT_ACADEMIC_CALENDAR_CONFIG,
): StudentProfile | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim();
  const match = trimmed.match(/^[uU](\d{2})([a-zA-Z]{2,4})(\d+)?@/);
  if (!match) {
    return null;
  }

  const rawYear = parseInt(match[1], 10);
  if (Number.isNaN(rawYear)) {
    return null;
  }

  const admissionYear = 2000 + rawYear;
  const rawDeptCode = match[2].toUpperCase();
  const deptCode = DEPARTMENT_CODE_ALIASES[rawDeptCode] ?? rawDeptCode;
  const rollNumber = match[3] || '';

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const isOddSemester = currentMonth >= config.oddSemesterStartMonth;
  const yearDiff = currentYear - admissionYear;

  let calculatedSemester: number;
  if (yearDiff < 0 || (yearDiff === 0 && !isOddSemester)) {
    calculatedSemester = 1;
  } else if (isOddSemester) {
    calculatedSemester = yearDiff * 2 + 1;
  } else {
    calculatedSemester = yearDiff * 2;
  }

  const isGraduated = calculatedSemester > config.maxUndergraduateSemesters;
  const currentSemester = Math.max(
    1,
    Math.min(config.maxUndergraduateSemesters, calculatedSemester),
  );

  const startYear = isOddSemester ? currentYear : currentYear - 1;
  const academicYearLabel = `${startYear}-${startYear + 1}`;

  return {
    isUndergraduate: true,
    admissionYear,
    deptCode,
    rollNumber,
    rawSemester: calculatedSemester,
    currentSemester,
    isOddSemester,
    isGraduated,
    academicYearLabel,
  };
}
