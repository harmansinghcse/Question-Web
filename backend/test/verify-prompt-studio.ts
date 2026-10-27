import { AppDataSource } from '../src/database/data-source';
import { QuestionsService } from '../src/questions/questions.service';

// Mirror template generator logic to verify deterministic output against live DB questions
function generatePromptTest(
  questions: any[],
  options: {
    task: string;
    answerStyle: string;
    customInstruction?: string;
    includeMetadata?: boolean;
  },
): string {
  const tasks: Record<string, string> = {
    SOLVE:
      'Solve the following questions with clear, step-by-step reasoning. Show necessary mathematical steps, algorithms, code blocks, and diagrams/derivations where appropriate. Conclude with definitive final answers.',
    EXPLAIN:
      'Explain the foundational computer science concepts, theorems, algorithms, and definitions tested by each of the following questions. Break down complex ideas with intuitive analogies, key terminology, and real-world relevance.',
    EXAM_READY:
      'Provide model, exam-ready answers formatted to score maximum marks according to academic standards. Structure answers with point-by-point presentation, highlighted keywords, definitions, necessary diagrams/tables, and clear subheadings.',
  };

  const styles: Record<string, string> = {
    CONCISE:
      'Answer style: Concise. Keep explanations brief, tight, and directly addressed to the core requirement. Use clear bullet points and avoid filler.',
    DETAILED:
      'Answer style: Detailed. Provide comprehensive, in-depth explanations covering underlying mechanics, background context, edge cases, and practical trade-offs.',
    EXAM_READY:
      'Answer style: Exam-ready. Format each answer specifically for university written examinations: clearly state assumptions, list step-by-step points, emphasize key technical terms, and provide clear summaries.',
  };

  const sections: string[] = [];
  sections.push(tasks[options.task] ?? tasks.SOLVE);
  sections.push(styles[options.answerStyle] ?? styles.EXAM_READY);

  if (options.customInstruction?.trim()) {
    sections.push(`Additional instruction: ${options.customInstruction.trim()}`);
  }

  sections.push(`Questions (${questions.length}):`);

  const questionBlocks = questions.map((q, index) => {
    const itemNumber = index + 1;
    const parts: string[] = [];
    parts.push(`${itemNumber}. ${q.quesText.trim()}`);

    if (options.includeMetadata !== false) {
      const metaTokens: string[] = [];
      if (q.subjectName) metaTokens.push(`Subject: ${q.subjectName}`);
      if (q.chapterName) metaTokens.push(`Chapter: ${q.chapterName}`);
      if (q.quesType) metaTokens.push(`Type: ${q.quesType}`);
      if (q.sourceLabel) metaTokens.push(`Source: ${q.sourceLabel}`);
      if (metaTokens.length > 0) {
        parts.push(`   [${metaTokens.join(' | ')}]`);
      }
    }

    return parts.join('\n');
  });

  sections.push(questionBlocks.join('\n\n'));
  sections.push(
    'Instructions for completion:\n- Answer each question in order and preserve the numbering.\n- Ensure technical accuracy, rigorous terminology, and clear organization.',
  );

  return sections.join('\n\n');
}

async function runVerification() {
  console.log('=== PROMPT STUDIO VERIFICATION ===\n');

  console.log('1. Connecting to database...');
  await AppDataSource.initialize();
  console.log('Database connected successfully.');

  const questionsService = new QuestionsService(AppDataSource);

  console.log('\n2. Testing QuestionsService.findAll() with enriched hierarchy metadata...');
  const allQuestions = await questionsService.findAll();
  console.log(`Retrieved ${allQuestions.length} total questions.`);
  if (allQuestions.length === 0) {
    throw new Error('Expected database to contain questions');
  }

  const sampleQ = allQuestions[0];
  console.log('Sample question metadata check:');
  console.log(' - ID:', sampleQ.quesId);
  console.log(' - Type:', sampleQ.quesType);
  console.log(' - Subject:', sampleQ.subjectName);
  console.log(' - Chapter:', sampleQ.chapterName);
  console.log(' - Source Label:', sampleQ.sourceLabel);
  console.log(' - Topics count:', sampleQ.topics.length);
  console.log(' - Images count:', sampleQ.images.length);

  console.log('\n3. Testing Filtering...');
  // Filter by search
  const searchResults = await questionsService.findAll({ search: 'program' });
  console.log(`Filtered by search ("program"): ${searchResults.length} questions found.`);

  // Filter by quesType
  const subjectiveResults = await questionsService.findAll({ quesType: 'SUBJECTIVE' });
  console.log(`Filtered by quesType ("SUBJECTIVE"): ${subjectiveResults.length} questions found.`);

  console.log('\n4. Testing Prompt Template Generation...');
  const selectedForPrompt = allQuestions.slice(0, 3);
  const prompt = generatePromptTest(selectedForPrompt, {
    task: 'EXAM_READY',
    answerStyle: 'EXAM_READY',
    customInstruction: 'Focus on SVNIT examination format with time complexity analysis.',
    includeMetadata: true,
  });

  console.log('--- GENERATED PROMPT OUTPUT ---');
  console.log(prompt);
  console.log('-------------------------------');

  // Assertions
  if (!prompt.includes('Questions (3):')) {
    throw new Error('Prompt missing correct questions count header');
  }
  if (!prompt.includes('Focus on SVNIT examination format with time complexity analysis.')) {
    throw new Error('Prompt missing custom instruction');
  }
  if (!prompt.includes('1. ') || !prompt.includes('2. ') || !prompt.includes('3. ')) {
    throw new Error('Prompt missing ordered question numbering');
  }

  console.log('\n5. Verification assertions passed successfully!');
  await AppDataSource.destroy();
  console.log('Database connection closed.');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
