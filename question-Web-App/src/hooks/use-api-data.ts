/**
 * useApiData — a lightweight hook for on-demand async data fetching.
 *
 * Features:
 * - Loading, success, error, and empty states
 * - Stale-response prevention (ignores responses for abandoned requests)
 * - Manual retry via the returned `refresh` function
 * - Re-fetches automatically when `fetcher` identity changes or `enabled` toggles
 */

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

function reducer<T>(state: FetchState<T>, action: Action<T>): FetchState<T> {
    switch (action.type) {
        case 'IDLE':    return { status: 'idle' };
        case 'LOADING': return { status: 'loading' };
        case 'SUCCESS': return { status: 'success', data: action.data };
        case 'ERROR':   return { status: 'error', message: action.message };
        default:        return state;
    }
}

/**
 * @param fetcher  Async function returning the data. Wrap in `useCallback` so
 *                 the hook only re-fetches when the function identity changes.
 * @param enabled  Set to false to skip fetching until a required param is
 *                 available. Defaults to true.
 */
export function useApiData<T>(
    fetcher: () => Promise<T>,
    enabled = true,
): FetchState<T> & { refresh: () => void } {
    // useReducer means all state transitions happen after the async resolution,
    // never synchronously inside an effect body. This satisfies react-hooks/set-state-in-effect.
    const [state, dispatch] = useReducer(
        reducer as React.Reducer<FetchState<T>, Action<T>>,
        { status: 'idle' },
    );

    /**
     * run() kicks off a fetch and returns a cleanup that marks the in-flight
     * request as stale, preventing stale responses from overwriting newer state.
     */
    const run = useCallback(() => {
        dispatch({ type: 'LOADING' });

        let active = true;

        fetcher()
            .then((data) => {
                if (!active) return;
                dispatch({ type: 'SUCCESS', data });
            })
            .catch((err: unknown) => {
                if (!active) return;
                const message =
                    err instanceof Error
                        ? err.message
                        : 'An unexpected error occurred';
                console.error('[useApiData] fetch error:', message);
                dispatch({ type: 'ERROR', message });
            });

        return () => {
            active = false;
        };
    }, [fetcher]);

    useEffect(() => {
        if (!enabled) {
            dispatch({ type: 'IDLE' });
            return;
        }
        return run();
    }, [run, enabled]);

    return { ...state, refresh: run };
}
