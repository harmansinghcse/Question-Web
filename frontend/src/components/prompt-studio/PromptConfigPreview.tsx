import { useState } from "react";
import {
    type AnswerStyle,
    ANSWER_STYLES,
    copyToClipboard,
    downloadPromptAsFile,
    getPromptStats,
    type PromptOptions,
    type PromptTask,
    PROMPT_TASKS,
} from "../../services/promptTemplate";
import type { QuestionItem } from "../../services/questionSelection";

interface Props {
    selectedQuestions: QuestionItem[];
    options: PromptOptions;
    onOptionsChange: (options: PromptOptions) => void;
    generatedPrompt: string;
    onPromptChange: (newPrompt: string) => void;
    onRegenerate: () => void;
    onGoToBrowser?: () => void;
}

export default function PromptConfigPreview({
    selectedQuestions,
    options,
    onOptionsChange,
    generatedPrompt,
    onPromptChange,
    onRegenerate,
    onGoToBrowser,
}: Props) {
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    const stats = getPromptStats(generatedPrompt);

    const handleCopy = async () => {
        const success = await copyToClipboard(generatedPrompt);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handleDownload = () => {
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `prompt-studio-${options.task.toLowerCase()}-${timestamp}.txt`;
        downloadPromptAsFile(generatedPrompt, filename);
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2500);
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col h-full shadow-sm overflow-hidden space-y-4 p-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div>
                    <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        Prompt Configuration & Live Preview
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                        Generated deterministically from your {selectedQuestions.length} selected question(s). Zero AI cost.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onRegenerate}
                        title="Rebuild prompt from active options"
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        Regenerate
                    </button>

                    <button
                        type="button"
                        onClick={handleCopy}
                        disabled={selectedQuestions.length === 0}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
                            copied
                                ? "bg-emerald-600 text-white"
                                : "bg-red-600 hover:bg-red-500 text-white shadow-red-950/50"
                        }`}
                    >
                        {copied ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                <span>Copy Prompt</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={selectedQuestions.length === 0}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 flex items-center gap-1.5 disabled:opacity-40 transition-colors ${
                            downloaded ? "border-emerald-500 text-emerald-400" : ""
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        <span>{downloaded ? "Saved" : ".txt"}</span>
                    </button>
                </div>
            </div>

            {/* Config Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Task Selection */}
                <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Task Directive
                    </label>
                    <select
                        value={options.task}
                        onChange={(e) => {
                            onOptionsChange({ ...options, task: e.target.value as PromptTask });
                        }}
                        className="w-full bg-neutral-950 border border-neutral-750 focus:border-red-500 rounded-lg px-3 py-2 text-xs text-neutral-100 transition-colors"
                    >
                        {(Object.keys(PROMPT_TASKS) as PromptTask[]).map((t) => (
                            <option key={t} value={t}>
                                {PROMPT_TASKS[t].title}
                            </option>
                        ))}
                    </select>
                    <p className="text-[11px] text-neutral-400 mt-1">
                        {PROMPT_TASKS[options.task]?.subtitle}
                    </p>
                </div>

                {/* Answer Style */}
                <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                        Answer Style
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(ANSWER_STYLES) as AnswerStyle[]).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => onOptionsChange({ ...options, answerStyle: s })}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    options.answerStyle === s
                                        ? "bg-red-950/40 border border-red-500 text-red-400 font-semibold"
                                        : "bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
                                }`}
                            >
                                {ANSWER_STYLES[s].title}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">
                        {ANSWER_STYLES[options.answerStyle]?.description}
                    </p>
                </div>
            </div>

            {/* Custom Instruction & Metadata Toggle */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-300">
                        Additional Custom Instruction <span className="text-neutral-500 font-normal">(Optional)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={options.includeMetadata !== false}
                            onChange={(e) =>
                                onOptionsChange({ ...options, includeMetadata: e.target.checked })
                            }
                            className="w-3.5 h-3.5 rounded border-neutral-700 text-red-600 focus:ring-red-500 bg-neutral-950 cursor-pointer"
                        />
                        <span>Include metadata tags</span>
                    </label>
                </div>
                <input
                    type="text"
                    value={options.customInstruction ?? ""}
                    onChange={(e) =>
                        onOptionsChange({ ...options, customInstruction: e.target.value })
                    }
                    placeholder="e.g., Focus on examination format, explain trade-offs, assume x86 architecture..."
                    className="w-full bg-neutral-950 border border-neutral-750 focus:border-red-500 rounded-lg px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 transition-colors"
                />
            </div>

            {/* Prompt Preview Textarea */}
            <div className="space-y-1.5 flex-1 flex flex-col min-h-[260px]">
                <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-neutral-300">
                        Generated Prompt Preview (Editable)
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                        <span>{stats.words.toLocaleString()} words</span>
                        <span>•</span>
                        <span>{stats.characters.toLocaleString()} chars</span>
                        <span>•</span>
                        <span className="text-neutral-200">~{stats.estimatedTokens.toLocaleString()} est. tokens</span>
                    </div>
                </div>

                {selectedQuestions.length === 0 ? (
                    <div className="flex-1 min-h-[220px] bg-neutral-950 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                        </div>
                        <h4 className="text-xs font-semibold text-neutral-300">No questions selected</h4>
                        <p className="text-[11px] text-neutral-500 max-w-xs">
                            Select questions from the Question Browser on the left to instantly generate your tailored AI prompt.
                        </p>
                        {onGoToBrowser && (
                            <button
                                type="button"
                                onClick={onGoToBrowser}
                                className="px-3 py-1 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 text-xs rounded-md border border-neutral-700 transition-colors"
                            >
                                Browse Questions
                            </button>
                        )}
                    </div>
                ) : (
                    <textarea
                        rows={11}
                        value={generatedPrompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                        className="w-full flex-1 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-xl p-3.5 font-mono text-xs leading-relaxed text-neutral-100 resize-y shadow-inner transition-colors"
                    />
                )}
            </div>

            {/* Cost and Privacy Guarantee Notice */}
            <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-3 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-red-950/50 text-red-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                    ✓
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                    <strong className="text-neutral-200">Deterministic & Private:</strong> This prompt was compiled directly from your database records on your machine. No external AI APIs, tokens, or network requests are consumed. Copy and paste it into ChatGPT, Claude, Gemini, DeepSeek, or any chatbot.
                </p>
            </div>
        </div>
    );
}
