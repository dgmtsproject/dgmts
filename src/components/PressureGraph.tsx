import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

type PressureDataPoint = {
  time: string | number;
  pressure: number;
};

const PressureGraph: React.FC<{ data: PressureDataPoint[] }> = ({ data }) => {
  // Check if data is available before rendering
  if (!data || data.length === 0) {
    return <div>No data available for the pressure graph.</div>;
  }

  console.log('Rendering Pressure Graph with data:', data);  // Debugging data passed to PressureGraph

  return (
    <div className="line-graph">
      <h3>Pressure Data Over Time</h3>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <LineChart
          width={600}
          height={400}
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="pressure" stroke="#82ca9d" activeDot={{ r: 8 }} />
        </LineChart>
      </div>
    </div>
  );
};

export default PressureGraph;
