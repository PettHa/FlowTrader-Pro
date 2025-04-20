// backend/services/strategyCompiler.js

/**
 * Strategy Compiler Service
 *
 * Translates the visual strategy definition (flowData from React Flow)
 * into an executable representation for backtesting and live trading.
 */
class StrategyCompiler {
    /**
     * Compiles the strategy flow data into an executable object.
     * @param {Object} flowData - Data from React Flow (nodes and edges).
     * @param {Object} parameters - Optional parameters to override defaults in nodes.
     * @returns {Object} - An object representing the compiled strategy with an `execute` method.
     *                    Returns null if compilation fails.
     */
    static compileStrategy(flowData, parameters = {}) {
      if (!flowData || !flowData.nodes || !flowData.edges) {
        console.error('[StrategyCompiler] Invalid flowData provided.');
        return null;
      }
  
      // console.log('[StrategyCompiler] Compiling strategy with parameters:', parameters);
  
      // Pre-process nodes and edges for faster lookup
      const nodesMap = new Map(flowData.nodes.map(node => [node.id, node]));
      const edges = flowData.edges;
  
      // Apply parameters to node data (creates a temporary, modified map for this instance)
      const nodesWithParams = new Map(nodesMap);
      flowData.nodes.forEach(node => {
          if (parameters && parameters[node.id]) {
              const mergedData = { ...node.data, ...parameters[node.id] };
              nodesWithParams.set(node.id, { ...node, data: mergedData });
          }
      });
  
  
      // Find all action nodes (entry/exit)
      const entryNodes = flowData.nodes.filter(node => node.type === 'entryNode');
      const exitNodes = flowData.nodes.filter(node => node.type === 'exitNode');
  
      /**
       * Finds incoming edges connected to a specific target handle of a node.
       * @param {string} targetNodeId - The ID of the target node.
       * @param {string} targetHandleId - The ID of the target handle (e.g., 'a', 'b', 'signal').
       * @returns {Array<Object>} - An array of edge objects.
       */
      const findIncomingEdges = (targetNodeId, targetHandleId) => {
        return edges.filter(edge => edge.target === targetNodeId && edge.targetHandle === targetHandleId);
      };
  
       /**
       * Finds a node by its ID from the potentially parameter-modified map.
       * @param {string} nodeId - The ID of the node to find.
       * @returns {Object|undefined} - The node object or undefined.
       */
       const findNodeById = (nodeId) => {
          return nodesWithParams.get(nodeId);
      };
  
      /**
       * Recursively evaluates the output value of a node for the current time step.
       * Uses memoization (cache) to avoid redundant calculations within the same time step.
       * @param {string} nodeId - The ID of the node to evaluate.
       * @param {string} sourceHandleId - The specific output handle we need the value from.
       * @param {Object} dataForStrategy - Contains current bar, previous bar, indicators etc.
       * @param {Map<string, any>} cache - Memoization cache for the current time step.
       * @returns {any} - The evaluated output value of the node's handle.
       * @throws {Error} If evaluation fails (e.g., missing input, invalid type).
       */
      const evaluateNode = (nodeId, sourceHandleId, dataForStrategy, cache) => {
          const cacheKey = `${nodeId}-${sourceHandleId}`;
          if (cache.has(cacheKey)) {
              return cache.get(cacheKey);
          }
  
          const node = findNodeById(nodeId);
          if (!node) {
              throw new Error(`[StrategyCompiler] Node not found: ${nodeId}`);
          }
  
          let result;
  
          try {
              switch (node.type) {
                  case 'priceNode':
                      // Price node outputs specific price components
                      if (!dataForStrategy.current) throw new Error(`Price data missing for node ${nodeId}`);
                      result = dataForStrategy.current[sourceHandleId]; // e.g., 'close', 'open'
                      if (typeof result === 'undefined') throw new Error(`Invalid price component '${sourceHandleId}' requested from node ${nodeId}`);
                      break;
  
                  case 'indicatorNode':
                      // Indicator node outputs its calculated value(s)
                      if (!dataForStrategy.indicators || !dataForStrategy.indicators[nodeId]) {
                           throw new Error(`Indicator data missing for node ${nodeId}`);
                      }
                      const indicatorResult = dataForStrategy.indicators[nodeId];
                      // Handle indicators with multiple outputs (like MACD)
                      if (sourceHandleId === 'result' || !indicatorResult.values || typeof indicatorResult.values[sourceHandleId] === 'undefined') {
                          // Default output or simple indicator
                          result = indicatorResult.value;
                      } else {
                          // Specific output like 'macd', 'signal', 'histogram'
                          result = indicatorResult.values[sourceHandleId][indicatorResult.values[sourceHandleId].length - 1]; // Get latest value
                      }
                       if (typeof result === 'undefined' || result === null) {
                          // Return null or throw? Returning null might be safer for conditions.
                          result = null;
                          // console.warn(`Indicator ${nodeId} handle ${sourceHandleId} returned null/undefined`);
                       }
                      break;
  
                  case 'conditionNode':
                      // Condition node evaluates inputs and returns boolean
                      const conditionType = node.data?.conditionType || 'GT';
                      const thresholdValue = node.data?.threshold; // Might be undefined or NaN
                      const usesThreshold = typeof thresholdValue === 'number' && !isNaN(thresholdValue);
  
                      // Get Input A value
                      const edgesA = findIncomingEdges(nodeId, 'a');
                      if (edgesA.length === 0) throw new Error(`Condition node ${nodeId} missing input A`);
                      const sourceNodeA = findNodeById(edgesA[0].source);
                      const valueA = evaluateNode(sourceNodeA.id, edgesA[0].sourceHandle, dataForStrategy, cache);
  
                      // Get Input B value (either from threshold or another node)
                      let valueB;
                      if (usesThreshold) {
                          valueB = thresholdValue;
                      } else {
                          const edgesB = findIncomingEdges(nodeId, 'b');
                          if (edgesB.length === 0) throw new Error(`Condition node ${nodeId} missing input B (and no threshold set)`);
                          const sourceNodeB = findNodeById(edgesB[0].source);
                          valueB = evaluateNode(sourceNodeB.id, edgesB[0].sourceHandle, dataForStrategy, cache);
                      }
  
                       // Handle nulls - conditions generally fail if an input is null
                      if (valueA === null || valueB === null) {
                          result = false;
                          break;
                      }
  
                      // --- Perform Comparison ---
                      // Basic comparisons
                      if (conditionType === 'GT') result = valueA > valueB;
                      else if (conditionType === 'LT') result = valueA < valueB;
                      else if (conditionType === 'EQ') result = valueA == valueB; // Use == for potential type coercion flexibility? Or ===? Let's use === for strictness.
                      // else if (conditionType === 'EQ') result = valueA === valueB;
                      else if (conditionType === 'GTE') result = valueA >= valueB; // Added GTE/LTE
                      else if (conditionType === 'LTE') result = valueA <= valueB;
                      // Crossover comparisons (requires previous values)
                      else if (conditionType === 'CROSS_ABOVE' || conditionType === 'CROSS_BELOW') {
                          // Need previous values
                          if (!dataForStrategy.previousIndicators) throw new Error(`Previous indicator data missing for crossover check at node ${nodeId}`);
  
                          // Get Previous Input A value
                          const prevValueA = evaluateNode(sourceNodeA.id, edgesA[0].sourceHandle, { ...dataForStrategy, indicators: dataForStrategy.previousIndicators, current: dataForStrategy.previous }, cache); // Need to simulate previous state
  
                          // Get Previous Input B value
                          let prevValueB;
                          if (usesThreshold) {
                              prevValueB = thresholdValue; // Threshold is constant
                          } else {
                              const edgesB = findIncomingEdges(nodeId, 'b');
                              const sourceNodeB = findNodeById(edgesB[0].source);
                              prevValueB = evaluateNode(sourceNodeB.id, edgesB[0].sourceHandle, { ...dataForStrategy, indicators: dataForStrategy.previousIndicators, current: dataForStrategy.previous }, cache);
                          }
  
                          // Handle nulls in previous values
                          if (prevValueA === null || prevValueB === null) {
                              result = false;
                          } else if (conditionType === 'CROSS_ABOVE') {
                              result = prevValueA <= prevValueB && valueA > valueB;
                          } else { // CROSS_BELOW
                              result = prevValueA >= prevValueB && valueA < valueB;
                          }
                      } else {
                          throw new Error(`Unsupported condition type: ${conditionType} at node ${nodeId}`);
                      }
                      break;
  
                  case 'logicNode': // Example: AND, OR (Not fully implemented in provided nodes)
                      const logicType = node.data?.logicType || 'AND';
                      const inputEdges = edges.filter(edge => edge.target === nodeId);
                      if (inputEdges.length < 2) throw new Error(`Logic node ${nodeId} requires at least 2 inputs`);
  
                      const inputValues = inputEdges.map(edge => {
                          const sourceNode = findNodeById(edge.source);
                          return evaluateNode(sourceNode.id, edge.sourceHandle, dataForStrategy, cache);
                      });
  
                      if (logicType === 'AND') {
                          result = inputValues.every(val => val === true); // All inputs must be true
                      } else if (logicType === 'OR') {
                          result = inputValues.some(val => val === true); // At least one input must be true
                      } else {
                           throw new Error(`Unsupported logic type: ${logicType} at node ${nodeId}`);
                      }
                      break;
  
                  default:
                      throw new Error(`Unsupported node type for evaluation: ${node.type} at node ${nodeId}`);
              }
          } catch (error) {
               console.error(`[StrategyCompiler] Error evaluating node ${nodeId} (${node.type}): ${error.message}`);
               // console.error("Node Data:", node.data);
               // console.error("Strategy Data Context:", dataForStrategy);
               result = null; // Or rethrow? Returning null makes it fail safely in conditions.
               // throw error; // Rethrow if evaluation must succeed
          }
  
          cache.set(cacheKey, result);
          return result;
      };
  
  
      // --- Return the compiled strategy object ---
      return {
        /**
         * Executes the compiled strategy logic for a given data point.
         * @param {Object} dataForStrategy - Data needed for evaluation (current bar, indicators, previous indicators).
         *                                   Example: { current: bar, previous: prevBar, indicators: {sma_1: {value: 50}, ...}, previousIndicators: {sma_1: {value: 49}, ...} }
         * @param {Object|null} currentPosition - The currently held position { type: 'LONG' | 'SHORT', entryPrice: ... } or null if flat.
         * @returns {Object|null} - A signal object { action: 'ENTRY' | 'EXIT', positionType: 'LONG' | 'SHORT', price: number } or null.
         */
        execute: (dataForStrategy, currentPosition) => {
          // console.log("[CompiledStrategy] Execute called. Position:", currentPosition, "Data:", dataForStrategy);
          const evaluationCache = new Map(); // Reset cache for each execution step
  
          try {
              // Check Exit conditions first (usually priority)
              for (const exitNode of exitNodes) {
                  const incomingEdges = findIncomingEdges(exitNode.id, 'signal');
                  if (incomingEdges.length > 0) {
                      const signalEdge = incomingEdges[0];
                      const signalSourceNode = findNodeById(signalEdge.source);
                      const exitSignal = evaluateNode(signalSourceNode.id, signalEdge.sourceHandle, dataForStrategy, evaluationCache);
  
                      // console.log(`[CompiledStrategy] Exit Node ${exitNode.id} (${exitNode.data.positionType}) signal:`, exitSignal);
  
                      if (exitSignal === true && currentPosition && currentPosition.type === exitNode.data.positionType) {
                          // console.log(`[CompiledStrategy] EXIT signal triggered for ${exitNode.data.positionType}`);
                          return {
                              action: 'EXIT',
                              positionType: exitNode.data.positionType,
                              price: dataForStrategy.current?.close // Use current close price for exit signal
                          };
                      }
                  }
              }
  
              // Check Entry conditions if currently flat
              if (!currentPosition) {
                  for (const entryNode of entryNodes) {
                      const incomingEdges = findIncomingEdges(entryNode.id, 'signal');
                      if (incomingEdges.length > 0) {
                          const signalEdge = incomingEdges[0];
                          const signalSourceNode = findNodeById(signalEdge.source);
                          const entrySignal = evaluateNode(signalSourceNode.id, signalEdge.sourceHandle, dataForStrategy, evaluationCache);
  
                          // console.log(`[CompiledStrategy] Entry Node ${entryNode.id} (${entryNode.data.positionType}) signal:`, entrySignal);
  
                          if (entrySignal === true) {
                              // console.log(`[CompiledStrategy] ENTRY signal triggered for ${entryNode.data.positionType}`);
                              return {
                                  action: 'ENTRY',
                                  positionType: entryNode.data.positionType,
                                  price: dataForStrategy.current?.close // Use current close price for entry signal
                              };
                          }
                      }
                  }
              }
          } catch (error) {
              console.error(`[CompiledStrategy] Error during execution: ${error.message}`, error.stack);
              // Decide how to handle errors during execution - maybe return null or a specific error signal?
              return null;
          }
  
          // No signal triggered
          return null;
        },
  
        // --- Optional: Add metadata about the compiled strategy ---
        requiredIndicators: () => {
              // Logic to determine which indicators are actually needed by tracing back from action nodes
              // This is more complex and might involve graph traversal
              const indicatorNodes = flowData.nodes.filter(node => node.type === 'indicatorNode');
              return indicatorNodes.map(node => ({ id: node.id, type: node.data?.indicatorType, params: node.data }));
        },
        compiledParameters: parameters,
        nodesMap: nodesWithParams, // Expose the map used during compilation (for debugging/info)
        edges: edges,
      };
    }
  }
  
  module.exports = StrategyCompiler;