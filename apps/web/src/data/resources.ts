export interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'interactive';
  category: 'kids' | 'parents';
  summary: string;
  thumbnail: string;
  tags: string[];
}

export const resources: Resource[] = [
  {
    id: 'kids-1',
    title: 'What is Money?',
    type: 'interactive',
    category: 'kids',
    summary: 'An interactive lesson on the basics of money, where it comes from, and what it is used for.',
    thumbnail: '/placeholders/kids-money.png',
    tags: ['money', 'basics', 'kids'],
  },
  {
    id: 'kids-2',
    title: 'Saving for a Goal',
    type: 'video',
    category: 'kids',
    summary: 'A short video on how to save money for a toy, a game, or anything else you want.',
    thumbnail: '/placeholders/kids-saving.png',
    tags: ['saving', 'goals', 'kids'],
  },
  {
    id: 'kids-3',
    title: 'Needs vs. Wants',
    type: 'article',
    category: 'kids',
    summary: 'Learn the difference between things you need and things you want, and how to make smart choices.',
    thumbnail: '/placeholders/kids-needs-wants.png',
    tags: ['needs', 'wants', 'choices', 'kids'],
  },
  {
    id: 'parents-1',
    title: 'Teaching Kids About Money',
    type: 'article',
    category: 'parents',
    summary: 'A guide for parents on how to introduce financial concepts to children at different ages.',
    thumbnail: '/placeholders/parents-teaching.png',
    tags: ['parenting', 'finance', 'education'],
  },
  {
    id: 'parents-2',
    title: 'Family Budgeting 101',
    type: 'video',
    category: 'parents',
    summary: 'Learn how to create a family budget that works for everyone and helps you achieve your financial goals together.',
    thumbnail: '/placeholders/parents-budgeting.png',
    tags: ['budgeting', 'family', 'finance'],
  },
  {
    id: 'parents-3',
    title: 'The Power of Allowance',
    type: 'interactive',
    category: 'parents',
    summary: 'An interactive guide to setting up an allowance system that teaches responsibility and financial literacy.',
    thumbnail: '/placeholders/parents-allowance.png',
    tags: ['allowance', 'parenting', 'chores'],
  },
];
