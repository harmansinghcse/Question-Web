import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../services/api";

export type ConnectionStatus = "checking" | "connected" | "disconnected";

export function useHealthCheck() {
    const [status, setStatus] = useState<ConnectionStatus>("checking");

    const checkHealth = useCallback(async () => {
        setStatus("checking");
        try {
            await fetchApi("/api/health");
            setStatus("connected");
        } catch (error) {
            setStatus("disconnected");
        }
    }, []);

    useEffect(() => {
        checkHealth();
    }, [checkHealth]);

    return { status, checkHealth };
}
