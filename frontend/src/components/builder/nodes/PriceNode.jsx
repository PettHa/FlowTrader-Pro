import React from 'react';
import { Handle, Position } from 'reactflow';
import { Database } from 'lucide-react';

const PriceNode = ({ data, selected, isConnectable }) => {
  // List of possible outputs from the market data
  const outputs = [
    { id: 'open', label: 'Open', top: '20%' },
    { id: 'high', label: 'High', top: '35%' },
    { id: 'low', label: 'Low', top: '50%' },
    { id: 'close', label: 'Close', top: '65%' },
    { id: 'volume', label: 'Volume', top: '80%' }
  ];

  return (
    <div className={`strategy-node price-node ${selected ? 'selected' : ''}`}>
      <div className="node-header">
        <div className="node-title">
          {data.label || 'Market Data'}
        </div>
        <Database size={14} className="node-header-icon" />
      </div>

      <div className="node-summary">
        Price Data Source
      </div>

      <div className="node-connections">
        <div className="connection-inputs"></div> {/* No inputs */}
        <div className="connection-outputs">
          {outputs.map(output => (
            <div key={output.id} className="handle-label-wrapper">
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                style={{ top: output.top }}
                isConnectable={isConnectable}
              />
              <div className="connection-label" style={{ top: output.top }}>
                {output.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PriceNode);