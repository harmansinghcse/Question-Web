import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  COMPLETED_TOPICS: '@question-web/completed-topics',
  TODAY_GOALS: '@question-web/today-goals',
  SCHEDULE: '@question-web/today-schedule',
  EXAMS: '@question-web/upcoming-exams',
  STUDY_STATS: '@question-web/study-stats',
};

export interface StudyGoal {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  location: string;
  type?: 'lecture' | 'lab' | 'tutorial' | 'exam';
}

export interface ExamItem {
  id: string;
  subject: string;
  title: string;
  date: string; // ISO date YYYY-MM-DD
}

export interface StudyStats {
  totalMinutes: number;
  sessionsCompleted: number;
  lastStudyDate: string;
}

// Initial defaults tailored for SVNIT 2nd Year B.Tech students
const DEFAULT_GOALS: StudyGoal[] = [
  { id: '1', text: 'Complete DBMS Unit 2 (Relational Algebra)', completed: true, createdAt: new Date().toISOString() },
  { id: '2', text: 'Practise 10 MCQs on Indexing & B-Trees', completed: false, createdAt: new Date().toISOString() },
  { id: '3', text: 'Revise AI heuristic search notes', completed: false, createdAt: new Date().toISOString() },
];

const DEFAULT_SCHEDULE: ScheduleItem[] = [
  { id: '1', time: '10:00 AM', title: 'DBMS Lecture', location: 'Classroom 304', type: 'lecture' },
  { id: '2', time: '01:00 PM', title: 'DAA Tutorial', location: 'LT-2', type: 'tutorial' },
  { id: '3', time: '03:30 PM', title: 'DBMS Lab Session', location: 'Lab 5, 2nd Floor', type: 'lab' },
];

const DEFAULT_EXAMS: ExamItem[] = [
  { id: '1', subject: 'DBMS', title: 'Mid-Semester Examination', date: '2026-11-15' },
  { id: '2', subject: 'DAA', title: 'Design & Analysis of Algorithms', date: '2026-11-18' },
  { id: '3', subject: 'AI', title: 'Artificial Intelligence Quiz', date: '2026-11-22' },
];

export const studyStorage = {
  // ── Completed Topics (Syllabus Tracking) ───────────────────────────────────
  async getCompletedTopics(): Promise<Set<number>> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COMPLETED_TOPICS);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  },

  async setTopicCompleted(topicId: number, completed: boolean): Promise<Set<number>> {
    try {
      const set = await studyStorage.getCompletedTopics();
      if (completed) {
        set.add(topicId);
      } else {
        set.delete(topicId);
      }
      await AsyncStorage.setItem(
        STORAGE_KEYS.COMPLETED_TOPICS,
        JSON.stringify(Array.from(set)),
      );
      return set;
    } catch {
      return new Set();
    }
  },

  // ── Today's Goals ──────────────────────────────────────────────────────────
  async getGoals(): Promise<StudyGoal[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.TODAY_GOALS);
      if (!raw) {
        await AsyncStorage.setItem(STORAGE_KEYS.TODAY_GOALS, JSON.stringify(DEFAULT_GOALS));
        return DEFAULT_GOALS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_GOALS;
    }
  },

  async saveGoals(goals: StudyGoal[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TODAY_GOALS, JSON.stringify(goals));
    } catch (e) {
      console.warn('[studyStorage] Error saving goals', e);
    }
  },

  async toggleGoal(goalId: string): Promise<StudyGoal[]> {
    const goals = await studyStorage.getGoals();
    const updated = goals.map((g) => (g.id === goalId ? { ...g, completed: !g.completed } : g));
    await studyStorage.saveGoals(updated);
    return updated;
  },

  async addGoal(text: string): Promise<StudyGoal[]> {
    const goals = await studyStorage.getGoals();
    const newGoal: StudyGoal = {
      id: Date.now().toString(),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newGoal, ...goals];
    await studyStorage.saveGoals(updated);
    return updated;
  },

  async deleteGoal(goalId: string): Promise<StudyGoal[]> {
    const goals = await studyStorage.getGoals();
    const updated = goals.filter((g) => g.id !== goalId);
    await studyStorage.saveGoals(updated);
    return updated;
  },

  // ── Today's Schedule ───────────────────────────────────────────────────────
  async getSchedule(): Promise<ScheduleItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SCHEDULE);
      if (!raw) {
        await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(DEFAULT_SCHEDULE));
        return DEFAULT_SCHEDULE;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SCHEDULE;
    }
  },

  async addScheduleItem(item: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem[]> {
    const items = await studyStorage.getSchedule();
    const newItem: ScheduleItem = { ...item, id: Date.now().toString() };
    const updated = [...items, newItem];
    await AsyncStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(updated));
    return updated;
  },

  // ── Upcoming Exams ─────────────────────────────────────────────────────────
  async getExams(): Promise<ExamItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.EXAMS);
      if (!raw) {
        await AsyncStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(DEFAULT_EXAMS));
        return DEFAULT_EXAMS;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_EXAMS;
    }
  },

  async addExam(exam: Omit<ExamItem, 'id'>): Promise<ExamItem[]> {
    const exams = await studyStorage.getExams();
    const newExam: ExamItem = { ...exam, id: Date.now().toString() };
    const updated = [...exams, newExam];
    await AsyncStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(updated));
    return updated;
  },

  // ── Study Stats (Timer & Report) ───────────────────────────────────────────
  async getStudyStats(): Promise<StudyStats> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDY_STATS);
      if (!raw) {
        return { totalMinutes: 45, sessionsCompleted: 2, lastStudyDate: new Date().toISOString() };
      }
      return JSON.parse(raw);
    } catch {
      return { totalMinutes: 0, sessionsCompleted: 0, lastStudyDate: new Date().toISOString() };
    }
  },

  async recordStudySession(minutes: number): Promise<StudyStats> {
    const stats = await studyStorage.getStudyStats();
    const updated: StudyStats = {
      totalMinutes: stats.totalMinutes + minutes,
      sessionsCompleted: stats.sessionsCompleted + 1,
      lastStudyDate: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.STUDY_STATS, JSON.stringify(updated));
    return updated;
  },
};
