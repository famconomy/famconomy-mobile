import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ChefHat,
  Search,
  Clock,
  Users,
  Heart,
  Star,
  Plus,
} from 'lucide-react-native';
import { getRecipes, toggleRecipeFavorite, Recipe } from '../../api/recipes';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';

const RecipesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { family } = useFamily();
  const familyId = family?.id ? Number(family.id) : undefined;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    if (!familyId) {
      setError('No family ID provided');
      setIsLoading(false);
      return;
    }

    try {
      const fetchedRecipes = await getRecipes(familyId, {
        favoritesOnly: showFavoritesOnly,
      });
      setRecipes(fetchedRecipes);
      setFilteredRecipes(fetchedRecipes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
      console.error('Error fetching recipes:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [familyId, showFavoritesOnly]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRecipes(recipes);
    } else {
      const filtered = recipes.filter(
        (recipe) =>
          recipe.Title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.Subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.Description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRecipes(filtered);
    }
  }, [searchQuery, recipes]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRecipes();
  }, [fetchRecipes]);

  const handleToggleFavorite = useCallback(
    async (recipe: Recipe) => {
      if (!familyId) return;

      try {
        const result = await toggleRecipeFavorite(familyId, recipe.RecipeID);
        setRecipes((prev) =>
          prev.map((r) =>
            r.RecipeID === recipe.RecipeID
              ? { ...r, isFavorite: result.isFavorite }
              : r
          )
        );
      } catch (err) {
        console.error('Error toggling favorite:', err);
      }
    },
    [familyId]
  );

  const handleRecipePress = useCallback(
    (recipe: Recipe) => {
      navigation.navigate('RecipeDetails', {
        recipeId: recipe.RecipeID,
      });
    },
    [navigation]
  );

  const toggleFavoritesFilter = useCallback(() => {
    setShowFavoritesOnly((prev) => !prev);
  }, []);

  const getTotalTime = (recipe: Recipe) => {
    const prep = recipe.PrepMinutes || 0;
    const cook = recipe.CookMinutes || 0;
    return prep + cook;
  };

  const renderRecipeCard = useCallback(
    ({ item: recipe }: { item: Recipe }) => {
      const totalTime = getTotalTime(recipe);
      const isFavorite = recipe.isFavorite || false;

      return (
        <TouchableOpacity
          style={styles.recipeCard}
          onPress={() => handleRecipePress(recipe)}
          activeOpacity={0.7}
        >
          {/* Image */}
          {recipe.CoverImageUrl ? (
            <Image
              source={{ uri: recipe.CoverImageUrl }}
              style={styles.recipeImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.recipeImage, styles.placeholderImage]}>
              <ChefHat size={48} color="#9ca3af" />
            </View>
          )}

          {/* Favorite Badge */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleToggleFavorite(recipe);
            }}
          >
            <Heart
              size={24}
              color={isFavorite ? '#ef4444' : '#ffffff'}
              fill={isFavorite ? '#ef4444' : 'transparent'}
            />
          </TouchableOpacity>

          {/* Content */}
          <View style={styles.recipeCardContent}>
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {recipe.Title}
            </Text>
            {recipe.Subtitle && (
              <Text style={styles.recipeSubtitle} numberOfLines={1}>
                {recipe.Subtitle}
              </Text>
            )}

            {/* Info Row */}
            <View style={styles.recipeInfo}>
              {totalTime > 0 && (
                <View style={styles.infoItem}>
                  <Clock size={14} color="#6b7280" />
                  <Text style={styles.infoText}>{totalTime} min</Text>
                </View>
              )}
              {recipe.Servings && (
                <View style={styles.infoItem}>
                  <Users size={14} color="#6b7280" />
                  <Text style={styles.infoText}>
                    {recipe.Servings} servings
                  </Text>
                </View>
              )}
            </View>

            {/* Tags */}
            {recipe.TraditionNotes && (
              <View style={styles.traditionBadge}>
                <Star size={12} color="#f59e0b" />
                <Text style={styles.traditionText}>Family Tradition</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [handleRecipePress, handleToggleFavorite]
  );

  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.headerContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Filter Bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              showFavoritesOnly && styles.filterButtonActive,
            ]}
            onPress={toggleFavoritesFilter}
          >
            <Heart
              size={18}
              color={showFavoritesOnly ? '#ffffff' : '#ef4444'}
              fill={showFavoritesOnly ? '#ffffff' : 'transparent'}
            />
            <Text
              style={[
                styles.filterButtonText,
                showFavoritesOnly && styles.filterButtonTextActive,
              ]}
            >
              Favorites
            </Text>
          </TouchableOpacity>

          <View style={styles.recipeCount}>
            <Text style={styles.recipeCountText}>
              {filteredRecipes.length}{' '}
              {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
            </Text>
          </View>
        </View>
      </View>
    ),
    [searchQuery, showFavoritesOnly, filteredRecipes.length, toggleFavoritesFilter]
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={styles.loadingText}>Loading recipes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRecipes}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (recipes.length === 0 && !showFavoritesOnly) {
    return (
      <View style={styles.centerContainer}>
        <ChefHat size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No Recipes Yet</Text>
        <Text style={styles.emptyText}>
          Start building your family cookbook!
        </Text>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Recipe</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (filteredRecipes.length === 0) {
    return (
      <View style={styles.container}>
        {ListHeaderComponent}
        <View style={styles.emptySearchContainer}>
          <Search size={48} color="#9ca3af" />
          <Text style={styles.emptySearchText}>
            {showFavoritesOnly
              ? 'No favorite recipes yet'
              : 'No recipes match your search'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredRecipes}
        renderItem={renderRecipeCard}
        keyExtractor={(recipe) => recipe.RecipeID.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeaderComponent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#ec4899"
          />
        }
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab}>
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ec4899',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#111827',
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  recipeCount: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  recipeCountText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  listContent: {
    padding: 8,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  recipeCard: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#f3f4f6',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    padding: 6,
  },
  recipeCardContent: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  recipeSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  recipeInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  traditionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  traditionText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#ec4899',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default RecipesScreen;
