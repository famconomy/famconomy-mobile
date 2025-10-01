
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, Filter, Search, ShoppingCart, MoreVertical, Check, X, Archive, Share2, Copy, Home, Circle, Users, GraduationCap, Package, User, Calendar, List, Wand2 } from 'lucide-react';
import { ShoppingList, ShoppingItem, ShoppingCategory, Meal, MealPlanWeek, MealSlot } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useFamily } from '../hooks/useFamily';
import { useLinZChat } from '../hooks/useLinZChat';
import { getShoppingLists, createShoppingList, archiveShoppingList, deleteShoppingList, addMealPlanToShoppingList } from '../api/shoppingLists';
import { getShoppingItems, createShoppingItem, updateShoppingItem } from '../api/shoppingItems';
import { getMeals, getMealPlan, upsertMealPlanEntry } from '../api/meals';
import { generateMealWithIngredients, getMealSuggestions } from '../api/linz';
import { MealSuggestion } from '../types';
import { getIntegrationStatus } from '../api/integrations';
import { InstacartExportView } from '../components/integrations/InstacartExportView';

const categoryIcons: Record<ShoppingCategory, React.ReactNode> = {
  groceries: <ShoppingCart size={16} />,
  household: <Home size={16} />,
  personal: <User size={16} />,
  school: <GraduationCap size={16} />,
  other: <Package size={16} />
};

const categoryColors: Record<ShoppingCategory, string> = {
  groceries: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
  household: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/50 dark:text-secondary-300',
  personal: 'bg-accent-100 text-accent-800 dark:bg-accent-900/50 dark:text-accent-300',
  school: 'bg-highlight-teal/20 text-highlight-teal dark:bg-highlight-teal/30',
  other: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
};

export const ShoppingPage: React.FC = () => {
  const { user } = useAuth();
  const { family } = useFamily();
  const { openChat, appendLinZMessage } = useLinZChat();

  const [showInstacartExport, setShowInstacartExport] = useState(false);
  const [integrations, setIntegrations] = useState<string[]>([]);

  useEffect(() => {
    getIntegrationStatus().then(setIntegrations);
  }, []);

  const [isCreatingMeal, setIsCreatingMeal] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSeeAllSuggestions = () => {
    if (meals.length === 0) {
      openChat();
      appendLinZMessage("Let's talk about your family's favorite meals to get some suggestions started!");
    } else {
      // For now, do nothing.
    }
  };

  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showNewMealModal, setShowNewMealModal] = useState(false); // New state for the meal modal
  const [showDeleteListModal, setShowDeleteListModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [moreMenuRef]);

  const [activeTab, setActiveTab] = useState<'lists' | 'meal-planner'>('lists');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanWeek[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    const today = new Date();
    const monday = new Date(today);
    const day = monday.getDay();
    const offset = day === 0 ? -6 : 1 - day; // Sunday -> previous Monday, otherwise current week Monday
    monday.setDate(monday.getDate() + offset);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  });
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newListName, setNewListName] = useState('');
  const [newMealName, setNewMealName] = useState('');
  const [newMealDescription, setNewMealDescription] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const validateItemForm = () => {
    const errors: { [key: string]: string } = {};
    if (!newItemName) {
      errors.newItemName = 'Item name is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemCategoryID, setNewItemCategoryID] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const validateListForm = () => {
    const errors: { [key: string]: string } = {};
    if (!newListName) {
      errors.newListName = 'List name is required.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchShoppingData = useCallback(async () => {
    if (!family) return;
    try {
      setIsLoading(true);
      const listsData = await getShoppingLists(family.FamilyID.toString(), filter);
      setShoppingLists(listsData);
      if (listsData.length > 0) {
        setSelectedList(listsData[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [family, filter]);

  const fetchMealsData = useCallback(async () => {
    if (!family) return;
    try {
      const [mealList, plan] = await Promise.all([
        getMeals(family.FamilyID),
        getMealPlan(family.FamilyID, { weekStart: selectedWeekStart }),
      ]);
      setMeals(mealList);
      setMealPlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meals');
    }
  }, [family, selectedWeekStart]);

  useEffect(() => {
    fetchShoppingData();
  }, [fetchShoppingData, filter]);

  useEffect(() => {
    if (activeTab === 'meal-planner') {
      fetchMealsData();
    }
  }, [activeTab, fetchMealsData]);

  const handleCreateList = async () => {
    if (!validateListForm()) {
      return;
    }
    if (!family || !user) return;
    try {
      await createShoppingList({
        FamilyID: family.FamilyID,
        Name: newListName,
        CreatedByUserID: user.id,
      });
      setNewListName('');
      setShowNewListModal(false);
      fetchShoppingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create list');
    }
  };

  const handleCreateItem = async () => {
    if (!validateItemForm()) {
      return;
    }
    if (!selectedList || !user) return;
    try {
      await createShoppingItem({
        ShoppingListID: selectedList.ShoppingListID,
        Name: newItemName,
        Quantity: newItemQuantity,
        Unit: newItemUnit,
        AddedByUserID: user.id,
        CategoryID: newItemCategoryID,
      });
      setNewItemName('');
      setNewItemQuantity(1);
      setNewItemUnit('');
      setNewItemCategoryID(null);
      setShowNewItemModal(false);
      fetchShoppingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    }
  };

  const handleCreateMeal = async () => {
    if (!family || !user || !newMealName.trim()) return;

    setIsCreatingMeal(true);
    try {
      await generateMealWithIngredients(newMealName, family.FamilyID, user.id);
      toast.success(`Successfully created meal "${newMealName}" with ingredients!`);
      setNewMealName('');
      setNewMealDescription('');
      setShowNewMealModal(false);
      fetchMealsData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create meal with LinZ');
      setError(err instanceof Error ? err.message : 'Failed to create meal with LinZ');
    } finally {
      setIsCreatingMeal(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!family) return;

    if (meals.length === 0) {
      openChat();
      appendLinZMessage("I don't have any meal history for you yet. Let's talk about your family's favorite meals to get some suggestions started!");
      return;
    }

    setIsSuggesting(true);
    try {
      const newSuggestions = await getMealSuggestions(family.FamilyID);
      setSuggestions(newSuggestions);
      toast.success('LinZ has some ideas for your meal plan!');
    } catch (err) {
      toast.error('LinZ had trouble coming up with suggestions.');
    } finally {
      setIsSuggesting(false);
    }
  };
  const handleDeleteList = async () => {
    if (!selectedList) return;
    try {
      await deleteShoppingList(selectedList.ShoppingListID.toString());
      setShowDeleteListModal(false);
      fetchShoppingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete list');
    }
  };

  const handleCopyList = () => {
    if (!selectedList) return;

    const listAsString = selectedList.ShoppingItems.map(
      (item) => `${item.Quantity} ${item.Unit || ''} ${item.Name}`.trim()
    ).join('\n');

    navigator.clipboard.writeText(listAsString).then(() => {
      toast.success('List copied to clipboard!');
    }, (err) => {
      toast.error('Failed to copy list.');
      console.error('Could not copy text: ', err);
    });
  };

  const handleArchiveList = async () => {
    if (!selectedList) return;
    try {
      await archiveShoppingList(selectedList.ShoppingListID.toString());
      fetchShoppingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive list');
    }
  };

  const handleToggleItemCompletion = async (item: ShoppingItem) => {
    try {
      await updateShoppingItem(item.ShoppingItemID.toString(), { Completed: !item.Completed });
      fetchShoppingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    }
  };

  const filteredLists = shoppingLists.filter(list => {
    return list.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           list.ShoppingItems.some(item => item.Name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const completedItems = selectedList?.ShoppingItems.filter(item => item.Completed).length || 0;
  const totalItems = selectedList?.ShoppingItems.length || 0;

  const renderTabs = () => (
    <div className="border-b border-neutral-200 dark:border-neutral-700">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        <button
          onClick={() => setActiveTab('lists')}
          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'lists'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400'
          }`}
        >
          <span className="inline-flex items-center gap-2"><List size={16} /> Lists</span>
        </button>
        <button
          onClick={() => setActiveTab('meal-planner')}
          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'meal-planner'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400'
          }`}
        >
          <span className="inline-flex items-center gap-2"><Calendar size={16} /> Meal Planner</span>
        </button>
      </nav>
    </div>
  );

  const weekDays = useMemo(() => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], []);
  const mealSlots: Array<{ slot: MealSlot; label: string }> = [
    { slot: 'BREAKFAST', label: 'Breakfast' },
    { slot: 'LUNCH', label: 'Lunch' },
    { slot: 'DINNER', label: 'Dinner' },
    { slot: 'SNACK', label: 'Snack' },
  ];

  const weekEntries = useMemo(() => {
    const week = mealPlan.find(plan => plan.WeekStart.startsWith(selectedWeekStart));
    const map: Record<string, MealPlanWeek['Entries'][number]> = {};
    if (week) {
      for (const entry of week.Entries) {
        map[`${entry.DayOfWeek}-${entry.MealSlot}`] = entry;
      }
    }
    return map;
  }, [mealPlan, selectedWeekStart]);

  const handleAssignMeal = async (dayIndex: number, slot: MealSlot, mealId: number) => {
    if (!family || !user) return;
    try {
      await upsertMealPlanEntry(family.FamilyID, {
        WeekStart: selectedWeekStart,
        DayOfWeek: dayIndex,
        MealSlot: slot,
        MealID: mealId,
        Servings: meals.find(m => m.MealID === mealId)?.DefaultServings ?? 4,
        AddedByUserID: user.id,
      });
      fetchMealsData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add meal');
    }
  };

  const handleGenerateShoppingList = async () => {
    if (!selectedList) {
      toast.info('Please select a shopping list first.');
      return;
    }
    if (!family) return;

    setIsGeneratingList(true);
    try {
      await addMealPlanToShoppingList(family.FamilyID, selectedWeekStart, selectedList.ShoppingListID);
      toast.success('Ingredients from your meal plan have been added to the list!');
      fetchShoppingData(); // Refresh the shopping list data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate shopping list.');
    }
    finally {
      setIsGeneratingList(false);
    }
  };

  const renderMealPlanner = () => (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Weekly Meal Plan</h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">Assign meals to each day and slot. LinZ will sync picked meals to your lists.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedWeekStart}
                onChange={(event) => setSelectedWeekStart(event.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button 
                onClick={handleGenerateShoppingList}
                disabled={isGeneratingList}
                className="flex items-center px-3 py-2 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400 transition-colors disabled:bg-primary-300 dark:disabled:bg-primary-700"
              >
                <Wand2 size={18} className="mr-2" />
                <span>{isGeneratingList ? 'Generating...' : 'Generate Shopping List'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="text-left text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400 w-28">Meal</th>
                  {weekDays.map((day, index) => (
                    <th key={day} className="text-left text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400 px-2">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mealSlots.map(({ slot, label }) => (
                  <tr key={slot}>
                    <td className="align-top pr-2 pt-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</td>
                    {weekDays.map((_, index) => {
                      const key = `${index}-${slot}`;
                      const entry = weekEntries[key];
                      const suggestion = suggestions.find(s => s.dayOfWeek === index && s.mealSlot === slot);
                      const suggestedMeal = suggestion ? meals.find(m => m.MealID === suggestion.mealId) : null;

                      return (
                        <td key={key} className="align-top px-2">
                          <div className={`rounded-xl border border-dashed p-3 min-h-[110px] flex flex-col gap-3 transition-all ${
                            suggestion ? 'border-primary-500 animate-pulse-slow' : 'border-neutral-200 dark:border-neutral-700'
                          } bg-neutral-50/60 dark:bg-neutral-800/40`}>
                            {entry ? (
                              <div>
                                <div className="font-semibold text-neutral-900 dark:text-white truncate">{entry.Meal?.Title ?? 'Meal removed'}</div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">Serves {entry.Servings}</div>
                              </div>
                            ) : suggestion && suggestedMeal ? (
                              <div className="flex flex-col h-full">
                                <p className="text-xs text-primary-500 font-semibold">Suggestion:</p>
                                <p className="font-semibold text-neutral-900 dark:text-white truncate">{suggestedMeal.Title}</p>
                                <div className="mt-auto flex gap-2">
                                  <button onClick={() => { 
                                    handleAssignMeal(index, slot, suggestedMeal.MealID);
                                    setSuggestions(prev => prev.filter(s => s !== suggestion));
                                   }} className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Accept</button>
                                  <button onClick={() => setSuggestions(prev => prev.filter(s => s !== suggestion))} className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Decline</button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-neutral-400 dark:text-neutral-500">Tap a meal to assign</div>
                            )}
                            <div className="mt-auto">
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Suggestions</div>
                              <div className="flex flex-wrap gap-2">
                                {meals.slice(0, 3).map(meal => (
                                  <button
                                    key={`${key}-${meal.MealID}`}
                                    onClick={() => handleAssignMeal(index, slot, meal.MealID)}
                                    className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/60"
                                  >
                                    {meal.Title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:w-1/3 space-y-4">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Family Suggestions</h3>
              <button onClick={handleSeeAllSuggestions} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">See all</button>
            </div>
            <div className="space-y-3">
              {meals.slice(0, 5).map(meal => (
                <div key={meal.MealID} className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-neutral-900 dark:text-white">{meal.Title}</h4>
                      {meal.IsFavorite && <span className="text-xs text-primary-500">Favorite</span>}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{meal.Description || 'No description yet.'}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {meal.Tags?.map(tag => (
                        <span key={tag.MealTagID} className="text-[11px] px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300">{tag.Tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-primary-50/70 dark:bg-primary-900/40 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300 mb-2">LinZ Assist</h3>
            <p className="text-xs text-primary-700/80 dark:text-primary-200/80">LinZ will import ingredients from your confirmed meals into the active shopping list. Tap the bubble to ask for recipe ideas or substitutions.</p>
            <button className="mt-3 inline-flex items-center gap-2 text-xs text-primary-700 hover:text-primary-800 dark:text-primary-200" onClick={() => {
              openChat();
              appendLinZMessage('Can you give me some recipe ideas?');
            }}>
              <Wand2 size={14} /> Ask LinZ for a recipe
            </button>
            <button 
              onClick={handleGetSuggestions}
              disabled={isSuggesting}
              className="mt-3 inline-flex items-center gap-2 text-xs text-primary-700 hover:text-primary-800 dark:text-primary-200 disabled:opacity-50"
            >
              <Wand2 size={14} /> {isSuggesting ? 'Thinking...' : 'Get Meal Suggestions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading && activeTab === 'lists') return <div>Loading shopping lists...</div>;
  if (error) return <div className="text-error-500">Error: {error}</div>;

  return (
    <div id="shopping-lists-panel" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Shopping Lists</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Manage family shopping lists and track expenses</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 md:flex-none md:min-w-[200px]">
            <input
              type="text"
              placeholder="Search lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            />
            <Search className="absolute left-3 top-2.5 text-neutral-400 dark:text-neutral-500" size={18} />
          </div>

          {activeTab === 'lists' ? (
            <button 
              onClick={() => setShowNewListModal(true)}
              className="flex items-center px-3 py-2 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400 transition-colors"
            >
              <Plus size={18} className="mr-2" />
              <span>New List</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowNewMealModal(true)} // This will be implemented next
              className="flex items-center px-3 py-2 rounded-2xl bg-secondary-500 text-white hover:bg-secondary-600 dark:hover:bg-secondary-400 transition-colors"
            >
              <Plus size={18} className="mr-2" />
              <span>New Meal</span>
            </button>
          )}
        </div>
      </div>

      {renderTabs()}

      {activeTab === 'meal-planner' ? (
        renderMealPlanner()
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lists Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-neutral-800 rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900 dark:text-white">Your Lists</h2>
              <div className="flex items-center space-x-2">
                <button onClick={() => setFilter('all')} className={`px-2 py-1 text-xs rounded-lg ${filter === 'all' ? 'bg-primary-100 text-primary-700' : 'text-neutral-500'}`}>All</button>
                <button onClick={() => setFilter('active')} className={`px-2 py-1 text-xs rounded-lg ${filter === 'active' ? 'bg-primary-100 text-primary-700' : 'text-neutral-500'}`}>Active</button>
                <button onClick={() => setFilter('archived')} className={`px-2 py-1 text-xs rounded-lg ${filter === 'archived' ? 'bg-primary-100 text-primary-700' : 'text-neutral-500'}`}>Archived</button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {filteredLists.map((list) => (
              <button
                key={list.ShoppingListID}
                onClick={() => setSelectedList(list)}
                className={`w-full p-4 text-left transition-colors ${
                  selectedList?.ShoppingListID === list.ShoppingListID
                    ? 'bg-primary-50 dark:bg-primary-900/30'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-neutral-900 dark:text-white">{list.Name}</h3>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {new Date(list.CreatedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {list.ShoppingItems.length} items
                  </span>
                  {/* Shared status removed as backend does not support it */}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected List */}
        {selectedList ? (
          <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-2xl shadow-card">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    {selectedList.Name}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {completedItems} of {totalItems} items completed
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button onClick={handleCopyList} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700">
                    <Copy size={18} />
                  </button>
                  {integrations.includes('INSTACART') && (
                    <button onClick={() => setShowInstacartExport(true)} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700">
                      <Share2 size={18} />
                    </button>
                  )}
                  <button onClick={handleArchiveList} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700">
                    <Archive size={18} />
                  </button>
                  <div className="relative" ref={moreMenuRef}>
                    <button onClick={() => setShowMoreMenu(prev => !prev)} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700">
                      <MoreVertical size={18} />
                    </button>
                    {showMoreMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-md shadow-lg z-10">
                        <button
                          onClick={() => {
                            setShowDeleteListModal(true);
                            setShowMoreMenu(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-error-600 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${(completedItems / totalItems) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Est. Total</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-white">${(totalItems * 3.5).toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="p-4">
              <button
                onClick={() => setShowNewItemModal(true)}
                className="w-full p-3 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-primary-500 hover:text-primary-500 dark:hover:border-primary-400 dark:hover:text-primary-400 transition-colors"
              >
                <Plus size={20} className="mx-auto" />
                <span className="block mt-1 text-sm">Add Item</span>
              </button>

              <div className="mt-4 space-y-2">
                {selectedList.ShoppingItems.map((item) => (
                  <motion.div
                    key={item.ShoppingItemID}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 ${
                      item.Completed ? 'bg-neutral-50 dark:bg-neutral-800/50' : 'bg-white dark:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center">
                      <button
                        onClick={() => handleToggleItemCompletion(item)}
                        className={`p-2 rounded-xl ${
                          item.Completed
                            ? 'text-primary-500 dark:text-primary-400'
                            : 'text-neutral-400 dark:text-neutral-500 hover:text-primary-500 dark:hover:text-primary-400'
                        }`}
                      >
                        {item.Completed ? <Check size={20} /> : <Circle size={20} />}
                      </button>

                      <div className="flex-1 ml-3">
                        <div className="flex items-center">
                          <h3 className={`font-medium ${
                            item.Completed
                              ? 'text-neutral-400 dark:text-neutral-500 line-through'
                              : 'text-neutral-900 dark:text-white'
                          }`}>
                            {item.Name}
                          </h3>
                        </div>
                        <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                          {item.Quantity} {item.Unit}
                        </div>
                      </div>

                      <button onClick={() => toast.info('More options coming soon!')} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-2xl shadow-card flex items-center justify-center p-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300 mx-auto mb-4">
                <ShoppingCart size={32} />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                No list selected
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                Select a list from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* New List Modal */}
      <AnimatePresence>
        {showNewListModal && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg max-w-lg w-full"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Create New List
                </h3>
                <button
                  onClick={() => setShowNewListModal(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  &times;
                </button>
              </div>

              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      List Name
                    </label>
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border ${formErrors.newListName ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400`}
                      placeholder="Enter list name"
                    />
                    {formErrors.newListName && <p className="text-red-500 text-xs mt-1">{formErrors.newListName}</p>}
                  </div>

                  {/* Template, Share with family, Enable notifications removed as backend does not support them */}
                </div>
              </div>

              <div className="flex justify-end p-4 border-t border-neutral-200 dark:border-neutral-700 space-x-3">
                <button
                  onClick={() => setShowNewListModal(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateList}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl"
                >
                  Create List
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Item Modal */}
      <AnimatePresence>
        {showNewItemModal && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg max-w-lg w-full"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Add New Item
                </h3>
                <button
                  onClick={() => setShowNewItemModal(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  &times;
                </button>
              </div>

              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border ${formErrors.newItemName ? 'border-red-500' : 'border-neutral-200 dark:border-neutral-700'} bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400`}
                      placeholder="Enter item name"
                    />
                    {formErrors.newItemName && <p className="text-red-500 text-xs mt-1">{formErrors.newItemName}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                        placeholder="e.g., pieces, lbs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Category
                    </label>
                    <select
                      value={newItemCategoryID ?? ''}
                      onChange={(e) => setNewItemCategoryID(parseInt(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
                    >
                      <option value="">Select a category</option>
                      <option value="1">Groceries</option>
                      <option value="2">Household</option>
                      <option value="3">Personal</option>
                      <option value="4">School</option>
                      <option value="5">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end p-4 border-t border-neutral-200 dark:border-neutral-700 space-x-3">
                <button
                  onClick={() => setShowNewItemModal(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateItem}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl"
                >
                  Add Item
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Meal Modal */}
      <AnimatePresence>
        {showNewMealModal && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg max-w-lg w-full"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Create New Meal
                </h3>
                <button
                  onClick={() => setShowNewMealModal(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  &times;
                </button>
              </div>

              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Meal Name
                    </label>
                    <input
                      type="text"
                      value={newMealName}
                      onChange={(e) => setNewMealName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400`}
                      placeholder="Enter meal name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newMealDescription}
                      onChange={(e) => setNewMealDescription(e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400`}
                      placeholder="Enter a brief description"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end p-4 border-t border-neutral-200 dark:border-neutral-700 space-x-3">
                <button
                  onClick={() => setShowNewMealModal(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMeal}
                  disabled={isCreatingMeal}
                  className="px-4 py-2 text-sm font-medium text-white bg-secondary-500 hover:bg-secondary-600 dark:hover:bg-secondary-400 rounded-xl disabled:bg-secondary-300 dark:disabled:bg-secondary-700"
                >
                  {isCreatingMeal ? 'LinZ is thinking...' : 'Create Meal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete List Modal */}
      <AnimatePresence>
        {showDeleteListModal && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg max-w-lg w-full"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Delete List
                </h3>
                <button
                  onClick={() => setShowDeleteListModal(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  &times;
                </button>
              </div>

              <div className="p-4">
                <p>Are you sure you want to delete this list? This action cannot be undone.</p>
              </div>

              <div className="flex justify-end p-4 border-t border-neutral-200 dark:border-neutral-700 space-x-3">
                <button
                  onClick={() => setShowDeleteListModal(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteList}
                  className="px-4 py-2 text-sm font-medium text-white bg-error-600 hover:bg-error-700 rounded-xl"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instacart Export Modal */}
      <AnimatePresence>
        {showInstacartExport && selectedList && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg max-w-4xl w-full h-full max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
                  Export to Instacart
                </h3>
                <button
                  onClick={() => setShowInstacartExport(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  &times;
                </button>
              </div>

              <div className="p-4 flex-grow overflow-hidden">
                <InstacartExportView items={selectedList.ShoppingItems} />
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
