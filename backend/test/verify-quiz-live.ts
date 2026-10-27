import { AppDataSource } from '../src/database/data-source';
import { QuizService } from '../src/quiz/quiz.service';
import { QuizQuestion } from '../src/quiz/entities/quiz-question.entity';
import { QuizAttempt } from '../src/quiz/entities/quiz-attempt.entity';
import { QuizAttemptResponse } from '../src/quiz/entities/quiz-attempt-response.entity';
import { Subject } from '../src/subjects/entities/subject.entity';
import { Chapter } from '../src/chapters/entities/chapter.entity';
import { Topic } from '../src/topics/entities/topic.entity';
import { Department } from '../src/departments/entities/department.entity';
import { UserRole, AccountStatus } from '../src/users/entities/user.entity';

async function runLiveTest() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();

  const quizService = new QuizService(
    AppDataSource,
    AppDataSource.getRepository(QuizQuestion),
    AppDataSource.getRepository(QuizAttempt),
    AppDataSource.getRepository(QuizAttemptResponse),
    AppDataSource.getRepository(Subject),
    AppDataSource.getRepository(Chapter),
    AppDataSource.getRepository(Topic),
    AppDataSource.getRepository(Department),
  );

  const testUser = {
    userId: 4,
    email: 'u25cs044@coed.svnit.ac.in',
    displayName: 'Harman',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log('\n--- Test 1: Fetch Counts for Subject 1 ---');
  const counts = await quizService.getQuestionCounts({ subjectKey: 1 });
  console.log('Question counts for Subject 1:', counts);

  console.log('\n--- Test 2: Start Revision Session (5 questions) ---');
  const session = await quizService.startRevisionAttempt({ subjectKey: 1, count: 5 }, testUser);
  console.log('Started Attempt ID:', session.attemptId);
  console.log('Received Questions Count:', session.questions.length);
  console.log('First Question Text:', session.questions[0]?.quesText);
  // Verify correct answers and explanations are stripped
  console.log('Has Correct Answer exposed?:', 'correctAnswer' in session.questions[0]);
  console.log('Has Explanation exposed?:', 'explanation' in session.questions[0]);

  console.log('\n--- Test 3: Submit Answers ---');
  const answers = session.questions.map((q: any, idx: number) => ({
    quizQuesId: q.quizQuesId,
    // Answer first 2 with "A", rest unanswered
    selectedAnswer: idx < 2 ? 'A' : undefined,
  }));

  const result = await quizService.submitRevisionAttempt(
    {
      attemptId: session.attemptId,
      timeTakenSeconds: 30,
      answers,
    },
    testUser,
  );

  console.log('Submission Results:');
  console.log(` - Total: ${result.totalQuestions}`);
  console.log(` - Correct: ${result.correctAnswers}`);
  console.log(` - Incorrect: ${result.incorrectAnswers}`);
  console.log(` - Unanswered: ${result.unanswered}`);
  console.log(` - Accuracy: ${result.accuracy}%`);
  console.log(` - Topic Breakdown Items: ${result.topicBreakdown.length}`);

  console.log('\n--- Test 4: Retrieve Past Attempt History ---');
  const history = await quizService.getUserAttemptHistory(testUser.userId, 1, 5);
  console.log(`User has ${history.total} completed attempts.`);

  await AppDataSource.destroy();
  console.log('\nAll live DB tests completed successfully!');
}

runLiveTest().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
