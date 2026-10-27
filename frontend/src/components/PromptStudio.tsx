import { useEffect, useState } from "react";
import {
    DEFAULT_PROMPT_OPTIONS,
    generatePrompt,
    type PromptOptions,
} from "../services/promptTemplate";
import type { QuestionItem } from "../services/questionSelection";
import QuestionBrowser from "./prompt-studio/QuestionBrowser";
import SelectedQuestionsPanel from "./prompt-studio/SelectedQuestionsPanel";
import PromptConfigPreview from "./prompt-studio/PromptConfigPreview";

type RightPanelTab = "selected" | "prompt";
type MobileTab = "browser" | "selected" | "prompt";

export default function PromptStudio() {
    // 1. Core Selection State: Map of quesId -> QuestionItem
    const [selectedQuestions, setSelectedQuestions] = useState<
        Map<number, QuestionItem>
    >(new Map());

    // 2. Prompt Configuration Options
    const [options, setOptions] = useState<PromptOptions>(DEFAULT_PROMPT_OPTIONS);

    // 3. Generated Prompt (Editable Text)
    const [generatedPrompt, setGeneratedPrompt] = useState<string>("");

    // Active sub-panels for desktop and mobile
    const [rightTab, setRightTab] = useState<RightPanelTab>("selected");
    const [mobileTab, setMobileTab] = useState<MobileTab>("browser");

    // Automatically re-generate prompt when selected questions or options change
    useEffect(() => {
        const list = Array.from(selectedQuestions.values());
        const prompt = generatePrompt(list, options);
        setGeneratedPrompt(prompt);
    }, [selectedQuestions, options]);

    // Toggle individual question
    const handleToggleSelect = (question: QuestionItem) => {
        setSelectedQuestions((prev) => {
            const next = new Map(prev);
            if (next.has(question.quesId)) {
                next.delete(question.quesId);
            } else {
                next.set(question.quesId, question);
            }
            return next;
        });
    };

    // Remove single question by id
    const handleRemoveQuestion = (quesId: number) => {
        setSelectedQuestions((prev) => {
            const next = new Map(prev);
            next.delete(quesId);
            return next;
        });
    };

    // Select all questions currently shown on the active page
    const handleSelectAllOnPage = (questionsOnPage: QuestionItem[]) => {
        setSelectedQuestions((prev) => {
            const next = new Map(prev);
            for (const q of questionsOnPage) {
                next.set(q.quesId, q);
            }
            return next;
        });
    };

    // Deselect questions shown on active page
    const handleDeselectOnPage = (questionsOnPage: QuestionItem[]) => {
        setSelectedQuestions((prev) => {
            const next = new Map(prev);
            for (const q of questionsOnPage) {
                next.delete(q.quesId);
            }
            return next;
        });
    };

    // Clear all selected questions
    const handleClearAll = () => {
        setSelectedQuestions(new Map());
    };

    // Force regenerate from template
    const handleRegenerate = () => {
        const list = Array.from(selectedQuestions.values());
        const prompt = generatePrompt(list, options);
        setGeneratedPrompt(prompt);
    };

    const selectedList = Array.from(selectedQuestions.values());

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header & Feature Badge */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-500/40 text-red-500 flex items-center justify-center font-bold">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-neutral-100">
                            Prompt Studio
                        </h2>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Unified Workspace
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-2xl">
                        Browse real database questions, curate your selection, and compile deterministic AI prompts without leaving this page.
                    </p>
                </div>

                {/* Workspace Stats Indicator */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg text-xs">
                        <span className="text-neutral-400">Active Selection:</span>
                        <strong className="text-red-400 font-semibold bg-red-950/50 border border-red-500/30 px-2 py-0.5 rounded-full">
                            {selectedQuestions.size} question{selectedQuestions.size === 1 ? "" : "s"}
                        </strong>
                    </div>
                </div>
            </div>

            {/* Mobile View Navigation Tabs (< lg screens) */}
            <div className="flex lg:hidden items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
                <button
                    type="button"
                    onClick={() => setMobileTab("browser")}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        mobileTab === "browser"
                            ? "bg-red-600 text-white font-semibold shadow-sm"
                            : "text-neutral-400 hover:text-neutral-200"
                    }`}
                >
                    1. Question Browser
                </button>
                <button
                    type="button"
                    onClick={() => setMobileTab("selected")}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 ${
                        mobileTab === "selected"
                            ? "bg-red-600 text-white font-semibold shadow-sm"
                            : "text-neutral-400 hover:text-neutral-200"
                    }`}
                >
                    <span>2. Selected</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40">
                        {selectedQuestions.size}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setMobileTab("prompt")}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                        mobileTab === "prompt"
                            ? "bg-red-600 text-white font-semibold shadow-sm"
                            : "text-neutral-400 hover:text-neutral-200"
                    }`}
                >
                    3. Prompt & Export
                </button>
            </div>

            {/* Desktop Layout (Split 2-Column Responsive Workspace) */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start">
                {/* Column A: Question Browser (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between pb-1">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[11px] flex items-center justify-center font-bold">
                                A
                            </span>
                            Question Browser
                        </h3>
                        <span className="text-xs text-neutral-500">
                            Click cards to select / deselect
                        </span>
                    </div>

                    <QuestionBrowser
                        selectedQuestions={selectedQuestions}
                        onToggleSelect={handleToggleSelect}
                        onSelectAllOnPage={handleSelectAllOnPage}
                        onDeselectOnPage={handleDeselectOnPage}
                    />
                </div>

                {/* Column B & C: Selected Questions & Prompt Panel (5 Cols) */}
                <div className="lg:col-span-5 space-y-4 sticky top-6">
                    {/* Panel Switcher Tabs */}
                    <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setRightTab("selected")}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                rightTab === "selected"
                                    ? "bg-neutral-800 text-white font-semibold shadow-sm"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            <span className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center text-[10px]">
                                B
                            </span>
                            <span>Selected Questions</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-red-950 border border-red-500/40 text-red-400">
                                {selectedQuestions.size}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setRightTab("prompt")}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                rightTab === "prompt"
                                    ? "bg-red-600 text-white font-semibold shadow-sm"
                                    : "text-neutral-400 hover:text-neutral-200"
                            }`}
                        >
                            <span className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center text-[10px]">
                                C
                            </span>
                            <span>Prompt & Export</span>
                        </button>
                    </div>

                    {/* Active Tab Panel */}
                    {rightTab === "selected" ? (
                        <SelectedQuestionsPanel
                            selectedQuestions={selectedList}
                            onRemoveQuestion={handleRemoveQuestion}
                            onClearAll={handleClearAll}
                            onGoToConfig={() => setRightTab("prompt")}
                        />
                    ) : (
                        <PromptConfigPreview
                            selectedQuestions={selectedList}
                            options={options}
                            onOptionsChange={setOptions}
                            generatedPrompt={generatedPrompt}
                            onPromptChange={setGeneratedPrompt}
                            onRegenerate={handleRegenerate}
                            onGoToBrowser={() => setRightTab("selected")}
                        />
                    )}
                </div>
            </div>

            {/* Mobile View Content Sections (< lg screens) */}
            <div className="block lg:hidden">
                {mobileTab === "browser" && (
                    <QuestionBrowser
                        selectedQuestions={selectedQuestions}
                        onToggleSelect={handleToggleSelect}
                        onSelectAllOnPage={handleSelectAllOnPage}
                        onDeselectOnPage={handleDeselectOnPage}
                    />
                )}

                {mobileTab === "selected" && (
                    <SelectedQuestionsPanel
                        selectedQuestions={selectedList}
                        onRemoveQuestion={handleRemoveQuestion}
                        onClearAll={handleClearAll}
                        onGoToConfig={() => setMobileTab("prompt")}
                    />
                )}

                {mobileTab === "prompt" && (
                    <PromptConfigPreview
                        selectedQuestions={selectedList}
                        options={options}
                        onOptionsChange={setOptions}
                        generatedPrompt={generatedPrompt}
                        onPromptChange={setGeneratedPrompt}
                        onRegenerate={handleRegenerate}
                        onGoToBrowser={() => setMobileTab("browser")}
                    />
                )}
            </div>

            {/* Mobile Sticky Bottom Floating Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-3 bg-neutral-950/95 border-t border-neutral-800 backdrop-blur-md flex lg:hidden items-center justify-between gap-3 z-30">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-400">Selected:</span>
                    <strong className="text-xs font-bold text-red-400 bg-red-950/50 border border-red-500/40 px-2 py-0.5 rounded-full">
                        {selectedQuestions.size}
                    </strong>
                </div>

                <div className="flex items-center gap-2">
                    {mobileTab !== "selected" && (
                        <button
                            type="button"
                            onClick={() => setMobileTab("selected")}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-850 text-neutral-200 border border-neutral-700"
                        >
                            View Selection ({selectedQuestions.size})
                        </button>
                    )}
                    {mobileTab !== "prompt" && (
                        <button
                            type="button"
                            onClick={() => setMobileTab("prompt")}
                            disabled={selectedQuestions.size === 0}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white disabled:opacity-40"
                        >
                            Generate Prompt →
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
