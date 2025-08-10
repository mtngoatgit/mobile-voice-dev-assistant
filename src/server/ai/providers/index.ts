import { OpenAIProvider } from "./openai";
import { ClaudeProvider } from "./claude";
import { GeminiProvider } from "./gemini";
import { type AIProvider, type AIProviderType } from "./types";

// Provider registry
const providers = {
  openai: OpenAIProvider,
  claude: ClaudeProvider,
  gemini: GeminiProvider,
} as const;

export function getProvider(providerId: AIProviderType): AIProvider {
  const ProviderClass = providers[providerId];
  if (!ProviderClass) {
    throw new Error(`Unknown AI provider: ${providerId}`);
  }
  
  return new ProviderClass();
}

export function getAvailableProviders(): Array<{ id: AIProviderType; isConfigured: boolean }> {
  return Object.entries(providers).map(([id, ProviderClass]) => ({
    id: id as AIProviderType,
    isConfigured: new ProviderClass().isConfigured(),
  }));
}

// Re-export types for convenience
export * from "./types";