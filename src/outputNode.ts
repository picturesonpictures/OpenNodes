import { BaseNode, NodeContext, NodeId, NodeInput, NodeOutput } from './types';

export type OutputFormat = 'text' | 'json' | 'markdown' | 'html';

export interface OutputNodeData {
  format: OutputFormat;
  fileName?: string; // Optional file name if saving to disk
}

export class OutputNode implements BaseNode {
  id: NodeId;
  type: string = 'OutputNode';
  name: string;
  inputs: Record<string, NodeInput> = {};
  outputs: Record<string, NodeOutput> = {};
  data: Record<string, any>;

  constructor(id: NodeId, name: string, initialData: OutputNodeData) {
    this.id = id;
    this.name = name;
    this.data = initialData;

    // OutputNode typically takes an input and formats it
    this.inputs = {
      input: {
        id: 'input',
        name: 'Input',
        type: 'any'
      }
    };

    // OutputNode might not have outputs, or it might output the formatted result
    this.outputs = {
      result: {
        id: 'result',
        name: 'Result',
        type: initialData.format
      }
    };
  }

  async execute(context: NodeContext): Promise<void> {
    const inputValue = this.inputs['input'].value;
    if (inputValue === undefined) {
      throw new Error(`OutputNode ${this.id} requires an input value`);
    }

    const format = this.data.format as OutputFormat;
    let formattedResult: string;

    try {
      switch (format) {
        case 'json':
          // Attempt to parse and stringify to ensure valid JSON
          if (typeof inputValue === 'string') {
            formattedResult = JSON.stringify(JSON.parse(inputValue), null, 2);
          } else {
            formattedResult = JSON.stringify(inputValue, null, 2);
          }
          break;
        case 'markdown':
        case 'html':
        case 'text':
        default:
          // For text-based formats, just convert to string
          formattedResult = typeof inputValue === 'string' ? inputValue : JSON.stringify(inputValue);
          break;
      }

      this.outputs['result'].value = formattedResult;

      // In a real application, you might save to a file, send to an API, or update the UI
      // context.emit('node:output', { nodeId: this.id, result: formattedResult, format });
      
      // For now, we just log it to the console if a fileName is provided (simulating a save)
      if (this.data.fileName) {
        console.log(`[OutputNode ${this.id}] Saving to ${this.data.fileName}:\n${formattedResult}`);
      }

    } catch (error) {
      console.error(`OutputNode ${this.id} failed to format output as ${format}:`, error);
      throw new Error(`Failed to format output: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
