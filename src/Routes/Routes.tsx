// src/Routes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Projects from "../pages/Projects";
import Instruments from "../pages/Instruments";
import Alarms from "../pages/Alarms";
import ProjectGraphs from "../pages/ProjectGraphs";
import ViewCustomGraphs from "../pages/ViewCustomGraphs";
import ExportData from "../pages/ExportData";
import Help from "../pages/Help";
// import SignUp from './pages/SignUp'; // Uncomment if using SignUp
import SignIn from "../pages/SignIn";
import ProjectForm from "../pages/ProjectForm";
import DashBoard from "../pages/DashBoard";
// import MergeTracks from "../components/MergeTracks";
import GapRemoval from "../components/GapRemoval";
import ProjectsList from "../pages/ProjectsList";
import AddProjects from "../pages/AddProjects";
import TrackGraphs from "../pages/TrackGraphs";
import NewTrackGraphs from "../pages/NewTrackGraphs";
import AtmsTrackGraphs from "../pages/AtmsTrackGraphs";
import AmtsRefGraphs from "../pages/AmtsRefGraphs";
import InstrumentsList from "../pages/InstrumentsList";
import AddAlarms from "../pages/Add-Alarms";
import LongBridgeDataSummary from "../pages/LongBridgeDataSummary";
import ReadingTables from "../pages/ReadingTables";
import AdminSetup from "../pages/AdminSetup";
import EditInstrument from "../pages/EditInstrument";
import AddUsers from "../pages/AddUsers";
import Permissions from "../pages/Permissions";
import Seismograph from "../pages/Seismograph";
import FileProcessor from "../pages/FileProcessor";
import FileManager from "../pages/FileManager";
import EventGraph from "../pages/EventGraph";
import Background from "../pages/Background";
import DeviceMap from "../pages/DeviceMap";
import Maps from "../pages/Maps";
import DataSummary from "../pages/DataSummary";
import DgmtsDataSummary from "../pages/DgmtsDataSummary";

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
      <Route path="/reading-tables" element={<ReadingTables />} />
      <Route path="/export-data" element={<ExportData />} />
      <Route path="/help" element={<Help />} />
      {/* <Route path="/MergeTracks" element={<MergeTracks />} /> */}
      <Route path="/single-prism-with-time" element={<GapRemoval />} />
      <Route path="/projects-list" element={<ProjectsList />} />
      <Route path="/add-projects" element={<AddProjects />} />
      <Route path="/multi-prisms-with-time" element={<TrackGraphs />} />
      <Route path="/new-track-graphs" element={<NewTrackGraphs />} />
      <Route path="/amts-track-graphs" element={<AtmsTrackGraphs />} />
      <Route path="/amts-ref-graphs" element={<AmtsRefGraphs />} />
      <Route path="/instruments-list" element={<InstrumentsList />} />
      <Route path="/add-alarms" element={<AddAlarms/>}/>
      <Route path="/long-bridge-data-summary" element={<LongBridgeDataSummary/>} />
      <Route path="/DGMTS-data-summary" element={<DgmtsDataSummary />} />
      <Route path='/data-summary' element={<DataSummary />} />
      <Route path="/reading-tables" element={<ReadingTables />} />
      <Route path="/admin-setup" element={<AdminSetup />} />
      <Route path="/edit-instrument" element={<EditInstrument />} />
      <Route path='/add-users' element={<AddUsers />} />
      <Route path="/permissions" element={<Permissions />} />
      <Route path="/seismograph" element={<Seismograph />} />
      <Route path='/process-files' element={<FileProcessor/>} />
      <Route path="/dashboard" element={<DashBoard />} />
      <Route path="/event/:id/graph" element={<EventGraph />} /> 
      <Route path="/background" element={<Background />} />
      <Route path="/seismograph-map" element={<DeviceMap/>} />
      <Route path="/maps" element={<Maps />} />
    </Routes>
  );
};

export default AppRoutes;
