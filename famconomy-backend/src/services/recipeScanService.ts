import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

export interface ScanRecipeResult {
  title?: string;
  subtitle?: string;
  description?: string;
  originStory?: string;
  traditionNotes?: string;
  servings?: number | string | null;
  prepMinutes?: number | string | null;
  cookMinutes?: number | string | null;
  firstCookedAt?: string | null;
  coverImageUrl?: string | null;
  sourceUrl?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  ingredients?: Array<{
    section_title?: string | null;
    sectionTitle?: string | null;
    name?: string | null;
    quantity?: string | null;
    notes?: string | null;
  }>;
  steps?: Array<{
    section_title?: string | null;
    sectionTitle?: string | null;
    instruction?: string | null;
    tip?: string | null;
  }>;
}

export interface NormalizedScanResult {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  originStory?: string | null;
  traditionNotes?: string | null;
  servings?: number | null;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  firstCookedAt?: string | null;
  coverImageUrl?: string | null;
  sourceUrl?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  ingredients: Array<{
    sectionTitle?: string | null;
    name: string;
    quantity?: string | null;
    notes?: string | null;
  }>;
  steps: Array<{
    sectionTitle?: string | null;
    instruction: string;
    tip?: string | null;
  }>;
}

const OPENAI_MODEL = process.env.OPENAI_RECIPE_VISION_MODEL ?? 'gpt-4o-mini';

const ensureClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured for recipe scanning.');
  }
  return new OpenAI({ apiKey });
};

export const extractRecipeFromScan = async (filePath: string): Promise<ScanRecipeResult> => {
  const client = ensureClient();
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();

  const mimeType = ext === '.png'
    ? 'image/png'
    : ext === '.webp'
      ? 'image/webp'
      : 'image/jpeg';

  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: 'You are a culinary archivist. Extract structured recipe data from family recipe scans and return clean JSON.'
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Read this recipe card or magazine page. Identify the recipe title, optional subtitle, description, origin story, tradition notes, servings, prep time, cook time, and each ingredient with quantities or helpful notes. Also capture each instruction step and any small tips. Return strictly valid JSON with keys: title, subtitle, description, origin_story, tradition_notes, servings, prep_minutes, cook_minutes, first_cooked_at, cover_image_url, source_url, external_source, external_id, ingredients (array of objects with section_title, name, quantity, notes), and steps (array of objects with section_title, instruction, tip). If any field is missing, use null or an empty array. If quantities include fractions, keep them as written.'
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Recipe scan produced no content.');
  }

  try {
    return JSON.parse(content) as ScanRecipeResult;
  } catch (error) {
    throw new Error('Failed to parse recipe scan response.');
  }
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const normalizeScanResult = (result: ScanRecipeResult): NormalizedScanResult => {
  const ingredients = Array.isArray(result.ingredients)
    ? result.ingredients
        .map((ingredient) => ({
          sectionTitle: cleanString(ingredient.sectionTitle ?? ingredient.section_title ?? undefined),
          name: cleanString(ingredient.name) ?? '',
          quantity: cleanString(ingredient.quantity),
          notes: cleanString(ingredient.notes),
        }))
        .filter((ingredient) => ingredient.name.length > 0)
    : [];

  const steps = Array.isArray(result.steps)
    ? result.steps
        .map((step) => ({
          sectionTitle: cleanString(step.sectionTitle ?? step.section_title ?? undefined),
          instruction: cleanString(step.instruction) ?? '',
          tip: cleanString(step.tip),
        }))
        .filter((step) => step.instruction.length > 0)
    : [];

  return {
    title: cleanString(result.title) ?? 'Untitled Recipe',
    subtitle: cleanString(result.subtitle),
    description: cleanString(result.description),
    originStory: cleanString(result.originStory ?? (result as any).origin_story),
    traditionNotes: cleanString(result.traditionNotes ?? (result as any).tradition_notes),
    servings: toNumberOrNull(result.servings ?? (result as any).servings_estimate),
    prepMinutes: toNumberOrNull(result.prepMinutes ?? (result as any).prep_minutes),
    cookMinutes: toNumberOrNull(result.cookMinutes ?? (result as any).cook_minutes),
    firstCookedAt: cleanString(result.firstCookedAt ?? (result as any).first_cooked_at),
    coverImageUrl: cleanString(result.coverImageUrl ?? (result as any).cover_image_url),
    sourceUrl: cleanString(result.sourceUrl ?? (result as any).source_url),
    externalSource: cleanString(result.externalSource ?? (result as any).external_source),
    externalId: cleanString(result.externalId ?? (result as any).external_id),
    ingredients,
    steps,
  };
};
