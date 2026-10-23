import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    // NestJS backend (global prefix "/api", default port 3000)
    const target = env.VITE_API_PROXY_TARGET || "http://localhost:3000";

    const proxy = {
        "/api": {
            target,
            changeOrigin: true,
        },
    };

    return {
        plugins: [react(), tailwindcss()],
        server: { proxy },
        preview: { proxy },
    };
});
