// src/App.tsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from '../src/Routes/Routes';
import { ProjectProvider } from './context/ProjectContext';
import { AdminProvider } from './context/AdminContext';

const App: React.FC = () => {
  return (
    <Router>
      <AdminProvider>
        <ProjectProvider>
          <AppRoutes />
        </ProjectProvider>
      </AdminProvider>
    </Router>
  );
};

export default App;
