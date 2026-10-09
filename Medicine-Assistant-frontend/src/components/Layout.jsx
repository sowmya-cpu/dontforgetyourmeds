import React from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";

function Layout() {

  return (

    <div className="container-fluid min-vh-100 bg-light p-0">

      <div className="row g-0 min-vh-100">

        {/* Desktop Sidebar */}
        <Sidebar />


        {/* Main Content */}
        <div className="col-lg-10 pb-5">

          {/* Header */}
          <Header />

          {/* Current Page */}
          <Outlet />

        </div>

      </div>


      {/* Mobile / Tablet Bottom Navigation */}
      <MobileBottomNav />

    </div>

  );
}

export default Layout;