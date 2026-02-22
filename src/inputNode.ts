import { BaseNode, NodeContext, NodeId, NodeInput, NodeOutput } from './types';

export type InputDataType = 'text' | 'image' | 'audio';

export interface InputNodeData {
  dataType: InputDataType;
  value: string | Buffer | any; // Could be a URL, base64 string, or raw buffer
  mimeType?: string;
}

export class InputNode implements BaseNode {
  id: NodeId;
  type: string = 'InputNode';
  name: string;
  inputs: Record<string, NodeInput> = {};
  outputs: Record<string, NodeOutput> = {};
  data: Record<string, any>;

  constructor(id: NodeId, name: string, initialData: InputNodeData) {
    this.id = id;
    this.name = name;
    this.data = initialData;

    // InputNode typically has no inputs, only outputs
    this.outputs = {
      output: {
        id: 'output',
        name: 'Output',
        type: initialData.dataType,
        value: initialData.value
      }
    };
  }

  async execute(context: NodeContext): Promise<void> {
    // For an InputNode, execution simply means passing its internal data to its output.
    // In a more complex scenario, this might involve fetching a file, reading from a microphone, etc.
    
    const dataType = this.data.dataType as InputDataType;
    const value = this.data.value;

    // Validate or process based on type if necessary
    switch (dataType) {
      case 'text':
        if (typeof value !== 'string') {
          throw new Error(`InputNode ${this.id} expected text value, got ${typeof value}`);
        }
        break;
      case 'image':
      case 'audio':
        // Basic validation for media types
        if (!value) {
          throw new Error(`InputNode ${this.id} missing media value`);
        }
        break;
      default:
        throw new Error(`InputNode ${this.id} has unsupported data type: ${dataType}`);
    }

    this.outputs['output'].value = {
      type: dataType,
      data: value,
      mimeType: this.data.mimeType
    };
  }
}
