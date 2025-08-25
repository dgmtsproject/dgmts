import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Stack,
  CircularProgress,
  Alert,
  TablePagination
} from '@mui/material';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

interface VibrationDataTableProps {
  rawData: any[];
  loading: boolean;
  permissions?: {
    download_graph?: boolean;
  };
}

interface TableRow {
  timestamp: string;
  x: number;
  y: number;
  z: number;
}

const VibrationDataTable: React.FC<VibrationDataTableProps> = ({ rawData, loading, permissions }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const tableData = useMemo(() => {
    if (!rawData.length) return [];

    return rawData.map(entry => ({
      timestamp: entry[0],
      x: Number(entry[1].toFixed(6)),
      y: Number(entry[2].toFixed(6)),
      z: Number(entry[3].toFixed(6))
    }));
  }, [rawData]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const exportToExcel = () => {
    if (!tableData.length) return;

    // Prepare data for export
    const exportData = tableData.map(row => ({
      'Timestamp': format(parseISO(row.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS'),
      'X (in/s)': row.x,
      'Y (in/s)': row.y,
      'Z (in/s)': row.z
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 25 }, // Timestamp
      { wch: 15 }, // X
      { wch: 15 }, // Y
      { wch: 15 }  // Z
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Vibration Data');

    // Generate filename with current date
    const now = new Date();
    const filename = `background_vibration_data_${format(now, 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  const getWarningColor = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 0.5) return '#ffebee'; // Light red background
    return 'inherit';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!tableData.length) {
    return (
      <Alert severity="info">
        No data available. Please load vibration data first.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Vibration Data Table ({tableData.length} records)
        </Typography>
        {permissions?.download_graph && (
          <Button
            variant="contained"
            onClick={exportToExcel}
            disabled={!tableData.length}
            sx={{ minWidth: 120 }}
          >
            Export to Excel
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                Timestamp
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                X (in/s)
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                Y (in/s)
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                Z (in/s)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    {format(parseISO(row.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      backgroundColor: getWarningColor(row.x),
                      fontWeight: Math.abs(row.x) >= 0.5 ? 'bold' : 'normal'
                    }}
                  >
                    {row.x.toFixed(6)}
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      backgroundColor: getWarningColor(row.y),
                      fontWeight: Math.abs(row.y) >= 0.5 ? 'bold' : 'normal'
                    }}
                  >
                    {row.y.toFixed(6)}
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      backgroundColor: getWarningColor(row.z),
                      fontWeight: Math.abs(row.z) >= 0.5 ? 'bold' : 'normal'
                    }}
                  >
                    {row.z.toFixed(6)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={tableData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
};

export default VibrationDataTable; 