// src/Routes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Projects from "../pages/Projects";
import Instruments from "../pages/Instruments";
import Alarms from "../pages/Alarms";
import ProjectGraphs from "../pages/ProjectGraphs";
import ViewCustomGraphs from "../pages/ViewCustomGraphs";
import FileManager from "../pages/FileManager";
import ExportData from "../pages/ExportData";
import Help from "../pages/Help";
// import SignUp from './pages/SignUp'; // Uncomment if using SignUp
import SignIn from "../pages/SignIn";
import ProjectForm from "../pages/ProjectForm";
import DashBoard from "../pages/DashBoard";
// import MergeTracks from "../components/MergeTracks";
import GapRemoval from "../components/GapRemoval";


const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signin" />} />
      {/* <Route path="/signup" element={<SignUp />} /> */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/ProjectForm" element={<ProjectForm />} />
      <Route path="/instruments" element={<Instruments />} />
      <Route path="/alarms" element={<Alarms />} />
      <Route path="/project-graphs" element={<ProjectGraphs />} />
      <Route path="/view-custom-graphs" element={<ViewCustomGraphs />} />
      <Route path="/file-manager" element={<FileManager />} />
      <Route path="/export-data" element={<ExportData />} />
      <Route path="/help" element={<Help />} />
      <Route path="/DashBoard" element={<DashBoard />} />
      {/* <Route path="/MergeTracks" element={<MergeTracks />} /> */}
      <Route path="/GapRemoval" element={<GapRemoval />} />

    </Routes>
  );
};

export default AppRoutes;
