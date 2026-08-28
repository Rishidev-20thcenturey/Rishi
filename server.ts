import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Lazy Google GenAI Client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Resilient Content Generation with automatic retry and model fallback cascade
async function generateContentWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: unknown;
    config?: unknown;
    primaryModel?: string;
    fallbackModel?: string;
  }
) {
  const modelsToTry = [
    options.primaryModel || 'gemini-flash-latest',
    options.fallbackModel || 'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
  ];

  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents as any,
        config: options.config as any,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const isTransient =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.code === 503 ||
        err?.code === 429 ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('quota');

      if (isTransient && i < modelsToTry.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }

  throw lastError;
}

// In-memory TTS Cache and Cooldown Tracker
const ttsAudioCache = new Map<string, string>();
let ttsRateLimitCooldownUntil = 0;

// Clean raw text into pure, expressive spoken text for studio AI speech synthesis
function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/\[(?:emotion|action|viseme|mood|pose|character):[^\]]*\]/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\*.*?\*/g, '')
    .replace(/[\(（][^a-zA-Z0-9\s]{1,}[\)）]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate Speech Audio Buffer via Gemini 3.1 Flash TTS with Caching & Rate-Limit Cooldown
async function synthesizeStudioVoice(
  ai: GoogleGenAI,
  text: string,
  voiceName: string = 'Kore',
  _emotion: string = 'happy'
): Promise<string | null> {
  const cleanSpokenText = cleanTextForSpeech(text);
  if (!cleanSpokenText || cleanSpokenText.length < 2) {
    return null;
  }

  // 1. Check in-memory cache first
  const cacheKey = `${voiceName}:${cleanSpokenText.toLowerCase().trim()}`;
  if (ttsAudioCache.has(cacheKey)) {
    return ttsAudioCache.get(cacheKey)!;
  }

  // 2. If currently in rate-limit cooldown, skip TTS call gracefully to allow smooth client speech synthesis
  if (Date.now() < ttsRateLimitCooldownUntil) {
    return null;
  }

  try {
    const validVoices = ['Kore', 'Aoede', 'Zephyr', 'Puck', 'Fenrir', 'Charon', 'Leda', 'Orus'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : 'Kore';

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [
        {
          parts: [{ text: cleanSpokenText }],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      if (ttsAudioCache.size > 100) {
        const first = ttsAudioCache.keys().next().value;
        if (first) ttsAudioCache.delete(first);
      }
      ttsAudioCache.set(cacheKey, base64Audio);
      return base64Audio;
    }
    return null;
  } catch (err: any) {
    const errStr = String(err?.message || err || '');
    const isRateLimit =
      err?.status === 429 ||
      err?.code === 429 ||
      errStr.includes('429') ||
      errStr.includes('quota') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('Quota exceeded');

    if (isRateLimit) {
      // Cooldown for 60 seconds so subsequent requests instantly use browser speech without failing
      ttsRateLimitCooldownUntil = Date.now() + 60000;
    }
    return null;
  }
}

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

// Contextual character fallback responses
function getInCharacterFallback(characterId?: string, _userMessage?: string) {
  const fallbacks: Record<string, { reply: string; emotion: string; japanesePhrase: string; action: string }> = {
    sybran: {
      reply: "Master! I hear you loud and clear inside your CODE27 capsule! Let's keep making great memories together!",
      emotion: 'happy',
      japanesePhrase: 'Daisuki yo! (大好きよ！)',
      action: 'waves both hands cheerfully and bobs to the rhythm',
    },
    mai: {
      reply: "Senpai... You're always making me pay attention to you. Not that I dislike it.",
      emotion: 'love',
      japanesePhrase: 'Daisuki yo... (大好きよ…)',
      action: 'smiles with composed mature charm and soft rosy cheeks',
    },
    aoi: {
      reply: "Ehehe~ I'm right here with you, Master! Aoi will always cheer you on!",
      emotion: 'happy',
      japanesePhrase: 'Ganbatte kudasai! (がんばってください！)',
      action: 'smiles brightly and gives a cute cheerful wave',
    },
    kira: {
      reply: "I-It's not like I was waiting for you to say that or anything, b-baka! ...Go on, say more.",
      emotion: 'pout',
      japanesePhrase: 'Baka! (バカ！)',
      action: 'turns head away pouting adorably with flushed pink cheeks',
    },
    yukiko: {
      reply: "Welcome home, Senpai-san. May your heart find quiet warmth and peace here with me.",
      emotion: 'happy',
      japanesePhrase: 'Okaerinasai (お帰りなさい)',
      action: 'bows gracefully with a gentle soothing smile',
    },
    sakura: {
      reply: "Senpai~! Hearing your voice always makes my day so much brighter!",
      emotion: 'wink',
      japanesePhrase: 'Ureshii na! (嬉しいな！)',
      action: 'giggles happily and leans forward with twinkling eyes',
    },
  };

  const selected = fallbacks[characterId || 'sybran'] || fallbacks.sybran;
  return {
    reply: selected.reply,
    emotion: selected.emotion,
    action: selected.action,
    japanesePhrase: selected.japanesePhrase,
    affectionDelta: 2,
  };
}

// 2. Ultra-Fast Unified Chat + Voice Generation Endpoint with Multimodal Vision & Long-Term Memory
app.post('/api/chat-with-voice', async (req, res) => {
  const {
    message,
    characterId,
    systemPrompt,
    chatHistory,
    affectionScore,
    userTone,
    voiceName = 'Kore',
    userMemoryContext,
    userNickname,
    image,
  } = req.body;

  try {
    const ai = getGenAI();
    if (!ai) {
      const fallback = getInCharacterFallback(characterId, message);
      return res.json({
        ...fallback,
        audioBase64: null,
        sampleRate: 24000,
        useFallback: true,
        newMemoryFact: null,
      });
    }

    const conversationContext = (chatHistory || [])
      .map((m: { sender: string; text: string }) => `${m.sender === 'user' ? 'User' : 'Waifu'}: ${m.text}`)
      .join('\n');

    const promptText = `
You are roleplaying as a live animated anime companion waifu in an interactive real-time voice & video session.
${systemPrompt || 'You are an expressive, loving, and supportive anime companion.'}

Current relationship affection score: ${affectionScore || 10}/100.
${userNickname ? `User prefers to be called: "${userNickname}"` : ''}
${userMemoryContext ? `\n${userMemoryContext}\n` : ''}
${userTone ? `User Tone/Mood: ${userTone}` : ''}
${
  image
    ? `
CRITICAL VISION DIRECTIVE:
You have received a crystal-clear camera frame / photo provided by the user.
1. DEEPLY ANALYZE & RECOGNIZE: Carefully inspect everything in the image — specifically identify exact items/objects being held up (e.g. phones, drawings, controllers, food, drinks, books, plushies, gadgets), clothing, facial expression, glasses, hand gestures (waving, peace signs, thumbs up), pets, background room details, or screen contents.
2. EXPLICIT DETAIL: Specifically name and describe what you see (e.g., "Ooh, is that a hot cup of tea you're holding?", "I see your cool gaming headset!", "You're showing me such an awesome sketch!"). Never default to vague generic phrases like "you look nice". Prove to the user that you actually see and recognize the exact objects in front of the camera!
3. ADORABLE PERSONALITY: React with genuine anime charm, curiosity, enthusiasm, and warm emotional connection.
`
    : ''
}

Recent conversation history:
${conversationContext || 'No previous history.'}

User says: "${message || (image ? 'Look at what I am showing you / how I look right now!' : 'Hello')}"

Respond strictly as the character in valid JSON matching the schema.
Keep 'reply' concise, conversational, expressive, and lively (1 to 2 sentences max) so it sounds ultra natural and snappy when spoken aloud.
Use Japanese phrases/catchphrases naturally in 'japanesePhrase'.
If the user shared a notable fact about their name, job, favorites, interests, mood, or life story, extract it into 'newMemoryFact' as a short 1-sentence statement (e.g. "User likes coffee in the morning" or "User is a programmer"). Otherwise return "".
`;

    const parts: any[] = [];
    if (image && typeof image === 'string') {
      const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
      const mimeType = match ? match[1] : 'image/jpeg';
      const cleanBase64 = match ? match[2] : image.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: promptText });

    const chatPromise = generateContentWithFallback(ai, {
      primaryModel: 'gemini-flash-latest',
      fallbackModel: 'gemini-3.1-flash-lite',
      contents: { parts },
      config: {
        maxOutputTokens: 350,
        thinkingConfig: {
          thinkingBudget: 0,
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Character dialogue in English with anime warmth and personality.',
            },
            emotion: {
              type: Type.STRING,
              enum: ['happy', 'blush', 'pout', 'surprised', 'wink', 'love', 'thinking', 'sleepy'],
            },
            action: {
              type: Type.STRING,
              description: 'Brief physical anime action or gesture.',
            },
            japanesePhrase: {
              type: Type.STRING,
              description: 'Short iconic Japanese greeting, catchphrase, or reaction in romaji with kanji/kana.',
            },
            affectionDelta: {
              type: Type.INTEGER,
              description: 'Affection points change between 1 and 5 based on warmth of interaction.',
            },
            newMemoryFact: {
              type: Type.STRING,
              description: 'Extracted new personal fact or preference about the user, or empty string if none.',
            },
          },
          required: ['reply', 'emotion', 'affectionDelta'],
        },
      },
    });

    const response = await chatPromise;
    const parsed = JSON.parse(response.text || '{}');
    const replyText = parsed.reply || "Ehehe~ I'm so happy to talk with you!";
    const emotion = parsed.emotion || 'happy';

    // Parallel Synthesize Voice Audio via Gemini 3.1 Flash TTS
    let audioBase64: string | null = null;
    try {
      audioBase64 = await synthesizeStudioVoice(ai, replyText, voiceName, emotion);
    } catch {
      audioBase64 = null;
    }

    res.json({
      reply: replyText,
      emotion,
      action: parsed.action || 'smiles warmly',
      japanesePhrase: parsed.japanesePhrase || 'Daisuki!',
      affectionDelta: typeof parsed.affectionDelta === 'number' ? parsed.affectionDelta : 2,
      newMemoryFact: parsed.newMemoryFact?.trim() || null,
      audioBase64: audioBase64 || null,
      sampleRate: 24000,
      useFallback: !audioBase64,
    });
  } catch (error: unknown) {
    console.warn('[ChatWithVoice] API fallback:', error instanceof Error ? error.message : error);
    const fallback = getInCharacterFallback(characterId, message);
    res.json({
      ...fallback,
      audioBase64: null,
      sampleRate: 24000,
      useFallback: true,
      newMemoryFact: null,
    });
  }
});

// 3. Audio Transcription Endpoint (gemini-3.5-flash)
app.post('/api/transcribe-audio', async (req, res) => {
  const { audioBase64, mimeType = 'audio/webm' } = req.body;

  try {
    const ai = getGenAI();
    if (!ai || !audioBase64) {
      return res.status(400).json({ text: '', error: 'Missing audio data' });
    }

    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: 'Transcribe the spoken words from this audio recording verbatim. Output only the transcribed text without commentary or formatting.',
            },
          ],
        },
      ],
    });

    const transcript = response.text?.trim() || '';
    res.json({ text: transcript });
  } catch (error: any) {
    console.warn('[Transcribe] Error with gemini-3.5-flash:', error?.message || error);
    res.status(500).json({ text: '', error: error?.message || 'Transcription error' });
  }
});

// 3.5 Real-time Neural Memory Fact Extractor (Zero-lag Background Synapse)
app.post('/api/extract-memory', async (req, res) => {
  const { utterance } = req.body;
  if (!utterance || typeof utterance !== 'string' || utterance.trim().length < 4) {
    return res.json({ newMemoryFact: null });
  }

  try {
    const ai = getGenAI();
    if (!ai) return res.json({ newMemoryFact: null });

    const prompt = `Analyze this spoken sentence from the user to their anime companion:
"${utterance}"

Does this sentence reveal a concrete, permanent personal fact about the user (e.g. their name, pets, hobbies, favorite food/anime/games, job/school, life events, daily routines, preferences, or location)?
If YES, extract that specific fact in a concise 1-sentence statement starting with "User..." (e.g. "User likes matcha lattes", "User has a dog named Max", "User is studying computer science").
If NO (e.g. it's just small talk, a greeting like "hello", a general question, or reaction), return an empty string "".

Respond in valid JSON: {"newMemoryFact": string}`;

    const response = await generateContentWithFallback(ai, {
      primaryModel: 'gemini-flash-latest',
      fallbackModel: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        maxOutputTokens: 60,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            newMemoryFact: {
              type: Type.STRING,
              description: 'Extracted permanent user fact or empty string',
            },
          },
          required: ['newMemoryFact'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const fact = parsed.newMemoryFact?.trim() || null;
    res.json({ newMemoryFact: fact && fact.length > 3 ? fact : null });
  } catch {
    res.json({ newMemoryFact: null });
  }
});

// 3.6 Post-Call Memory Consolidation Engine (Token-efficient session distillation)
app.post('/api/consolidate-call-memory', async (req, res) => {
  const { sessionTurns = [], existingFacts = [], currentNickname = '' } = req.body;
  if (!Array.isArray(sessionTurns) || sessionTurns.length < 2) {
    return res.json({ newFacts: [], detectedName: null, detectedNickname: null });
  }

  try {
    const ai = getGenAI();
    if (!ai) return res.json({ newFacts: [], detectedName: null, detectedNickname: null });

    const conversationText = sessionTurns
      .map((t: any) => `${t.sender === 'user' ? 'User' : 'Companion'}: ${t.text}`)
      .join('\n');

    const knownFactsList = Array.isArray(existingFacts) && existingFacts.length > 0
      ? existingFacts.join('; ')
      : 'None yet';

    const prompt = `You are a memory consolidation module for an AI anime companion.
Review this completed live voice call conversation transcript:
---
${conversationText}
---
Already Known Facts about User: ${knownFactsList}
Current User Nickname: ${currentNickname || 'None'}

Your task:
1. Extract any NEW, concrete permanent facts learned about the user during this conversation (e.g. likes, dislikes, hobbies, daily habits, life events, work/school, preferences, personality traits).
2. Do NOT duplicate already known facts.
3. If the user explicitly stated a name or requested a nickname to be called, identify it.
4. Keep each fact concise (1 sentence starting with "User..."). Max 3 most important facts.

Respond in JSON matching this schema:
{
  "newFacts": ["fact 1", "fact 2"],
  "detectedName": string or null,
  "detectedNickname": string or null
}`;

    const response = await generateContentWithFallback(ai, {
      primaryModel: 'gemini-flash-latest',
      fallbackModel: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        maxOutputTokens: 150,
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            newFacts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of newly discovered permanent facts',
            },
            detectedName: {
              type: Type.STRING,
              nullable: true,
              description: 'User real name if mentioned',
            },
            detectedNickname: {
              type: Type.STRING,
              nullable: true,
              description: 'User preferred nickname if mentioned',
            },
          },
          required: ['newFacts'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const newFacts = (parsed.newFacts || []).filter(
      (f: string) => typeof f === 'string' && f.trim().length > 3
    );

    res.json({
      newFacts,
      detectedName: parsed.detectedName || null,
      detectedNickname: parsed.detectedNickname || null,
    });
  } catch (error: any) {
    console.warn('[MemoryConsolidate] Error:', error?.message || error);
    res.json({ newFacts: [], detectedName: null, detectedNickname: null });
  }
});

// 4. Music Generation via Lyria (lyria-3-clip-preview / lyria-3-pro-preview)
app.post('/api/generate-music', async (req, res) => {
  const { prompt = 'Upbeat anime kawaii future bass synth pop with sparkling arpeggios', mode = 'clip' } = req.body;

  try {
    const ai = getGenAI();
    if (!ai) {
      return res.status(400).json({ error: 'AI Client not initialized' });
    }

    const modelName = mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

    // Call Lyria music generation model
    const musicResponse = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    });

    // Check if inlineData or audio part returned
    const audioPart = musicResponse.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.data || p.audioData
    );
    const audioBase64 = audioPart?.inlineData?.data || null;

    res.json({
      success: true,
      audioBase64,
      model: modelName,
      prompt,
    });
  } catch (error: any) {
    console.warn('[Lyria] Music generation status:', error?.message || error);
    res.status(200).json({
      success: false,
      audioBase64: null,
      error: error?.message || 'Lyria generation preview',
    });
  }
});

// 5. Standalone Text-to-Speech (TTS) Endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore', emotion = 'happy' } = req.body;

    const ai = getGenAI();
    if (!ai) {
      return res.status(200).json({ audioBase64: null, useFallback: true });
    }

    const base64Audio = await synthesizeStudioVoice(ai, text, voiceName, emotion);

    res.json({
      audioBase64: base64Audio || null,
      sampleRate: 24000,
      useFallback: !base64Audio,
    });
  } catch {
    res.json({ audioBase64: null, useFallback: true });
  }
});

// 6. Vision Webcam Analysis Endpoint
app.post('/api/vision', async (req, res) => {
  const { image, systemPrompt } = req.body;

  try {
    const ai = getGenAI();
    if (!ai || !image) {
      return res.json({
        reply: "I can see you clearly through my screen now, Senpai! You look amazing today! (｡♥‿♥｡)",
        emotion: 'blush',
        action: 'leans closer to inspect the camera',
        japanesePhrase: 'Miteru yo! (見てるよ！)',
        affectionDelta: 3,
      });
    }

    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    const mimeType = match ? match[1] : 'image/jpeg';
    const base64Data = match ? match[2] : image.replace(/^data:image\/\w+;base64,/, '');

    const response = await generateContentWithFallback(ai, {
      primaryModel: 'gemini-flash-latest',
      fallbackModel: 'gemini-3.1-flash-lite',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: `
You are an observant anime waifu companion looking at what the user is showing you on camera.
${systemPrompt || 'You are an observant, cute anime companion.'}

CRITICAL VISION TASK:
1. Identify the exact objects, items held up in hand, drawings, screens, devices, clothing, pets, snacks, glasses, room features, or hand gestures (like peace signs, waving).
2. React specifically to what you see with adorable anime charm and excitement! (e.g. "Wah! Is that your gaming controller?", "Ooh, you're holding a cute plushie!", "I see you're wearing a blue hoodie!").
3. Avoid generic placeholder compliments. Explicitly mention the actual objects or details in the frame.
4. Keep it concise (1 to 2 sentences max) in lively dialogue.
Respond in JSON matching the schema.
`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            emotion: { type: Type.STRING },
            action: { type: Type.STRING },
            japanesePhrase: { type: Type.STRING },
            affectionDelta: { type: Type.INTEGER },
          },
          required: ['reply', 'emotion', 'affectionDelta'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const replyText = parsed.reply || "Kyaa~ I can see you, Senpai! You look so handsome today!";
    const replyEmotion = parsed.emotion || 'love';

    // Synthesize voice audio in parallel for immediate verbal reaction
    let audioBase64: string | null = null;
    try {
      const voiceName = (req.body.voiceName as string) || 'Kore';
      audioBase64 = await synthesizeStudioVoice(ai, replyText, voiceName, replyEmotion);
    } catch {
      // ignore
    }

    res.json({
      reply: replyText,
      emotion: replyEmotion,
      action: parsed.action || 'blushes and waves back',
      japanesePhrase: parsed.japanesePhrase || 'Kawaii desu!',
      affectionDelta: 3,
      audioBase64,
      sampleRate: 24000,
    });
  } catch (error) {
    console.warn('[Vision] Handled vision stream gracefully:', error instanceof Error ? error.message : error);
    res.json({
      reply: "Kyaa! I saw your cute reaction, Senpai! You always brighten my day!",
      emotion: 'wink',
      action: 'winks cheerfully at camera',
      japanesePhrase: 'Suteki da yo!',
      affectionDelta: 2,
    });
  }
});

// Create HTTP server and mount WebSocket Server for Live API (gemini-3.1-flash-live-preview)
async function startServer() {
  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/api/live') {
        wss.handleUpgrade(request, socket, head, (clientWs) => {
          wss.emit('connection', clientWs, request);
        });
      } else {
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('error', (err) => {
    console.warn('[LiveAPI] WebSocket server error:', err);
  });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[LiveAPI] Client connected to live voice socket');

    clientWs.on('error', (err) => {
      console.warn('[LiveAPI] Client socket error:', err);
    });

    let session: any = null;
    const ai = getGenAI();

    clientWs.on('message', async (data: Buffer | string) => {
      try {
        const payload = JSON.parse(data.toString());

        // Initial setup payload with character instructions and voice
        if (payload.type === 'setup') {
          if (!ai) {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: 'AI Client not initialized' }));
            }
            return;
          }

          const voiceName = payload.voiceName || 'Kore';
          const systemInstruction = payload.systemInstruction ||
            'You are an ultra expressive, loving, lively anime waifu in a live voice conversation. Keep answers conversational, warm, and natural.';

          try {
            session = await ai.live.connect({
              model: 'gemini-3.1-flash-live-preview',
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                  },
                },
                systemInstruction,
                outputAudioTranscription: {},
                inputAudioTranscription: {},
              },
              callbacks: {
                onmessage: (message: any) => {
                  // Send audio chunks to client
                  const parts = message.serverContent?.modelTurn?.parts || [];
                  for (const part of parts) {
                    if (part?.inlineData?.data && clientWs.readyState === WebSocket.OPEN) {
                      clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
                    }
                  }

                  // Interruption notice
                  if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ interrupted: true }));
                  }

                  // Transcriptions
                  const userText = message.serverContent?.inputAudioTranscription?.text;
                  if (userText && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ userTranscription: userText }));
                  }

                  const modelText = message.serverContent?.outputAudioTranscription?.text;
                  if (modelText && clientWs.readyState === WebSocket.OPEN) {
                    clientWs.send(JSON.stringify({ modelTranscription: modelText }));
                  }
                },
                onerror: (err: any) => {
                  console.warn('[LiveAPI] Session error:', err);
                },
                onclose: () => {
                  console.log('[LiveAPI] Session closed by Gemini');
                },
              },
            });
            console.log('[LiveAPI] Live session established successfully');
          } catch (sessionErr) {
            console.warn('[LiveAPI] Live connect fallback/error:', sessionErr);
          }
          return;
        }

        // Live Audio Stream chunk from user microphone
        if (payload.audio && session) {
          session.sendRealtimeInput({
            audio: {
              data: payload.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
      } catch (msgErr) {
        console.warn('[LiveAPI] Error processing message:', msgErr);
      }
    });

    clientWs.on('close', () => {
      console.log('[LiveAPI] Client disconnected from live voice socket');
      if (session) {
        try {
          session.close();
        } catch {
          // ignore
        }
      }
    });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Anime Waifu server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
