// src/components/Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../image/bg.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Simple admin credentials (in production, use proper authentication)
    if (username === "admin" && password === "admin123") {
      localStorage.setItem("isAdmin", "true");
      navigate("/admin");
    } else {
      setError("Invalid credentials! Use admin/admin123");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-2 border-pink-300">
        <div className="flex flex-col items-center mb-6">
          <img src={logo} alt="logo" className="w-20 h-20 mb-4" />
          <h1 className="text-3xl font-bold text-pink-600">FOODFAST</h1>
          <p className="text-gray-500 text-sm">🚁 Drone Delivery Admin</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-pink-700 font-semibold mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="admin"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-pink-700 font-semibold mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="admin123"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-pink-500 text-white font-bold py-3 rounded-lg hover:bg-pink-600 transition-all shadow-md"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center text-gray-500 text-xs">
          <p>Demo Credentials:</p>
          <p className="font-mono">admin / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;