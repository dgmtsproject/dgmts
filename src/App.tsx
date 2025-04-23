// src/App.tsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from '../src/Routes/Routes';
import { ProjectProvider } from './context/ProjectContext'; // Import the ProjectProvider

const App: React.FC = () => {
  return (
    <Router>
      <ProjectProvider> {/* Wrap AppRoutes with ProjectProvider */}
        <AppRoutes />
      </ProjectProvider>
    </Router>
  );
};

export default App;
