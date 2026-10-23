import { useState } from "react";
import { useHealthCheck } from "./hooks/useHealthCheck";
import { useDashboardStats } from "./hooks/useDashboardStats";
import AddQuestionForm from "./components/AddQuestionForm";

const NAV_ACTIVE =
    "flex items-center gap-3 px-3 py-2 rounded-md bg-neutral-800 text-neutral-100 font-medium border-l-2 border-red-500 transition-colors";
const NAV_IDLE =
    "flex items-center gap-3 px-3 py-2 rounded-md text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-colors";

export default function App() {
    const { status, checkHealth } = useHealthCheck();
    const { state: stats, reload: reloadStats } = useDashboardStats();
    const [view, setView] = useState<"dashboard" | "add">("dashboard");

    const cards = [
        { label: "Total Questions", key: "totalQuestions", accent: "bg-red-500/80" },
        { label: "Subjects", key: "totalSubjects", accent: "bg-red-500/40" },
        { label: "Topics", key: "totalTopics", accent: "bg-red-500/40" },
    ] as const;

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex">
            {/* Sidebar */}
            <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-red-900/40 border border-red-500/50 flex items-center justify-center text-red-500 font-bold">
                            Q
                        </div>
                        <h1 className="text-lg font-semibold tracking-wide text-neutral-100">
                            Question Web
                        </h1>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <a
                        href="#"
                        aria-current={view === "dashboard" ? "page" : undefined}
                        onClick={(e) => {
                            e.preventDefault();
                            setView("dashboard");
                        }}
                        className={view === "dashboard" ? NAV_ACTIVE : NAV_IDLE}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-red-500"
                        >
                            <rect width="7" height="9" x="3" y="3" rx="1" />
                            <rect width="7" height="5" x="14" y="3" rx="1" />
                            <rect width="7" height="9" x="14" y="12" rx="1" />
                            <rect width="7" height="5" x="3" y="16" rx="1" />
                        </svg>
                        Dashboard
                    </a>
                    <a
                        href="#"
                        aria-current={view === "add" ? "page" : undefined}
                        onClick={(e) => {
                            e.preventDefault();
                            setView("add");
                        }}
                        className={view === "add" ? NAV_ACTIVE : NAV_IDLE}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 12h8" />
                            <path d="M12 8v8" />
                        </svg>
                        Add Question
                    </a>
                    <a
                        href="#"
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 6h18" />
                            <path d="M3 12h18" />
                            <path d="M3 18h18" />
                        </svg>
                        Manage Questions
                    </a>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="h-16 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-medium text-neutral-100">
                            Overview
                        </h2>

                        {/* Connection Status Badge */}
                        <div className="flex items-center gap-2">
                            {status === "checking" && (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse"></span>
                                    Checking API...
                                </span>
                            )}
                            {status === "connected" && (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Connected
                                </span>
                            )}
                            {status === "disconnected" && (
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-900/20 px-2.5 py-1 rounded-full border border-red-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        Disconnected
                                    </span>
                                    <button
                                        onClick={checkHealth}
                                        className="text-xs text-neutral-400 hover:text-white transition-colors underline decoration-neutral-600 underline-offset-2"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 cursor-pointer group">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">
                                Admin User
                            </p>
                            <p className="text-xs text-neutral-500">
                                admin@questionweb.local
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:border-neutral-500 transition-colors">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {view === "add" ? (
                        <AddQuestionForm />
                    ) : (
                    <div className="max-w-6xl mx-auto space-y-8">
                        <div>
                            <h3 className="text-2xl font-semibold text-neutral-100">
                                Welcome to Question Web
                            </h3>
                            <p className="text-neutral-400 mt-1">
                                Manage your computer science question
                                repository.
                            </p>
                        </div>

                        {stats.status === "error" && (
                            <div
                                role="alert"
                                className="flex flex-wrap items-center justify-between gap-3 bg-red-900/20 border border-red-500/30 rounded-xl px-5 py-4"
                            >
                                <div>
                                    <p className="text-sm font-medium text-red-400">
                                        Couldn't load dashboard statistics
                                    </p>
                                    <p className="text-xs text-neutral-400 mt-0.5">
                                        {stats.message}
                                    </p>
                                </div>
                                <button
                                    onClick={reloadStats}
                                    className="text-sm font-medium text-red-300 bg-red-900/30 hover:bg-red-900/50 border border-red-500/40 px-3 py-1.5 rounded-md transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {cards.map(({ label, key, accent }) => (
                                <div
                                    key={key}
                                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden"
                                >
                                    <div
                                        className={`absolute top-0 left-0 w-1 h-full ${accent}`}
                                    ></div>
                                    <p className="text-sm font-medium text-neutral-400 mb-1">
                                        {label}
                                    </p>
                                    {stats.status === "loading" && (
                                        <div
                                            aria-label="Loading"
                                            className="h-9 w-24 rounded bg-neutral-800 animate-pulse"
                                        ></div>
                                    )}
                                    {stats.status === "error" && (
                                        <p className="text-3xl font-semibold text-neutral-600">
                                            —
                                        </p>
                                    )}
                                    {stats.status === "success" && (
                                        <p className="text-3xl font-semibold text-neutral-100">
                                            {stats.data[key].toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="border-2 border-dashed border-neutral-800 bg-neutral-900/50 rounded-xl p-12 flex flex-col items-center justify-center text-center mt-4">
                            <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-500 mb-4">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M12 2v20" />
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            </div>
                            <h4 className="text-lg font-medium text-neutral-200">
                                Dashboard functionality pending
                            </h4>
                            <p className="text-neutral-500 mt-2 max-w-sm">
                                Interactive statistics, charts, and recent
                                activity will be implemented in subsequent
                                phases.
                            </p>
                        </div>
                    </div>
                    )}
                </div>
            </main>
        </div>
    );
}
