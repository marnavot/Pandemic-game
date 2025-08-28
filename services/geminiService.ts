

import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Helper function to introduce a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateText = async (
  prompt: string,
  retries = 5,
  delay = 2000
): Promise<string | null> => {
  if (!API_KEY) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a dramatic news anchor for a global news network reporting on a unfolding pandemic crisis. Keep your reports short, punchy, and thematic. Do not use markdown.",
        temperature: 0.9,
        topP: 1,
        topK: 1,
      }
    });
    return response.text;
  } catch (error: any) {
    console.error(`Error generating text with Gemini (attempt ${6 - retries}):`, error);

    let isRateLimitError = false;
    // The Gemini SDK error for rate limiting might be nested. We check the message content.
    // The user's provided error log is a JSON string. Let's check for it.
    try {
        const errorString = typeof error === 'object' ? JSON.stringify(error) : String(error);
        if (errorString.includes('"code":429') || errorString.includes('"status":"RESOURCE_EXHAUSTED"')) {
            isRateLimitError = true;
        }
    } catch (e) {
        // Could not stringify, fallback to a simple message check
        if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
            isRateLimitError = true;
        }
    }

    if (isRateLimitError && retries > 0) {
      console.log(`Rate limit hit. Retrying in ${delay / 1000}s... (${retries} retries left)`);
      await sleep(delay);
      // Recursively call with one less retry and doubled delay for backoff
      return generateText(prompt, retries - 1, delay * 2);
    }
    
    // If it's not a rate limit error or retries are exhausted
    console.error("Failed to generate text after all retries or due to a non-retryable error.");
    return "A communications blackout prevents further details. The situation is dire.";
  }
};


export const generateEpidemicReport = async (cityName: string, diseaseColor: string, useAi: boolean): Promise<string | null> => {
    if (!useAi) {
        return `An EPIDEMIC has occurred in ${cityName}. The ${diseaseColor.toUpperCase()} disease is spreading rapidly.`;
    }
    const prompt = `Generate a news flash. A deadly EPIDEMIC has just broken out in ${cityName}. The disease is the fast-spreading "${diseaseColor.toUpperCase()}" plague. Report on the chaos and the escalating global threat.`;
    return generateText(prompt);
};

export const generateCureDiscoveredReport = async (diseaseColor: string, useAi: boolean): Promise<string | null> => {
    if (!useAi) {
        return `A cure has been discovered for the ${diseaseColor.toUpperCase()} disease! This is a turning point.`;
    }
    const prompt = `Generate a hopeful news report. A CURE has been discovered for the "${diseaseColor.toUpperCase()}" plague! Describe the global celebration and the turning of the tide against the pandemic.`;
    return generateText(prompt);
};

export const generateOutbreakReport = async (cityNames: string, useAi: boolean, gameType: 'pandemic' | 'fallOfRome'): Promise<string | null> => {
    const isFallOfRome = gameType === 'fallOfRome';
    const isChainReaction = cityNames.includes(',');

    const terms = {
        outbreak: isFallOfRome ? 'SACKING' : 'OUTBREAK',
        chainReaction: isFallOfRome ? 'CHAIN REACTION of SACKINGS' : 'CHAIN REACTION of OUTBREAKS',
    };

    if (!useAi) {
        return isChainReaction
            ? `A ${terms.chainReaction} has occurred, spreading through: ${cityNames}.`
            : `A ${terms.outbreak} has occurred in ${cityNames}.`;
    }

    const prompt = isFallOfRome
        ? (isChainReaction
            ? `Generate a panicked report from a Roman scout. A massive CHAIN REACTION of SACKINGS has occurred, rampaging through these cities: ${cityNames}. Barbarian hordes are overwhelming our defenses. The situation is catastrophic.`
            : `Generate a panicked report from a Roman scout. The city of ${cityNames} has been SACKED by barbarian hordes! Our defenses have fallen. The situation is critical.`
          )
        : (isChainReaction
            ? `Generate an urgent field report. A massive CHAIN REACTION of OUTBREAKS has occurred, starting in and spreading through the following cities: ${cityNames}. Containment has catastrophically failed and the disease is spreading uncontrollably. The situation is critical.`
            : `Generate an urgent field report. A massive OUTBREAK has occurred in ${cityNames}. Containment has failed and the disease is spreading to neighboring regions. The situation is critical.`
          );

    return generateText(prompt);
};

export const generateEradicationReport = async (diseaseColor: string, useAi: boolean): Promise<string | null> => {
    if (!useAi) {
        return `The ${diseaseColor.toUpperCase()} disease has been completely ERADICATED. A major victory!`;
    }
    const prompt = `Generate a celebratory news report. The "${diseaseColor.toUpperCase()}" plague has been completely ERADICATED from the planet. Describe this monumental victory for humanity.`;
    return generateText(prompt);
};

export const generateGameOverReport = async (win: boolean, reason: string | null, useAi: boolean): Promise<string | null> => {
    if (!useAi) {
        return reason;
    }
    const prompt = win
        ? `Generate a triumphant final news report for the history books. Humanity has won! The official summary is: "${reason}". Elaborate on this glorious victory.`
        : `Generate a somber, final broadcast to the world. The pandemic has overwhelmed us. It's over. Humanity has lost. The official cause of failure is: "${reason}". Report on this catastrophic event, explaining how it happened.`;
    return generateText(prompt);
};