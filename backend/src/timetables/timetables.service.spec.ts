import { TimetablesService } from './timetables.service';
import { Timetable } from './entities/timetable.entity';

function makeTimetable(
  id: number,
  division: string,
  academicYear: string,
): Timetable {
  return {
    timetableId: id,
    deptId: 1,
    semester: 3,
    division,
    academicYear,
    isActive: true,
  } as Timetable;
}

describe('TimetablesService.findStudentSchedule', () => {
  function build(candidates: Timetable[]) {
    const timetableRepo = {
      find: jest.fn().mockResolvedValue(candidates),
      findOne: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve({
          ...candidates.find((c) => c.timetableId === where.timetableId),
          entries: [],
        }),
      ),
    };
    const service = new TimetablesService(
      timetableRepo as never,
      {} as never,
      {} as never,
    );
    return { service, timetableRepo };
  }

  it('returns the only division automatically', async () => {
    const { service } = build([makeTimetable(1, 'A', '2026-27')]);
    const res = await service.findStudentSchedule({ deptId: 1, semester: 3 });
    expect(res.divisions).toEqual(['A']);
    expect(res.division).toBe('A');
    expect(res.timetable?.timetableId).toBe(1);
  });

  it('does not guess a division when several exist', async () => {
    const { service } = build([
      makeTimetable(1, 'A', '2026-27'),
      makeTimetable(2, 'B', '2026-27'),
    ]);
    const res = await service.findStudentSchedule({ deptId: 1, semester: 3 });
    expect(res.divisions).toEqual(['A', 'B']);
    expect(res.division).toBeNull();
    expect(res.timetable).toBeNull();
  });

  it('honours an explicit (case-insensitive) division', async () => {
    const { service } = build([
      makeTimetable(1, 'A', '2026-27'),
      makeTimetable(2, 'B', '2026-27'),
    ]);
    const res = await service.findStudentSchedule({
      deptId: 1,
      semester: 3,
      division: ' b ',
    });
    expect(res.division).toBe('B');
    expect(res.timetable?.timetableId).toBe(2);
  });

  it('ignores an unknown division and older academic years', async () => {
    const { service } = build([
      makeTimetable(5, 'A', '2026-27'),
      makeTimetable(4, 'C', '2025-26'),
    ]);
    const res = await service.findStudentSchedule({
      deptId: 1,
      semester: 3,
      division: 'C',
    });
    expect(res.divisions).toEqual(['A']);
    expect(res.division).toBeNull();
    expect(res.timetable).toBeNull();
  });

  it('returns an explicit empty result when nothing is published', async () => {
    const { service } = build([]);
    const res = await service.findStudentSchedule({ deptId: 1, semester: 3 });
    expect(res).toEqual({ divisions: [], division: null, timetable: null });
  });
});

