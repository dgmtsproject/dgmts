import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import { Box, Typography } from '@mui/material';
import { LatLngTuple } from 'leaflet';

const DeviceMap = () => {
  const position: LatLngTuple = [38.890331, -77.435932]; // Device coordinates
  const fillBlueOptions = { 
    fillColor: 'red',
    color: 'red', 
    fillOpacity: 0.5,
    radius: 500 // Circle radius in meters
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <Box p={3}>
          <Typography variant="h4" gutterBottom>Device Location</Typography>
          
          <Box sx={{ 
            height: '500px', 
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #ddd'
          }}>
            <MapContainer 
              center={position} 
              zoom={17}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Circle 
                              center={position}
                              pathOptions={fillBlueOptions}
                              radius={20}             >
                <Popup>Device: Rock-25160046</Popup>
              </Circle>
            </MapContainer>
          </Box>
          
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              Device: Rock-25160046 | Coordinates: {position.join(', ')}
            </Typography>
          </Box>
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default DeviceMap;