import { UserMemoryProfile, MemoryItem, MemoryCategory } from '../types';

const STORAGE_KEY = 'KIRA_NEURAL_MEMORY_V2';

const DEFAULT_MEMORY_PROFILE: UserMemoryProfile = {
  userName: '',
  userNickname: 'Senpai',
  memories: [
    {
      id: 'mem-default-1',
      category: 'identity',
      fact: 'Prefers being addressed warmly as Senpai / Master.',
      timestamp: Date.now(),
    },
    {
      id: 'mem-default-2',
      category: 'interest',
      fact: 'Enjoys interactive 3D anime companions and cyberpunk aesthetic.',
      timestamp: Date.now(),
    },
  ],
  customNotes: '',
  infiniteMemoryEnabled: true,
  totalConversations: 0,
  lastInteraction: Date.now(),
};

class MemoryEngine {
  private profile: UserMemoryProfile;

  constructor() {
    this.profile = this.load();
  }

  public load(): UserMemoryProfile {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_MEMORY_PROFILE,
          ...parsed,
          memories: Array.isArray(parsed.memories) ? parsed.memories : DEFAULT_MEMORY_PROFILE.memories,
        };
      }
    } catch (e) {
      console.warn('[MemoryEngine] Failed to parse stored memory, resetting to default:', e);
    }
    return { ...DEFAULT_MEMORY_PROFILE };
  }

  public save(profile?: UserMemoryProfile): void {
    if (profile) {
      this.profile = profile;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch (e) {
      console.warn('[MemoryEngine] Failed to save memory profile:', e);
    }
  }

  public getProfile(): UserMemoryProfile {
    return { ...this.profile };
  }

  public setInfiniteMemoryEnabled(enabled: boolean): void {
    this.profile.infiniteMemoryEnabled = enabled;
    this.save();
  }

  public updateUserInfo(userName: string, userNickname: string, customNotes?: string): void {
    this.profile.userName = userName.trim();
    this.profile.userNickname = userNickname.trim() || 'Senpai';
    if (customNotes !== undefined) {
      this.profile.customNotes = customNotes.trim();
    }
    this.profile.lastInteraction = Date.now();
    this.save();
  }

  public addMemory(fact: string, category: MemoryCategory = 'interest'): boolean {
    const cleanFact = fact.trim();
    if (!cleanFact || cleanFact.length < 3) return false;

    // Check duplicate or near duplicate
    const isDuplicate = this.profile.memories.some(
      (m) => m.fact.toLowerCase() === cleanFact.toLowerCase()
    );
    if (isDuplicate) return false;

    const newItem: MemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      category,
      fact: cleanFact,
      timestamp: Date.now(),
    };

    // Keep up to 30 most relevant high-priority memories in memory core
    this.profile.memories = [newItem, ...this.profile.memories].slice(0, 30);
    this.profile.lastInteraction = Date.now();
    this.save();
    return true;
  }

  public addMemoriesBatch(facts: string[], category: MemoryCategory = 'interest'): number {
    let addedCount = 0;
    for (const fact of facts) {
      if (this.addMemory(fact, category)) {
        addedCount++;
      }
    }
    return addedCount;
  }

  public removeMemory(id: string): void {
    this.profile.memories = this.profile.memories.filter((m) => m.id !== id);
    this.save();
  }

  public clearAllMemories(): void {
    this.profile.memories = [];
    this.profile.customNotes = '';
    this.save();
  }

  public incrementConversation(): void {
    this.profile.totalConversations = (this.profile.totalConversations || 0) + 1;
    this.profile.lastInteraction = Date.now();
    this.save();
  }

  // Generates a compact, highly optimized Pre-Call system prompt block (~70-120 tokens)
  public generateMemoryPromptContext(extraContext?: {
    affectionLevelName?: string;
    affectionScore?: number;
    headPatCount?: number;
    recentRecap?: string;
  }): string {
    if (!this.profile.infiniteMemoryEnabled) {
      return '';
    }

    const preferredNickname = this.profile.userNickname || this.profile.userName || 'Senpai';
    const nameSection = this.profile.userName
      ? `User's Real Name: "${this.profile.userName}", Call them: "${preferredNickname}"`
      : `Address user affectionately as: "${preferredNickname}"`;

    const factsList = this.profile.memories
      .slice(0, 12)
      .map((m) => `- [${m.category.toUpperCase()}] ${m.fact}`)
      .join('\n');

    const notesSection = this.profile.customNotes
      ? `\nUser Special Notes: ${this.profile.customNotes}`
      : '';

    const milestoneSection = extraContext
      ? `\nBond Level: ${extraContext.affectionLevelName || 'Devoted'} (${extraContext.affectionScore || 0}% Affection, ${extraContext.headPatCount || 0} Headpats)`
      : '';

    const recapSection = extraContext?.recentRecap
      ? `\nRecent Context Before Call: "${extraContext.recentRecap}"`
      : '';

    return `
[NEURAL LONG-TERM MEMORY & BOND BRIEFING]
${nameSection}${milestoneSection}
Permanent Memory Bank:
${factsList || '- Enjoys spending time and chatting with you.'}${notesSection}${recapSection}
Directive: Seamlessly recall these known facts in live voice speech! Greet the user personally by name/nickname to show unbroken continuity from past talks.
`.trim();
  }
}

export const memoryEngine = new MemoryEngine();
