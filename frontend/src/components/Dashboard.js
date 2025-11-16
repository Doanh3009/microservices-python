// src/components/Dashboard.js

import React, { useState, useEffect } from "react";
// Import các API của bạn
import API from "../api"; 
import { FaDollarSign, FaReceipt, FaUsers, FaBoxOpen, FaClock, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";

// Một component nhỏ để hiển thị thẻ thống kê
const StatCard = ({ icon, title, value, color }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-lg border ${color.border} flex items-center gap-4`}>
    <div className={`text-3xl p-3 rounded-full ${color.bg} ${color.text}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    users: 0,
    products: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState({
    pending: 0,
    paid: 0,
    failed: 0
  });

useEffect(() => {
  const fetchData = async () => {
    try {
      // Gọi đồng thời cả 4 API
      const [usersRes, productsRes, ordersRes, paymentsRes] = await Promise.all([
        API.getUsers(),
        API.getProducts(),
        API.getOrders(),
        API.getPayments()
      ]);

      const usersData = usersRes.data;
      const productsData = productsRes.data;
      const ordersData = ordersRes.data;
      const paymentsData = paymentsRes.data;

      // 1. Thống kê
      const totalRevenue = paymentsData
        .filter(p => p.status === 'Paid')
        .reduce((sum, p) => sum + p.amount, 0);
      
      setStats({
        revenue: totalRevenue,
        orders: ordersData.length,
        users: usersData.length,
        products: productsData.length
      });

      // 2. 5 đơn hàng gần nhất với tên User
      const last5Orders = ordersData.slice(-5).reverse().map(order => {
        const user = usersData.find(u => u.id === order.user_id);
        return {
          ...order,
          userName: user ? user.name : `ID: ${order.user_id}`
        };
      });
      setRecentOrders(last5Orders);

      // 3. Thống kê tình trạng thanh toán
      const statusCounts = paymentsData.reduce((acc, p) => {
        if (p.status === 'Paid') acc.paid++;
        else if (p.status === 'Pending') acc.pending++;
        else if (p.status === 'Failed') acc.failed++;
        return acc;
      }, { pending: 0, paid: 0, failed: 0 });
      setPaymentStatus(statusCounts);

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  fetchData();
}, []);

  return (
    // Thêm pt-20 để không bị Navbar che mất
    <div className="min-h-screen bg-pink-50 p-6 pt-20">
      <h2 className="text-3xl font-bold text-pink-600 mb-6">
        🍓 Admin Dashboard
      </h2>
      
      {/* Hàng 1: Thẻ Thống Kê */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          icon={<FaDollarSign />} 
          title="Total Revenue" 
          value={`$${stats.revenue.toFixed(2)}`}
          color={{ border: 'border-green-200', bg: 'bg-green-100', text: 'text-green-600' }}
        />
        <StatCard 
          icon={<FaReceipt />} 
          title="Total Orders" 
          value={stats.orders}
          color={{ border: 'border-blue-200', bg: 'bg-blue-100', text: 'text-blue-600' }}
        />
        <StatCard 
          icon={<FaUsers />} 
          title="Total Users" 
          value={stats.users}
          color={{ border: 'border-purple-200', bg: 'bg-purple-100', text: 'text-purple-600' }}
        />
        <StatCard 
          icon={<FaBoxOpen />} 
          title="Total Products" 
          value={stats.products}
          color={{ border: 'border-yellow-200', bg: 'bg-yellow-100', text: 'text-yellow-600' }}
        />
      </div>

      {/* Hàng 2: Danh sách */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cột 1 & 2: Đơn hàng gần đây */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-pink-200 p-6">
          <h3 className="text-lg font-semibold text-pink-700 mb-4">
            Recent Orders
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase">
                <tr>
                  <th className="py-2 px-3">Order ID</th>
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length > 0 ? recentOrders.map(order => (
                  <tr key={order.id} className="border-t border-pink-100 hover:bg-pink-50">
                    <td className="py-3 px-3 font-medium">#{order.id}</td>
                    <td className="py-3 px-3">{order.userName}</td>
                    <td className="py-3 px-3 font-semibold text-green-600">${order.total.toFixed(2)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" className="py-4 text-center text-gray-400 italic">No recent orders.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột 3: Tình trạng thanh toán */}
        <div className="bg-white rounded-2xl shadow-lg border border-pink-200 p-6">
          <h3 className="text-lg font-semibold text-pink-700 mb-4">
            Payment Status
          </h3>
          <ul className="space-y-4">
            <li className="flex justify-between items-center text-lg">
              <span className="flex items-center gap-2 text-green-600">
                <FaCheckCircle /> Paid
              </span>
              <span className="font-bold text-green-600">{paymentStatus.paid}</span>
            </li>
            <li className="flex justify-between items-center text-lg">
              <span className="flex items-center gap-2 text-yellow-600">
                <FaClock /> Pending
              </span>
              <span className="font-bold text-yellow-600">{paymentStatus.pending}</span>
            </li>
            <li className="flex justify-between items-center text-lg">
              <span className="flex items-center gap-2 text-red-600">
                <FaExclamationCircle /> Failed
              </span>
              <span className="font-bold text-red-600">{paymentStatus.failed}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;