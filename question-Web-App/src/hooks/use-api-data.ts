import { useCallback, useEffect, useReducer, useRef } from "react";

type State<T> =
    | { status: "loading"; data: null; message: null }
    | { status: "success"; data: T; message: null }
    | { status: "error"; data: null; message: string };

type Action<T> =
    | { type: "START" }
    | { type: "SUCCESS"; data: T }
    | { type: "ERROR"; message: string };

function reducer<T>(_state: State<T>, action: Action<T>): State<T> {
    switch (action.type) {
        case "START":
            return { status: "loading", data: null, message: null };
        case "SUCCESS":
            return { status: "success", data: action.data, message: null };
        case "ERROR":
            return { status: "error", data: null, message: action.message };
    }
}

/**
 * Standard fetch hook used by all screens that consume the API.
 *
 * Provides:
 *   - Loading / success / error states
 *   - Abort of in-flight requests when the screen unmounts or dependencies change
 *   - Manual `refresh()` trigger
 *   - Opt-in `enabled` flag (so dependent queries can wait for parents)
 */
export function useApiData<T>(
    fetcher: () => Promise<T>,
    enabled: boolean = true,
): State<T> & { refresh: () => void } {
    const [state, dispatch] = useReducer(reducer<T>, {
        status: "loading",
        data: null,
        message: null,
    });

    // Monotonically increasing ID so out-of-order responses are dropped.
    const requestId = useRef(0);

    const run = useCallback(() => {
        if (!enabled) {
            dispatch({ type: "START" });
            return;
        }

        const id = ++requestId.current;
        dispatch({ type: "START" });

        fetcher()
            .then((data) => {
                if (id !== requestId.current) return;
                dispatch({ type: "SUCCESS", data });
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
        const reqRef = requestId;
        return () => {
            // Invalidate any in-flight request on unmount / dependency change.
            reqRef.current++;
        };
    }, [run]);

    const refresh = useCallback(() => {
        run();
    }, [run]);

    return { ...state, refresh };
}
