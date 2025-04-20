// frontend/src/components/builder/nodes/ConditionNode.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { GitCompare, ChevronDown, ChevronUp } from 'lucide-react';

const conditionTypes = [
  { value: 'GT', label: '>', description: 'Greater Than' },
  { value: 'LT', label: '<', description: 'Less Than' },
  { value: 'EQ', label: '=', description: 'Equals' },
  { value: 'GTE', label: '>=', description: 'Greater Than or Equal' }, // Added
  { value: 'LTE', label: '<=', description: 'Less Than or Equal' },   // Added
  { value: 'CROSS_ABOVE', label: '↗', description: 'Crosses Above' },
  { value: 'CROSS_BELOW', label: '↘', description: 'Crosses Below' }
];

const ConditionNode = ({ data, selected, id, isConnectable, updateNodeData }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Local state
  const [localLabel, setLocalLabel] = useState(data?.label || '');
  const [localConditionType, setLocalConditionType] = useState(data?.conditionType || 'GT');
  // Handle threshold potentially being undefined or null
  const [localThreshold, setLocalThreshold] = useState(
    data?.threshold !== undefined && data?.threshold !== null ? String(data.threshold) : ''
  );

  // Sync with props
  useEffect(() => {
    setLocalLabel(data?.label || '');
    setLocalConditionType(data?.conditionType || 'GT');
    setLocalThreshold(data?.threshold !== undefined && data?.threshold !== null ? String(data.threshold) : '');
  }, [data]);

  // Determine if threshold is actively used based on local state
  const usesThreshold = localThreshold.trim() !== '';
  const currentCondition = conditionTypes.find(c => c.value === localConditionType) || conditionTypes[0];

  // Handle local input changes
  const handleLocalChange = (setter) => (e) => {
    setter(e.target.value);
  };

  // Update parent state on blur
  const handleBlur = useCallback((fieldName, value) => {
    let processedValue = value;
    if (fieldName === 'threshold') {
      // Allow empty string to mean "no threshold" (use Input B)
      processedValue = value.trim() === '' ? null : parseFloat(value);
      if (value.trim() !== '' && isNaN(processedValue)) {
        processedValue = 0; // Default to 0 if invalid number entered
      }
    } else if (fieldName === 'label') {
      processedValue = value.trim() === '' ? null : value.trim();
    }

    // Compare against existing data before updating
    const existingValue = data ? data[fieldName] : undefined;
    // Convert values for comparison (handle null/undefined for threshold/label)
    const existingValueStr = fieldName === 'threshold' ?
                             (existingValue !== undefined && existingValue !== null ? String(existingValue) : null) :
                             (existingValue || '');
    const processedValueStr = fieldName === 'threshold' ?
                              (processedValue !== undefined && processedValue !== null ? String(processedValue) : null) :
                              (processedValue || '');


    if (existingValueStr !== processedValueStr) {
    //   console.log(`ConditionNode ${id} blur update:`, { [fieldName]: processedValue });
      updateNodeData(id, { [fieldName]: processedValue });
    }
  }, [id, updateNodeData, data]);

   // Handle type change immediately
   const handleTypeChange = useCallback((e) => {
    const newType = e.target.value;
    setLocalConditionType(newType);
    updateNodeData(id, { conditionType: newType });
  }, [id, updateNodeData]);

  const toggleExpand = useCallback(() => { setIsExpanded(prev => !prev); }, []);

  // Dynamic positioning for handles
  const inputA_Top = usesThreshold ? '50%' : '35%';
  const inputB_Top = '65%';
  const result_Top = '50%';

  // Get header title (uses local state and passed dynamic header)
  const getHeaderTitle = () => {
    if (localLabel && localLabel.trim() !== '') return localLabel.trim();
    if (data?.calculatedHeader) return data.calculatedHeader; // Use calculated if available
    // Fallback generation
    const thresholdValueNum = parseFloat(localThreshold);
    return `${currentCondition.label}${usesThreshold && !isNaN(thresholdValueNum) ? ` ${thresholdValueNum}` : ''}`;
  };

  // Get placeholder text for label input
  const getPlaceholderText = () => {
     if (data?.calculatedHeader) return data.calculatedHeader;
     const thresholdValueNum = parseFloat(localThreshold);
     return `${currentCondition.label}${usesThreshold && !isNaN(thresholdValueNum) ? ` ${thresholdValueNum}` : ''}`;
  }

  return (
    <div className={`strategy-node condition-node ${selected ? 'selected' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="node-header" onClick={toggleExpand} title={isExpanded ? 'Collapse' : 'Expand'}>
        <div className="node-title">{getHeaderTitle()}</div>
        <GitCompare size={14} className="node-header-icon" />
        {isExpanded ? <ChevronUp className="edit-toggle-icon" size={14} /> : <ChevronDown className="edit-toggle-icon" size={14} />}
      </div>

      {!isExpanded && <div className="node-summary" title={getHeaderTitle()}>{getHeaderTitle()}</div>}

      {isExpanded && (
        <>
          <div className="node-param-group">
            <label className="node-param-label" htmlFor={`${id}-conditionType`}>Condition Type:</label>
            <select id={`${id}-conditionType`} className="node-select" name="conditionType" value={localConditionType} onChange={handleTypeChange}>
              {conditionTypes.map(type => <option key={type.value} value={type.value}>{type.label} ({type.description})</option>)}
            </select>
          </div>
          <div className="node-param-group">
            <label className="node-param-label" htmlFor={`${id}-threshold`}>Threshold Value (Optional):</label>
            <input id={`${id}-threshold`} type="number" name="threshold" className="node-input"
              value={localThreshold}
              onChange={handleLocalChange(setLocalThreshold)}
              onBlur={() => handleBlur('threshold', localThreshold)}
              step="any" placeholder="Use Input B if empty"
            />
          </div>
          <div className="node-param-group">
            <label className="node-param-label" htmlFor={`${id}-label`}>Custom Label (Optional):</label>
            <input id={`${id}-label`} type="text" name="label" className="node-input"
              value={localLabel}
              onChange={handleLocalChange(setLocalLabel)}
              onBlur={() => handleBlur('label', localLabel)}
              placeholder={getPlaceholderText()}
            />
          </div>
        </>
      )}

      {/* Connections */}
      <div className="node-connections">
        <div className="connection-inputs">
          <div className="handle-label-wrapper">
            <Handle type="target" position={Position.Left} id="a" className="react-flow__handle" style={{ top: inputA_Top }} isConnectable={isConnectable}/>
            <div className="connection-label" style={{ top: inputA_Top }}>Input A</div>
          </div>
          {!usesThreshold && ( // Only show Input B handle if threshold is NOT used
            <div className="handle-label-wrapper">
              <Handle type="target" position={Position.Left} id="b" className="react-flow__handle" style={{ top: inputB_Top }} isConnectable={isConnectable}/>
              <div className="connection-label" style={{ top: inputB_Top }}>Input B</div>
            </div>
          )}
        </div>
        <div className="connection-outputs">
          <div className="handle-label-wrapper">
            <Handle type="source" position={Position.Right} id="result" className="react-flow__handle" style={{ top: result_Top }} isConnectable={isConnectable}/>
            <div className="connection-label" style={{ top: result_Top }}>Result</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ConditionNode);