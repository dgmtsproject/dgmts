import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import VibrationDataTable from '../components/VibrationDataTable';
import { Box, Typography, Button, Stack, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { format } from 'date-fns';
import { useAdminContext } from '../context/AdminContext';

const VibrationDataTablePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { permissions } = useAdminContext();
  const { rawData, fromDate, toDate } = location.state || {};



  const handleBackToCharts = () => {
    navigate('/background');
  };

  if (!rawData || !Array.isArray(rawData)) {
    return (
      <>
        <HeaNavLogo />
        <MainContentWrapper>
          <BackButton to="/dashboard" />
          <Box p={3}>
            <Alert severity="error">
              No data available. Please load vibration data from the charts view first.
            </Alert>
            <Button
              variant="contained"
              onClick={handleBackToCharts}
              sx={{ mt: 2 }}
            >
              Back to Charts
            </Button>
          </Box>
        </MainContentWrapper>
      </>
    );
  }

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton to="/dashboard" />
        <Box p={3}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Vibration Data Table
              </Typography>
              {fromDate && toDate && (
                <Typography variant="body2" color="textSecondary">
                  Date Range: {format(fromDate, 'MMM dd, yyyy HH:mm')} - {format(toDate, 'MMM dd, yyyy HH:mm')}
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={handleBackToCharts}
            >
              Back to Charts
            </Button>
          </Stack>

          <VibrationDataTable rawData={rawData} loading={false} permissions={permissions} />
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default VibrationDataTablePage; 