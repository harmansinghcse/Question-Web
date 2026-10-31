import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
    COMPLETED_TOPICS: "@question-web/completed-topics",
    TODAY_GOALS: "@question-web/today-goals",
    STUDY_STATS: "@question-web/study-stats",
    TIMETABLE_DIVISION: "@question-web/timetable-division",
    STUDY_REMINDERS: "@question-web/study-reminders",
};

export interface StudyGoal {
    id: string;
    text: string;
    completed: boolean;
    createdAt: string;
}

export interface StudyReminder {
    id: string;
    title: string;
    time: string;
    active: boolean;
    createdAt: string;
}

export interface StudyStats {
    totalMinutes: number;
    sessionsCompleted: number;
    lastStudyDate: string;
}

// Goals seeded by older app versions. They were placeholder data, so they are
// stripped from storage instead of being shown to the user.
const LEGACY_SEED_GOALS: { id: string; text: string }[] = [
    { id: "1", text: "Complete DBMS Unit 2 (Relational Algebra)" },
    { id: "2", text: "Practise 10 MCQs on Indexing & B-Trees" },
    { id: "3", text: "Revise AI heuristic search notes" },
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
            if (!raw) return [];
            const parsed = JSON.parse(raw) as StudyGoal[];
            if (!Array.isArray(parsed)) return [];
            const cleaned = parsed.filter(
                (g) =>
                    !LEGACY_SEED_GOALS.some(
                        (l) => l.id === g.id && l.text === g.text,
                    ),
            );
            if (cleaned.length !== parsed.length) {
                await AsyncStorage.setItem(
                    STORAGE_KEYS.TODAY_GOALS,
                    JSON.stringify(cleaned),
                );
            }
            return cleaned;
        } catch {
            return [];
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
                    totalMinutes: 0,
                    sessionsCompleted: 0,
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

    // === Study Reminders ===
    async getReminders(): Promise<StudyReminder[]> {
        try {
            const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDY_REMINDERS);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as StudyReminder[];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    },
    async saveReminders(reminders: StudyReminder[]): Promise<void> {
        try {
            await AsyncStorage.setItem(
                STORAGE_KEYS.STUDY_REMINDERS,
                JSON.stringify(reminders),
            );
        } catch (e) {
            console.warn("[studyStorage] Error saving reminders", e);
        }
    },
    async toggleReminder(id: string): Promise<StudyReminder[]> {
        const reminders = await studyStorage.getReminders();
        const updated = reminders.map((r) =>
            r.id === id ? { ...r, active: !r.active } : r,
        );
        await studyStorage.saveReminders(updated);
        return updated;
    },
    async addReminder(title: string, time: string): Promise<StudyReminder[]> {
        const reminders = await studyStorage.getReminders();
        const newReminder: StudyReminder = {
            id: Date.now().toString(),
            title: title.trim(),
            time: time.trim() || "08:00 PM",
            active: true,
            createdAt: new Date().toISOString(),
        };
        const updated = [newReminder, ...reminders];
        await studyStorage.saveReminders(updated);
        return updated;
    },
    async deleteReminder(id: string): Promise<StudyReminder[]> {
        const reminders = await studyStorage.getReminders();
        const updated = reminders.filter((r) => r.id !== id);
        await studyStorage.saveReminders(updated);
        return updated;
    },
};
