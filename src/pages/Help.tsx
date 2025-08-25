import React from 'react';
import Header from '../components/Header';
import Navbar from '../components/Navbar';
import logo from '../assets/logo.jpg';
import helpTopics from '../data/helpTopics.json';
import HeaNavLogo from "../components/HeaNavLogo";
import BackButton from "../components/Back";
import MainContentWrapper from "../components/MainContentWrapper";

const Help: React.FC = () => {
  return (
    <div className="page">
      <Header />
      <Navbar />
      <HeaNavLogo/>
      <MainContentWrapper>
      <BackButton to="/dashboard" />
        <h2>Help</h2>
        <div className="data-list">
          <h3>Help Topics</h3>
          <ul>
            {helpTopics.map((topic) => (
              <li key={topic.id}>
                {topic.topic} - {topic.description}
              </li>
            ))}
          </ul>
        </div>
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

export default Help;