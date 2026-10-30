import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useApiData } from "./use-api-data";
import { useAuth } from "../providers/AuthProvider";
import {
    api,
    type MyTimetable,
    type UpcomingExam,
} from "../services/api";
import { studyStorage } from "../services/study-storage";

/** Shape every screen/modal uses to render a remote resource. */
export interface ApiSlice<T> {
    status: "loading" | "success" | "error" | "unauthenticated";
    data: T | null;
    message: string | null;
    refresh: () => void;
}

/**
 * Loads the authenticated student's timetable and upcoming exams from the
 * backend (department / semester are resolved server-side from the token).
 *
 * - The only client-side input is the optional division, persisted locally.
 * - Data is re-fetched when the screen regains focus and when the division
 *   changes. Failures are surfaced (never replaced with fake data).
 */
export function useStudentSchedule() {
    const { isAuthenticated, isRestoring } = useAuth();
    const [division, setDivisionState] = useState<string | null>(null);
    const [divisionReady, setDivisionReady] = useState(false);

    useEffect(() => {
        let mounted = true;
        void studyStorage.getTimetableDivision().then((stored) => {
            if (!mounted) return;
            setDivisionState(stored);
            setDivisionReady(true);
        });
        return () => {
            mounted = false;
        };
    }, []);

    const fetchTimetable = useCallback(
        () => api.getMyTimetable(division ?? undefined),
        [division],
    );
    const fetchExams = useCallback(() => api.getUpcomingExams(), []);

    // Both endpoints are per-student: wait for the session to be restored and
    // never call them without a logged-in user (that would only yield a 401).
    const canFetch = isAuthenticated && !isRestoring;
    const timetable = useApiData<MyTimetable>(
        fetchTimetable,
        divisionReady && canFetch,
    );
    const exams = useApiData<UpcomingExam[]>(fetchExams, canFetch);

    const loggedOut = !isRestoring && !isAuthenticated;
    const loginRequired: ApiSlice<never> = {
        status: "unauthenticated",
        data: null,
        message: null,
        refresh: () => {},
    };

    // Drop a stored division the backend no longer recognises.
    useEffect(() => {
        if (
            timetable.status === "success" &&
            division &&
            timetable.data?.division !== division
        ) {
            void studyStorage.setTimetableDivision(null);
            queueMicrotask(() => {
                setDivisionState(null);
            });
        }
    }, [timetable.status, timetable.data, division]);

    const selectDivision = useCallback((next: string | null) => {
        void studyStorage.setTimetableDivision(next);
        setDivisionState(next);
    }, []);

    // Refresh whenever the screen is focused again (skip the initial focus,
    // which is already covered by the initial fetch).
    const timetableRefresh = useRef(timetable.refresh);
    const examsRefresh = useRef(exams.refresh);
    useEffect(() => {
        timetableRefresh.current = timetable.refresh;
        examsRefresh.current = exams.refresh;
    });
    const skipFirstFocus = useRef(true);
    useFocusEffect(
        useCallback(() => {
            if (skipFirstFocus.current) {
                skipFirstFocus.current = false;
                return;
            }
            timetableRefresh.current();
            examsRefresh.current();
        }, []),
    );

    return {
        timetable: (loggedOut
            ? loginRequired
            : timetable) as ApiSlice<MyTimetable>,
        exams: (loggedOut ? loginRequired : exams) as ApiSlice<UpcomingExam[]>,
        selectDivision,
    };
}

