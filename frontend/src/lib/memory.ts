import { createClient, UserMemory } from './supabase';

const DIFY_API_URL = process.env.NEXT_PUBLIC_DIFY_API_URL || 'http://localhost/v1';
const DIFY_API_KEY = process.env.NEXT_PUBLIC_DIFY_API_KEY || '';

// Extract facts from a conversation turn
export async function extractFacts(
  userMessage: string,
  assistantResponse: string,
  userId: string
): Promise<{ facts: string[]; categories: string[] }> {
  // Use Dify to extract facts (or could use a separate LLM call)
  const extractionPrompt = `Analyze this conversation and extract any NEW personal facts about the user that should be remembered for future conversations.

USER MESSAGE: "${userMessage}"
ASSISTANT RESPONSE: "${assistantResponse}"

Extract facts like:
- Personal info (name, age, family members, pets)
- Preferences (likes, dislikes, favorites)
- Work/study details (job, company, school, projects)
- Goals and plans
- Important dates (birthdays, anniversaries)
- Location details
- Skills or hobbies

Return ONLY a JSON array of objects with "fact" and "category" fields.
If no new facts to extract, return empty array: []

Example output:
[{"fact": "Has a sister named Alice", "category": "family"}, {"fact": "Works at Google", "category": "work"}]

JSON output:`;

  try {
    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {},
        query: extractionPrompt,
        user: `${userId}-memory-extractor`,
        conversation_id: '',
        response_mode: 'blocking', // Use blocking mode for extraction
      }),
    });

    if (!response.ok) {
      console.error('[Memory] Extraction API error:', response.status);
      return { facts: [], categories: [] };
    }

    const data = await response.json();
    const answer = data.answer || '';

    // Parse JSON from response
    const jsonMatch = answer.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const facts = parsed.map((p: { fact: string }) => p.fact);
      const categories = parsed.map((p: { category: string }) => p.category || 'general');
      console.log('[Memory] Extracted facts:', facts);
      return { facts, categories };
    }

    return { facts: [], categories: [] };
  } catch (error) {
    console.error('[Memory] Extraction error:', error);
    return { facts: [], categories: [] };
  }
}

// Save memories to database
export async function saveMemories(
  userId: string,
  facts: string[],
  categories: string[],
  sourceMessageId?: string
): Promise<void> {
  if (facts.length === 0) return;

  const supabase = createClient();

  const memories = facts.map((fact, i) => ({
    user_id: userId,
    fact,
    category: categories[i] || 'general',
    source_message_id: sourceMessageId || null,
    confidence: 1.0,
  }));

  console.log('[Memory] Saving memories:', memories);

  // Use upsert to avoid duplicates (we have UNIQUE constraint on user_id + fact)
  const { error } = await supabase
    .from('user_memories')
    .upsert(memories, { onConflict: 'user_id,fact', ignoreDuplicates: true });

  if (error) {
    console.error('[Memory] Save error:', error);
  } else {
    console.log('[Memory] Saved', facts.length, 'memories');
  }
}

// Retrieve relevant memories for a query
export async function getRelevantMemories(
  userId: string,
  query: string,
  limit: number = 10
): Promise<UserMemory[]> {
  const supabase = createClient();

  // Strategy: Combine text search + recent memories
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  let memories: UserMemory[] = [];

  // 1. Text search for relevant memories
  if (searchTerms.length > 0) {
    const searchQuery = searchTerms.join(' | '); // OR search
    const { data: searchResults } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .textSearch('fact_search', searchQuery)
      .limit(limit);

    if (searchResults) {
      memories = searchResults;
      console.log('[Memory] Found', searchResults.length, 'relevant memories via search');
    }
  }

  // 2. Also get recent memories if we don't have enough
  if (memories.length < limit) {
    const { data: recentMemories } = await supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit - memories.length);

    if (recentMemories) {
      // Add recent memories that aren't already in the list
      const existingIds = new Set(memories.map(m => m.id));
      for (const mem of recentMemories) {
        if (!existingIds.has(mem.id)) {
          memories.push(mem);
        }
      }
      console.log('[Memory] Added recent memories, total:', memories.length);
    }
  }

  // Update last_referenced_at for used memories
  if (memories.length > 0) {
    const memoryIds = memories.map(m => m.id);
    await supabase
      .from('user_memories')
      .update({ last_referenced_at: new Date().toISOString() })
      .in('id', memoryIds);
  }

  return memories;
}

// Format memories for inclusion in AI context
export function formatMemoriesForContext(memories: UserMemory[]): string {
  if (memories.length === 0) return '';

  const grouped: Record<string, string[]> = {};
  for (const mem of memories) {
    const cat = mem.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(mem.fact);
  }

  let result = '\n\n## Remembered Facts About User:';
  for (const [category, facts] of Object.entries(grouped)) {
    result += `\n${category.charAt(0).toUpperCase() + category.slice(1)}:`;
    for (const fact of facts) {
      result += `\n- ${fact}`;
    }
  }

  return result;
}

// Get all memories for a user (for settings/management)
export async function getAllMemories(userId: string): Promise<UserMemory[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_memories')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Memory] Fetch all error:', error);
    return [];
  }

  return data || [];
}

// Delete a specific memory
export async function deleteMemory(memoryId: string, userId: string): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId);

  return !error;
}
