// src/components/AdminLayout.js
import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-pink-50">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;