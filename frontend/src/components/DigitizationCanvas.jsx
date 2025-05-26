import React, { useCallback, useState, useEffect, useRef } from 'react';
import { ReactFlow, addEdge, MiniMap, Controls, Background, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', type: 'input', data: { label: 'Preprocess' }, position: { x: 0, y: 50 }, sourcePosition: 'right', targetPosition: 'left' },
  { id: '2', data: { label: 'OCR' }, position: { x: 200, y: 50 }, sourcePosition: 'right', targetPosition: 'left' },
];
const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }];

export default function DigitizationCanvas() {
  console.log('DigitizationCanvas render');
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [showFlow, setShowFlow] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    console.log('DigitizationCanvas useEffect');
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        console.log('DigitizationCanvas container size:', rect.width, rect.height);
      } else {
        console.log('DigitizationCanvas containerRef is null');
      }
      setShowFlow(true);
      console.log('DigitizationCanvas setShowFlow(true)');
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: 500 }}>
      {showFlow && (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      )}
    </div>
  );
} 