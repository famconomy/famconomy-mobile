
export interface JournalEntry {
  EntryID: number;
  FamilyID: number;
  Title: string;
  EntryText: string;
  IsPrivate: boolean;
  CreatedByUserID: string;
  CreatedAt: string;
}

export type JournalMood = 'happy' | 'good' | 'neutral' | 'sad' | 'stressed';
export type JournalTag = 'family' | 'personal' | 'work' | 'health' | 'goals' | 'memories' | 'gratitude';
