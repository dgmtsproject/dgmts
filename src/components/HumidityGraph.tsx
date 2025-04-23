import React, { useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import humidityData from '../data/humidityData.json';

const HumidityGraph: React.FC = () => {
  useEffect(() => {
    humidityData.forEach((data) => {
      if (data.humidity > 100) {
        toast.error(`Alert: Humidity ${data.humidity} at ${data.time} exceeds 100!`, {
          position: 'top-right',
          autoClose: 5000,
        });
      }
    });
  }, []);

  return (
    <div className="line-graph">
      <h3>Humidity Data Over Time</h3>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <LineChart width={300} height={300} data={humidityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="humidity" stroke="#00b7eb" activeDot={{ r: 8 }} />
        </LineChart>
      </div>
      <ToastContainer />
    </div>
  );
};

export default HumidityGraph;