import React, { useState } from 'react';
import { resources, Resource } from '../data/resources';
import { Search, BookOpen, PlayCircle, MousePointerClick } from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kids' | 'parents'>('kids');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | Resource['type']>('all');

  const filteredResources = resources.filter(resource => {
    const matchesCategory = resource.category === activeTab;
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) || resource.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    return matchesCategory && matchesSearch && matchesType;
  });

  const renderIcon = (type: Resource['type']) => {
    switch (type) {
      case 'article':
        return <BookOpen className="h-6 w-6 text-primary-600" />;
      case 'video':
        return <PlayCircle className="h-6 w-6 text-secondary-600" />;
      case 'interactive':
        return <MousePointerClick className="h-6 w-6 text-accent-600" />;
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Resources</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Financial education for the whole family.</p>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex space-x-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
          <button onClick={() => setActiveTab('kids')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'kids' ? 'bg-white dark:bg-neutral-700 shadow' : 'text-neutral-600 dark:text-neutral-300'}`}>For Kids</button>
          <button onClick={() => setActiveTab('parents')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'parents' ? 'bg-white dark:bg-neutral-700 shadow' : 'text-neutral-600 dark:text-neutral-300'}`}>For Parents</button>
        </div>
        <div className="flex space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
            />
          </div>
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as any)}
            className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
          >
            <option value="all">All Types</option>
            <option value="article">Articles</option>
            <option value="video">Videos</option>
            <option value="interactive">Interactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map(resource => (
          <div key={resource.id} className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform">
            <img src={resource.thumbnail} alt={resource.title} className="w-full h-40 object-cover" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${resource.type === 'article' ? 'text-primary-600' : resource.type === 'video' ? 'text-secondary-600' : 'text-accent-600'}`}>{resource.type}</span>
                {renderIcon(resource.type)}
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{resource.title}</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{resource.summary}</p>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
