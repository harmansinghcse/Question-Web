import { AppDataSource } from '../../database/data-source';
import { QuizImporterService } from '../quiz-importer.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const filePathArg = process.argv[2] || 'seeds/sample_quiz_questions.json';
  const resolvedPath = path.resolve(process.cwd(), filePathArg);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found at ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`Reading seed data from ${resolvedPath}...`);
  const rawData = fs.readFileSync(resolvedPath, 'utf8');
  const payload = JSON.parse(rawData);

  console.log('Connecting to database...');
  await AppDataSource.initialize();

  const importer = new QuizImporterService(AppDataSource);
  console.log(`Starting import of batch (${payload.questions?.length || 0} questions)...`);

  const report = await importer.importBatch(payload);

  console.log('\n=== IMPORT REPORT ===');
  console.log(`Total Received:       ${report.totalReceived}`);
  console.log(`Successfully Inserted: ${report.inserted}`);
  console.log(`Skipped Duplicates:   ${report.skippedDuplicates}`);
  console.log(`Validation Failures:  ${report.failedValidation}`);

  if (report.errors.length > 0) {
    console.log('\nErrors / Notices:');
    for (const err of report.errors.slice(0, 10)) {
      console.log(` - Item #${err.index}: ${err.reason} (Snippet: "${err.quesTextSnippet}")`);
    }
    if (report.errors.length > 10) {
      console.log(` ... and ${report.errors.length - 10} more.`);
    }
  }

  await AppDataSource.destroy();
  console.log('\nImport process completed.');
}

main().catch((err) => {
  console.error('Import failed with uncaught exception:', err);
  process.exit(1);
});
