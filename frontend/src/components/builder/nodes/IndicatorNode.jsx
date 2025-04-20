// frontend/src/components/builder/nodes/IndicatorNode.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { LineChart, ChevronDown, ChevronUp } from 'lucide-react';

const IndicatorNode = ({ data, selected, id, isConnectable, updateNodeData }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Local state for input values - Initialize from data prop or defaults
  const [localLabel, setLocalLabel] = useState(data?.label || '');
  const [localPeriod, setLocalPeriod] = useState(data?.period !== undefined ? String(data.period) : '20');
  const [localFastPeriod, setLocalFastPeriod] = useState(data?.fastPeriod !== undefined ? String(data.fastPeriod) : '12');
  const [localSlowPeriod, setLocalSlowPeriod] = useState(data?.slowPeriod !== undefined ? String(data.slowPeriod) : '26');
  const [localSignalPeriod, setLocalSignalPeriod] = useState(data?.signalPeriod !== undefined ? String(data.signalPeriod) : '9');
  const [localIndicatorType, setLocalIndicatorType] = useState(data?.indicatorType || 'SMA');

  // Effect to update local state if data prop changes from outside
  useEffect(() => {
    setLocalLabel(data?.label || '');
    setLocalPeriod(data?.period !== undefined ? String(data.period) : '20');
    setLocalFastPeriod(data?.fastPeriod !== undefined ? String(data.fastPeriod) : '12');
    setLocalSlowPeriod(data?.slowPeriod !== undefined ? String(data.slowPeriod) : '26');
    setLocalSignalPeriod(data?.signalPeriod !== undefined ? String(data.signalPeriod) : '9');
    setLocalIndicatorType(data?.indicatorType || 'SMA');
  }, [data]);

  // Handle local input changes
  const handleLocalChange = (setter) => (e) => {
    setter(e.target.value);
  };

  // Update parent state on blur
  const handleBlur = useCallback((fieldName, value) => {
    let processedValue = value;
    if (['period', 'fastPeriod', 'slowPeriod', 'signalPeriod'].includes(fieldName)) {
      processedValue = value.trim() === '' ? null : parseInt(value, 10); // Parse to int, allow clearing
      if (value.trim() !== '' && (isNaN(processedValue) || processedValue < 1)) {
        // Reset to default if invalid or less than 1
        processedValue = fieldName === 'period' ? 20 :
                         fieldName === 'fastPeriod' ? 12 :
                         fieldName === 'slowPeriod' ? 26 : 9;
      }
    } else if (fieldName === 'label') {
      processedValue = value.trim() === '' ? null : value.trim(); // Allow clearing label
    }

    // Avoid updating if the value hasn't effectively changed
    const existingValue = data ? data[fieldName] : undefined;
    // Convert existing value to string for comparison for number fields, handle label clearing
    const existingValueStr = fieldName === 'label' ?
                             (existingValue || '') :
                             (existingValue !== undefined && existingValue !== null ? String(existingValue) : null);
    const processedValueStr = fieldName === 'label' ?
                              (processedValue || '') :
                              (processedValue !== undefined && processedValue !== null ? String(processedValue) : null);


    if (existingValueStr !== processedValueStr) {
      // console.log(`IndicatorNode ${id} blur update:`, { [fieldName]: processedValue });
      updateNodeData(id, { [fieldName]: processedValue });
    }
  }, [id, updateNodeData, data]);

   // Special handler for indicator type select
  const handleTypeChange = useCallback((e) => {
    const newType = e.target.value;
    setLocalIndicatorType(newType);
    // Reset periods to defaults when type changes, if desired
    let resetData = { indicatorType: newType };
    if (['SMA', 'EMA', 'RSI'].includes(newType)) {
        resetData = { ...resetData, period: 20 }; // Or keep existing if possible?
        setLocalPeriod('20');
    } else if (newType === 'MACD') {
        resetData = { ...resetData, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
        setLocalFastPeriod('12');
        setLocalSlowPeriod('26');
        setLocalSignalPeriod('9');
    }
    updateNodeData(id, resetData);
  }, [id, updateNodeData]);

  const toggleExpand = useCallback(() => { setIsExpanded(prev => !prev); }, []);

  // Get header title (using local state)
  const getHeaderTitle = () => {
    // Use explicit user label if set
    if (localLabel && localLabel.trim() !== '') {
      return localLabel.trim();
    }
    // Use dynamically calculated header if available (passed via data prop)
    if (data?.calculatedHeader) {
        return data.calculatedHeader;
    }
    // Fallback to generating based on type and params
    let title = localIndicatorType;
    if (['SMA', 'EMA', 'RSI'].includes(localIndicatorType)) {
      title += `(${localPeriod || '?'})`;
    } else if (localIndicatorType === 'MACD') {
      title += `(${localFastPeriod || '?'}, ${localSlowPeriod || '?'}, ${localSignalPeriod || '?'})`;
    }
    return title;
  };

  // Get placeholder for label input
  const getPlaceholderText = () => {
    let title = localIndicatorType;
     if (['SMA', 'EMA', 'RSI'].includes(localIndicatorType)) {
       title += `(${localPeriod || '?'})`;
     } else if (localIndicatorType === 'MACD') {
       title += `(${localFastPeriod || '?'}, ${localSlowPeriod || '?'}, ${localSignalPeriod || '?'})`;
     }
    return title;
  }


  return (
    <div className={`strategy-node indicator-node ${selected ? 'selected' : ''} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="node-header" onClick={toggleExpand} title={isExpanded ? 'Collapse' : 'Expand'}>
        <div className="node-title">{getHeaderTitle()}</div>
        <LineChart size={14} className="node-header-icon" />
        {isExpanded ? <ChevronUp className="edit-toggle-icon" size={14} /> : <ChevronDown className="edit-toggle-icon" size={14} />}
      </div>

      {!isExpanded && <div className="node-summary" title={getHeaderTitle()}>{getHeaderTitle()}</div>}

      {isExpanded && (
        <>
          <div className="node-param-group">
            <label className="node-param-label" htmlFor={`${id}-indicatorType`}>Indicator Type:</label>
            <select id={`${id}-indicatorType`} className="node-select" name="indicatorType" value={localIndicatorType} onChange={handleTypeChange}>
                <option value="SMA">Simple Moving Average (SMA)</option>
                <option value="EMA">Exponential Moving Average (EMA)</option>
                <option value="RSI">Relative Strength Index (RSI)</option>
                <option value="MACD">Moving Average Convergence Divergence (MACD)</option>
            </select>
          </div>

          {['SMA', 'EMA', 'RSI'].includes(localIndicatorType) && (
            <div className="node-param-group">
              <label className="node-param-label" htmlFor={`${id}-period`}>Period:</label>
              <input id={`${id}-period`} type="number" name="period" className="node-input"
                value={localPeriod}
                onChange={handleLocalChange(setLocalPeriod)}
                onBlur={() => handleBlur('period', localPeriod)}
                min="1" step="1"
                placeholder="e.g., 20"
              />
            </div>
          )}

          {localIndicatorType === 'MACD' && (
            <>
              <div className="node-param-group">
                <label className="node-param-label" htmlFor={`${id}-fastPeriod`}>Fast Period:</label>
                <input id={`${id}-fastPeriod`} type="number" name="fastPeriod" className="node-input"
                  value={localFastPeriod}
                  onChange={handleLocalChange(setLocalFastPeriod)}
                  onBlur={() => handleBlur('fastPeriod', localFastPeriod)}
                  min="1" step="1"
                  placeholder="e.g., 12"
                 />
              </div>
              <div className="node-param-group">
                <label className="node-param-label" htmlFor={`${id}-slowPeriod`}>Slow Period:</label>
                 <input id={`${id}-slowPeriod`} type="number" name="slowPeriod" className="node-input"
                   value={localSlowPeriod}
                   onChange={handleLocalChange(setLocalSlowPeriod)}
                   onBlur={() => handleBlur('slowPeriod', localSlowPeriod)}
                   min="1" step="1"
                   placeholder="e.g., 26"
                  />
              </div>
              <div className="node-param-group">
                <label className="node-param-label" htmlFor={`${id}-signalPeriod`}>Signal Period:</label>
                 <input id={`${id}-signalPeriod`} type="number" name="signalPeriod" className="node-input"
                   value={localSignalPeriod}
                   onChange={handleLocalChange(setLocalSignalPeriod)}
                   onBlur={() => handleBlur('signalPeriod', localSignalPeriod)}
                   min="1" step="1"
                   placeholder="e.g., 9"
                 />
              </div>
            </>
          )}

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

      {/* --- Connections --- */}
      <div className="node-connections">
        {/* Input */}
        <div className="connection-inputs">
          <div className="handle-label-wrapper">
            <Handle type="target" position={Position.Left} id="price" className="react-flow__handle" style={{ top: '50%' }} isConnectable={isConnectable} />
            <div className="connection-label" style={{ top: '50%' }}>Price</div>
          </div>
        </div>

        {/* Outputs */}
        <div className="connection-outputs">
          {localIndicatorType === 'MACD' ? (
            <>
              <div className="handle-label-wrapper">
                <Handle type="source" position={Position.Right} id="macd" style={{ top: '35%' }} isConnectable={isConnectable} />
                <div className="connection-label" style={{ top: '35%' }}>MACD</div>
              </div>
              <div className="handle-label-wrapper">
                <Handle type="source" position={Position.Right} id="signal" style={{ top: '65%' }} isConnectable={isConnectable} />
                <div className="connection-label" style={{ top: '65%' }}>Signal</div>
              </div>
              {/* Add Histogram handle/label if needed */}
            </>
          ) : (
            <div className="handle-label-wrapper">
              <Handle type="source" position={Position.Right} id="result" className="react-flow__handle" style={{ top: '50%' }} isConnectable={isConnectable} />
              <div className="connection-label" style={{ top: '50%' }}>Result</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(IndicatorNode);