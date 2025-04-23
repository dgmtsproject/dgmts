import React from 'react';
import logo from '../assets/logo.jpg';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import HeaNavLogo from '../components/HeaNavLogo';

const filesData = [
  {
    "id": 1,
    "projectName": "Highway Expansion Project",
    "fileName": "highway_expansion_report_2025.xlsx",
    "type": "xlsx",
    "size": "2.5 MB",
    "lastModified": "2025-04-10"
  },
  {
    "id": 2,
    "projectName": "Bridge Reinforcement",
    "fileName": "bridge_reinforcement_data_2025.xlsx",
    "type": "xlsx",
    "size": "1.8 MB",
    "lastModified": "2025-04-12"
  },
  {
    "id": 3,
    "projectName": "Tunnel Monitoring",
    "fileName": "tunnel_monitoring_logs.csv",
    "type": "csv",
    "size": "500 KB",
    "lastModified": "2025-04-13"
  },
  {
    "id": 4,
    "projectName": "Railway Electrification",
    "fileName": "railway_electrification_readings_2025.pdf",
    "type": "pdf",
    "size": "3.2 MB",
    "lastModified": "2025-04-15"
  },
  {
    "id": 5,
    "projectName": "Coastal Road Development",
    "fileName": "coastal_road_development_data_2025.xlsx",
    "type": "xlsx",
    "size": "2.1 MB",
    "lastModified": "2025-04-16"
  },
  {
    "id": 6,
    "projectName": "Metro Line Construction",
    "fileName": "metro_line_construction_report_2025.pdf",
    "type": "pdf",
    "size": "4.0 MB",
    "lastModified": "2025-04-17"
  }
];

const FileManager: React.FC = () => {
  const handleExcelDownload = (projectName: string) => {
    const worksheetData = [
      ['Project Name', 'Status', 'Start Date'],
      [projectName, 'In Progress', '2025-04-10'],
      [projectName, 'Completed', '2025-04-12'],
      [projectName, 'Planning', '2025-04-13']
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Project Data');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileName = `${projectName.replace(/\s/g, '_').toLowerCase()}_data.xlsx`;
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, fileName);
  };

  return (
    <>
      <HeaNavLogo />
      <div className="page">
        <div className="content">
          <h2 style={{ textAlign: 'center', marginTop: '20px', color: '#1c1c1c' }}>Project File Manager</h2>

          <TableContainer component={Paper} style={{ maxWidth: '95%', margin: '20px auto', border: '1px solid black' }}>
            <Table>
              <TableHead style={{ backgroundColor: '#e0e0e0' }}>
                <TableRow>
                  <TableCell style={cellStyleHeader}>Project</TableCell>
                  <TableCell style={cellStyleHeader}>File Name</TableCell>
                  <TableCell style={cellStyleHeader}>Type</TableCell>
                  <TableCell style={cellStyleHeader}>Size</TableCell>
                  <TableCell style={cellStyleHeader}>Last Modified</TableCell>
                  <TableCell style={cellStyleHeader}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filesData.map((file) => (
                  <TableRow key={file.id} style={{ backgroundColor: '#fcfcfc' }}>
                    <TableCell style={cellStyleBody}>{file.projectName}</TableCell>
                    <TableCell style={cellStyleBody}>{file.fileName}</TableCell>
                    <TableCell style={cellStyleBody}>{file.type.toUpperCase()}</TableCell>
                    <TableCell style={cellStyleBody}>{file.size}</TableCell>
                    <TableCell style={cellStyleBody}>{file.lastModified}</TableCell>
                    <TableCell style={cellStyleBody}>
                      <Button
                        variant="contained"
                        style={{
                          padding: '6px 10px',
                          fontSize: '13px',
                          backgroundColor: '#1e88e5',
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                        onClick={() => handleExcelDownload(file.projectName)}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <div className="centered-logo">
            <img
              src={logo}
              alt="DGMTS Logo"
              style={{
                position: 'fixed',
                top: '65%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '30vw',
                opacity: 0.1,
                zIndex: -1,
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>
        <footer style={{ textAlign: 'center', padding: '12px', fontSize: '14px', color: '#444' }}>
          © 2025 DGMTS. All rights reserved.
        </footer>
      </div>
    </>
  );
};

const cellStyleHeader = {
  fontWeight: 'bold',
  border: '1px solid black',
  textAlign: 'center' as const,
  padding: '10px',
  fontSize: '15px',
};

const cellStyleBody = {
  border: '1px solid black',
  textAlign: 'center' as const,
  padding: '10px',
  fontSize: '14px',
};

export default FileManager;
