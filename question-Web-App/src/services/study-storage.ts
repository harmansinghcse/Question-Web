import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
    COMPLETED_TOPICS: "@question-web/completed-topics",
    TODAY_GOALS: "@question-web/today-goals",
    STUDY_STATS: "@question-web/study-stats",
    TIMETABLE_DIVISION: "@question-web/timetable-division",
};

export interface StudyGoal {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
}

export interface StudyStats {
    totalMinutes: number;
    sessionsCompleted: number;
    lastStudyDate: string;
}

// Initial defaults tailored for SVNIT students
const DEFAULT_GOALS: StudyGoal[] = [
    {
        id: "1",
        text: "Complete DBMS Unit 2 (Relational Algebra)",
        completed: true,
        createdAt: new Date().toISOString(),
    },
    {
        id: "2",
        text: "Practise 10 MCQs on Indexing & B-Trees",
        completed: false,
        createdAt: new Date().toISOString(),
    },
    {
        id: "3",
        text: "Revise AI heuristic search notes",
        completed: false,
        createdAt: new Date().toISOString(),
    },
];

export const studyStorage = {
    // === Completed Topics (Syllabus Tracking) ===
    async getCompletedTopics(): Promise<Set<number>> {
        try {
            const raw = await AsyncStorage.getItem(
                STORAGE_KEYS.COMPLETED_TOPICS,
            );
            if (!raw) return new Set();
            const arr = JSON.parse(raw);
            return new Set(Array.isArray(arr) ? arr : []);
        } catch {
            return new Set();
        }
    },
    async setTopicCompleted(
        topicId: number,
        completed: boolean,
    ): Promise<Set<number>> {
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

    // === Today's Goals ===
    async getGoals(): Promise<StudyGoal[]> {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.TODAY_GOALS);
            if (!raw) {
                await AsyncStorage.setItem(
                    STORAGE_KEYS.TODAY_GOALS,
                    JSON.stringify(DEFAULT_GOALS),
                );
                return DEFAULT_GOALS;
            }
            return JSON.parse(raw);
        } catch {
            return DEFAULT_GOALS;
        }
    },
    async saveGoals(goals: StudyGoal[]): Promise<void> {
        try {
            await AsyncStorage.setItem(
                STORAGE_KEYS.TODAY_GOALS,
                JSON.stringify(goals),
            );
        } catch (e) {
            console.warn("[studyStorage] Error saving goals", e);
        }
    },
    async toggleGoal(goalId: string): Promise<StudyGoal[]> {
        const goals = await studyStorage.getGoals();
        const updated = goals.map((g) =>
            g.id === goalId ? { ...g, completed: !g.completed } : g,
        );
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

    // === Timetable division (view filter only; the backend resolves department/semester) ===
    async getTimetableDivision(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.TIMETABLE_DIVISION);
        } catch {
            return null;
        }
    },
    async setTimetableDivision(division: string | null): Promise<void> {
        try {
            if (division) {
                await AsyncStorage.setItem(
                    STORAGE_KEYS.TIMETABLE_DIVISION,
                    division,
                );
            } else {
                await AsyncStorage.removeItem(STORAGE_KEYS.TIMETABLE_DIVISION);
            }
        } catch (e) {
            console.warn("[studyStorage] Error saving division", e);
        }
    },

    // === Study Stats (Timer & Report) ===
    async getStudyStats(): Promise<StudyStats> {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDY_STATS);
            if (!raw) {
                return {
                    totalMinutes: 45,
                    sessionsCompleted: 2,
                    lastStudyDate: new Date().toISOString(),
                };
            }
            return JSON.parse(raw);
        } catch {
            return {
                totalMinutes: 0,
                sessionsCompleted: 0,
                lastStudyDate: new Date().toISOString(),
            };
        }
    },
    async recordStudySession(minutes: number): Promise<StudyStats> {
        const stats = await studyStorage.getStudyStats();
        const updated: StudyStats = {
            totalMinutes: stats.totalMinutes + minutes,
            sessionsCompleted: stats.sessionsCompleted + 1,
            lastStudyDate: new Date().toISOString(),
        };
        await AsyncStorage.setItem(
            STORAGE_KEYS.STUDY_STATS,
            JSON.stringify(updated),
        );
        return updated;
    },
};
