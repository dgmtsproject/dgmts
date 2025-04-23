import React from 'react';
import { useLocation } from 'react-router-dom';
// import Header from '../components/Header';
// import Navbar from '../components/Navbar';
import logo from '../assets/logo.jpg';
import instrumentsData from '../data/instrumentsData.json';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import HeaNavLogo from '../components/HeaNavLogo';

const Instruments: React.FC = () => {
  const location = useLocation();
  const project = location.state?.project;

  const filteredInstruments = project?.instrumentIds
    ? instrumentsData.filter((instrument) =>
        project.instrumentIds.includes(instrument.id)
      )
    : [];

  return (
    <>
    <HeaNavLogo/>
    <div className="page">
      {/* <Header />
      <Navbar /> */}
      <div className="content" style={{ padding: '2rem' }}>
        <h2>Instruments for: {project?.name || "No Project Selected"}</h2>

        <TableContainer component={Paper} style={{ border: '1px solid #000' }}>
          <Table>
            <TableHead style={{ backgroundColor: '#f1f1f1' }}>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>
                  <strong>Instrument Name</strong>
                </TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>
                  <strong>Type</strong>
                </TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>
                  <strong>Last Calibrated</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInstruments.map((instrument) => (
                <TableRow key={instrument.id} style={{ backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
                  <TableCell style={{ border: '1px solid black' }}>{instrument.name}</TableCell>
                  <TableCell style={{ border: '1px solid black' }}>{instrument.type}</TableCell>
                  <TableCell style={{ border: '1px solid black' }}>{instrument.lastCalibrated}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <div className="centered-logo">
          <img
            src={logo}
            alt="Logo"
            style={{
              position: 'fixed',
              top: '65%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '30vw',
              opacity: 0.1,
              zIndex: -1,
              pointerEvents: 'none'
            }}
          />
        </div>
      </div>
      <footer>© 2025 DGMTS. All rights reserved.</footer>
    </div>
    </>
  );
};

export default Instruments;
