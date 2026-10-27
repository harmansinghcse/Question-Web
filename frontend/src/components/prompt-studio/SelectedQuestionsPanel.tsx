import { useState } from "react";
import type { QuestionItem } from "../../services/questionSelection";

interface Props {
    selectedQuestions: QuestionItem[];
    onRemoveQuestion: (quesId: number) => void;
    onClearAll: () => void;
    onGoToConfig?: () => void;
}

export default function SelectedQuestionsPanel({
    selectedQuestions,
    onRemoveQuestion,
    onClearAll,
    onGoToConfig,
}: Props) {
    const [showConfirmClear, setShowConfirmClear] = useState(false);

    const handleClearClick = () => {
        if (selectedQuestions.length > 2) {
            setShowConfirmClear(true);
        } else {
            onClearAll();
        }
    };

    const confirmClear = () => {
        onClearAll();
        setShowConfirmClear(false);
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col h-full shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/90 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-950/50 border border-red-500/40 text-red-500 flex items-center justify-center font-bold text-xs">
                        {selectedQuestions.length}
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-neutral-100">
                            Selected Questions
                        </h4>
                        <p className="text-[11px] text-neutral-400">
                            Preserved across all filters & search
                        </p>
                    </div>
                </div>

                {selectedQuestions.length > 0 && (
                    <div className="flex items-center gap-2">
                        {showConfirmClear ? (
                            <div className="flex items-center gap-1.5 bg-red-950/60 border border-red-500/40 px-2 py-1 rounded-lg text-xs animate-in fade-in">
                                <span className="text-[11px] text-red-300 font-medium">Clear all {selectedQuestions.length}?</span>
                                <button
                                    type="button"
                                    onClick={confirmClear}
                                    className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-[11px] transition-colors"
                                >
                                    Yes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmClear(false)}
                                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleClearClick}
                                className="text-xs text-neutral-400 hover:text-red-400 hover:bg-red-950/30 px-2.5 py-1 rounded-md border border-neutral-800 hover:border-red-500/30 transition-colors"
                            >
                                Clear Selection
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* List of Selected Questions */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[220px] max-h-[580px]">
                {selectedQuestions.length === 0 ? (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 text-neutral-500 space-y-2">
                        <div className="w-10 h-10 rounded-full bg-neutral-850 flex items-center justify-center text-neutral-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </div>
                        <p className="text-xs font-medium text-neutral-400">No questions selected yet</p>
                        <p className="text-[11px] text-neutral-500 max-w-[220px]">
                            Click on any question card in the Question Browser to add it here.
                        </p>
                    </div>
                ) : (
                    selectedQuestions.map((q, index) => (
                        <div
                            key={q.quesId}
                            className="p-3 bg-neutral-950 border border-neutral-800/80 hover:border-neutral-700 rounded-lg group transition-all text-left relative"
                        >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-neutral-400 bg-neutral-850 px-1.5 py-0.5 rounded">
                                        #{index + 1}
                                    </span>
                                    <span
                                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                            q.quesType === "MCQ"
                                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                                : q.quesType === "FILLUPS"
                                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                                : q.quesType === "TRUE/FALSE"
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                                        }`}
                                    >
                                        {q.quesType || "SUBJECTIVE"}
                                    </span>
                                    {q.subjectName && (
                                        <span className="text-[10px] text-neutral-400 truncate max-w-[140px]">
                                            {q.subjectName}
                                        </span>
                                    )}
                                </div>

                                {/* Remove Button */}
                                <button
                                    type="button"
                                    onClick={() => onRemoveQuestion(q.quesId)}
                                    title="Remove question from selection"
                                    className="text-neutral-500 hover:text-red-400 p-1 hover:bg-red-950/40 rounded transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </div>

                            <p className="text-xs text-neutral-200 line-clamp-3 leading-relaxed">
                                {q.quesText}
                            </p>

                            {q.chapterName && (
                                <p className="text-[10px] text-neutral-500 mt-1.5 truncate">
                                    {q.chapterNo ? `Ch ${q.chapterNo}: ` : ""}
                                    {q.chapterName}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Actions */}
            {selectedQuestions.length > 0 && onGoToConfig && (
                <div className="p-3.5 border-t border-neutral-800 bg-neutral-900/90 shrink-0">
                    <button
                        type="button"
                        onClick={onGoToConfig}
                        className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-red-950/50 transition-all"
                    >
                        <span>Configure Prompt ({selectedQuestions.length})</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </div>
            )}
        </div>
    );
}
