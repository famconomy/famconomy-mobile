
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

export async function suggestMealNames(familyId: number): Promise<string[]> {
  try {
    // Get LinZ facts about family preferences
    const linzFacts = await prisma.linZFacts.findMany({
      where: {
        familyId: familyId,
        key: {
          in: ['favorite_meals', 'dietary_restrictions', 'cuisine_preferences', 'cooking_skill', 'meal_preferences', 'family_favorites']
        }
      }
    });

    // Get recent conversation context about food
    const recentConversations = await prisma.linZConversation.findMany({
      where: { familyId: familyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 15 } }
    });

    const foodMessages = recentConversations.flatMap(conv => conv.messages)
      .filter(msg => /meal|food|cook|dinner|lunch|breakfast|recipe|eat/i.test(msg.content))
      .slice(0, 15);
    
    const conversationContext = foodMessages.map(msg => `- ${msg.content}`).join('\n');
    const factsSummary = linzFacts.map(f => ` - ${f.key}: ${JSON.stringify(f.value)}`).join('\n');

    const systemPrompt = `
      You are a family meal planning assistant. Based on the family's conversation history and preferences, suggest 10-15 popular, family-friendly meal names that they might enjoy.
      
      Consider common family meals like "Spaghetti and Meatballs", "Chicken Tacos", "Beef Stir Fry", "Grilled Chicken", "Pizza Night", etc.
      
      You must respond with a valid JSON object containing a "meals" array of meal name strings.
      
      Example response:
      {
        "meals": ["Spaghetti and Meatballs", "Chicken Tacos", "Beef Stir Fry", "Grilled Salmon", "Homemade Pizza", "Chicken Alfredo", "Taco Tuesday", "BBQ Chicken", "Veggie Stir Fry", "Meatloaf"]
      }
    `;

    if (!process.env.OPENAI_API_KEY) {
      // Return some common family meals as fallback
      return [
        "Spaghetti and Meatballs",
        "Chicken Tacos", 
        "Beef Stir Fry",
        "Grilled Chicken",
        "Homemade Pizza",
        "Chicken Alfredo",
        "BBQ Chicken",
        "Veggie Stir Fry",
        "Fish and Chips",
        "Chicken Parmesan"
      ];
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `## Family Preferences:\n${factsSummary || 'No specific preferences recorded yet'}\n\n## Recent Food Conversations:\n${conversationContext || 'No recent food conversations'}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const parsedJson = JSON.parse(content);
    
    // Handle both direct array (legacy) and object with meals property (new format)
    let mealNames: string[];
    if (Array.isArray(parsedJson)) {
      mealNames = parsedJson;
    } else if (parsedJson.meals && Array.isArray(parsedJson.meals)) {
      mealNames = parsedJson.meals;
    } else {
      // Try to find any array in the response object
      const foundArray = Object.values(parsedJson).find(value => Array.isArray(value));
      mealNames = foundArray ? foundArray as string[] : [];
    }

    return mealNames || [];

  } catch (error) {
    console.error('Error generating meal name suggestions:', error);
    // Return fallback meal names
    return [
      "Spaghetti and Meatballs",
      "Chicken Tacos", 
      "Beef Stir Fry",
      "Grilled Chicken",
      "Homemade Pizza",
      "Chicken Alfredo",
      "BBQ Chicken",
      "Veggie Stir Fry"
    ];
  }
}

export async function suggestMeals(
  familyId: number, 
  options?: { 
    mealSlots?: ('BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK')[]; 
    daysToSuggest?: number;
    forceRefresh?: boolean;
  }
): Promise<MealSuggestion[]> {
  // Set defaults
  const mealSlots = options?.mealSlots || ['DINNER'];
  const daysToSuggest = options?.daysToSuggest || 7;
  const forceRefresh = options?.forceRefresh || false;

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
    include: { 
      Meal: true,
      MealPlanWeek: true 
    },
    orderBy: { MealPlanWeek: { WeekStart: 'desc' } },
  });

  // 2. Fetch all available meals for the family, optionally filtered by tags
  const allMeals = await prisma.meal.findMany({
    where: {
      FamilyID: familyId,
      NOT: {
        Status: 'ARCHIVED',
      },
    },
    include: {
      Tags: true,
    },
  });

  // 3. If no meals exist, fetch LinZ facts and conversation history to inform suggestions
  let linzFacts: any[] = [];
  let conversationContext = '';
  
  if (allMeals.length === 0) {
    // Get LinZ facts about family preferences
    linzFacts = await prisma.linZFacts.findMany({
      where: {
        familyId: familyId,
        key: {
          in: ['favorite_meals', 'dietary_restrictions', 'cuisine_preferences', 'cooking_skill', 'meal_preferences']
        }
      }
    });

    // Get recent conversation context
    const recentConversations = await prisma.linZConversation.findMany({
      where: { familyId: familyId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 10 } }
    });

    const messages = recentConversations.flatMap(conv => conv.messages)
      .filter(msg => msg.content.toLowerCase().includes('meal') || msg.content.toLowerCase().includes('food'))
      .slice(0, 10);
    
    conversationContext = messages.map(msg => `- ${msg.content}`).join('\n');
  }

  // 4. Construct the prompt for OpenAI
  const historySummary = history
    .filter(h => h.Meal && h.MealPlanWeek)
    .map(h => ` - ${h.Meal.Title} on ${h.MealPlanWeek.WeekStart.toDateString()}`)
    .join('\n');
  const availableMealsSummary = allMeals.map(m => {
    const tags = m.Tags ? m.Tags.map(tag => tag.Tag).join(', ') : 'no tags';
    return ` - ${m.Title} (ID: ${m.MealID}) [Tags: ${tags}]`;
  }).join('\n');
  const factsSummary = linzFacts.map(f => ` - ${f.key}: ${JSON.stringify(f.value)}`).join('\n');

  // 5. Create different prompts based on whether meals exist
  const mealSlotsStr = mealSlots.join(', ');
  const totalSuggestions = daysToSuggest * mealSlots.length;
  
  const systemPrompt = allMeals.length > 0 ? `
    You are a family meal planning assistant. Your task is to create a diverse and appealing meal plan for ${daysToSuggest} days.
    You will be given a history of recently planned meals and a list of all available meals with their IDs and tags.
    Avoid suggesting the same meals that have been eaten in the last 2-3 weeks if possible.
    The family enjoys variety.

    You need to suggest meals for these meal slots: ${mealSlotsStr}
    
    When suggesting meals, consider the meal's tags and appropriateness for the time of day:
    - BREAKFAST: Look for meals tagged as "breakfast", "morning", "quick", "light", or traditionally breakfast foods
    - LUNCH: Look for meals tagged as "lunch", "light", "quick", "sandwich", "salad", or moderate portion meals  
    - DINNER: Look for meals tagged as "dinner", "main", "hearty", "family", or substantial evening meals
    - SNACK: Look for meals tagged as "snack", "light", "quick", "healthy", or small portion items

    You must respond with a valid JSON object containing a "suggestions" array of ${totalSuggestions} meal suggestion objects.
    Each object in the suggestions array must have the following properties:
    - "mealId": (number) The ID of the suggested meal from the available meals list.
    - "dayOfWeek": (number) The day of the week, where Monday is 0 and Sunday is ${daysToSuggest - 1}.
    - "mealSlot": (string) One of: ${mealSlotsStr}.

    Provide suggestions for each requested meal slot for each day. If a meal doesn't have specific tags, use your best judgment based on the meal name and description.

    Example response for dinner suggestions:
    {
      "suggestions": [
        { "mealId": 101, "dayOfWeek": 0, "mealSlot": "DINNER" },
        { "mealId": 105, "dayOfWeek": 1, "mealSlot": "DINNER" },
        { "mealId": 112, "dayOfWeek": 2, "mealSlot": "DINNER" }
      ]
    }
    Do not include any extra text or explanations in your response. Only the JSON object.
  ` : `
    You are a family meal planning assistant. The family doesn't have any meals saved yet, but you can help them by suggesting popular, family-friendly meal names based on their preferences and conversation history.
    
    Since there are no existing meals with IDs, return an empty suggestions array. The frontend will handle this case by prompting the user to chat about their preferences first.
    
    You must respond with a JSON object containing an empty suggestions array:
    {
      "suggestions": []
    }
  `;

  try {
    // For development: return mock data if no API key is present
    if (!process.env.OPENAI_API_KEY) {
      console.log('[Mock] Generating meal suggestions.');
      const suggestions: MealSuggestion[] = [];
      
      // If no meals exist, return empty array to trigger frontend conversation flow
      if (allMeals.length === 0) {
        console.log('[Mock] No meals available - returning empty suggestions to prompt conversation');
        return suggestions;
      }
      
      // Otherwise, create mock suggestions from existing meals for all requested slots
      for (let day = 0; day < daysToSuggest; day++) {
        for (const slot of mealSlots) {
          // Try to pick different meals for different slots
          const mealIndex = (day * mealSlots.length + mealSlots.indexOf(slot)) % allMeals.length;
          if (allMeals[mealIndex]) {
            suggestions.push({ 
              mealId: allMeals[mealIndex].MealID, 
              dayOfWeek: day, 
              mealSlot: slot 
            });
          }
        }
      }
      return suggestions;
    }

    // If no meals exist, return empty array to trigger conversation flow
    if (allMeals.length === 0) {
      console.log('No meals available for family - returning empty suggestions to prompt conversation');
      return [];
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `## Recent Meal History:\n${historySummary || 'No recent meal history'}\n\n## Available Meals:\n${availableMealsSummary}\n\n## Family Preferences:\n${factsSummary || 'No preferences recorded yet'}\n\n## Recent Food Conversations:\n${conversationContext || 'No recent food conversations'}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }

    const parsedJson = JSON.parse(content);
    
    // Handle both direct array (legacy) and object with suggestions property (new format)
    let suggestionsArray: any[];
    if (Array.isArray(parsedJson)) {
      suggestionsArray = parsedJson;
    } else if (parsedJson.suggestions && Array.isArray(parsedJson.suggestions)) {
      suggestionsArray = parsedJson.suggestions;
    } else {
      // Try to find any array in the response object
      const foundArray = Object.values(parsedJson).find(value => Array.isArray(value));
      if (foundArray) {
        suggestionsArray = foundArray as any[];
      } else {
        console.error('OpenAI response structure:', JSON.stringify(parsedJson, null, 2));
        throw new Error('Could not find an array of suggestions in the OpenAI response.');
      }
    }

    // Validate the suggestions array structure
    if (!Array.isArray(suggestionsArray)) {
      throw new Error('Suggestions is not an array.');
    }

    // Basic validation of each suggestion object
    for (const suggestion of suggestionsArray) {
      if (typeof suggestion.mealId !== 'number' || 
          typeof suggestion.dayOfWeek !== 'number' || 
          typeof suggestion.mealSlot !== 'string') {
        console.warn('Invalid suggestion object:', suggestion);
      }
    }

    return suggestionsArray as MealSuggestion[];

  } catch (error) {
    console.error('Error generating meal suggestions from OpenAI:', error);
    throw new Error('Failed to generate meal suggestions.');
  }
}
