import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../services/api";

export interface DashboardStats {
    totalQuestions: number;
    totalSubjects: number;
    totalTopics: number;
}

export type StatsState =
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; data: DashboardStats };

export function useDashboardStats() {
    const [state, setState] = useState<StatsState>({ status: "loading" });

    const load = useCallback(async () => {
        setState({ status: "loading" });
        try {
            const data = await fetchApi<DashboardStats>("/api/dashboard/stats");
            setState({ status: "success", data });
        } catch (error) {
            setState({
                status: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to load statistics",
            });
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    return { state, reload: load };
}
