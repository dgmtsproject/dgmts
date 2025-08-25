// LongBridgeMap.tsx
import React from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import HeaNavLogo from '../components/HeaNavLogo';
import BackButton from '../components/Back';
import MainContentWrapper from '../components/MainContentWrapper';

const LongBridgeMap: React.FC = () => {
  const position: [number, number] = [38.8814312, -77.0330815];
  const maxZoom = 22; // Higher than standard

  const SetMapView = () => {
    const map = useMap();
    map.setView(position, maxZoom);
    return null;
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      <BackButton to="/dashboard" />
        <div style={{ width: '100%', height: 'calc(100vh - 64px)' }}>
          <MapContainer
            center={position}
            zoom={maxZoom}
            style={{ height: '100%', width: '100%' }}
            maxZoom={maxZoom}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
              attribution='<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> | Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              maxZoom={maxZoom}
              maxNativeZoom={20} // Some providers may limit this
            />
            <SetMapView />
          </MapContainer>
        </div>
      </MainContentWrapper>
    </>
  );
};

export default LongBridgeMap;