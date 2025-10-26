import { FamilyGig } from '../api/gigs';

export type RootDrawerParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Tasks: undefined;
  Gigs: undefined;
  Messages: undefined;
  Recipes: undefined;
  Shopping: undefined;
  Wishlists: undefined;
  Finance: undefined;
  Family: undefined;
  Values: undefined;
  Journal: undefined;
  Resources: undefined;
  Settings: undefined;
  GigDetails: { gigId: number; gig: FamilyGig };
  TaskDetails: { taskId: number };
  RecipeDetails: { recipeId: number };
  EventDetails: { eventId: number };
  ChatDetail: { chatId: number };
  MemberProfile: { memberId: number };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootDrawerParamList {}
  }
}
