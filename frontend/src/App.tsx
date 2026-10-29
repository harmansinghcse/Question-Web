import React, { useState } from "react";
import { useHealthCheck } from "./hooks/useHealthCheck";
import { useDashboardStats } from "./hooks/useDashboardStats";
import AddQuestionForm from "./components/AddQuestionForm";
import ExamManagement from "./components/ExamManagement";
import BookManagement from "./components/BookManagement";
import SourceManagement from "./components/SourceManagement";
import QuizRevision from "./components/QuizRevision";
import QuizAdminManagement from "./components/QuizAdminManagement";
import PromptStudio from "./components/PromptStudio";
import UpcomingExamManagement from "./components/UpcomingExamManagement";
import TimetableManagement from "./components/TimetableManagement";

type ViewSection =
    | "overview"
    | "revision"
    | "quiz-admin"
    | "prompt-studio"
    | "questions"
    | "exams"
    | "books"
    | "sources"
    | "upcoming-exams"
    | "timetables";

const NAV_ACTIVE =
    "flex items-center gap-3 px-3 py-2 rounded-md bg-neutral-800 text-neutral-100 font-medium border-l-2 border-red-500 transition-colors";
const NAV_IDLE =
    "flex items-center gap-3 px-3 py-2 rounded-md text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-colors";

export default function App() {
    const { status: healthStatus, checkHealth } = useHealthCheck();
    const { state: stats, reload: loadStats } = useDashboardStats();

    const [view, setView] = useState<ViewSection>("overview");

    const handleRetry = () => {
        checkHealth();
        loadStats();
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex">
            {/* Sidebar - Removed conflicting 'flex' class, keeping 'hidden md:flex' */}
            <aside className="w-64 bg-neutral-900 border-r border-neutral-800 hidden md:flex flex-col shrink-0">
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

                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {/* 1. Overview */}
                    <a
                        href="#overview"
                        aria-current={view === "overview" ? "page" : undefined}
                        onClick={(e) => {
                            e.preventDefault();
                            setView("overview");
                        }}
                        className={view === "overview" ? NAV_ACTIVE : NAV_IDLE}
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
                            className={
                                view === "overview" ? "text-red-500" : ""
                            }
                        >
                            <rect width="7" height="9" x="3" y="3" rx="1" />
                            <rect width="7" height="5" x="14" y="3" rx="1" />
                            <rect width="7" height="9" x="14" y="12" rx="1" />
                            <rect width="7" height="5" x="3" y="16" rx="1" />
                        </svg>
                        Overview
                    </a>

                    {/* Academic Organization */}
                    <div className="pt-4 pb-1">
                        <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            Academics
                        </p>
                    </div>

                    <a
                        href="#timetables"
                        aria-current={
                            view === "timetables" ? "page" : undefined
                        }
                        onClick={(e) => {
                            e.preventDefault();
                            setView("timetables");
                        }}
                        className={
                            view === "timetables" ? NAV_ACTIVE : NAV_IDLE
                        }
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
                            className={
                                view === "timetables" ? "text-red-500" : ""
                            }
                        >
                            <rect
                                x="3"
                                y="4"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                            />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Timetables
                    </a>

                    <a
                        href="#upcoming-exams"
                        aria-current={
                            view === "upcoming-exams" ? "page" : undefined
                        }
                        onClick={(e) => {
                            e.preventDefault();
                            setView("upcoming-exams");
                        }}
                        className={
                            view === "upcoming-exams" ? NAV_ACTIVE : NAV_IDLE
                        }
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
                            className={
                                view === "upcoming-exams" ? "text-red-500" : ""
                            }
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Upcoming Exams
                    </a>

                    {/* Student Tools */}
                    <div className="pt-4 pb-1">
                        <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            Student Tools
                        </p>
                    </div>

                    <a
                        href="#revision"
                        aria-current={view === "revision" ? "page" : undefined}
                        onClick={(e) => {
                            e.preventDefault();
                            setView("revision");
                        }}
                        className={view === "revision" ? NAV_ACTIVE : NAV_IDLE}
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
                            className={
                                view === "revision" ? "text-red-500" : ""
                            }
                        >
                            <circle cx="12" cy="12" r="10" />
                            <polygon points="10 8 16 12 10 16 10 8" />
                        </svg>
                        <span>Quiz Revision</span>
                    </a>

                    <a
                        href="#prompt-studio"
                        aria-current={
                            view === "prompt-studio" ? "page" : undefined
                        }
                        onClick={(e) => {
                            e.preventDefault();
                            setView("prompt-studio");
                        }}
                        className={
                            view === "prompt-studio" ? NAV_ACTIVE : NAV_IDLE
                        }
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
                            className={
                                view === "prompt-studio" ? "text-red-500" : ""
                            }
                        >
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                        </svg>
                        <span>Prompt Studio</span>
                    </a>

                    {/* Database Management */}
                    <div className="pt-4 pb-1">
                        <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                            Database
                        </p>
                    </div>

                    <a
                        href="#questions"
                        aria-current={view === "questions" ? "page" : undefined}
                        onClick={(e) => {
                            e.preventDefault();
                            setView("questions");
                        }}
                        className={view === "questions" ? NAV_ACTIVE : NAV_IDLE}
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
                            className={
                                view === "questions" ? "text-red-500" : ""
                            }
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 12h8" />
                            <path d="M12 8v8" />
                        </svg>
                        Question Entry
                    </a>

                    <a
                        href="#quiz-admin"
                        aria-current={
                            view === "quiz-admin" ? "page" : undefined
                        }
                        onClick={(e) => {
                            e.preventDefault();
                            setView("quiz-admin");
                        }}
                        className={
                            view === "quiz-admin" ? NAV_ACTIVE : NAV_IDLE
                        }
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
                            className={
                                view === "quiz-admin" ? "text-red-500" : ""
                            }
                        >
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                            <polyline points="10 2 10 10 13 7 16 10 16 2" />
                        </svg>
                        Quiz Question Bank
                    </a>

                    <a
                        href="#exams"
                        aria-current={view === "exams" ? "page" : undefined}
                        onClick={(e) => {
                            e.preventDefault();
                            setView("exams");
                        }}
                        className={view === "exams" ? NAV_ACTIVE : NAV_IDLE}
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
                            className={view === "exams" ? "text-red-500" : ""}
                        >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                        Exam Source Mgmt
                    </a>

                    <a
                        href="#books"
                        aria-current={view === "books" ? "page" : undefined}
                        onClick={(e) => {
                            e.preventDefault();
                            setView("books");
                        }}
                        className={view === "books" ? NAV_ACTIVE : NAV_IDLE}
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
                            className={view === "books" ? "text-red-500" : ""}
                        >
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                            <path d="M6 6h10" />
                            <path d="M6 10h10" />
                        </svg>
                        Book Source Mgmt
                    </a>

                    <a
                        href="#sources"
                        aria-current={view === "sources" ? "page" : undefined}
                        onClick={(e) => {
                            e.preventDefault();
                            setView("sources");
                        }}
                        className={view === "sources" ? NAV_ACTIVE : NAV_IDLE}
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
                            className={view === "sources" ? "text-red-500" : ""}
                        >
                            <rect
                                width="20"
                                height="8"
                                x="2"
                                y="2"
                                rx="2"
                                ry="2"
                            />
                            <rect
                                width="20"
                                height="8"
                                x="2"
                                y="14"
                                rx="2"
                                ry="2"
                            />
                            <line x1="6" y1="6" x2="6.01" y2="6" />
                            <line x1="6" y1="18" x2="6.01" y2="18" />
                        </svg>
                        Source Records
                    </a>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top Bar */}
                <header className="h-16 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-medium text-neutral-100">
                            {view === "overview" && "Dashboard Overview"}
                            {view === "timetables" && "Timetable Management"}
                            {view === "upcoming-exams" && "Upcoming Exams"}
                            {view === "revision" && "Quiz-Based Revision"}
                            {view === "quiz-admin" && "Quiz Question Bank"}
                            {view === "prompt-studio" && "Prompt Studio"}
                            {view === "questions" && "Question Entry"}
                            {view === "exams" && "Exam Source Mgmt"}
                            {view === "books" && "Book Source Mgmt"}
                            {view === "sources" && "Source Management"}
                        </h2>

                        {/* Connection Status Badge */}
                        <div className="flex items-center gap-2">
                            {healthStatus === "checking" && (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse"></span>
                                    Checking API...
                                </span>
                            )}
                            {healthStatus === "connected" && (
                                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    Connected
                                </span>
                            )}
                            {healthStatus === "disconnected" && (
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-900/20 px-2.5 py-1 rounded-full border border-red-500/30">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        Disconnected
                                    </span>
                                    <button
                                        onClick={handleRetry}
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
                    {view === "revision" && <QuizRevision />}
                    {view === "quiz-admin" && <QuizAdminManagement />}
                    {view === "prompt-studio" && <PromptStudio />}
                    {view === "questions" && <AddQuestionForm />}
                    {view === "exams" && <ExamManagement />}
                    {view === "books" && <BookManagement />}
                    {view === "sources" && <SourceManagement />}
                    {view === "upcoming-exams" && <UpcomingExamManagement />}
                    {view === "timetables" && <TimetableManagement />}

                    {view === "overview" && (
                        <div className="max-w-6xl mx-auto space-y-8">
                            <div>
                                <h3 className="text-2xl font-semibold text-neutral-100">
                                    Welcome to Question Web
                                </h3>
                                <p className="text-neutral-400 mt-1">
                                    Live database statistics from your MySQL
                                    repository.
                                </p>
                            </div>

                            {/* Error Banner if Stats fail */}
                            {stats.status === "error" && (
                                <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 flex items-center justify-between text-red-200 text-sm">
                                    <span>
                                        Failed to load live statistics:{" "}
                                        {stats.message}
                                    </span>
                                    <button
                                        onClick={loadStats}
                                        className="px-3 py-1 bg-red-800/50 hover:bg-red-800 rounded text-white font-medium transition-colors"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {/* Summary Cards with Real Counts */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80"></div>
                                    <p className="text-sm font-medium text-neutral-400 mb-1">
                                        Total Questions
                                    </p>
                                    {stats.status === "loading" ? (
                                        <div className="h-9 w-20 bg-neutral-800 animate-pulse rounded mt-1"></div>
                                    ) : stats.status === "success" ? (
                                        <p className="text-3xl font-semibold text-neutral-100">
                                            {stats.data.totalQuestions.toLocaleString()}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500/40"></div>
                                    <p className="text-sm font-medium text-neutral-400 mb-1">
                                        Subjects
                                    </p>
                                    {stats.status === "loading" ? (
                                        <div className="h-9 w-20 bg-neutral-800 animate-pulse rounded mt-1"></div>
                                    ) : stats.status === "success" ? (
                                        <p className="text-3xl font-semibold text-neutral-100">
                                            {stats.data.totalSubjects.toLocaleString()}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500/40"></div>
                                    <p className="text-sm font-medium text-neutral-400 mb-1">
                                        Topics
                                    </p>
                                    {stats.status === "loading" ? (
                                        <div className="h-9 w-20 bg-neutral-800 animate-pulse rounded mt-1"></div>
                                    ) : stats.status === "success" ? (
                                        <p className="text-3xl font-semibold text-neutral-100">
                                            {stats.data.totalTopics.toLocaleString()}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            {/* Quick Action Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                                <button
                                    onClick={() => setView("timetables")}
                                    className="p-5 bg-gradient-to-br from-indigo-950/30 to-neutral-900 hover:from-indigo-950/50 hover:to-neutral-850 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-left transition-all group shadow-lg shadow-indigo-950/20"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md shadow-indigo-600/30">
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
                                            <rect
                                                x="3"
                                                y="4"
                                                width="18"
                                                height="18"
                                                rx="2"
                                                ry="2"
                                            />
                                            <line
                                                x1="16"
                                                y1="2"
                                                x2="16"
                                                y2="6"
                                            />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line
                                                x1="3"
                                                y1="10"
                                                x2="21"
                                                y2="10"
                                            />
                                        </svg>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-semibold text-white">
                                            Timetables
                                        </h4>
                                        <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                                            New
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1">
                                        Manage departmental weekly schedules and
                                        classes.
                                    </p>
                                </button>

                                <button
                                    onClick={() => setView("upcoming-exams")}
                                    className="p-5 bg-gradient-to-br from-emerald-950/30 to-neutral-900 hover:from-emerald-950/50 hover:to-neutral-850 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-left transition-all group shadow-lg shadow-emerald-950/20"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-md shadow-emerald-600/30">
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
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-semibold text-white">
                                            Upcoming Exams
                                        </h4>
                                        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                            New
                                        </span>
                                    </div>
                                    <p className="text-xs text-neutral-400 mt-1">
                                        Schedule and track short-term upcoming
                                        exams.
                                    </p>
                                </button>

                                <button
                                    onClick={() => setView("revision")}
                                    className="p-5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-xl text-left transition-all group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
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
                                            <polygon points="10 8 16 12 10 16 10 8" />
                                        </svg>
                                    </div>
                                    <h4 className="text-sm font-semibold text-neutral-200">
                                        Quiz Revision
                                    </h4>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Practice topic-based MCQs with feedback
                                    </p>
                                </button>

                                <button
                                    onClick={() => setView("questions")}
                                    className="p-5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-xl text-left transition-all group"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-red-950/40 border border-red-500/30 text-red-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
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
                                    </div>
                                    <h4 className="text-sm font-semibold text-neutral-200">
                                        Question Entry
                                    </h4>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        Enter Exam or Book questions
                                    </p>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
