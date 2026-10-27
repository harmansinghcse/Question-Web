import {
    type AnswerStyle,
    ANSWER_STYLES,
    type PromptOptions,
    type PromptTask,
    PROMPT_TASKS,
} from "../../services/promptTemplate";
import type { QuestionItem } from "../../services/questionSelection";

interface Props {
    selectedQuestions: QuestionItem[];
    options: PromptOptions;
    onOptionsChange: (options: PromptOptions) => void;
    onBackToSelection: () => void;
    onGenerate: () => void;
}

export default function PromptPreferences({
    selectedQuestions,
    options,
    onOptionsChange,
    onBackToSelection,
    onGenerate,
}: Props) {
    const handleTaskSelect = (task: PromptTask) => {
        onOptionsChange({ ...options, task });
    };

    const handleStyleSelect = (answerStyle: AnswerStyle) => {
        onOptionsChange({ ...options, answerStyle });
    };

    const handleCustomInstructionChange = (text: string) => {
        onOptionsChange({ ...options, customInstruction: text });
    };

    const handleToggleMetadata = (includeMetadata: boolean) => {
        onOptionsChange({ ...options, includeMetadata });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header / Selected Summary */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        Step 2 — Configure Prompt Preferences
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                        Select what you want an external AI chatbot to do with your selected questions.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-400">Questions:</span>
                    <span className="text-xs font-semibold text-white bg-red-600/30 border border-red-500/50 px-2.5 py-1 rounded-full">
                        {selectedQuestions.length} selected
                    </span>
                    <button
                        type="button"
                        onClick={onBackToSelection}
                        className="text-xs text-neutral-400 hover:text-white underline ml-2 transition-colors"
                    >
                        Change selection
                    </button>
                </div>
            </div>

            {/* 1. Choose Task */}
            <div className="space-y-3">
                <div>
                    <h4 className="text-sm font-semibold text-neutral-200">1. Select AI Task</h4>
                    <p className="text-xs text-neutral-400">
                        Choose the primary directive to instruct the external AI chatbot.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {(Object.keys(PROMPT_TASKS) as PromptTask[]).map((taskKey) => {
                        const task = PROMPT_TASKS[taskKey];
                        const isSelected = options.task === taskKey;
                        return (
                            <button
                                key={task.id}
                                type="button"
                                onClick={() => handleTaskSelect(taskKey)}
                                className={`p-4 rounded-xl text-left border transition-all ${
                                    isSelected
                                        ? "bg-red-950/25 border-red-500/60 shadow-md shadow-red-950/20 ring-1 ring-red-500/50"
                                        : "bg-neutral-900 hover:bg-neutral-850/80 border-neutral-800 hover:border-neutral-700"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <h5 className="text-sm font-semibold text-white">
                                        {task.title}
                                    </h5>
                                    {isSelected ? (
                                        <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs">
                                            ✓
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border border-neutral-700"></div>
                                    )}
                                </div>
                                <p className="text-xs text-neutral-400 leading-relaxed">
                                    {task.subtitle}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Choose Answer Style */}
            <div className="space-y-3">
                <div>
                    <h4 className="text-sm font-semibold text-neutral-200">2. Answer Style</h4>
                    <p className="text-xs text-neutral-400">
                        Tune how concise or comprehensive the generated responses should be.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.keys(ANSWER_STYLES) as AnswerStyle[]).map((styleKey) => {
                        const style = ANSWER_STYLES[styleKey];
                        const isSelected = options.answerStyle === styleKey;
                        return (
                            <button
                                key={style.id}
                                type="button"
                                onClick={() => handleStyleSelect(styleKey)}
                                className={`p-4 rounded-xl text-left border transition-all ${
                                    isSelected
                                        ? "bg-red-950/25 border-red-500/60 ring-1 ring-red-500/50"
                                        : "bg-neutral-900 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <h5 className="text-sm font-semibold text-white">{style.title}</h5>
                                    {isSelected && <span className="text-red-500 text-xs font-bold">✓</span>}
                                </div>
                                <p className="text-xs text-neutral-400">{style.description}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. Additional Custom Instruction */}
            <div className="space-y-3">
                <div>
                    <h4 className="text-sm font-semibold text-neutral-200">
                        3. Additional Custom Instruction <span className="text-neutral-500 font-normal">(Optional)</span>
                    </h4>
                    <p className="text-xs text-neutral-400">
                        Add any specific academic requirements, focus topics, or constraints for the AI.
                    </p>
                </div>

                <textarea
                    rows={3}
                    value={options.customInstruction ?? ""}
                    onChange={(e) => handleCustomInstructionChange(e.target.value)}
                    placeholder="e.g., Focus on common examination mistakes, adhere to standard syllabus conventions, assume 64-bit architecture..."
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl p-3.5 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors"
                />
            </div>

            {/* 4. Options & Toggles */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-medium text-neutral-200">Include question context metadata</p>
                    <p className="text-xs text-neutral-400">
                        Embeds subject, chapter, topic, and exam/book source tags into the prompt to provide helpful context for the AI.
                    </p>
                </div>
                <input
                    type="checkbox"
                    checked={options.includeMetadata !== false}
                    onChange={(e) => handleToggleMetadata(e.target.checked)}
                    className="w-5 h-5 rounded border-neutral-700 text-red-600 focus:ring-red-500 focus:ring-offset-neutral-950 bg-neutral-950 cursor-pointer"
                />
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-neutral-800">
                <button
                    type="button"
                    onClick={onBackToSelection}
                    className="px-4 py-2 text-xs font-medium bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-700 transition-colors flex items-center gap-1.5"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Back to Question Selection
                </button>

                <button
                    type="button"
                    onClick={onGenerate}
                    className="px-6 py-2.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg shadow-lg shadow-red-950/60 transition-all flex items-center gap-2"
                >
                    <span>Generate Prompt</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>
        </div>
    );
}
