// frontend/src/components/builder/VisualStrategyBuilder/index.jsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'; // Added useMemo
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Trash2, Download, Upload, FileX } from 'lucide-react';

// Import node types
import IndicatorNode from '../nodes/IndicatorNode';
import ConditionNode from '../nodes/ConditionNode';
import EntryNode from '../nodes/EntryNode';
import ExitNode from '../nodes/ExitNode';
import PriceNode from '../nodes/PriceNode';

// Import utility functions
import { generateNodeId, generateNodePosition, calculateDynamicHeader, getNodeDisplayValue } from '../utils/nodeUtils'; // Added getNodeDisplayValue

// Import styles
import './styles.css';

// Node type options for adding new nodes
const NODE_TYPES_CONFIG = [ // Renamed to avoid conflict with reactflow prop
  {
    category: 'Indicators',
    items: [
      { type: 'indicatorNode', label: 'SMA', data: { indicatorType: 'SMA', period: 20 } },
      { type: 'indicatorNode', label: 'EMA', data: { indicatorType: 'EMA', period: 20 } },
      { type: 'indicatorNode', label: 'RSI', data: { indicatorType: 'RSI', period: 14 } },
      { type: 'indicatorNode', label: 'MACD', data: { indicatorType: 'MACD', fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } }
    ]
  },
  {
    category: 'Conditions',
    items: [
      { type: 'conditionNode', label: 'Greater Than', data: { conditionType: 'GT' } },
      { type: 'conditionNode', label: 'Less Than', data: { conditionType: 'LT' } },
      { type: 'conditionNode', label: 'Equals', data: { conditionType: 'EQ' } },
      { type: 'conditionNode', label: 'Crosses Above', data: { conditionType: 'CROSS_ABOVE' } },
      { type: 'conditionNode', label: 'Crosses Below', data: { conditionType: 'CROSS_BELOW' } }
    ]
  },
  {
    category: 'Actions',
    items: [
      { type: 'entryNode', label: 'Long Entry', data: { positionType: 'LONG' } },
      { type: 'entryNode', label: 'Short Entry', data: { positionType: 'SHORT' } },
      { type: 'exitNode', label: 'Long Exit', data: { positionType: 'LONG' } },
      { type: 'exitNode', label: 'Short Exit', data: { positionType: 'SHORT' } }
    ]
  }
];

// Initial flow state (Only used if initialStrategy prop is missing)
const initialNodes = [
  { id: 'price', type: 'priceNode', data: { label: 'Market Data' }, position: { x: 50, y: 150 }, deletable: false },
];
const initialEdges = [];


const VisualStrategyBuilder = ({ initialStrategy, strategyName = 'New Strategy', onBuilderInit }) => {
  // State for nodes and edges managed internally by the builder
  const [nodes, setNodes] = useState(initialStrategy?.nodes || initialNodes);
  const [edges, setEdges] = useState(initialStrategy?.edges || initialEdges);
  const [rfInstance, setRfInstance] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [nodeMenuPosition, setNodeMenuPosition] = useState({ x: 0, y: 0 });

  const reactFlowWrapper = useRef(null);
  const nodeMenuRef = useRef(null);

  // Update internal state if initialStrategy prop changes
  useEffect(() => {
    // Ensure initial strategy always includes the non-deletable price node
    const ensurePriceNode = (nodesArray) => {
      let hasPrice = false;
      const updated = nodesArray.map(n => {
        if (n.id === 'price') {
          hasPrice = true;
          return { ...n, type: 'priceNode', deletable: false }; // Ensure type and deletable status
        }
        return n;
      });
      if (!hasPrice) {
        updated.unshift({ id: 'price', type: 'priceNode', data: { label: 'Market Data' }, position: { x: 50, y: 150 }, deletable: false });
      }
      return updated;
    };

    setNodes(ensurePriceNode(initialStrategy?.nodes || initialNodes));
    setEdges(initialStrategy?.edges || initialEdges);
  }, [initialStrategy]);

  // Memoized callback for nodes to update their data in *this* component's state
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes(nds =>
      nds.map(node => {
        if (node.id === nodeId) {
          const existingData = node.data || {};
          // Preserve calculatedHeader unless explicitly overwritten
          const mergedData = { ...existingData, ...newData };
          if (newData.calculatedHeader === undefined && existingData.calculatedHeader !== undefined) {
            mergedData.calculatedHeader = existingData.calculatedHeader;
          }
          return { ...node, data: mergedData };
        }
        return node;
      })
    );
  }, [setNodes]); // setNodes is stable

  // Dynamic Header Calculation (useEffect)
  useEffect(() => {
    let hasChanges = false;
    const nextNodes = nodes.map(node => {
      const dynamicHeader = calculateDynamicHeader(node, nodes, edges);
      const currentHeader = node.data?.calculatedHeader;

      if (dynamicHeader !== null && currentHeader !== dynamicHeader) {
        const newData = { ...(node.data || {}), calculatedHeader: dynamicHeader };
        hasChanges = true;
        return { ...node, data: newData };
      }
      if (dynamicHeader === null && currentHeader !== undefined && currentHeader !== null) {
         const { calculatedHeader, ...restData } = node.data || {};
         hasChanges = true;
         return { ...node, data: restData };
      }
      return node;
    });

    if (hasChanges) {
      setNodes(nextNodes);
    }
  }, [nodes, edges]); // Dependencies are correct

  // React Flow Event Handlers (Memoized)
  const onNodesChange = useCallback((changes) => {
    const filteredChanges = changes.filter(
      change => !(change.type === 'remove' && change.id === 'price')
    );
    if (filteredChanges.length > 0) {
      setNodes((nds) => applyNodeChanges(filteredChanges, nds));
    }
    // Deselect node if removed
    const removedNode = changes.find(change => change.type === 'remove' && change.id === selectedNodeId);
    if (removedNode) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]); // Added dependency

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection) => {
    setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
  }, []);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setShowNodeMenu(false);
  }, []);

  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    if (reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      setNodeMenuPosition(position);
      setShowNodeMenu(true);
    }
  }, []);

  // Store the instance and call the prop
  const handleOnInit = useCallback((instance) => {
    setRfInstance(instance); // Store internal ref
    if (onBuilderInit) {
      onBuilderInit(instance); // Call parent callback
    }
    instance.fitView({ padding: 0.1 }); // Fit view on init
  }, [onBuilderInit]);

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === 'price') return;
    setNodes(nds => nds.filter(node => node.id !== selectedNodeId));
    setEdges(eds => eds.filter(edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Add a new node
  const addNode = useCallback((type, nodeData) => {
    const id = generateNodeId(type);
    let position;
    if (showNodeMenu && nodeMenuPosition && rfInstance) {
      position = rfInstance.project({ x: nodeMenuPosition.x, y: nodeMenuPosition.y });
    } else {
      position = generateNodePosition(nodes);
    }
    const newNode = { id, type, position, data: { ...nodeData, id } }; // Add id to data as well
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(id);
    setShowNodeMenu(false);
  }, [nodes, showNodeMenu, nodeMenuPosition, rfInstance]);

  // Export strategy
  const handleExportStrategy = useCallback(() => {
    if (!rfInstance) return;
    const flowToExport = rfInstance.toObject();
    // Remove calculated headers before export
    flowToExport.nodes = flowToExport.nodes.map(node => {
      const { calculatedHeader, ...restData } = node.data || {};
      return { ...node, data: restData };
    });
    const dataStr = JSON.stringify(flowToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${strategyName.replace(/\s+/g, '_') || 'flowtrader_strategy'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rfInstance, strategyName]);

  // Import strategy
  const handleImportStrategy = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const flow = JSON.parse(event.target.result);
          if (flow && Array.isArray(flow.nodes) && Array.isArray(flow.edges)) {
            const ensurePriceNode = (nodesArray) => { /* ... (same as in useEffect) ... */ };
            setNodes(ensurePriceNode(flow.nodes));
            setEdges(flow.edges);
            setSelectedNodeId(null);
            setTimeout(() => rfInstance?.fitView({ padding: 0.1 }), 100); // Fit view after import
          } else {
            alert("This file doesn't contain a valid strategy.");
          }
        } catch (error) {
          alert("Error loading strategy: " + error.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [rfInstance]);

  // Reset strategy
  const handleResetStrategy = useCallback(() => {
    if (window.confirm("Are you sure you want to reset the strategy? This will delete all nodes and connections.")) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      setSelectedNodeId(null);
      setTimeout(() => rfInstance?.fitView({ padding: 0.1 }), 100); // Fit view after reset
    }
  }, [rfInstance]);


  // Define node types with the memoized updateNodeData function
  const nodeTypes = useMemo(() => ({ // Memoize the nodeTypes object itself
      indicatorNode: props => <IndicatorNode {...props} updateNodeData={updateNodeData} />,
      conditionNode: props => <ConditionNode {...props} updateNodeData={updateNodeData} />,
      entryNode: props => <EntryNode {...props} updateNodeData={updateNodeData} />,
      exitNode: props => <ExitNode {...props} updateNodeData={updateNodeData} />,
      priceNode: PriceNode
  }), [updateNodeData]); // Dependency: the memoized updateNodeData function

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId && selectedNodeId !== 'price' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        deleteSelectedNode();
      }
      if (event.key === 'Escape') {
        setSelectedNodeId(null);
        setShowNodeMenu(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur(); // Remove focus from any active element
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteSelectedNode]);

  // Handle clicking outside the node menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (nodeMenuRef.current && !nodeMenuRef.current.contains(event.target)) {
        setShowNodeMenu(false);
      }
    };
    if (showNodeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNodeMenu]);


  return (
    <div className="visual-strategy-builder">
      <div className="builder-controls">
        <button
          className="control-button primary"
          onClick={() => setShowNodeMenu(!showNodeMenu)} // Toggle menu instead of setting position here
          title="Add Node"
        >
          <Plus size={16} />
          <span>Add Node</span>
        </button>

        <button
          className="control-button danger"
          onClick={deleteSelectedNode}
          disabled={!selectedNodeId || selectedNodeId === 'price'}
          title="Delete Selected Node (Del/Backspace)"
        >
          <Trash2 size={16} />
          <span>Delete</span>
        </button>

        <div className="control-spacer"></div>

        <button
          className="control-button secondary"
          onClick={handleImportStrategy}
          title="Import Strategy from JSON"
        >
          <Upload size={16} />
          <span>Import</span>
        </button>

        <button
          className="control-button secondary"
          onClick={handleExportStrategy}
          title="Export Strategy to JSON"
        >
          <Download size={16} />
          <span>Export</span>
        </button>

        <button
          className="control-button warning"
          onClick={handleResetStrategy}
          title="Reset to Empty Strategy"
        >
          <FileX size={16} />
          <span>Reset</span>
        </button>
      </div>

      <div className="builder-content" ref={reactFlowWrapper}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes} // Pass the memoized nodeTypes
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={handleOnInit}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onContextMenu={onPaneContextMenu} // Use this to set position and show menu
            fitView
            snapToGrid={true}
            snapGrid={[15, 15]}
            minZoom={0.2}
            maxZoom={2}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            deleteKeyCode={null} // Handle delete manually
            multiSelectionKeyCode={null}
            proOptions={{ hideAttribution: true }} // Hide attribution for Pro users
          >
            <Background color="#e0e0e0" gap={20} size={1.5} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={2}
              nodeStrokeColor={(n) => {
                if (n.selected) return 'var(--primary-dark)';
                if (n.type === 'priceNode') return '#2563eb'; // Blue
                if (n.type === 'indicatorNode') return '#db2777'; // Pink
                if (n.type === 'conditionNode') return '#10b981'; // Green
                if (n.type === 'entryNode' || n.type === 'exitNode') {
                  return n.data?.positionType === 'LONG' ? '#10b981' : '#ef4444'; // Green/Red
                }
                return '#aaa'; // Default gray
              }}
              nodeColor={(n) => {
                if (n.selected) return 'rgba(59, 130, 246, 0.2)'; // Light blue selected
                if (n.type === 'priceNode') return 'rgba(37, 99, 235, 0.1)';
                if (n.type === 'indicatorNode') return 'rgba(219, 39, 119, 0.1)';
                if (n.type === 'conditionNode') return 'rgba(16, 185, 129, 0.1)';
                if (n.type === 'entryNode' || n.type === 'exitNode') {
                  return n.data?.positionType === 'LONG' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                }
                return '#fff'; // Default white
              }}
              nodeBorderRadius={2}
            />

            {showNodeMenu && (
              <Panel
                position="top-left" // Position relative to pane
                style={{
                  // Apply position based on context menu click
                  transform: `translate(${nodeMenuPosition.x}px, ${nodeMenuPosition.y}px)`,
                  zIndex: 100
                }}
              >
                <div className="node-menu" ref={nodeMenuRef}>
                  <div className="node-menu-header">Add Node</div>
                  {NODE_TYPES_CONFIG.map((category) => (
                    <div key={category.category} className="node-menu-category">
                      <div className="category-title">{category.category}</div>
                      <div className="category-items">
                        {category.items.map((item) => (
                          <button
                            key={`${item.type}-${item.label}`}
                            className="node-menu-item"
                            onClick={() => addNode(item.type, item.data)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default VisualStrategyBuilder;