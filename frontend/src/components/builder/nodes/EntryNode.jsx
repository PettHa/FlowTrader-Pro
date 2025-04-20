import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { LogIn, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';

const EntryNode = ({ data, selected, id, isConnectable, updateNodeData }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const positionType = data.positionType || 'LONG';
  const isLong = positionType === 'LONG';

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'label') {
      processedValue = value.trim() === '' ? null : value;
    }
    if (updateNodeData && id) {
      updateNodeData(id, { [name]: processedValue });
    }
  }, [updateNodeData, id]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const getPositionIcon = () => {
    return isLong ?
      <ArrowUp size={14} className="position-icon long" title="Long Position" /> :
      <ArrowDown size={14} className="position-icon short" title="Short Position" />;
  };

  const getHeaderTitle = () => {
    if (data.label && data.label.trim() !== '') {
      return data.label;
    }
    return `${isLong ? 'Long' : 'Short'} Entry`;
  };

  return (
    <div className={`strategy-node action-node entry-node ${selected ? 'selected' : ''} ${isLong ? 'long' : 'short'} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="node-header" onClick={toggleExpand} title={isExpanded ? 'Collapse' : 'Expand'}>
        <div className="node-title">
          {getHeaderTitle()}
        </div>
        {getPositionIcon()}
        <LogIn size={14} className="node-header-icon" />
        {isExpanded ? <ChevronUp className="edit-toggle-icon" size={14} /> : <ChevronDown className="edit-toggle-icon" size={14} />}
      </div>

      {!isExpanded && (
        <div className="node-summary" title={getHeaderTitle()}>
          {getHeaderTitle()}
        </div>
      )}

      {isExpanded && (
        <>
          <div className="node-param-group">
            <label className="node-param-label" htmlFor={`${id}-positionType`}>Position Type:</label>
            <select id={`${id}-positionType`} className="node-select" name="positionType" value={positionType} onChange={handleChange}>
              <option value="LONG">Long</option>
              <option value="SHORT">Short</option>
            </select>
          </div>
          <div className="node-param-group">
            <label className="node-param-label" htmlFor={`${id}-label`}>Custom Label (Optional):</label>
            <input id={`${id}-label`} type="text" name="label" className="node-input" value={data.label || ''} onChange={handleChange} placeholder={`${isLong ? 'Long' : 'Short'} Entry`}/>
          </div>
        </>
      )}

      <div className="node-connections">
        <div className="connection-inputs">
          <div className="handle-label-wrapper">
            <Handle type="target" position={Position.Left} id="signal" className="react-flow__handle" style={{ top: '50%' }} isConnectable={isConnectable}/>
            <div className="connection-label" style={{ top: '50%' }}>Signal</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EntryNode);