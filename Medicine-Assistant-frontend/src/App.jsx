import { useEffect } from "react";
import Welcome from "./pages/Welcome"
import Signup from "./pages/Signup"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css";
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import MyMedicines from "./pages/MyMedicines";
import TodaysSchedule from "./pages/TodaysSchedule";
import AddPrescription from "./pages/AddPrescription";
import AskAssistant from "./pages/AskAssistant";
import Profile from "./pages/Profile";
import AddManually from "./pages/AddManually";
import NotificationSettings from "./pages/NotificationSettings";
import PushTest from "./components/PushTest";
import { startReminderScheduler } from "./utils/reminderScheduler";

function App() {
  
useEffect(() => {
    startReminderScheduler();
  }, []);
  return (
    <>
      <BrowserRouter>
      <ToastContainer position="top-right" />
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login/>} />

         {/* <Route path="/push-test" element={<PushTest/>}/> */}
        {/* Pages with Sidebar */}
        <Route element={<Layout />}>

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/medicines" element={<MyMedicines/>} />
          <Route path="/schedule" element={<TodaysSchedule/>} />
          <Route path="/prescription" element={<AddPrescription/>} />
          <Route path="/assistant" element={<AskAssistant/>} />
          <Route path="/profile" element={<Profile/>} />
          <Route path="/add-manually" element={<AddManually/>}/>
          <Route path="notification-settings" element={<NotificationSettings/>}/>
        </Route>
      </Routes>
    </BrowserRouter>
    </>
  )
}

export default App
