// frontend/src/components/builder/nodes/EntryNode.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { LogIn, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';

const EntryNode = ({ data, selected, id, isConnectable, updateNodeData }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Local State
  const [localPositionType, setLocalPositionType] = useState(data?.positionType || 'LONG');
  const [localLabel, setLocalLabel] = useState(data?.label || '');

  // Sync with props
  useEffect(() => {
    setLocalPositionType(data?.positionType || 'LONG');
    setLocalLabel(data?.label || '');
  }, [data]);

  const isLong = localPositionType === 'LONG';

  // Handle local input change
  const handleLocalChange = (setter) => (e) => {
    setter(e.target.value);
  };

  // Update parent state on blur (only for label)
  const handleBlur = useCallback((fieldName, value) => {
    let processedValue = value.trim() === '' ? null : value.trim();

    if ((data?.[fieldName] || '') !== processedValue) {
    //   console.log(`EntryNode ${id} blur update:`, { [fieldName]: processedValue });
      updateNodeData(id, { [fieldName]: processedValue });
    }
  }, [id, updateNodeData, data]);

  // Handle type change immediately
  const handleTypeChange = useCallback((e) => {
    const newType = e.target.value;
    setLocalPositionType(newType);
    updateNodeData(id, { positionType: newType });
  }, [id, updateNodeData]);

  const toggleExpand = useCallback(() => { setIsExpanded(prev => !prev); }, []);

  const getPositionIcon = () => {
    return isLong ?
      <ArrowUp size={14} className="position-icon long" title="Long Position" /> :
      <ArrowDown size={14} className="position-icon short" title="Short Position" />;
  };

  const getHeaderTitle = () => {
    if (localLabel && localLabel.trim() !== '') return localLabel.trim();
    return `${isLong ? 'Long' : 'Short'} Entry`;
  };

  return (
    <div className={`strategy-node action-node entry-node ${selected ? 'selected' : ''} ${isLong ? 'long' : 'short'} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="node-header" onClick={toggleExpand} title={isExpanded ? 'Collapse' : 'Expand'}>
        <div className="node-title">{getHeaderTitle()}</div>
        {getPositionIcon()}
        <LogIn size={14} className="node-header-icon" />
        {isExpanded ? <ChevronUp className="edit-toggle-icon" size={14} /> : <ChevronDown className="edit-toggle-icon" size={14} />}
      </div>

      {!isExpanded && <div className="node-summary" title={getHeaderTitle()}>{getHeaderTitle()}</div>}

      {isExpanded && (
        <>
          <div className="node-param-group">
            <label className="node-param-label" htmlFor={`${id}-positionType`}>Position Type:</label>
            <select id={`${id}-positionType`} className="node-select" name="positionType" value={localPositionType} onChange={handleTypeChange}>
              <option value="LONG">Long</option>
              <option value="SHORT">Short</option>
            </select>
          </div>
          <div className="node-param-group">
            <label className="node-param-label" htmlFor={`${id}-label`}>Custom Label (Optional):</label>
            <input id={`${id}-label`} type="text" name="label" className="node-input"
              value={localLabel}
              onChange={handleLocalChange(setLocalLabel)}
              onBlur={() => handleBlur('label', localLabel)}
              placeholder={`${isLong ? 'Long' : 'Short'} Entry`}
            />
          </div>
        </>
      )}

      {/* Connections */}
      <div className="node-connections">
        <div className="connection-inputs">
          <div className="handle-label-wrapper">
            <Handle type="target" position={Position.Left} id="signal" className="react-flow__handle" style={{ top: '50%' }} isConnectable={isConnectable}/>
            <div className="connection-label" style={{ top: '50%' }}>Signal</div>
          </div>
        </div>
        {/* No outputs for action nodes */}
        <div className="connection-outputs"></div>
      </div>
    </div>
  );
};

export default React.memo(EntryNode);