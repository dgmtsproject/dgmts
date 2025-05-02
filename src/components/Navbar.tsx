import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <Link to="/projects">Projects</Link>
      <Link to="/instruments">Instruments</Link>
      <Link to="/alarms">Alarms</Link>
      <Link to="/project-graphs">Project Graphs</Link>
      <Link to="/view-custom-graphs">View Custom Graphs</Link>
      <Link to="/file-manager">File Manager</Link>
      <Link to="/ProjectForm">Admin Setup</Link>
      <Link to="/export-data">Export Data</Link>
      <Link to="/single-prism-with-time">Single Prism Graph</Link>
      <Link to="/multi-prisms-with-time">Multiple Prisms Graph</Link>
      <Link to="/amts-track-graphs"> AMTS Track Graphs</Link>
      <Link to="/amts-ref-graphs"> AMTS Ref Graphs</Link>
    </nav>
  );
};

export default Navbar;