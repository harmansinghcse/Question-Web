
export type Question = {
  id: string;
  subject: string;
  title: string;
  chapter: string;
  source: 'Previous Year Paper' | 'Recommended Book';
  year?: number;
  marks: number;
  priority: 'High' | 'Medium' | 'Low';
};

export const questions: Question[] = [
  {
    id: 'q1',
    subject: 'DBMS',
    title: 'Explain the normalization process with an example.',
    chapter: 'Normalization',
    source: 'Previous Year Paper',
    year: 2023,
    marks: 5,
    priority: 'High',
  },
  {
    id: 'q2',
    subject: 'DBMS',
    title: 'Explain different types of database joins.',
    chapter: 'SQL',
    source: 'Recommended Book',
    marks: 6,
    priority: 'Medium',
  },
  {
    id: 'q3',
    subject: 'OOP',
    title: 'Demonstrate multiple inheritance in C++.',
    chapter: 'Inheritance',
    source: 'Recommended Book',
    marks: 10,
    priority: 'Medium',
  },
  {
    id: 'q4',
    subject: 'DAA',
    title: 'Solve a recurrence relation using the Master Theorem.',
    chapter: 'Divide and Conquer',
    source: 'Previous Year Paper',
    year: 2022,
    marks: 10,
    priority: 'Low',
  },
  {
    id: 'q5',
    subject: 'OS',
    title: 'Explain CPU scheduling algorithms.',
    chapter: 'Process Scheduling',
    source: 'Previous Year Paper',
    year: 2024,
    marks: 8,
    priority: 'High',
  },
  {
    id: 'q6',
    subject: 'DBMS',
    title: 'Explain ACID properties of transactions.',
    chapter: 'Transactions',
    source: 'Previous Year Paper',
    year: 2024,
    marks: 5,
    priority: 'High',
  },
];
