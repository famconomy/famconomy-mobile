import { prisma } from '../db';
import { v4 as uuid } from 'uuid';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CONSOLIDATION_MODEL = process.env.LINZ_CONSOLIDATION_MODEL ?? 'gpt-4o-mini';

interface ConsolidationResult {
  new_facts: LinZFact[];
  updated_facts: LinZFact[];
  summary: string;
}

const validateConsolidationResult = (payload: unknown): ConsolidationResult => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Consolidation payload is not an object.');
  }

  const result = payload as Partial<ConsolidationResult>;

  if (!Array.isArray(result.new_facts)) {
    throw new Error('Consolidation payload missing new_facts array.');
  }
  if (!Array.isArray(result.updated_facts)) {
    throw new Error('Consolidation payload missing updated_facts array.');
  }
  if (typeof result.summary !== 'string') {
    throw new Error('Consolidation payload missing summary string.');
  }

  const validateFact = (fact: any) => {
    if (!fact || typeof fact !== 'object') {
      throw new Error('Fact entry must be an object.');
    }
    if (typeof fact.key !== 'string' || !fact.key.trim()) {
      throw new Error('Fact entry missing key.');
    }
    if (!('value' in fact)) {
      throw new Error(`Fact ${fact.key} is missing value.`);
    }
    if ('confidence' in fact && typeof fact.confidence !== 'number') {
      throw new Error(`Fact ${fact.key} has non-numeric confidence.`);
    }
    if ('userId' in fact && fact.userId !== null && typeof fact.userId !== 'string') {
      throw new Error(`Fact ${fact.key} has invalid userId.`);
    }
  };

  result.new_facts.forEach(validateFact);
  result.updated_facts.forEach(validateFact);

  return {
    new_facts: result.new_facts,
    updated_facts: result.updated_facts,
    summary: result.summary,
  };
};

// Mock LLM client for now
const llm = {
  strictJson: async (prompt: string, _schema: any) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured; unable to run consolidation.');
    }

    const messages = [
      {
        role: 'system' as const,
        content: 'You are a service that returns only valid JSON responses conforming to the requested schema.',
      },
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: CONSOLIDATION_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Consolidation model returned empty content.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse consolidation JSON: ${(error as Error).message}`);
    }

    return validateConsolidationResult(parsed);
  },
};

interface Conversation {
  id: number;
  familyId: number;
  userId: string | null;
  kind: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  consolidatedAt: Date | null;
}

interface LinZFact {
  key: string;
  value: any;
  confidence?: number;
  userId: string | null;
}

interface ConsolidationBatch {
  familyId: number;
  userId: string | null;
  conversations: Conversation[];
}

// Helper to fetch unconsolidated memory in batches
async function fetchUnconsolidatedMemoryBatches({
  windowHours,
  limit,
}: {
  windowHours: number;
  limit: number;
}): Promise<ConsolidationBatch[]> {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - windowHours);

  // Fetch unconsolidated LinZConversation entries
  const rawConversations = await prisma.linZConversation.findMany({
    where: {
      consolidatedAt: null,
      createdAt: { gte: cutoff },
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  // Fetch all LinZMemory entries (not time-limited, not consolidated)
  const rawMemories = await prisma.linZMemory.findMany();

  const batches: { [key: string]: ConsolidationBatch } = {};

  // Add LinZConversation entries to batches
  for (const conv of rawConversations) {
    const batchKey = `${conv.familyId}-${conv.userId || 'null'}`;
    if (!batches[batchKey]) {
      batches[batchKey] = {
        familyId: conv.familyId,
        userId: conv.userId,
        conversations: [],
      };
    }
    batches[batchKey].conversations.push(conv);
  }

  // Add LinZMemory entries to batches as pseudo-conversations
  for (const mem of rawMemories) {
    const batchKey = `${mem.familyId}-${mem.userId || 'null'}`;
    if (!batches[batchKey]) {
      batches[batchKey] = {
        familyId: mem.familyId,
        userId: mem.userId,
        conversations: [],
      };
    }
    batches[batchKey].conversations.push({
      id: mem.id,
      familyId: mem.familyId,
      userId: mem.userId,
      kind: 'memory',
      content: mem.value,
      createdAt: mem.createdAt,
      updatedAt: mem.updatedAt,
      consolidatedAt: null,
    });
  }

  return Object.values(batches);
}

// Helper to build the LLM prompt
function buildConsolidationPrompt({
  conversations,
  existingFacts,
}: {
  conversations: Conversation[];
  existingFacts: any[];
}): string {
  const conversationJson = JSON.stringify(
    conversations.map((c) => ({
      time: c.createdAt.toISOString(),
      speaker: c.userId || 'system',
      entries: (() => {
        try {
          return JSON.parse(c.content);
        } catch (error) {
          return c.content;
        }
      })(),
    })),
    null,
    2
  );
  const factsJson = JSON.stringify(existingFacts, null, 2);

  return `SYSTEM:
You are a memory consolidation AI.

TASK:
Given a recent conversation transcript and the current long-term facts, produce three things:
1) new_facts: facts/preferences/relationships not already present.
2) updated_facts: existing facts that need changes based on the new conversation.
3) summary: a single concise sentence capturing the primary topic.

RULES:
- Output STRICT JSON only with keys: new_facts, updated_facts, summary.
- Each fact must be { "key": string, "value": any, "confidence": number (0..1), "userId": string|null }.
- Prefer stable, atomic keys, e.g., "family.name", "child.Ava.favorite_color".
- Do NOT duplicate facts; treat case and synonyms carefully.
- If uncertain, omit the fact or lower confidence.

INPUT:
- conversation (ISO time, speaker, text): ${conversationJson}
- current_facts: ${factsJson}`;
}

// Helper to infer tags from model output (placeholder)
function inferTags(modelJson: any): string[] {
  // In a real scenario, this would use NLP or predefined rules to extract tags
  // For now, we'll just return a placeholder or extract from summary if possible.
  if (modelJson.summary.includes('family')) return ['family_setup'];
  return [];
}

// Helper to get the newest conversation timestamp
function newestConversationTimestamp(conversations: Conversation[]): Date | null {
  if (conversations.length === 0) return null;
  return new Date(Math.max(...conversations.map(c => c.createdAt.getTime())));
}

// Main consolidation job
export async function runConsolidationJob(now: Date = new Date()) {
  const runId = uuid();
  console.log(`Starting LinZ Memory Consolidation Job (Run ID: ${runId}) at ${now.toISOString()}`);

  const batches = await fetchUnconsolidatedMemoryBatches({ windowHours: 6, limit: 500 });
  console.log(`Found ${batches.length} batches to process.`);

  for (const batch of batches) {
    const { familyId, userId, conversations } = batch;
    console.log(`Processing batch for Family ID: ${familyId}, User ID: ${userId || 'N/A'} with ${conversations.length} conversations.`);

    const existingFacts = await prisma.linZFacts.findMany({
      where: { familyId, userId },
    });

    const prompt = buildConsolidationPrompt({ conversations, existingFacts });

    try {
      const modelJson = await llm.strictJson(prompt, {
        schema: {
          type: 'object',
          properties: {
            new_facts: { type: 'array', items: { type: 'object' } }, // Simplified schema for mock
            updated_facts: { type: 'array', items: { type: 'object' } }, // Simplified schema for mock
            summary: { type: 'string' },
          },
          required: ['new_facts', 'updated_facts', 'summary'],
        },
      });

      await prisma.$transaction(async (tx) => {
        // Upsert new and updated facts
        for (const f of [...modelJson.new_facts, ...modelJson.updated_facts]) {
          await tx.linZFacts.upsert({
            where: { familyId_key_userId: { familyId, userId: f.userId, key: f.key } },
            create: {
              familyId,
              userId: f.userId,
              key: f.key,
              value: f.value,
              confidence: f.confidence ?? 0.9,
              source: 'model_consolidation',
              lastConfirmedAt: now,
            },
            update: {
              value: f.value,
              confidence: f.confidence ?? 0.9,
              lastConfirmedAt: now,
            },
          });
        }

        // Store a one-sentence summary
        await tx.conversationSummary.create({
          data: {
            familyId,
            userId,
            runId,
            summary: modelJson.summary,
            tags: inferTags(modelJson),
            occurredAt: newestConversationTimestamp(conversations) ?? now,
          },
        });

        // Mark consolidated short-term logs; a separate sweep removes them after the retention window
        await tx.linZConversation.updateMany({
          where: { id: { in: conversations.map((c) => c.id) } },
          data: { consolidatedAt: now },
        });
      });

      // Write audit log
      // Note: AuditLog relations are not set up yet, so we'll just log to console for now.
      console.log(`Audit: CONSOLIDATION_UPSERT - Run ID: ${runId}, New Facts: ${modelJson.new_facts.length}, Updated Facts: ${modelJson.updated_facts.length}`);

    } catch (error) {
      console.error(`Error processing batch for Family ID: ${familyId}, User ID: ${userId || 'N/A'}:`, error);
      // Log audit for failure if AuditLog was fully set up
    }
  }
  console.log(`Finished LinZ Memory Consolidation Job (Run ID: ${runId}).`);

  try {
    await purgeOldShortTerm({ olderThanHours: 6 });
  } catch (purgeError) {
    console.warn('Failed to purge old short-term memories after consolidation run', purgeError);
  }
}

// Optional: purge older short-term memory physically
export async function purgeOldShortTerm({ olderThanHours }: { olderThanHours: number }) {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - olderThanHours);

  const result = await prisma.linZConversation.deleteMany({
    where: {
      consolidatedAt: { not: null }, // Only delete consolidated memories
      createdAt: { lte: cutoff },
    },
  });
  console.log(`Purged ${result.count} old consolidated short-term memories.`);
}
