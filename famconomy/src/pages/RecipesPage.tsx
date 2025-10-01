import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Heart,
  Share2,
  Plus,
  Upload,
  Calendar,
  Users,
  Clock,
  BookOpen,
  Quote,
  Loader2,
  Feather,
  Bookmark,
  BookmarkCheck,
  Link2,
  Wand2,
  Trash2,
  Pencil,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { useFamily } from '../hooks/useFamily';
import {
  createRecipe,
  createRecipeMemory,
  deleteRecipe,
  getRecipe,
  getRecipeMemories,
  getRecipes,
  importRecipe,
  importRecipeFromScan,
  shareRecipe,
  toggleRecipeFavorite,
  updateRecipe,
} from '../api/recipes';
import type {
  Recipe,
  RecipeInput,
  RecipeIngredient,
  RecipeMemory,
  RecipeStep,
} from '../types';

type RecipeFormState = {
  Title: string;
  Subtitle: string;
  Description: string;
  OriginStory: string;
  TraditionNotes: string;
  FirstCookedAt: string;
  Servings: string;
  PrepMinutes: string;
  CookMinutes: string;
  CoverImageUrl: string;
  Visibility: 'FAMILY' | 'LINK';
  Ingredients: Array<{ SectionTitle: string; Name: string; Quantity: string; Notes: string }>;
  Steps: Array<{ SectionTitle: string; Instruction: string; Tip: string }>;
};

interface ImportRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => Promise<void>;
  submitting: boolean;
}

const ImportRecipeModal: React.FC<ImportRecipeModalProps> = ({ isOpen, onClose, onSubmit, submitting }) => {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setUrl('');
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url.trim()) {
      toast.error('Paste a recipe link to import.');
      return;
    }
    await onSubmit(url.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Upload size={18} /> Import from the web
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            LinZ will invite Mealie to gently gather the ingredients and steps from the recipe you share.
          </p>
        </div>
        <div className="px-6 py-6 space-y-4">
          <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Recipe URL</label>
          <input
            type="url"
            value={url}
            onChange={event => setUrl(event.target.value)}
            className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="https://example.com/best-family-lasagna"
            required
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            We respect original creators—imported recipes stay private to your family unless you choose to share.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-secondary-600 text-white px-5 py-2 text-sm font-medium hover:bg-secondary-700 disabled:bg-secondary-300"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Import recipe
          </button>
        </div>
      </motion.form>
    </div>
  );
};

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { Message: string; StoryTitle?: string }) => Promise<void>;
  submitting: boolean;
}

interface ScanRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (file: File) => Promise<void>;
  submitting: boolean;
}

const ScanRecipeModal: React.FC<ScanRecipeModalProps> = ({ isOpen, onClose, onSubmit, submitting }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [isOpen, previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (nextFile) {
      setFile(nextFile);
      setPreviewUrl(URL.createObjectURL(nextFile));
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error('Choose a photo of the recipe to continue.');
      return;
    }
    await onSubmit(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Upload size={18} /> Import from a photo
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Upload a clear picture of a recipe card or magazine clipping. We will transcribe it and let you review before saving.
          </p>
        </div>
        <div className="px-6 py-6 space-y-4">
          <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Recipe image</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="w-full text-sm text-neutral-600 dark:text-neutral-300"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Tip: take the photo straight on, in good lighting, so the handwriting or print is easy to read.
          </p>
          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <img src={previewUrl} alt="Recipe preview" className="w-full max-h-64 object-cover" />
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !file}
            className="inline-flex items-center gap-2 rounded-full bg-secondary-600 text-white px-5 py-2 text-sm font-medium hover:bg-secondary-700 disabled:bg-secondary-300"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Import scan
          </button>
        </div>
      </motion.form>
    </div>
  );
};

const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose, onSubmit, submitting }) => {
  const [storyTitle, setStoryTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStoryTitle('');
      setMessage('');
    }
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) {
      toast.error('Share a memory to save it.');
      return;
    }
    await onSubmit({
      Message: message.trim(),
      StoryTitle: storyTitle.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Feather size={18} /> Add a family memory
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Your words become part of the recipe’s story for future generations.
          </p>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Memory title</label>
            <input
              type="text"
              value={storyTitle}
              onChange={event => setStoryTitle(event.target.value)}
              className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-highlight-teal"
              placeholder="First snow day stew, 1998"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Memory</label>
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-highlight-teal"
              placeholder="Share the laughter, the smell in the kitchen, the person who taught you the trick."
              required
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-highlight-teal text-white px-5 py-2 text-sm font-medium hover:bg-highlight-teal/80 disabled:bg-highlight-teal/50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Save memory
          </button>
        </div>
      </motion.form>
    </div>
  );
};

export const RecipesPage: React.FC = () => {
  const { family } = useFamily();

  const familyId = family?.FamilyID;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [memories, setMemories] = useState<RecipeMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [recipeForModal, setRecipeForModal] = useState<Recipe | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [memorySubmitting, setMemorySubmitting] = useState(false);

  const fetchRecipes = useCallback(async () => {
    if (!familyId) return;
    try {
      setIsLoading(true);
      const data = await getRecipes(familyId);
      setRecipes(data);
      if (data.length) {
        const first = data[0];
        setSelectedRecipe(first);
        setMemories(first.Memories ?? []);
      } else {
        setSelectedRecipe(null);
        setMemories([]);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch recipes', err);
      setError('We had trouble loading your recipes.');
    } finally {
      setIsLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  const loadRecipeDetails = useCallback(async (recipeId: number) => {
    if (!familyId) return;
    try {
      setIsDetailsLoading(true);
      const recipe = await getRecipe(familyId, recipeId);
      setSelectedRecipe(recipe);
      if (recipe.Memories) {
        setMemories(recipe.Memories);
      } else {
        const notes = await getRecipeMemories(familyId, recipeId);
        setMemories(notes);
      }
    } catch (err) {
      console.error('Failed to load recipe', err);
      toast.error('Could not open this recipe right now.');
    } finally {
      setIsDetailsLoading(false);
    }
  }, [familyId]);

  const handleCreateRecipe = async (payload: RecipeInput) => {
    if (!familyId) return;
    try {
      setSubmitting(true);
      const recipe = await createRecipe(familyId, payload);
      toast.success('Recipe tucked safely into your family collection.');
      setRecipes(prev => [recipe, ...prev]);
      setSelectedRecipe(recipe);
      setMemories(recipe.Memories ?? []);
      setIsCreateOpen(false);
      setRecipeForModal(null);
    } catch (err) {
      console.error('Create recipe failed', err);
      toast.error('We couldn’t save that recipe yet. Try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRecipe = async (payload: RecipeInput) => {
    const target = recipeForModal ?? selectedRecipe;
    if (!familyId || !target) return;
    try {
      setSubmitting(true);
      const recipe = await updateRecipe(familyId, target.RecipeID, payload);
      toast.success('Updates saved. Your family history just grew richer.');
      setRecipes(prev => prev.map(item => (item.RecipeID === recipe.RecipeID ? recipe : item)));
      setSelectedRecipe(recipe);
      setMemories(recipe.Memories ?? []);
      setIsCreateOpen(false);
      setRecipeForModal(null);
    } catch (err) {
      console.error('Update recipe failed', err);
      toast.error('Could not update the recipe yet.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportRecipe = async (url: string) => {
    if (!familyId) return;
    try {
      setSubmitting(true);
      const recipe = await importRecipe(familyId, url);
      toast.success('Recipe imported! Give it a quick glance and make it yours.');
      setRecipes(prev => [recipe, ...prev.filter(item => item.RecipeID !== recipe.RecipeID)]);
      setSelectedRecipe(recipe);
      setMemories(recipe.Memories ?? []);
      setIsImportOpen(false);
    } catch (err) {
      console.error('Import recipe failed', err);
      toast.error('We couldn’t gather that recipe. Double-check the link and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanRecipe = async (file: File) => {
    if (!familyId) return;
    try {
      setScanSubmitting(true);
      const recipe = await importRecipeFromScan(familyId, file);
      toast.success('Recipe scanned! Give it a review before serving.');
      setRecipes(prev => [recipe, ...prev.filter(item => item.RecipeID !== recipe.RecipeID)]);
      setSelectedRecipe(recipe);
      setMemories(recipe.Memories ?? []);
      setIsScanOpen(false);
    } catch (err) {
      console.error('Scan recipe failed', err);
      toast.error('We couldn’t read that photo. Try a clearer, well-lit picture.');
    } finally {
      setScanSubmitting(false);
    }
  };

  const handleFavoriteToggle = async (recipe: Recipe) => {
    if (!familyId) return;
    try {
      const { isFavorite } = await toggleRecipeFavorite(familyId, recipe.RecipeID);
      setRecipes(prev => prev.map(item => (item.RecipeID === recipe.RecipeID ? { ...item, isFavorite } : item)));
      if (selectedRecipe?.RecipeID === recipe.RecipeID) {
        setSelectedRecipe(prev => prev ? { ...prev, isFavorite } : prev);
      }
      toast.success(isFavorite ? 'Saved to your favorites.' : 'Removed from favorites.');
    } catch (err) {
      console.error('Toggle favorite failed', err);
      toast.error('Favorites are unavailable right now.');
    }
  };

  const handleShare = async (recipe: Recipe, visibility: 'FAMILY' | 'LINK') => {
    if (!familyId) return;
    try {
      const result = await shareRecipe(familyId, recipe.RecipeID, visibility);
      const shareUrl = result.shareToken
        ? `${window.location.origin}/share/recipes/${result.shareToken}`
        : undefined;
      setRecipes(prev => prev.map(item => (item.RecipeID === recipe.RecipeID ? { ...item, Visibility: result.visibility, ShareToken: result.shareToken } : item)));
      if (selectedRecipe?.RecipeID === recipe.RecipeID) {
        setSelectedRecipe(prev => prev ? { ...prev, Visibility: result.visibility, ShareToken: result.shareToken ?? null } : prev);
      }
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl).catch(() => undefined);
        toast.success('Link ready! We copied it so you can share with loved ones.');
      } else {
        toast.success('Sharing set to family only.');
      }
    } catch (err) {
      console.error('Share recipe failed', err);
      toast.error('We couldn’t adjust sharing right now.');
    }
  };

  const handleDelete = async (recipe: Recipe) => {
    if (!familyId) return;
    if (!window.confirm(`Remove “${recipe.Title}” from your family cookbook?`)) {
      return;
    }

    try {
      await deleteRecipe(familyId, recipe.RecipeID);
      toast.success('Recipe removed. You can always add it back.');
      setRecipes(prev => prev.filter(item => item.RecipeID !== recipe.RecipeID));
      if (selectedRecipe?.RecipeID === recipe.RecipeID) {
        setSelectedRecipe(null);
        setMemories([]);
      }
    } catch (err) {
      console.error('Delete recipe failed', err);
      toast.error('We couldn’t remove that recipe yet.');
    }
  };

  const handleCreateMemory = async (payload: { Message: string; StoryTitle?: string }) => {
    if (!familyId || !selectedRecipe) return;
    try {
      setMemorySubmitting(true);
      const memory = await createRecipeMemory(familyId, selectedRecipe.RecipeID, payload);
      toast.success('Memory saved. Future generations will smile reading this.');
      setMemories(prev => [memory, ...prev]);
      setIsMemoryOpen(false);
    } catch (err) {
      console.error('Create memory failed', err);
      toast.error('We couldn’t save that memory yet.');
    } finally {
      setMemorySubmitting(false);
    }
  };

  const favoriteCount = useMemo(() => recipes.filter(recipe => recipe.isFavorite).length, [recipes]);
  const heroRecipe = selectedRecipe ?? recipes[0] ?? null;

  return (
    <div className="space-y-8" id="recipes-page">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-200 via-rose-200 to-sky-200 dark:from-amber-600/30 dark:via-rose-600/30 dark:to-sky-600/30 p-6 md:p-10">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-neutral-900/70 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-200 shadow-sm">
            <BookOpen size={14} /> Family Recipes
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white">
            Preserve the dishes that taste like home.
          </h1>
          <p className="text-neutral-600 dark:text-neutral-200 text-sm md:text-base">
            Capture ingredients, memories, and little whispered tips so every generation can recreate the moments that matter.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                setRecipeForModal(null);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 text-white px-5 py-2 text-sm font-medium hover:bg-primary-700"
            >
              <Plus size={16} /> Start a new recipe
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/90 text-primary-600 px-5 py-2 text-sm font-medium hover:bg-white shadow-sm"
            >
              <Upload size={16} /> Import from URL
            </button>
            <button
              onClick={() => setIsScanOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 text-secondary-600 px-5 py-2 text-sm font-medium hover:bg-white shadow-sm"
            >
              <Wand2 size={16} /> Scan recipe card
            </button>
            <button
              onClick={() => setIsMemoryOpen(true)}
              disabled={!selectedRecipe}
              className="inline-flex items-center gap-2 rounded-full border border-white/60 text-white px-5 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-60"
            >
              <Feather size={16} /> Share a memory
            </button>
          </div>
        </div>
        {heroRecipe && (
          <div className="mt-8 md:absolute md:top-8 md:right-8 md:w-72">
            <div className="rounded-2xl bg-white/90 dark:bg-neutral-900/80 p-4 shadow-xl border border-white/40 dark:border-neutral-700">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Spotlight</p>
              <p className="text-lg font-semibold text-primary-600 dark:text-primary-300 mt-1">{heroRecipe.Title}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-3">{heroRecipe.Description ?? 'A treasured family favorite.'}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <span className="inline-flex items-center gap-1"><Users size={14} /> Serves {heroRecipe.Servings ?? '—'}</span>
                <span className="inline-flex items-center gap-1"><Clock size={14} /> Prep {heroRecipe.PrepMinutes ?? '—'} min</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,3fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Kitchen heirlooms</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{recipes.length} recipes · {favoriteCount} favorites</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-neutral-500">
              <Loader2 size={20} className="animate-spin mr-2" /> Gathering your family recipes...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-error-300 bg-error-50 px-4 py-6 text-error-600">
              {error}
            </div>
          ) : recipes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 p-10 text-center space-y-3">
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Start your family cookbook</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Add the first recipe that your family reaches for when comfort is needed.</p>
              <button
                onClick={() => {
                  setRecipeForModal(null);
                  setIsCreateOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-primary-600 text-white px-5 py-2 text-sm font-medium hover:bg-primary-700"
              >
                <Plus size={16} /> Add a treasured recipe
              </button>
              <button
                onClick={() => setIsScanOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white text-secondary-600 px-5 py-2 text-sm font-medium hover:bg-secondary-50 dark:bg-neutral-800 dark:text-secondary-300 dark:hover:bg-neutral-700"
              >
                <Wand2 size={16} /> Scan a recipe card
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {recipes.map(recipe => {
                const isSelected = selectedRecipe?.RecipeID === recipe.RecipeID;
                return (
                  <button
                    key={recipe.RecipeID}
                    onClick={() => loadRecipeDetails(recipe.RecipeID)}
                    className={`w-full text-left rounded-2xl border px-4 py-3 transition-colors ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/40'
                        : 'border-transparent hover:border-primary-200 dark:hover:border-primary-600/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{recipe.Title}</h3>
                          {recipe.isFavorite && <BookmarkCheck size={16} className="text-primary-500" />}
                        </div>
                        {recipe.Subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{recipe.Subtitle}</p>}
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2">{recipe.Description ?? 'A family staple.'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                          <Calendar size={14} /> {formatDate(recipe.FirstCookedAt)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                          <Clock size={14} /> {recipe.PrepMinutes ?? '—'} min prep
                        </span>
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            handleFavoriteToggle(recipe);
                          }}
                          className={`rounded-full border px-2 py-1 text-xs font-medium transition-colors ${
                            recipe.isFavorite
                              ? 'border-primary-400 text-primary-600 bg-primary-50 dark:bg-primary-900/40'
                              : 'border-neutral-200 text-neutral-500 hover:border-primary-200 hover:text-primary-600 dark:border-neutral-700 dark:hover:border-primary-600/40'
                          }`}
                        >
                          {recipe.isFavorite ? 'Favorited' : 'Favorite'}
                        </button>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white dark:bg-neutral-900 shadow-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {selectedRecipe ? (
            <div className="flex flex-col h-full">
              <div className="relative">
                {selectedRecipe.CoverImageUrl ? (
                  <img
                    src={selectedRecipe.CoverImageUrl}
                    alt={selectedRecipe.Title}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="h-56 w-full bg-gradient-to-br from-primary-100 via-secondary-100 to-amber-100 dark:from-primary-900/30 dark:via-secondary-900/30 dark:to-amber-900/30 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Bookmark size={36} className="text-primary-500 mx-auto" />
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">Add a cover photo to bring this story to life.</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => handleFavoriteToggle(selectedRecipe)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-medium text-primary-600 shadow"
                  >
                    {selectedRecipe.isFavorite ? <Heart size={14} className="fill-primary-500 text-primary-500" /> : <Heart size={14} />} Favorite
                  </button>
                  <button
                    onClick={() => handleShare(selectedRecipe, selectedRecipe.Visibility === 'LINK' ? 'FAMILY' : 'LINK')}
                    className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-medium text-secondary-600 shadow"
                  >
                    <Share2 size={14} /> {selectedRecipe.Visibility === 'LINK' ? 'Stop sharing link' : 'Share link'}
                  </button>
                </div>
              </div>

              <div className="px-6 py-6 space-y-6 flex-1 overflow-y-auto">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{selectedRecipe.Title}</h2>
                    {selectedRecipe.Subtitle && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{selectedRecipe.Subtitle}</p>}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full"><Users size={14} /> Serves {selectedRecipe.Servings ?? '—'}</span>
                      <span className="inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full"><Clock size={14} /> Prep {selectedRecipe.PrepMinutes ?? '—'} min</span>
                      <span className="inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full"><Calendar size={14} /> First shared {formatDate(selectedRecipe.FirstCookedAt)}</span>
                      {selectedRecipe.SourceUrl && (
                        <a
                          href={selectedRecipe.SourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          <Link2 size={14} /> Original source
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setRecipeForModal(selectedRecipe);
                        setIsCreateOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-300 dark:border-neutral-600 px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:border-primary-300 hover:text-primary-600"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(selectedRecipe)}
                      className="inline-flex items-center gap-2 rounded-full border border-error-300 px-4 py-1.5 text-xs font-medium text-error-500 hover:bg-error-50"
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>

                {selectedRecipe.Description && (
                  <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 px-4 py-3 text-sm text-neutral-600 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-700">
                    {selectedRecipe.Description}
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide">Ingredients</h3>
                    <div className="space-y-2">
                      {selectedRecipe.Ingredients
                        .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
                        .map(ingredient => (
                          <div key={`${ingredient.RecipeIngredientID}-${ingredient.Name}`} className="rounded-xl bg-white dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 px-3 py-2">
                            {ingredient.SectionTitle && <p className="text-[10px] uppercase tracking-wide text-secondary-500 dark:text-secondary-300">{ingredient.SectionTitle}</p>}
                            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{ingredient.Name}</p>
                            {(ingredient.Quantity || ingredient.Notes) && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {[ingredient.Quantity, ingredient.Notes].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide">Steps</h3>
                    <div className="space-y-2">
                      {selectedRecipe.Steps
                        .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
                        .map((step, index) => (
                          <div key={`${step.RecipeStepID}-${index}`} className="rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-3">
                            <div className="flex items-start gap-3">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 text-xs font-semibold">{index + 1}</span>
                              <div className="space-y-1">
                                {step.SectionTitle && <p className="text-[10px] uppercase tracking-wide text-secondary-500 dark:text-secondary-300">{step.SectionTitle}</p>}
                                <p className="text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap">{step.Instruction}</p>
                                {step.Tip && (
                                  <p className="text-xs text-secondary-600 dark:text-secondary-300 flex items-center gap-1">
                                    <Wand2 size={12} /> {step.Tip}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {(selectedRecipe.OriginStory || selectedRecipe.TraditionNotes) && (
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-4 py-4 space-y-2">
                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-200 inline-flex items-center gap-2">
                      <BookOpen size={16} /> The story
                    </h3>
                    {selectedRecipe.OriginStory && <p className="text-sm text-amber-800/90 dark:text-amber-100 whitespace-pre-wrap">{selectedRecipe.OriginStory}</p>}
                    {selectedRecipe.TraditionNotes && (
                      <p className="text-xs text-amber-700/70 dark:text-amber-200/80 whitespace-pre-wrap border-t border-amber-200/60 dark:border-amber-800/80 pt-2">
                        {selectedRecipe.TraditionNotes}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide">Family memories</h3>
                    <button
                      onClick={() => setIsMemoryOpen(true)}
                      className="inline-flex items-center gap-2 text-xs text-primary-600 hover:text-primary-700"
                    >
                      <Feather size={14} /> Add memory
                    </button>
                  </div>
                  {memories.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      Be the first to share what this dish means to you.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memories.map(memory => (
                        <div key={memory.RecipeMemoryID} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 px-4 py-3">
                          <div className="flex items-start gap-3">
                            <Quote size={18} className="text-primary-500" />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                                {memory.StoryTitle ?? 'Shared memory'}
                              </div>
                              <p className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">{memory.Message}</p>
                              <p className="text-xs text-neutral-400 dark:text-neutral-500">{memory.SharedBy ? `${memory.SharedBy.FirstName} ${memory.SharedBy.LastName}` : 'Family member'} · {formatDate(memory.SharedAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
              <Bookmark size={48} className="text-primary-500" />
              <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Select a recipe to see its story</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">Choose a recipe from the left to revisit ingredients, instructions, and the memories your family has shared.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isCreateOpen && (
          <RecipeFormModal
            title={recipeForModal ? 'Edit recipe' : 'Add a family recipe'}
            isOpen={isCreateOpen}
            onClose={() => {
              setIsCreateOpen(false);
              setRecipeForModal(null);
            }}
            onSubmit={recipeForModal ? handleUpdateRecipe : handleCreateRecipe}
            submitting={submitting}
            initialRecipe={recipeForModal ?? undefined}
            familyName={family?.FamilyName}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isImportOpen && (
          <ImportRecipeModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onSubmit={handleImportRecipe}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isScanOpen && (
          <ScanRecipeModal
            isOpen={isScanOpen}
            onClose={() => setIsScanOpen(false)}
            onSubmit={handleScanRecipe}
            submitting={scanSubmitting}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMemoryOpen && (
          <MemoryModal
            isOpen={isMemoryOpen}
            onClose={() => setIsMemoryOpen(false)}
            onSubmit={handleCreateMemory}
            submitting={memorySubmitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};


const getDefaultFormState = (familyName?: string): RecipeFormState => ({
  Title: '',
  Subtitle: '',
  Description: familyName ? `A beloved ${familyName} original.` : '',
  OriginStory: '',
  TraditionNotes: '',
  FirstCookedAt: '',
  Servings: '',
  PrepMinutes: '',
  CookMinutes: '',
  CoverImageUrl: '',
  Visibility: 'FAMILY',
  Ingredients: [
    { SectionTitle: '', Name: '', Quantity: '', Notes: '' },
  ],
  Steps: [
    { SectionTitle: '', Instruction: '', Tip: '' },
  ],
});

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch (error) {
    return iso;
  }
};

const toRecipeInput = (draft: RecipeFormState): RecipeInput => {
  const clean = <T,>(value: T, predicate: (val: T) => boolean): T | undefined =>
    predicate(value) ? value : undefined;

  const toNumber = (value: string): number | undefined => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    Title: draft.Title.trim(),
    Subtitle: clean(draft.Subtitle.trim(), Boolean),
    Description: clean(draft.Description.trim(), Boolean),
    OriginStory: clean(draft.OriginStory.trim(), Boolean),
    TraditionNotes: clean(draft.TraditionNotes.trim(), Boolean),
    FirstCookedAt: draft.FirstCookedAt ? new Date(draft.FirstCookedAt).toISOString() : undefined,
    Servings: toNumber(draft.Servings),
    PrepMinutes: toNumber(draft.PrepMinutes),
    CookMinutes: toNumber(draft.CookMinutes),
    Visibility: draft.Visibility,
    CoverImageUrl: clean(draft.CoverImageUrl.trim(), Boolean),
    Ingredients: draft.Ingredients
      .map((ingredient, index) => ({
        SectionTitle: clean(ingredient.SectionTitle.trim(), Boolean),
        Name: ingredient.Name.trim(),
        Quantity: clean(ingredient.Quantity.trim(), Boolean),
        Notes: clean(ingredient.Notes.trim(), Boolean),
        SortOrder: index,
      }))
      .filter(ingredient => ingredient.Name.length > 0),
    Steps: draft.Steps
      .map((step, index) => ({
        SectionTitle: clean(step.SectionTitle.trim(), Boolean),
        Instruction: step.Instruction.trim(),
        Tip: clean(step.Tip.trim(), Boolean),
        SortOrder: index,
      }))
      .filter(step => step.Instruction.length > 0),
  };
};

const mapRecipeToForm = (recipe: Recipe): RecipeFormState => ({
  Title: recipe.Title ?? '',
  Subtitle: recipe.Subtitle ?? '',
  Description: recipe.Description ?? '',
  OriginStory: recipe.OriginStory ?? '',
  TraditionNotes: recipe.TraditionNotes ?? '',
  FirstCookedAt: recipe.FirstCookedAt ? recipe.FirstCookedAt.split('T')[0] : '',
  Servings: recipe.Servings ? String(recipe.Servings) : '',
  PrepMinutes: recipe.PrepMinutes ? String(recipe.PrepMinutes) : '',
  CookMinutes: recipe.CookMinutes ? String(recipe.CookMinutes) : '',
  CoverImageUrl: recipe.CoverImageUrl ?? '',
  Visibility: recipe.Visibility ?? 'FAMILY',
  Ingredients: (recipe.Ingredients || []).length
    ? recipe.Ingredients
        .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
        .map((ingredient: RecipeIngredient) => ({
          SectionTitle: ingredient.SectionTitle ?? '',
          Name: ingredient.Name ?? '',
          Quantity: ingredient.Quantity ?? '',
          Notes: ingredient.Notes ?? '',
        }))
    : [{ SectionTitle: '', Name: '', Quantity: '', Notes: '' }],
  Steps: (recipe.Steps || []).length
    ? recipe.Steps
        .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
        .map((step: RecipeStep) => ({
          SectionTitle: step.SectionTitle ?? '',
          Instruction: step.Instruction ?? '',
          Tip: step.Tip ?? '',
        }))
    : [{ SectionTitle: '', Instruction: '', Tip: '' }],
});

interface RecipeFormModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: RecipeInput) => Promise<void>;
  submitting: boolean;
  initialRecipe?: Recipe | null;
  familyName?: string;
}

const RecipeFormModal: React.FC<RecipeFormModalProps> = ({
  title,
  isOpen,
  onClose,
  onSubmit,
  submitting,
  initialRecipe,
  familyName,
}) => {
  const [formState, setFormState] = useState<RecipeFormState>(() => getDefaultFormState(familyName));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      return;
    }
    if (initialRecipe) {
      setFormState(mapRecipeToForm(initialRecipe));
    } else {
      setFormState(getDefaultFormState(familyName));
    }
  }, [familyName, initialRecipe, isOpen]);

  const updateIngredient = (index: number, patch: Partial<RecipeFormState['Ingredients'][number]>) => {
    setFormState(prev => {
      const next = [...prev.Ingredients];
      next[index] = { ...next[index], ...patch };
      return { ...prev, Ingredients: next };
    });
  };

  const updateStep = (index: number, patch: Partial<RecipeFormState['Steps'][number]>) => {
    setFormState(prev => {
      const next = [...prev.Steps];
      next[index] = { ...next[index], ...patch };
      return { ...prev, Steps: next };
    });
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!formState.Title.trim()) {
      nextErrors.Title = 'Please give this recipe a name.';
    }
    if (!formState.Ingredients.some(ingredient => ingredient.Name.trim().length > 0)) {
      nextErrors.Ingredients = 'Add at least one ingredient so everyone can recreate it.';
    }
    if (!formState.Steps.some(step => step.Instruction.trim().length > 0)) {
      nextErrors.Steps = 'Share at least one instruction to guide future cooks.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit(toRecipeInput(formState));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="w-full max-w-3xl rounded-3xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="max-h-[85vh] overflow-y-auto">
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">{title}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Capture the ingredients, story, and little secrets that make this dish family-famous.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Recipe title</label>
                <input
                  type="text"
                  value={formState.Title}
                  onChange={event => setFormState(prev => ({ ...prev, Title: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Grandma's Sunday Roast"
                  required
                />
                {errors.Title && <p className="mt-1 text-xs text-error-500">{errors.Title}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formState.Subtitle}
                  onChange={event => setFormState(prev => ({ ...prev, Subtitle: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Comfort in a casserole dish"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Servings</label>
                <input
                  type="number"
                  min={1}
                  value={formState.Servings}
                  onChange={event => setFormState(prev => ({ ...prev, Servings: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="6"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Prep (min)</label>
                  <input
                    type="number"
                    min={0}
                    value={formState.PrepMinutes}
                    onChange={event => setFormState(prev => ({ ...prev, PrepMinutes: event.target.value }))}
                    className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Cook (min)</label>
                  <input
                    type="number"
                    min={0}
                    value={formState.CookMinutes}
                    onChange={event => setFormState(prev => ({ ...prev, CookMinutes: event.target.value }))}
                    className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="45"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">First cooked</label>
                <input
                  type="date"
                  value={formState.FirstCookedAt}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={event => setFormState(prev => ({ ...prev, FirstCookedAt: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">Cover image URL</label>
                <input
                  type="url"
                  value={formState.CoverImageUrl}
                  onChange={event => setFormState(prev => ({ ...prev, CoverImageUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">Description</label>
              <textarea
                value={formState.Description}
                onChange={event => setFormState(prev => ({ ...prev, Description: event.target.value }))}
                rows={3}
                className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="A cozy classic requested at every family gathering."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">Origin story</label>
                <textarea
                  value={formState.OriginStory}
                  onChange={event => setFormState(prev => ({ ...prev, OriginStory: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Grandma Bea created this when the garden overflowed with tomatoes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">Tradition notes</label>
                <textarea
                  value={formState.TraditionNotes}
                  onChange={event => setFormState(prev => ({ ...prev, TraditionNotes: event.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Served every Christmas Eve with sparkling cider and board games."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide">Ingredients</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Group ingredients by section and note helpful brands or measurements.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormState(prev => ({
                    ...prev,
                    Ingredients: [...prev.Ingredients, { SectionTitle: '', Name: '', Quantity: '', Notes: '' }],
                  }))}
                  className="inline-flex items-center gap-2 rounded-full bg-primary-100 text-primary-600 px-3 py-1.5 text-xs font-medium hover:bg-primary-200"
                >
                  <Plus size={14} /> Ingredient
                </button>
              </div>
              {errors.Ingredients && <p className="text-xs text-error-500">{errors.Ingredients}</p>}
              <div className="space-y-3">
                {formState.Ingredients.map((ingredient, index) => (
                  <div key={index} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Name *</label>
                        <input
                          type="text"
                          value={ingredient.Name}
                          onChange={event => updateIngredient(index, { Name: event.target.value })}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Sweet onion, diced"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Quantity</label>
                        <input
                          type="text"
                          value={ingredient.Quantity}
                          onChange={event => updateIngredient(index, { Quantity: event.target.value })}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="2 cups"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Section</label>
                        <input
                          type="text"
                          value={ingredient.SectionTitle}
                          onChange={event => updateIngredient(index, { SectionTitle: event.target.value })}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Sauce"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Notes</label>
                        <input
                          type="text"
                          value={ingredient.Notes}
                          onChange={event => updateIngredient(index, { Notes: event.target.value })}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Use Vidalia if in season"
                        />
                      </div>
                    </div>
                    {formState.Ingredients.length > 1 && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setFormState(prev => ({
                            ...prev,
                            Ingredients: prev.Ingredients.filter((_, itemIndex) => itemIndex !== index),
                          }))}
                          className="text-xs text-error-500 hover:text-error-600"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide">Steps</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Share the little cues and tips that keep the dish true to its roots.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormState(prev => ({
                    ...prev,
                    Steps: [...prev.Steps, { SectionTitle: '', Instruction: '', Tip: '' }],
                  }))}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary-100 text-secondary-600 px-3 py-1.5 text-xs font-medium hover:bg-secondary-200"
                >
                  <Plus size={14} /> Step
                </button>
              </div>
              {errors.Steps && <p className="text-xs text-error-500">{errors.Steps}</p>}
              <div className="space-y-3">
                {formState.Steps.map((step, index) => (
                  <div key={index} className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Section</label>
                        <input
                          type="text"
                          value={step.SectionTitle}
                          onChange={event => updateStep(index, { SectionTitle: event.target.value })}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                          placeholder="Prepare sauce"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Whispered tip</label>
                        <input
                          type="text"
                          value={step.Tip}
                          onChange={event => updateStep(index, { Tip: event.target.value })}
                          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                          placeholder="Stir clockwise for luck"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Instruction *</label>
                      <textarea
                        value={step.Instruction}
                        onChange={event => updateStep(index, { Instruction: event.target.value })}
                        rows={2}
                        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                        placeholder="Sauté onions in butter until translucent, humming dad's favorite tune."
                      />
                    </div>
                    {formState.Steps.length > 1 && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setFormState(prev => ({
                            ...prev,
                            Steps: prev.Steps.filter((_, stepIndex) => stepIndex !== index),
                          }))}
                          className="text-xs text-error-500 hover:text-error-600"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">Sharing</label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">Choose who can see this recipe. You can share a link later if you change your mind.</p>
              <div className="flex gap-3">
                {(['FAMILY', 'LINK'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormState(prev => ({ ...prev, Visibility: option }))}
                    className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-medium transition-colors ${
                      formState.Visibility === option
                        ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300'
                        : 'border-neutral-200 text-neutral-600 hover:border-primary-400 dark:border-neutral-700 dark:text-neutral-400'
                    }`}
                  >
                    {option === 'FAMILY' ? 'Family only' : 'Family + anyone with link'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 text-white px-5 py-2 text-sm font-medium hover:bg-primary-700 disabled:bg-primary-300"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Save recipe
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
