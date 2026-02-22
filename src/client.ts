export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ModelCapability {
  vision: boolean;
  audio: boolean;
  tools: boolean;
  streaming: boolean;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[]; // Can be array for multimodal
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/opennodes/opennodes', // Required by OpenRouter
      'X-Title': 'OpenNodes', // Optional but recommended
    };
  }

  async getModels(): Promise<OpenRouterModel[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data as OpenRouterModel[];
  }

  detectCapabilities(model: OpenRouterModel): ModelCapability {
    const modality = model.architecture?.modality || '';
    return {
      vision: modality.includes('image') || modality.includes('vision'),
      audio: modality.includes('audio'),
      tools: true, // Most modern models support tools, but this could be refined
      streaming: true, // OpenRouter supports streaming for almost all models
    };
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat completion failed: ${response.status} - ${errorText}`);
    }

    return await response.json() as ChatCompletionResponse;
  }

  async *createStreamingChatCompletion(request: ChatCompletionRequest): AsyncGenerator<any, void, unknown> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Streaming chat completion failed: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            yield JSON.parse(data);
          } catch (e) {
            console.warn('Failed to parse stream chunk', data);
          }
        }
      }
    }
  }
}
