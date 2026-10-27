import type { QuestionItem } from "./questionSelection";

export type PromptTask =
    | "SOLVE"
    | "EXPLAIN"
    | "EXAM_READY"
    | "ANALYZE"
    | "REVISION_GUIDE";

export interface TaskDefinition {
    id: PromptTask;
    title: string;
    subtitle: string;
    systemInstruction: string;
}

export const PROMPT_TASKS: Record<PromptTask, TaskDefinition> = {
    SOLVE: {
        id: "SOLVE",
        title: "Solve the questions",
        subtitle: "Provide step-by-step solutions, calculations, and final answers",
        systemInstruction:
            "Solve the following questions with clear, step-by-step reasoning. Show necessary mathematical steps, algorithms, code blocks, and diagrams/derivations where appropriate. Conclude with definitive final answers.",
    },
    EXPLAIN: {
        id: "EXPLAIN",
        title: "Explain the concepts tested",
        subtitle: "Break down underlying theory, mechanisms, and principles",
        systemInstruction:
            "Explain the foundational computer science concepts, theorems, algorithms, and definitions tested by each of the following questions. Break down complex ideas with intuitive analogies, key terminology, and real-world relevance.",
    },
    EXAM_READY: {
        id: "EXAM_READY",
        title: "Provide exam-ready answers",
        subtitle: "Format structured solutions optimized for maximum university exam marks",
        systemInstruction:
            "Provide model, exam-ready answers formatted to score maximum marks according to academic standards. Structure answers with point-by-point presentation, highlighted keywords, definitions, necessary diagrams/tables, and clear subheadings.",
    },
    ANALYZE: {
        id: "ANALYZE",
        title: "Analyze the questions",
        subtitle: "Evaluate difficulty, prerequisites, and common student pitfalls",
        systemInstruction:
            "Conduct a detailed academic analysis of each question. Identify its cognitive level (Bloom's taxonomy), estimated difficulty, prerequisite topics, core competencies being evaluated, and common examination mistakes students make.",
    },
    REVISION_GUIDE: {
        id: "REVISION_GUIDE",
        title: "Create a revision guide",
        subtitle: "Synthesize cheat-sheets, key definitions, and rapid review points",
        systemInstruction:
            "Create a structured revision guide and quick-review summary based on the concepts tested across the following questions. Group related concepts, extract essential formulas, and provide high-yield review bullets for rapid exam preparation.",
    },
};

export type AnswerStyle = "CONCISE" | "DETAILED" | "EXAM_READY";

export interface StyleDefinition {
    id: AnswerStyle;
    title: string;
    description: string;
    promptDirective: string;
}

export const ANSWER_STYLES: Record<AnswerStyle, StyleDefinition> = {
    CONCISE: {
        id: "CONCISE",
        title: "Concise",
        description: "Direct, bulleted, and to-the-point with minimal preamble",
        promptDirective:
            "Answer style: Concise. Keep explanations brief, tight, and directly addressed to the core requirement. Use clear bullet points and avoid filler.",
    },
    DETAILED: {
        id: "DETAILED",
        title: "Detailed",
        description: "Comprehensive coverage with background theory and edge cases",
        promptDirective:
            "Answer style: Detailed. Provide comprehensive, in-depth explanations covering underlying mechanics, background context, edge cases, and practical trade-offs.",
    },
    EXAM_READY: {
        id: "EXAM_READY",
        title: "Exam-ready",
        description: "Structured layout with marks-oriented points and headings",
        promptDirective:
            "Answer style: Exam-ready. Format each answer specifically for university written examinations: clearly state assumptions, list step-by-step points, emphasize key technical terms, and provide clear summaries.",
    },
};

export interface PromptOptions {
    task: PromptTask;
    answerStyle: AnswerStyle;
    customInstruction?: string;
    includeMetadata?: boolean;
}

export const DEFAULT_PROMPT_OPTIONS: PromptOptions = {
    task: "SOLVE",
    answerStyle: "EXAM_READY",
    customInstruction: "",
    includeMetadata: true,
};

/**
 * Deterministically generates an AI prompt from user preferences and selected questions.
 * No AI calls or token costs — pure template formatting.
 */
export function generatePrompt(
    questions: QuestionItem[],
    options: PromptOptions = DEFAULT_PROMPT_OPTIONS,
): string {
    if (!questions || questions.length === 0) {
        return "No questions selected. Please select at least one question in Step 1 to generate a prompt.";
    }

    const taskDef = PROMPT_TASKS[options.task] ?? PROMPT_TASKS.SOLVE;
    const styleDef = ANSWER_STYLES[options.answerStyle] ?? ANSWER_STYLES.EXAM_READY;

    const sections: string[] = [];

    // 1. Task instruction
    sections.push(taskDef.systemInstruction);

    // 2. Style directive
    sections.push(styleDef.promptDirective);

    // 3. Optional custom user instruction
    const customTrimmed = options.customInstruction?.trim();
    if (customTrimmed) {
        sections.push(`Additional instruction: ${customTrimmed}`);
    }

    // 4. Questions header
    sections.push(`Questions (${questions.length}):`);

    // 5. Questions list
    const questionBlocks = questions.map((q, index) => {
        const itemNumber = index + 1;
        const parts: string[] = [];

        // Question text
        parts.push(`${itemNumber}. ${q.quesText.trim()}`);

        // Optional metadata line
        if (options.includeMetadata !== false) {
            const metaTokens: string[] = [];
            if (q.subjectName) metaTokens.push(`Subject: ${q.subjectName}`);
            if (q.chapterName) metaTokens.push(`Chapter: ${q.chapterName}`);
            if (q.quesType) metaTokens.push(`Type: ${q.quesType}`);
            if (q.sourceLabel) metaTokens.push(`Source: ${q.sourceLabel}`);

            if (q.topics && q.topics.length > 0) {
                const topicNames = q.topics.map((t) => t.topicName).join(", ");
                metaTokens.push(`Topics: ${topicNames}`);
            }

            if (metaTokens.length > 0) {
                parts.push(`   [${metaTokens.join(" | ")}]`);
            }
        }

        // Image notice if question has attached diagrams
        if (q.images && q.images.length > 0) {
            parts.push(
                `   (Note: This question includes ${q.images.length} attached diagram/figure file(s)).`,
            );
        }

        return parts.join("\n");
    });

    sections.push(questionBlocks.join("\n\n"));

    // 6. Concluding instruction
    sections.push(
        "Instructions for completion:\n- Answer each question in order and preserve the numbering.\n- Ensure technical accuracy, rigorous terminology, and clear organization.",
    );

    return sections.join("\n\n");
}

/**
 * Copies text to the system clipboard with modern navigator.clipboard and fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (!text) return false;

    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall back to document.execCommand below
        }
    }

    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);
        return successful;
    } catch {
        return false;
    }
}

/**
 * Initiates a browser download of the generated prompt as a plain text file.
 */
export function downloadPromptAsFile(
    content: string,
    filename = "prompt-studio-export.txt",
): void {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Utility to calculate prompt statistics (character, word, and estimated token counts).
 */
export function getPromptStats(text: string) {
    const characters = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    // Approximating tokens: 1 token ~= 4 characters in English
    const estimatedTokens = Math.ceil(characters / 4);
    return { characters, words, estimatedTokens };
}
