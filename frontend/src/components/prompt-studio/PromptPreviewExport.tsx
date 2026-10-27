import { useState } from "react";
import {
    copyToClipboard,
    downloadPromptAsFile,
    getPromptStats,
    type PromptOptions,
} from "../../services/promptTemplate";
import type { QuestionItem } from "../../services/questionSelection";

interface Props {
    generatedPrompt: string;
    onPromptTextChange: (newText: string) => void;
    onRegenerate: () => void;
    onBackToPreferences: () => void;
    onBackToSelection: () => void;
    selectedQuestions: QuestionItem[];
    options: PromptOptions;
}

export default function PromptPreviewExport({
    generatedPrompt,
    onPromptTextChange,
    onRegenerate,
    onBackToPreferences,
    onBackToSelection,
    selectedQuestions,
    options,
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
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Top Status & Export Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <h3 className="text-base font-semibold text-neutral-100">
                                Generated AI Prompt Ready
                            </h3>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">
                            Copy this prompt directly into ChatGPT, Claude, Gemini, DeepSeek, or any AI chatbot.
                        </p>
                    </div>

                    {/* Primary Action Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Copy Button */}
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md ${
                                copied
                                    ? "bg-emerald-600 text-white shadow-emerald-950/40"
                                    : "bg-red-600 hover:bg-red-500 text-white shadow-red-950/50"
                            }`}
                        >
                            {copied ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Copied to Clipboard!</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                    <span>Copy Prompt</span>
                                </>
                            )}
                        </button>

                        {/* Download .txt Button */}
                        <button
                            type="button"
                            onClick={handleDownload}
                            className={`px-3.5 py-2 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors ${
                                downloaded ? "border-emerald-500/50 text-emerald-400" : ""
                            }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            <span>{downloaded ? "Downloaded!" : "Download .txt"}</span>
                        </button>
                    </div>
                </div>

                {/* Prompt Metadata & Statistics Pill Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800/80 text-xs text-neutral-400">
                    <div className="flex flex-wrap items-center gap-4">
                        <span>
                            Questions: <strong className="text-white">{selectedQuestions.length}</strong>
                        </span>
                        <span>•</span>
                        <span>
                            Words: <strong className="text-white">{stats.words.toLocaleString()}</strong>
                        </span>
                        <span>•</span>
                        <span>
                            Characters: <strong className="text-white">{stats.characters.toLocaleString()}</strong>
                        </span>
                        <span>•</span>
                        <span>
                            Est. AI Tokens: <strong className="text-neutral-200">~{stats.estimatedTokens.toLocaleString()}</strong>
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onRegenerate}
                            title="Reset manual edits back to the fresh template"
                            className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                            Reset / Regenerate
                        </button>
                    </div>
                </div>
            </div>

            {/* Editable Prompt Textarea */}
            <div className="relative">
                <div className="flex items-center justify-between px-1 mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        Prompt Content (Editable before copying)
                    </label>
                    <span className="text-[11px] text-neutral-500">
                        You can manually tweak or add comments here before copying
                    </span>
                </div>

                <textarea
                    rows={16}
                    value={generatedPrompt}
                    onChange={(e) => onPromptTextChange(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl p-4 font-mono text-xs sm:text-sm leading-relaxed text-neutral-100 selection:bg-red-500/30 transition-colors resize-y shadow-inner"
                />
            </div>

            {/* Zero AI Cost & Security Notice */}
            <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-4 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-950/40 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </div>
                <div className="text-xs text-neutral-400 leading-relaxed">
                    <strong className="text-neutral-200">Zero AI Costs & Client-Side Privacy:</strong>{" "}
                    This prompt is generated entirely locally using structured templates from your database questions. No AI model APIs, keys, or external network requests were made. Simply paste it into your favorite chat model to proceed.
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBackToPreferences}
                        className="px-4 py-2 text-xs font-medium bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        Change Preferences
                    </button>
                    <button
                        type="button"
                        onClick={onBackToSelection}
                        className="px-4 py-2 text-xs font-medium bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-neutral-200 rounded-lg border border-neutral-800 transition-colors"
                    >
                        Select Different Questions
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleCopy}
                    className="px-5 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition-colors shadow-md shadow-red-950/50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    <span>{copied ? "Copied!" : "Copy Prompt"}</span>
                </button>
            </div>
        </div>
    );
}
