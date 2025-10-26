// Educational Resources Data
// This is static data for educational resources about family finance

export interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'interactive';
  category: 'kids' | 'parents';
  summary: string;
  thumbnail: string;
  tags: string[];
  content?: string; // Full content for detail view
  url?: string; // External link
}

export const resources: Resource[] = [
  // Kids Resources
  {
    id: 'kids-1',
    title: 'What is Money?',
    type: 'interactive',
    category: 'kids',
    summary: 'An interactive lesson on the basics of money, where it comes from, and what it is used for.',
    thumbnail: 'https://via.placeholder.com/400x250/3b82f6/ffffff?text=What+is+Money',
    tags: ['money', 'basics', 'kids'],
    content: 'Learn about money, coins, bills, and how people use money to buy things they need and want.',
  },
  {
    id: 'kids-2',
    title: 'Saving for a Goal',
    type: 'video',
    category: 'kids',
    summary: 'A short video on how to save money for a toy, a game, or anything else you want.',
    thumbnail: 'https://via.placeholder.com/400x250/10b981/ffffff?text=Saving+Goals',
    tags: ['saving', 'goals', 'kids'],
    content: 'Setting a savings goal helps you save money for something special. Learn how to make a plan!',
  },
  {
    id: 'kids-3',
    title: 'Needs vs. Wants',
    type: 'article',
    category: 'kids',
    summary: 'Learn the difference between things you need and things you want, and how to make smart choices.',
    thumbnail: 'https://via.placeholder.com/400x250/f59e0b/ffffff?text=Needs+vs+Wants',
    tags: ['needs', 'wants', 'choices', 'kids'],
    content: 'Needs are things you must have to live, like food and shelter. Wants are things that would be nice to have.',
  },

  // Parents Resources
  {
    id: 'parents-1',
    title: 'Teaching Kids About Money',
    type: 'article',
    category: 'parents',
    summary: 'A guide for parents on how to introduce financial concepts to children at different ages.',
    thumbnail: 'https://via.placeholder.com/400x250/8b5cf6/ffffff?text=Teaching+Money',
    tags: ['parenting', 'finance', 'education'],
    content: 'Age-appropriate strategies for teaching children about earning, saving, spending, and giving.',
  },
  {
    id: 'parents-2',
    title: 'Family Budgeting 101',
    type: 'video',
    category: 'parents',
    summary: 'Learn how to create a family budget that works for everyone and helps you achieve your financial goals together.',
    thumbnail: 'https://via.placeholder.com/400x250/ec4899/ffffff?text=Family+Budget',
    tags: ['budgeting', 'family', 'finance'],
    content: 'Creating a family budget involves tracking income, expenses, and setting aside money for savings and goals.',
  },
  {
    id: 'parents-3',
    title: 'The Power of Allowance',
    type: 'interactive',
    category: 'parents',
    summary: 'An interactive guide to setting up an allowance system that teaches responsibility and financial literacy.',
    thumbnail: 'https://via.placeholder.com/400x250/06b6d4/ffffff?text=Allowance+System',
    tags: ['allowance', 'parenting', 'chores'],
    content: 'Allowance can be a powerful tool for teaching kids about money management, responsibility, and work ethic.',
  },
  {
    id: 'parents-4',
    title: 'Building Emergency Funds',
    type: 'article',
    category: 'parents',
    summary: 'Why every family needs an emergency fund and how to start building one today.',
    thumbnail: 'https://via.placeholder.com/400x250/ef4444/ffffff?text=Emergency+Fund',
    tags: ['savings', 'emergency', 'planning'],
    content: 'An emergency fund provides financial security when unexpected expenses arise. Aim for 3-6 months of expenses.',
  },
  {
    id: 'kids-4',
    title: 'Earning and Spending',
    type: 'video',
    category: 'kids',
    summary: 'Learn how people earn money through work and how to make smart spending decisions.',
    thumbnail: 'https://via.placeholder.com/400x250/14b8a6/ffffff?text=Earn+and+Spend',
    tags: ['earning', 'spending', 'work', 'kids'],
    content: 'People work to earn money, then use that money to buy things they need and want.',
  },
  {
    id: 'kids-5',
    title: 'The Giving Jar',
    type: 'interactive',
    category: 'kids',
    summary: 'Discover the joy of giving and how sharing with others makes a difference.',
    thumbnail: 'https://via.placeholder.com/400x250/f97316/ffffff?text=Giving+Jar',
    tags: ['giving', 'charity', 'kindness', 'kids'],
    content: 'Giving to others is an important part of managing money. Learn about charity and helping those in need.',
  },
  {
    id: 'parents-5',
    title: 'Digital Money Management',
    type: 'article',
    category: 'parents',
    summary: 'Teaching kids about credit cards, debit cards, and online transactions in a digital age.',
    thumbnail: 'https://via.placeholder.com/400x250/a855f7/ffffff?text=Digital+Money',
    tags: ['digital', 'cards', 'technology'],
    content: 'In today\'s digital world, children need to understand online payments, security, and responsible card use.',
  },
];

export const getResourcesByCategory = (category: 'kids' | 'parents'): Resource[] => {
  return resources.filter(r => r.category === category);
};

export const getResourceById = (id: string): Resource | undefined => {
  return resources.find(r => r.id === id);
};

export const searchResources = (query: string, category?: 'kids' | 'parents'): Resource[] => {
  const lowerQuery = query.toLowerCase();
  return resources.filter(r => {
    const matchesCategory = !category || r.category === category;
    const matchesSearch = 
      r.title.toLowerCase().includes(lowerQuery) ||
      r.summary.toLowerCase().includes(lowerQuery) ||
      r.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
    return matchesCategory && matchesSearch;
  });
};
