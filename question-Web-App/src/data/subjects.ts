
export type Subject = {
  id: string;
  name: string;
  icon: string;
  completed: number;
  total: number;
  color: string;
};

export const subjects: Subject[] = [
  {
    id: 'dbms',
    name: 'DBMS',
    icon: '▤',
    completed: 48,
    total: 71,
    color: '#6387F5',
  },
  {
    id: 'oop',
    name: 'OOP',
    icon: '</>',
    completed: 37,
    total: 71,
    color: '#B17AE8',
  },
  {
    id: 'daa',
    name: 'DAA',
    icon: '⌘',
    completed: 29,
    total: 70,
    color: '#24A681',
  },
  {
    id: 'co',
    name: 'CO',
    icon: '▦',
    completed: 25,
    total: 70,
    color: '#E89B36',
  },
  {
    id: 'dm',
    name: 'Discrete Maths',
    icon: 'Σ',
    completed: 16,
    total: 68,
    color: '#7654E8',
  },
];
