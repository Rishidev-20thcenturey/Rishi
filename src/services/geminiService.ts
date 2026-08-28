import { CharacterPreset, EmotionType } from '../types';

export interface ChatResponsePayload {
  reply: string;
  emotion: EmotionType;
  action?: string;
  japanesePhrase?: string;
  affectionDelta: number;
  newMemoryFact?: string | null;
  audioBase64?: string | null;
  sampleRate?: number;
  useFallback?: boolean;
}

// Single-trip fast execution endpoint: returns character response AND Studio AI Audio with Multimodal Vision
export async function sendChatWithVoice(
  message: string,
  character: CharacterPreset,
  chatHistory: { sender: 'user' | 'waifu'; text: string }[],
  affectionScore: number,
  userTone?: string,
  overrideVoice?: string,
  userMemoryContext?: string,
  userNickname?: string,
  image?: string | null
): Promise<ChatResponsePayload> {
  // 1. Try server endpoint first (when running on full-stack host or AI Studio)
  try {
    const res = await fetch('/api/chat-with-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        characterId: character.id,
        systemPrompt: character.systemPrompt,
        chatHistory: chatHistory.slice(-8),
        affectionScore,
        userTone,
        voiceName: overrideVoice || character.voice.geminiVoice || 'Kore',
        userMemoryContext,
        userNickname,
        image: image || undefined,
      }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Proceed to client-side direct API fallback
  }

  // 2. Direct Client-side Gemini fallback (works on Netlify / Static hosting with user API Key)
  const clientApiKey = localStorage.getItem('GEMINI_USER_API_KEY') || '';
  if (clientApiKey) {
    try {
      const prompt = `You are ${character.name}, an interactive anime AI companion.
Personality: ${character.personality}
System Prompt: ${character.systemPrompt}
Current Affection Score: ${affectionScore}/100.
The user said: "${message}".

Respond with a JSON object in this format:
{
  "reply": "your in-character response to the user",
  "emotion": "happy" | "shy" | "blush" | "smug" | "surprised" | "sad" | "pout" | "wink" | "neutral",
  "action": "short physical action description",
  "japanesePhrase": "a short relevant cute japanese phrase with romaji and english",
  "affectionDelta": 1
}`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const parsed = JSON.parse(textContent);
          return {
            reply: parsed.reply || "Ehehe~ I'm so happy to chat with you!",
            emotion: parsed.emotion || 'happy',
            action: parsed.action || 'smiles at you',
            japanesePhrase: parsed.japanesePhrase || 'Arigatou! (Thank you!)',
            affectionDelta: parsed.affectionDelta || 1,
            audioBase64: null,
            sampleRate: 24000,
            useFallback: true,
          };
        }
      }
    } catch (e) {
      console.warn('Client-side Gemini API call error:', e);
    }
  }

  // 3. Graceful offline fallback
  return {
    reply: `Ehehe~ I hear you loud and clear, Master! Let's keep chatting!`,
    emotion: 'happy',
    action: 'smiles warmly at you',
    japanesePhrase: 'Daijoubu da yo! (大丈夫だよ！)',
    affectionDelta: 1,
    audioBase64: null,
    sampleRate: 24000,
    useFallback: true,
  };
}

export async function sendChatMessage(
  message: string,
  character: CharacterPreset,
  chatHistory: { sender: 'user' | 'waifu'; text: string }[],
  affectionScore: number,
  userTone?: string
): Promise<ChatResponsePayload> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        characterId: character.id,
        systemPrompt: character.systemPrompt,
        chatHistory: chatHistory.slice(-8),
        affectionScore,
        userTone,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.warn('Chat request fallback handled:', err);
    return {
      reply: `Ehehe~ I'm right here with you, Master! Let's keep talking!`,
      emotion: 'happy',
      action: 'smiles warmly at you',
      japanesePhrase: 'Daijoubu da yo! (大丈夫だよ！)',
      affectionDelta: 1,
    };
  }
}

// Audio Transcription via gemini-3.5-flash
export async function transcribeAudioRecording(
  audioBase64: string,
  mimeType: string = 'audio/webm'
): Promise<string> {
  try {
    const res = await fetch('/api/transcribe-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, mimeType }),
    });

    if (!res.ok) {
      throw new Error('Transcription error');
    }

    const data = await res.json();
    return data.text || '';
  } catch (err) {
    console.warn('Transcription error:', err);
    return '';
  }
}

// Music Generation via Lyria (lyria-3-clip-preview / lyria-3-pro-preview)
export async function generateLyriaMusic(
  prompt: string,
  mode: 'clip' | 'pro' = 'clip'
): Promise<{ success: boolean; audioBase64?: string | null; error?: string }> {
  try {
    const res = await fetch('/api/generate-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, mode }),
    });

    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Music generation failed' };
  }
}

export async function requestGeminiTTS(
  text: string,
  voiceName: string = 'Kore',
  emotion: EmotionType = 'happy'
): Promise<{ audioBase64: string | null; sampleRate: number }> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        voiceName,
        emotion,
      }),
    });

    if (!res.ok) {
      return { audioBase64: null, sampleRate: 24000 };
    }

    const data = await res.json();
    return {
      audioBase64: data.audioBase64 || null,
      sampleRate: data.sampleRate || 24000,
    };
  } catch {
    return { audioBase64: null, sampleRate: 24000 };
  }
}

export async function analyzeCameraSnapshot(
  imageBase64: string,
  character: CharacterPreset,
  voiceName?: string
): Promise<ChatResponsePayload> {
  try {
    const res = await fetch('/api/vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBase64,
        characterId: character.id,
        systemPrompt: character.systemPrompt,
        voiceName: voiceName || character.voice.geminiVoice || 'Kore',
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to analyze camera vision');
    }

    return await res.json();
  } catch (err) {
    console.warn('Vision request fallback handled:', err);
    return {
      reply: "Kyaa! I saw your cute reaction, Master! You always brighten my day!",
      emotion: 'wink',
      action: 'winks cheerfully at camera',
      japanesePhrase: 'Suteki da yo!',
      affectionDelta: 2,
    };
  }
}

export async function extractMemoryFact(
  userUtterance: string
): Promise<string | null> {
  if (!userUtterance || userUtterance.trim().length < 4) return null;
  try {
    const res = await fetch('/api/extract-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ utterance: userUtterance }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.newMemoryFact || null;
    }
  } catch {
    // Non-blocking background extraction
  }
  return null;
}

export async function consolidateCallMemory(
  sessionTurns: Array<{ sender: string; text: string }>,
  existingFacts: string[],
  currentNickname: string
): Promise<{ newFacts: string[]; detectedName: string | null; detectedNickname: string | null }> {
  if (!sessionTurns || sessionTurns.length < 2) {
    return { newFacts: [], detectedName: null, detectedNickname: null };
  }
  try {
    const res = await fetch('/api/consolidate-call-memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionTurns, existingFacts, currentNickname }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[ConsolidateCallMemory] Failed:', err);
  }
  return { newFacts: [], detectedName: null, detectedNickname: null };
}



