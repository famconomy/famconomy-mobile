import { Prisma } from '@prisma/client';

interface RecipeListOptions {
  search?: string;
  favoritesOnly?: boolean;
}

export const buildRecipeFilters = (
  familyId: number,
  userId: string | undefined,
  options: RecipeListOptions = {}
): Prisma.RecipeFindManyArgs => {
  const where: Prisma.RecipeWhereInput = {
    FamilyID: familyId,
  };

  if (options.search) {
    where.OR = [
      { Title: { contains: options.search, mode: 'insensitive' } },
      { Description: { contains: options.search, mode: 'insensitive' } },
      { OriginStory: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  if (options.favoritesOnly && userId) {
    where.Favorites = {
      some: {
        UserID: userId,
      },
    };
  }

  return { where };
};
