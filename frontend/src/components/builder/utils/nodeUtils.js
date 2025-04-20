// Counter for generating unique node IDs
let nodeCounter = 1;

/**
 * Generates a unique ID for a new node.
 * Example: 'indicator_1', 'condition_5'
 *
 * @param {string} type - The node type (e.g., 'indicatorNode', 'conditionNode').
 * @returns {string} A unique node ID.
 */
export const generateNodeId = (type) => {
  // Use a simpler prefix derived from the type
  const prefix = type.replace('Node', '').toLowerCase();
  const id = `${prefix}_${nodeCounter++}`;
  return id;
};

/**
 * Calculates a suitable position for a newly added node.
 * Tries to place it to the right of the rightmost node.
 *
 * @param {Array} nodes - Array of existing nodes.
 * @returns {object} An object containing { x, y } coordinates.
 */
export const generateNodePosition = (nodes) => {
  const PADDING = 200; // Space between nodes horizontally
  const VERTICAL_OFFSET = 50; // Slight vertical offset for new nodes

  if (!nodes || nodes.length === 0) {
    return { x: 100, y: 150 };
  }

  try {
    const rightmostNode = nodes.reduce((max, node) => {
      if (node.position && typeof node.position.x === 'number') {
        if (!max.position || node.position.x > max.position.x) {
          return node;
        }
      }
      return max;
    }, { position: { x: -Infinity } });

    if (rightmostNode.position && typeof rightmostNode.position.x === 'number') {
      return {
        x: rightmostNode.position.x + PADDING,
        y: rightmostNode.position.y + VERTICAL_OFFSET
      };
    }
  } catch (error) {
    console.error("Error calculating node position:", error, nodes);
    return { x: Math.random() * 400 + 100, y: Math.random() * 200 + 100 };
  }

  return { x: 100, y: 150 + nodes.length * 20 };
};

/**
 * Gets a display value for a node based on its type and data.
 * Used to show info about connected nodes.
 * 
 * @param {object} node - The node object.
 * @param {object} [edge] - Optional: The edge connecting to this node.
 * @returns {string} - A short display string.
 */
export const getNodeDisplayValue = (node, edge = null) => {
  if (!node) return '?';

  // User label has highest priority
  if (node.data?.label && node.data.label.trim() !== '') {
    return node.data.label;
  }

  // Generate string based on node type
  switch (node.type) {
    case 'priceNode':
      if (edge?.sourceHandle) {
        return edge.sourceHandle.charAt(0).toUpperCase() + edge.sourceHandle.slice(1);
      }
      return node.data?.label || 'Market Data';

    case 'indicatorNode':
      const type = node.data?.indicatorType || '?';
      const period = node.data?.period ?? '?';
      const fastPeriod = node.data?.fastPeriod ?? '?';
      const slowPeriod = node.data?.slowPeriod ?? '?';
      const signalPeriod = node.data?.signalPeriod ?? '?';
      
      if (type === 'SMA' || type === 'EMA' || type === 'RSI') return `${type}(${period})`;
      if (type === 'MACD') return `MACD(${fastPeriod},${slowPeriod},${signalPeriod})`;
      return type;

    case 'conditionNode':
      if (node.data?.calculatedHeader) return node.data.calculatedHeader;
      const condType = node.data?.conditionType || '?';
      const condTypes = { GT: '>', LT: '<', EQ: '=', CROSS_ABOVE: '↗', CROSS_BELOW: '↘' };
      const symbol = condTypes[condType] || '?';
      const threshold = node.data?.threshold;
      const usesThreshold = typeof threshold === 'number' && !isNaN(threshold);
      return usesThreshold ? `${symbol} ${threshold}` : symbol;

    case 'logicNode':
      return node.data?.logicType || '?';

    case 'entryNode':
    case 'exitNode':
      const actionType = node.type === 'entryNode' ? 'Entry' : 'Exit';
      const posType = node.data?.positionType === 'LONG' ? 'Long' : 'Short';
      return `${posType} ${actionType}`;

    default:
      return node.id;
  }
};

/**
 * Calculates a dynamic header title for a node based on its connections.
 * Returns null if the node doesn't need a dynamic header.
 * 
 * @param {object} node - The node to calculate the header for.
 * @param {Array} allNodes - All nodes in the flow.
 * @param {Array} allEdges - All edges in the flow.
 * @returns {string|null} - The calculated header or null.
 */
export const calculateDynamicHeader = (node, allNodes, allEdges) => {
  // Dynamic header for condition nodes
  if (node.type === 'conditionNode') {
    const conditionTypes = { GT: '>', LT: '<', EQ: '=', CROSS_ABOVE: '↗', CROSS_BELOW: '↘' };
    const currentConditionType = node.data?.conditionType || 'GT';
    const symbol = conditionTypes[currentConditionType] || '?';
    const thresholdValue = node.data?.threshold;
    const usesThreshold = typeof thresholdValue === 'number' && !isNaN(thresholdValue);

    const edgeA = allEdges.find(edge => edge.target === node.id && edge.targetHandle === 'a');
    const sourceNodeA = edgeA ? allNodes.find(n => n.id === edgeA.source) : null;
    const valueA = getNodeDisplayValue(sourceNodeA, edgeA);

    let valueB;
    if (usesThreshold) {
      valueB = thresholdValue.toString();
    } else {
      const edgeB = allEdges.find(edge => edge.target === node.id && edge.targetHandle === 'b');
      const sourceNodeB = edgeB ? allNodes.find(n => n.id === edgeB.source) : null;
      valueB = getNodeDisplayValue(sourceNodeB, edgeB);
    }
    return `${valueA} ${symbol} ${valueB}`;
  }

  // Return null for all other node types
  return null;
};