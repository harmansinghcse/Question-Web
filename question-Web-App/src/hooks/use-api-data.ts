
import type React from 'react';
import { useCallback, useEffect, useReducer } from 'react';

export type FetchState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; message: string };

type Action<T> =
    | { type: 'IDLE' }
    | { type: 'LOADING' }
    | { type: 'SUCCESS'; data: T }
    | { type: 'ERROR'; message: string };

function reducer<T>(
    state: FetchState<T>,
    action: Action<T>,
): FetchState<T> {
    switch (action.type) {
        case 'IDLE':
            return { status: 'idle' };
        case 'LOADING':
            return { status: 'loading' };
        case 'SUCCESS':
            return { status: 'success', data: action.data };
        case 'ERROR':
            return { status: 'error', message: action.message };
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
        { status: 'idle' },
    );

    const run = useCallback(() => {
        if (!enabled) {
            dispatch({ type: 'IDLE' });
            return;
        }

        let active = true;

        dispatch({ type: 'LOADING' });

        fetcher()
            .then((data) => {
                if (active) {
                    dispatch({ type: 'SUCCESS', data });
                }
            })
            .catch((err: unknown) => {
                if (!active) return;

                const message =
                    err instanceof Error
                        ? err.message
                        : 'An unexpected error occurred';

                console.error('[useApiData] fetch error:', err);
                dispatch({ type: 'ERROR', message });
            });

        return () => {
            active = false;
        };
    }, [fetcher, enabled]);

    useEffect(() => {
        return run();
    }, [run]);

    const refresh = useCallback(() => {
        // Retry the request without waiting for a dependency change.
        run();
    }, [run]);

    return { ...state, refresh };
}
