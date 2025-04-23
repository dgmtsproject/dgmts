// import React, { useEffect } from 'react';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import sensorData from '../data/sensorData.json';

// const LineGraph: React.FC = () => {
//   useEffect(() => {
//     sensorData.forEach((data) => {
//       if (data.value > 100) {
//         toast.error(`Alert: Value ${data.value} at ${data.time} exceeds 100!`, {
//           position: 'top-right',
//           autoClose: 5000,
//         });
//       }
//     });
//   }, []);

//   return (
//     <div className="line-graph">
//       <h3>Sensor Data Over Time</h3>
//       <LineChart width={600} height={300} data={sensorData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
//         <CartesianGrid strokeDasharray="3 3" />
//         <XAxis dataKey="time" />
//         <YAxis />
//         <Tooltip />
//         <Legend />
//         <Line type="monotone" dataKey="value" stroke="#8884d8" activeDot={{ r: 8 }} />
//       </LineChart>
//       <ToastContainer />
//     </div>
//   );
// };

// export default LineGraph;