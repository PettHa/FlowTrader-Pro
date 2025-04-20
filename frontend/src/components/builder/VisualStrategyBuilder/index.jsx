import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { Plus, Trash2, Save, Download, Upload, FileX } from 'lucide-react';

// Import node types
import IndicatorNode from './nodes/IndicatorNode';
import ConditionNode from './nodes/ConditionNode';
import EntryNode from './nodes/EntryNode';
import ExitNode from './nodes/ExitNode';
import PriceNode from './nodes/PriceNode';

// Import utility functions
import { generateNodeId, generateNodePosition, calculateDynamicHeader } from './utils/nodeUtils';

// Import styles
import './styles.css';

// Node type options for adding new nodes
const NODE_TYPES = [
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

// Initial flow state
const initialNodes = [
  { id: 'price', type: 'priceNode', data: { label: 'Market Data' }, position: { x: 50, y: 150 }, deletable: false },
  { id: 'entry_long_1', type: 'entryNode', data: { positionType: 'LONG' }, position: { x: 700, y: 100 } },
  { id: 'exit_long_1', type: 'exitNode', data: { positionType: 'LONG' }, position: { x: 700, y: 250 } }
];
const initialEdges = [];

const VisualStrategyBuilder = ({ initialStrategy, onSave, strategyName = 'New Strategy' }) => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [rfInstance, setRfInstance] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [nodeMenuPosition, setNodeMenuPosition] = useState({ x: 0, y: 0 });
  
  const reactFlowWrapper = useRef(null);
  const nodeMenuRef = useRef(null);

  // Load initial strategy if provided
  useEffect(() => {
    if (initialStrategy && initialStrategy.nodes && initialStrategy.edges) {
      // Make sure price node exists and is not deletable
      let hasPriceNode = false;
      const updatedNodes = initialStrategy.nodes.map(node => {
        if (node.id === 'price') {
          hasPriceNode = true;
          return { ...node, deletable: false };
        }
        return node;
      });
      
      // Add price node if it doesn't exist
      if (!hasPriceNode) {
        updatedNodes.unshift({
          id: 'price',
          type: 'priceNode',
          data: { label: 'Market Data' },
          position: { x: 50, y: 150 },
          deletable: false
        });
      }
      
      setNodes(updatedNodes);
      setEdges(initialStrategy.edges);
    }
  }, [initialStrategy]);

  // Calculate dynamic headers based on connections
  useEffect(() => {
    let hasChanges = false;
    const nextNodes = nodes.map(node => {
      const dynamicHeader = calculateDynamicHeader(node, nodes, edges);
      
      if (dynamicHeader !== undefined && node.data?.calculatedHeader !== dynamicHeader) {
        const newData = {
          ...node.data,
          calculatedHeader: dynamicHeader
        };
        hasChanges = true;
        return { ...node, data: newData };
      }
      
      return node;
    });
    
    if (hasChanges) {
      setNodes(nextNodes);
    }
  }, [nodes, edges]);

  // Handle node changes (position, selection, deletion)
  const onNodesChange = useCallback((changes) => {
    // Prevent deleting the price node
    const filteredChanges = changes.filter(
      change => !(change.type === 'remove' && change.id === 'price')
    );
    
    if (filteredChanges.length > 0) {
      setNodes((nds) => applyNodeChanges(filteredChanges, nds));
    }
    
    // Clear selected node if it was removed
    const removedNode = changes.find(change => change.type === 'remove' && change.id === selectedNodeId);
    if (removedNode) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  // Handle edge changes (addition, deletion)
  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  // Handle connection between nodes
  const onConnect = useCallback((connection) => {
    setEdges((eds) => addEdge({
      ...connection,
      animated: true
    }, eds));
  }, []);

  // Handle node click to select it
  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Handle clicking the background to deselect nodes
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setShowNodeMenu(false);
  }, []);

  // Handle updating node data (from node components)
  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes(nodes => nodes.map(node => {
      if (node.id === nodeId) {
        // Keep the calculated header from previous state
        const { calculatedHeader, ...restOfExistingData } = node.data;
        return {
          ...node,
          data: {
            calculatedHeader,
            ...restOfExistingData,
            ...newData
          }
        };
      }
      return node;
    }));
  }, []);

  // Handle right-click to open node menu
  const onPaneContextMenu = useCallback((event) => {
    event.preventDefault();
    
    if (reactFlowWrapper.current) {
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
      };
      
      setNodeMenuPosition(position);
      setShowNodeMenu(true);
    }
  }, []);

  // Handle deleting the selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === 'price') return;
    
    setNodes(nodes => nodes.filter(node => node.id !== selectedNodeId));
    setEdges(edges => edges.filter(
      edge => edge.source !== selectedNodeId && edge.target !== selectedNodeId
    ));
    
    setSelectedNodeId(null);
  }, [selectedNodeId]);

  // Handle adding a new node
  const addNode = useCallback((type, nodeData) => {
    const id = generateNodeId(type);
    let position;
    
    if (showNodeMenu && nodeMenuPosition) {
      // Convert screen position to flow position if needed
      if (rfInstance) {
        position = rfInstance.project({
          x: nodeMenuPosition.x,
          y: nodeMenuPosition.y
        });
      } else {
        position = nodeMenuPosition;
      }
    } else {
      position = generateNodePosition(nodes);
    }
    
    const newNode = {
      id,
      type,
      position,
      data: { ...nodeData, id }
    };
    
    setNodes(nodes => [...nodes, newNode]);
    setSelectedNodeId(id);
    setShowNodeMenu(false);
  }, [nodes, showNodeMenu, nodeMenuPosition, rfInstance]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && 
          selectedNodeId && 
          selectedNodeId !== 'price' &&
          !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        deleteSelectedNode();
      }
      
      if (event.key === 'Escape') {
        setSelectedNodeId(null);
        setShowNodeMenu(false);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
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

  // Save the strategy flow
  const handleSaveStrategy = useCallback(() => {
    if (!rfInstance) return;
    
    const flowToSave = rfInstance.toObject();
    
    // Remove calculated headers to keep the JSON clean
    flowToSave.nodes = flowToSave.nodes.map(node => {
      const { calculatedHeader, ...restData } = node.data || {};
      return { ...node, data: restData };
    });
    
    if (onSave) {
      onSave({
        name: strategyName,
        flow: flowToSave
      });
    }
  }, [rfInstance, onSave, strategyName]);

  // Export strategy to JSON file
  const handleExportStrategy = useCallback(() => {
    if (!rfInstance) return;
    
    const flowToExport = rfInstance.toObject();
    
    // Remove calculated headers
    flowToExport.nodes = flowToExport.nodes.map(node => {
      const { calculatedHeader, ...restData } = node.data || {};
      return { ...node, data: restData };
    });
    
    // Create file for download
    const dataStr = JSON.stringify(flowToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    // Create link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${strategyName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rfInstance, strategyName]);

  // Import strategy from JSON file
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
            // Make sure price node exists and is not deletable
            let hasPriceNode = false;
            const updatedNodes = flow.nodes.map(node => {
              if (node.id === 'price') {
                hasPriceNode = true;
                return { ...node, deletable: false };
              }
              return node;
            });
            
            // Add price node if it doesn't exist
            if (!hasPriceNode) {
              updatedNodes.unshift({
                id: 'price',
                type: 'priceNode',
                data: { label: 'Market Data' },
                position: { x: 50, y: 150 },
                deletable: false
              });
            }
            
            setNodes(updatedNodes);
            setEdges(flow.edges);
            setSelectedNodeId(null);
            
            setTimeout(() => rfInstance?.fitView({ padding: 0.1 }), 100);
          } else {
            console.error("Invalid strategy format");
            alert("This file doesn't contain a valid strategy.");
          }
        } catch (error) {
          console.error("Error parsing strategy file:", error);
          alert("Error loading strategy: " + error.message);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }, [rfInstance]);

  // Reset the strategy to initial state
  const handleResetStrategy = useCallback(() => {
    if (window.confirm("Are you sure you want to reset the strategy? This will delete all nodes and connections.")) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      setSelectedNodeId(null);
    }
  }, []);

  // Define node types with updateNodeData function
  const nodeTypes = {
    indicatorNode: props => <IndicatorNode {...props} updateNodeData={updateNodeData} />,
    conditionNode: props => <ConditionNode {...props} updateNodeData={updateNodeData} />,
    entryNode: props => <EntryNode {...props} updateNodeData={updateNodeData} />,
    exitNode: props => <ExitNode {...props} updateNodeData={updateNodeData} />,
    priceNode: PriceNode
  };

  return (
    <div className="visual-strategy-builder">
      <div className="builder-controls">
        <button 
          className="control-button primary"
          onClick={() => setShowNodeMenu(!showNodeMenu)}
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
        
        <button 
          className="control-button primary"
          onClick={handleSaveStrategy}
          title="Save Strategy"
        >
          <Save size={16} />
          <span>Save</span>
        </button>
      </div>
      
      <div className="builder-content" ref={reactFlowWrapper}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setRfInstance}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onContextMenu={onPaneContextMenu}
            fitView
            snapToGrid={true}
            snapGrid={[15, 15]}
            minZoom={0.2}
            maxZoom={2}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            deleteKeyCode={null}
            multiSelectionKeyCode={null}
          >
            <Background color="#e0e0e0" gap={20} size={1.5} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={2}
              nodeStrokeColor={(n) => {
                if (n.selected) return 'var(--primary-dark)';
                if (n.type === 'priceNode') return '#2563eb';
                if (n.type === 'indicatorNode') return '#db2777';
                if (n.type === 'conditionNode') return '#10b981';
                if (n.type === 'entryNode' || n.type === 'exitNode') {
                  return n.data?.positionType === 'LONG' ? '#10b981' : '#ef4444';
                }
                return '#aaa';
              }}
              nodeColor={(n) => {
                if (n.selected) return 'rgba(59, 130, 246, 0.2)';
                if (n.type === 'priceNode') return 'rgba(37, 99, 235, 0.1)';
                if (n.type === 'indicatorNode') return 'rgba(219, 39, 119, 0.1)';
                if (n.type === 'conditionNode') return 'rgba(16, 185, 129, 0.1)';
                if (n.type === 'entryNode' || n.type === 'exitNode') {
                  return n.data?.positionType === 'LONG' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                }
                return '#fff';
              }}
              nodeBorderRadius={2}
            />
            
            {showNodeMenu && (
              <Panel 
                position="top-left" 
                style={{ 
                  transform: `translate(${nodeMenuPosition.x}px, ${nodeMenuPosition.y}px)`,
                  zIndex: 100
                }}
              >
                <div className="node-menu" ref={nodeMenuRef}>
                  <div className="node-menu-header">Add Node</div>
                  {NODE_TYPES.map((category) => (
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