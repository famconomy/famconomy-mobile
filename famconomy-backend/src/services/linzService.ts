
import OpenAI from 'openai';
import { prisma } from '../db';

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Interface for the structured ingredient data we expect from the AI
export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

/**
 * Generates a list of ingredients for a given meal using the OpenAI API.
 *
 * @param mealName The name of the meal (e.g., "Chicken Tacos").
 * @param familySize The number of people the meal should feed.
 * @returns A promise that resolves to an array of Ingredient objects.
 */
export async function generateIngredientsForMeal(
  mealName: string,
  familySize: number
): Promise<Ingredient[]> {
  const systemPrompt = `
    You are a recipe assistant. Your task is to generate a list of ingredients for a given meal.
    The user will provide a meal name and a family size.
    You must respond with a valid JSON array of ingredient objects.
    Each object in the array should have the following properties: "name" (string), "quantity" (number), and "unit" (string).
    The quantities should be scaled appropriately for the given family size.
    For example, for "Tacos" and a family size of 4, you might return:
    [
      {"name": "Ground Beef", "quantity": 1.5, "unit": "lbs"},
      {"name": "Taco Seasoning", "quantity": 1, "unit": "packet"},
      {"name": "Taco Shells", "quantity": 12, "unit": "shells"},
      {"name": "Lettuce", "quantity": 1, "unit": "head"},
      {"name": "Tomatoes", "quantity": 3, "unit": "medium"},
      {"name": "Shredded Cheese", "quantity": 2, "unit": "cups"}
    ]
    Do not include any extra text or explanations in your response. Only the JSON array.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Meal: "${mealName}", Family Size: ${familySize}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    // The model might return a JSON object with a key, e.g. {"ingredients": [...]}.
    // We need to find the array within the parsed object.
    const parsedJson = JSON.parse(content);
    const ingredientsArray = Array.isArray(parsedJson)
      ? parsedJson
      : Object.values(parsedJson).find(Array.isArray);

    if (!ingredientsArray) {
      throw new Error('Could not find an array of ingredients in the OpenAI response.');
    }

    // TODO: Add validation to ensure each object in the array has the correct properties.

    return ingredientsArray as Ingredient[];
  } catch (error) {
    console.error('Error generating ingredients from OpenAI:', error);
    throw new Error('Failed to generate ingredients.');
  }
}

export interface MealSuggestion {
  mealId: number;
  dayOfWeek: number; // 0 for Monday, 6 for Sunday
  mealSlot: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
}

export async function suggestMeals(familyId: number): Promise<MealSuggestion[]> {
  // 1. Fetch meal history (e.g., last 8 weeks)
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  const history = await prisma.mealPlanEntry.findMany({
    where: {
      MealPlanWeek: {
        FamilyID: familyId,
        WeekStart: { gte: eightWeeksAgo },
      },
    },
    include: { Meal: true },
    orderBy: { MealPlanWeek: { WeekStart: 'desc' } },
  });

  // 2. Fetch all available meals for the family
  const allMeals = await prisma.meal.findMany({
    where: {
      FamilyID: familyId,
      NOT: {
        Status: 'ARCHIVED',
      },
    },
  });

  // 3. Construct the prompt for OpenAI
  const historySummary = history.map(h => ` - ${h.Meal.Title} on ${h.MealPlanWeek.WeekStart.toDateString()}`).join('\n');
  const availableMealsSummary = allMeals.map(m => ` - ${m.Title} (ID: ${m.MealID})`).join('\n');

  const systemPrompt = `
    You are a family meal planning assistant. Your task is to create a diverse and appealing 7-day dinner plan.
    You will be given a history of recently planned meals and a list of all available meals with their IDs.
    Avoid suggesting the same meals that have been eaten in the last 2-3 weeks if possible.
    The family enjoys variety.

    You must respond with a valid JSON array of 7 meal suggestion objects for the 7 days of the week (Monday to Sunday).
    Each object must have the following properties:
    - "mealId": (number) The ID of the suggested meal from the available meals list.
    - "dayOfWeek": (number) The day of the week, where Monday is 0 and Sunday is 6.
    - "mealSlot": (string) This should always be "DINNER".

    Example response:
    [
      { "mealId": 101, "dayOfWeek": 0, "mealSlot": "DINNER" },
      { "mealId": 105, "dayOfWeek": 1, "mealSlot": "DINNER" },
      { "mealId": 112, "dayOfWeek": 2, "mealSlot": "DINNER" },
      { "mealId": 103, "dayOfWeek": 3, "mealSlot": "DINNER" },
      { "mealId": 108, "dayOfWeek": 4, "mealSlot": "DINNER" },
      { "mealId": 115, "dayOfWeek": 5, "mealSlot": "DINNER" },
      { "mealId": 102, "dayOfWeek": 6, "mealSlot": "DINNER" }
    ]
    Do not include any extra text or explanations in your response. Only the JSON array.
  `;

  try {
    // For development: return mock data if no API key is present
    if (!process.env.OPENAI_API_KEY) {
      console.log('[Mock] Generating meal suggestions.');
      const suggestions: MealSuggestion[] = [];
      for (let i = 0; i < 7; i++) {
        if (allMeals[i]) {
          suggestions.push({ mealId: allMeals[i].MealID, dayOfWeek: i, mealSlot: 'DINNER' });
        }
      }
      return suggestions;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `## Recent Meal History:\n${historySummary}\n\n## Available Meals:\n${availableMealsSummary}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const parsedJson = JSON.parse(content);
    const suggestionsArray = Array.isArray(parsedJson) ? parsedJson : Object.values(parsedJson).find(Array.isArray);

    if (!suggestionsArray) {
      throw new Error('Could not find an array of suggestions in the OpenAI response.');
    }

    // TODO: Add validation for the suggestions array structure

    return suggestionsArray as MealSuggestion[];

  } catch (error) {
    console.error('Error generating meal suggestions from OpenAI:', error);
    throw new Error('Failed to generate meal suggestions.');
  }
}
