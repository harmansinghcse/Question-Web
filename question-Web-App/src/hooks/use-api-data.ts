import type React from "react";
import { useCallback, useEffect, useReducer, useRef } from "react";

export type FetchState<T> =
    | { status: "idle" }
    | { status: "loading" }
    | { status: "success"; data: T }
    | { status: "error"; message: string };

type Action<T> =
    | { type: "IDLE" }
    | { type: "LOADING" }
    | { type: "SUCCESS"; data: T }
    | { type: "ERROR"; message: string };

function reducer<T>(state: FetchState<T>, action: Action<T>): FetchState<T> {
    switch (action.type) {
        case "IDLE":
            return { status: "idle" };
        case "LOADING":
            return { status: "loading" };
        case "SUCCESS":
            return { status: "success", data: action.data };
        case "ERROR":
            return { status: "error", message: action.message };
        default:
            return state;
    }
}

export function useApiData<T>(
    fetcher: () => Promise<T>,
    enabled = true,
): FetchState<T> & { refresh: () => void } {
    const [state, dispatch] = useReducer(
        reducer as React.Reducer<FetchState<T>, Action<T>>,
        { status: "idle" },
    );

    // Each request gets an id. Only the latest request may update state, so
    // stale responses (after a re-render, retry or unmount) are ignored.
    const requestId = useRef(0);

    const run = useCallback(() => {
        const id = ++requestId.current;

        if (!enabled) {
            dispatch({ type: "IDLE" });
            return;
        }

        dispatch({ type: "LOADING" });

        fetcher()
            .then((data) => {
                if (id === requestId.current) {
                    dispatch({ type: "SUCCESS", data });
                }
            })
            .catch((err: unknown) => {
                if (id !== requestId.current) return;

                const message =
                    err instanceof Error
                        ? err.message
                        : "An unexpected error occurred";

                console.warn("[useApiData] fetch error:", message);
                dispatch({ type: "ERROR", message });
            });
    }, [fetcher, enabled]);

    useEffect(() => {
        run();
        return () => {
            // Invalidate any in-flight request on unmount / dependency change.
            requestId.current++;
        };
    }, [run]);

    const refresh = useCallback(() => {
        run();
    }, [run]);

    return { ...state, refresh };
}
