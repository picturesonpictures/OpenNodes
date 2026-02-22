import { BaseNode, Connection, ConnectionId, ExecutionEngine, ExecutionState, Graph, NodeContext, NodeId } from './types';

export class GraphImpl implements Graph {
  id: string;
  nodes: Map<NodeId, BaseNode> = new Map();
  connections: Map<ConnectionId, Connection> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  addNode(node: BaseNode): void {
    this.nodes.set(node.id, node);
  }

  removeNode(nodeId: NodeId): void {
    this.nodes.delete(nodeId);
    // Remove associated connections
    for (const [connId, conn] of this.connections.entries()) {
      if (conn.sourceNodeId === nodeId || conn.targetNodeId === nodeId) {
        this.connections.delete(connId);
      }
    }
  }

  addConnection(connection: Connection): void {
    this.connections.set(connection.id, connection);
  }

  removeConnection(connectionId: ConnectionId): void {
    this.connections.delete(connectionId);
  }

  getIncomingConnections(nodeId: NodeId): Connection[] {
    return Array.from(this.connections.values()).filter(c => c.targetNodeId === nodeId);
  }

  getOutgoingConnections(nodeId: NodeId): Connection[] {
    return Array.from(this.connections.values()).filter(c => c.sourceNodeId === nodeId);
  }
}

export class ExecutionEngineImpl implements ExecutionEngine {
  graph: Graph;
  state: ExecutionState;

  constructor(graph: Graph) {
    this.graph = graph;
    this.state = {
      status: 'idle',
      nodeResults: new Map()
    };
  }

  reset(): void {
    this.state = {
      status: 'idle',
      nodeResults: new Map()
    };
  }

  private getTopologicalOrder(): NodeId[] {
    const inDegree = new Map<NodeId, number>();
    const adjList = new Map<NodeId, NodeId[]>();

    // Initialize
    for (const nodeId of this.graph.nodes.keys()) {
      inDegree.set(nodeId, 0);
      adjList.set(nodeId, []);
    }

    // Build graph representation
    for (const conn of this.graph.connections.values()) {
      const currentInDegree = inDegree.get(conn.targetNodeId) || 0;
      inDegree.set(conn.targetNodeId, currentInDegree + 1);
      
      const neighbors = adjList.get(conn.sourceNodeId) || [];
      neighbors.push(conn.targetNodeId);
      adjList.set(conn.sourceNodeId, neighbors);
    }

    // Find nodes with 0 in-degree
    const queue: NodeId[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const order: NodeId[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);

      const neighbors = adjList.get(current) || [];
      for (const neighbor of neighbors) {
        const degree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, degree);
        if (degree === 0) {
          queue.push(neighbor);
        }
      }
    }

    if (order.length !== this.graph.nodes.size) {
      throw new Error("Graph contains a cycle");
    }

    return order;
  }

  async executeNode(nodeId: NodeId): Promise<void> {
    const node = this.graph.nodes.get(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    this.state.currentNodeId = nodeId;

    // Resolve inputs from incoming connections
    const incoming = (this.graph as GraphImpl).getIncomingConnections(nodeId);
    for (const conn of incoming) {
      const sourceNode = this.graph.nodes.get(conn.sourceNodeId);
      if (sourceNode) {
        const sourceOutput = sourceNode.outputs[conn.sourceOutputId];
        const targetInput = node.inputs[conn.targetInputId];
        if (sourceOutput && targetInput) {
          targetInput.value = sourceOutput.value;
        }
      }
    }

    const context: NodeContext = {
      graph: this.graph,
      engine: this,
    };

    await node.execute(context);

    // Store results
    const results: Record<string, any> = {};
    for (const [key, output] of Object.entries(node.outputs)) {
      results[key] = output.value;
    }
    this.state.nodeResults.set(nodeId, results);
  }

  async execute(): Promise<void> {
    this.state.status = 'running';
    this.state.error = undefined;

    try {
      const order = this.getTopologicalOrder();
      for (const nodeId of order) {
        await this.executeNode(nodeId);
      }
      this.state.status = 'completed';
    } catch (error) {
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    } finally {
      this.state.currentNodeId = undefined;
    }
  }
}
