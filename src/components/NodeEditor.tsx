import React, { useCallback, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node as ReactFlowNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Initial dummy data to show the editor works
const initialNodes: ReactFlowNode[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Input Node (Text)' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    data: { label: 'Model Node (OpenRouter)' },
    position: { x: 250, y: 125 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'Output Node (Markdown)' },
    position: { x: 250, y: 250 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
];

export const NodeEditor: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default NodeEditor;
