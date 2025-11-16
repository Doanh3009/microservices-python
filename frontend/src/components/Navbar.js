import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../image/bg.png";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    navigate("/");
    setIsOpen(false);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogoClick = () => {
    navigate("/admin");
    setIsOpen(false);
  };

  return (
    <div className="w-full bg-pink-200 shadow-md flex justify-between items-center px-4 py-3 fixed top-0 left-0 z-50">
      {/* Logo */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={handleLogoClick}
      >
        <img src={logo} alt="logo" className="w-8 h-8" />
        <span className="text-pink-900 font-bold text-lg">FOODFAST ADMIN</span>
      </div>

      {/* Hamburger nút cho mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden text-pink-900 text-2xl p-2"
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Menu Desktop */}
      <div className="hidden md:flex flex-1 items-center justify-center text-pink-800 font-medium">
        <div className="flex justify-evenly text-xl w-3/5"> 
          {/* justify-evenly dàn đều 4 link trong khối này */}
          <Link to="/admin/users" className="hover:text-pink-600">
            USERS
          </Link>
          <Link to="/admin/products" className="hover:text-pink-600">
            PRODUCTS
          </Link>
          <Link to="/admin/orders" className="hover:text-pink-600">
            ORDERS
          </Link>
          <Link to="/admin/payments" className="hover:text-pink-600">
            PAYMENTS
          </Link>
        </div>
      </div>

      {/* Logout (desktop) */}
      <div className="hidden md:block">
        <button
          onClick={handleLogout}
          className="bg-pink-500 text-white px-4 py-1 rounded-lg hover:bg-pink-600 transition"
        >
          Log out
        </button>
      </div>

      {/* Menu Mobile */}
      <div
        className={`${
          isOpen ? "block" : "hidden"
        } md:hidden w-full bg-pink-100 shadow-lg mt-3`}
      >
        <div className="flex flex-col items-start p-4 gap-4">
          <Link
            to="/admin/users"
            className="hover:text-pink-600 w-full"
            onClick={closeMenu}
          >
            USERS
          </Link>
          <Link
            to="/admin/products"
            className="hover:text-pink-600 w-full"
            onClick={closeMenu}
          >
            PRODUCTS
          </Link>
          <Link
            to="/admin/orders"
            className="hover:text-pink-600 w-full"
            onClick={closeMenu}
          >
            ORDERS
          </Link>
          <Link
            to="/admin/payments"
            className="hover:text-pink-600 w-full"
            onClick={closeMenu}
          >
            PAYMENTS
          </Link>

          <button
            onClick={handleLogout}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition w-full mt-2"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
