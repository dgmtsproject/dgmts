import React from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import InteractiveProjectMaps from '../components/InteractiveProjectMaps';

const MapsPage: React.FC = () => {
  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton />
        <InteractiveProjectMaps />
      </MainContentWrapper>
    </>
  );
};

export default MapsPage;
