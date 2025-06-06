import React from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';


const DgmtsDataSummary: React.FC = () => {
    return(
        <>
        <HeaNavLogo/>
        <MainContentWrapper>
            <h1>DGMTS Data Summary</h1>
            <p>This page will provide a summary of the DGMTS Testing Reporting data.</p>
            {/* Add more content or components as needed */}
        </MainContentWrapper>
        </>

    )
};
export default DgmtsDataSummary;