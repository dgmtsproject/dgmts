// src/Routes.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Instruments from "../pages/Instruments";
import Alarms from "../pages/Alarms";
import ProjectGraphs from "../pages/ProjectGraphs";
import ViewCustomGraphs from "../pages/ViewCustomGraphs";
import Help from "../pages/Help";
// import SignUp from './pages/SignUp'; // Uncomment if using SignUp
import SignIn from "../pages/SignIn";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
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
// import Seismograph from "../pages/Seismograph";
import FileProcessor from "../pages/FileProcessor";
import FileManager from "../pages/FileManager";
import EventGraph from "../pages/EventGraph";
import Background from "../pages/Background";
import AncSeismograph from "../pages/AncSeismograph";
import Smg3Seismograph from "../pages/Smg3Seismograph";
import RockSmg1Seismograph from "../pages/RockSmg1Seismograph";
import RockSmg2Seismograph from "../pages/RockSmg2Seismograph";
import Instantel1Seismograph from "../pages/Instantel1Seismograph";
import Instantel2Seismograph from "../pages/Instantel2Seismograph";
import VibrationDataTablePage from "../pages/VibrationDataTablePage";
import DeviceMap from "../pages/DeviceMap";
import MapsPage from "../pages/MapsPage";
import DataSummary from "../pages/DataSummary";
import DgmtsDataSummary from "../pages/DgmtsDataSummary";
import LongBridgeMap from "../pages/LongBridgeMap";
import Tiltmeter from "../pages/Tiltmeter";
import Tiltmeter30846 from "../pages/Tiltmeter30846";
import Tiltmeter142939 from "../pages/Tiltmeter142939";
import Tiltmeter143969 from "../pages/Tiltmeter143969";
import PrivateRoute from "../components/PrivateRoute";
import EditProject from "../pages/EditProject";
import EditTiltmeterInstrument from "../pages/EditTiltmeterInstrument";
import EditUsers from "../pages/EditUsers";
import AddSyscomGraph from "../pages/AddSyscomGraph";
import DynamicSeismograph from "../pages/DynamicSeismograph";
import DeviceManagement from "../pages/DeviceManagement";
import Payment from "../pages/Payment";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signin" />} />
      {/* <Route path="/signup" element={<SignUp />} /> */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<PrivateRoute />}> {/* All protected routes below */}
        <Route path="/ProjectForm" element={<ProjectForm />} />
        <Route path="/instruments" element={<Instruments />} />
        <Route path="/alarms" element={<Alarms />} />
        <Route path="/project-graphs" element={<ProjectGraphs />} />
        <Route path="/view-custom-graphs" element={<ViewCustomGraphs />} />
        <Route path="/file-manager" element={<FileManager />} />
        <Route path="/reading-tables" element={<ReadingTables />} />
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
        <Route path="/edit-tiltmeter-instrument" element={<EditTiltmeterInstrument />} />
        <Route path='/add-users' element={<AddUsers />} />
        <Route path="/permissions" element={<Permissions />} />
        {/* <Route path="/seismograph" element={<Seismograph />} /> */}
        <Route path='/process-files' element={<FileProcessor/>} />
        <Route path="/dashboard" element={<DashBoard />} />
        <Route path="/event/:id/graph" element={<EventGraph />} /> 
        <Route path="/background" element={<Background />} />
        <Route path="/anc-seismograph" element={<AncSeismograph />} />
        <Route path="/smg3-seismograph" element={<Smg3Seismograph />} />
        <Route path="/rocksmg1-seismograph" element={<RockSmg1Seismograph />} />
        <Route path="/rocksmg2-seismograph" element={<RockSmg2Seismograph />} />
        <Route path="/instantel1-seismograph" element={<Instantel1Seismograph />} />
        <Route path="/instantel2-seismograph" element={<Instantel2Seismograph />} />
        <Route path="/tiltmeter" element={<Tiltmeter />} />
        <Route path="/tiltmeter-30846" element={<Tiltmeter30846 />} />
        <Route path="/tiltmeter-142939" element={<Tiltmeter142939 />} />
        <Route path="/tiltmeter-143969" element={<Tiltmeter143969 />} />
        <Route path="/vibration-data-table" element={<VibrationDataTablePage />} />
        <Route path="/seismograph-map" element={<DeviceMap/>} />
        <Route path="/long-bridge-map" element={<LongBridgeMap />} />
        <Route path="/maps" element={<MapsPage />} />
        <Route path="/edit-project" element={<EditProject />} />
        <Route path="/edit-users" element={<EditUsers />} />
        <Route path="/add-syscom-graph" element={<AddSyscomGraph />} />
        <Route path="/dynamic-seismograph" element={<DynamicSeismograph />} />
        <Route path="/device-management" element={<DeviceManagement />} />
        <Route path="/payment" element={<Payment />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
