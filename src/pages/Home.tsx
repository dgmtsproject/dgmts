import React from "react";
import Header from "../components/Header";
import Navbar from "../components/Navbar";
import logo from "../assets/logo.jpg";
import HeaNavLogo from '../components/HeaNavLogo';
import BackButton from '../components/Back';
import MainContentWrapper from '../components/MainContentWrapper';

const Home: React.FC = () => {
  return (
    <div className="page">
      <Header />
      <Navbar />
      <HeaNavLogo />
      <MainContentWrapper>
      <BackButton to="/dashboard" />
        <h2>
          Welcome to Dulles Geotechnical Monitoring and Telemetry Solutions
        </h2>
        <div className="centered-logo">
          <img
            src={logo}
            alt="DGMTS Logo"
            style={{
              position: "fixed",
              top: "65%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "30vw",
              opacity: 0.1,
              zIndex: -1,
              pointerEvents: "none",
            }}
          />
        </div>
      </MainContentWrapper>
      <footer>© 2025 DGMTS. All rights reserved.</footer>
    </div>
  );
};

export default Home;
