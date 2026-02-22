export type NodeId = string;
export type ConnectionId = string;

export interface NodeInput {
  id: string;
  name: string;
  type: string;
  value?: any;
}

export interface NodeOutput {
  id: string;
  name: string;
  type: string;
  value?: any;
}

export interface NodeContext {
  graph: Graph;
  engine: ExecutionEngine;
  [key: string]: any;
}

export interface BaseNode {
  id: NodeId;
  type: string;
  name: string;
  inputs: Record<string, NodeInput>;
  outputs: Record<string, NodeOutput>;
  data: Record<string, any>;
  
  execute(context: NodeContext): Promise<void>;
}

export interface Connection {
  id: ConnectionId;
  sourceNodeId: NodeId;
  sourceOutputId: string;
  targetNodeId: NodeId;
  targetInputId: string;
}

export interface Graph {
  id: string;
  nodes: Map<NodeId, BaseNode>;
  connections: Map<ConnectionId, Connection>;
}

export interface ExecutionState {
  status: 'idle' | 'running' | 'completed' | 'error';
  currentNodeId?: NodeId;
  error?: Error;
  nodeResults: Map<NodeId, Record<string, any>>;
}

export interface ExecutionEngine {
  graph: Graph;
  state: ExecutionState;
  
  execute(): Promise<void>;
  executeNode(nodeId: NodeId): Promise<void>;
  reset(): void;
}
