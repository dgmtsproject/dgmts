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
      <Link to="/ProjectForm">Form</Link>
      <Link to="/export-data">Export Data</Link>
      <Link to="/GapRemoval">MergeTracks</Link>
    </nav>
  );
};

export default Navbar;