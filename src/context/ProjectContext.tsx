// src/context/ProjectContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the context type for better type safety
interface ProjectContextType {
  selectedProject: string | null;
  setSelectedProject: (projectName: string) => void;
}

// Create the context with an undefined default value
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Create the provider component that will wrap your app
export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  return (
    <ProjectContext.Provider value={{ selectedProject, setSelectedProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

// Custom hook to use the project context
export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
};
