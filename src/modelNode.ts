import { BaseNode, NodeContext, NodeId, NodeInput, NodeOutput } from './types';
import { ChatMessage, OpenRouterClient } from './client';

export interface ModelNodeData {
  modelId: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export class ModelNode implements BaseNode {
  id: NodeId;
  type: string = 'ModelNode';
  name: string;
  inputs: Record<string, NodeInput> = {};
  outputs: Record<string, NodeOutput> = {};
  data: Record<string, any>;

  constructor(id: NodeId, name: string, initialData: ModelNodeData) {
    this.id = id;
    this.name = name;
    this.data = initialData;

    // ModelNode typically takes a prompt/input and outputs a response
    this.inputs = {
      input: {
        id: 'input',
        name: 'Input',
        type: 'any' // Can be text, image, or audio depending on the model
      }
    };

    this.outputs = {
      output: {
        id: 'output',
        name: 'Output',
        type: 'text' // Typically text, but could be structured data
      }
    };
  }

  async execute(context: NodeContext): Promise<void> {
    const client = context.openRouterClient as OpenRouterClient;
    if (!client) {
      throw new Error(`ModelNode ${this.id} requires an OpenRouterClient in the context`);
    }

    const inputValue = this.inputs['input'].value;
    if (!inputValue) {
      throw new Error(`ModelNode ${this.id} requires an input value`);
    }

    const modelId = this.data.modelId;
    const systemPrompt = this.data.systemPrompt;
    const temperature = this.data.temperature;
    const maxTokens = this.data.maxTokens;
    const stream = this.data.stream;

    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Handle different input types (text, image, audio)
    if (inputValue.type === 'text') {
      messages.push({ role: 'user', content: inputValue.data });
    } else if (inputValue.type === 'image') {
      // Assuming the model supports vision and the input data is a URL or base64
      messages.push({
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: inputValue.data } }
        ]
      });
    } else {
      // Fallback for unsupported types or raw strings
      messages.push({ role: 'user', content: String(inputValue.data || inputValue) });
    }

    const request = {
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream
    };

    try {
      if (stream) {
        // For streaming, we might want to emit events or handle it differently
        // Here we just collect the full response for simplicity in the basic execution
        const streamGenerator = client.createStreamingChatCompletion(request);
        let fullResponse = '';
        for await (const chunk of streamGenerator) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullResponse += content;
          // In a real app, you'd emit an event here to update the UI
          // context.emit('node:stream', { nodeId: this.id, chunk: content });
        }
        this.outputs['output'].value = fullResponse;
      } else {
        const response = await client.createChatCompletion(request);
        this.outputs['output'].value = response.choices[0]?.message?.content || '';
      }
    } catch (error) {
      console.error(`ModelNode ${this.id} execution failed:`, error);
      throw error;
    }
  }
}
