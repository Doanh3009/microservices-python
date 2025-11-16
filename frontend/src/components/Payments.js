import React, { useState, useEffect } from "react";
// ✅ SỬA: Import API thay vì axios trực tiếp
import API from "../api";
import { FaCreditCard, FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaSearch } from "react-icons/fa";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({
    id: "",
    order_id: "",
    amount: 0,
    method: "",
    status: "Pending",
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    id: "",
    order_id: "",
    amount: 0,
    method: "",
    status: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const paymentMethods = ["Cash", "ATM Card", "Bank Transfer", "E-Wallet"];
  const paymentStatuses = ["Pending", "Paid", "Failed", "Refunded"];

  // ✅ SỬA: Dùng API.getPayments
  const fetchPayments = async (search = "") => {
    try {
      const res = await API.getPayments(search);
      setPayments(res.data);
    } catch (err) {
      console.error("Error fetching payments:", err);
    }
  };

  // ✅ SỬA: Dùng API.getOrders
  const fetchOrders = async () => {
    try {
      const res = await API.getOrders();
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchOrders();
  }, []);

  const handleSearch = () => {
    fetchPayments(searchTerm);
  };

  const handleOrderSelect = (orderId, isEdit = false) => {
    const order = orders.find(o => o.id === parseInt(orderId));
    if (order) {
      if (isEdit) {
        setEditForm({ ...editForm, order_id: orderId, amount: order.total });
      } else {
        setForm({ ...form, order_id: orderId, amount: order.total });
      }
    }
  };

  // ✅ SỬA: Dùng API.createPayment
  const createPayment = async () => {
    if (!form.order_id) return alert("Please select an order!");
    if (!form.method) return alert("Please select a payment method!");
    if (!form.status) return alert("Please select a status!");

    try {
      const payload = {
        order_id: parseInt(form.order_id),
        method: form.method,
        status: form.status
      };

      if (form.id && form.id.trim() !== "") {
        const id = parseInt(form.id);
        if (id <= 0) return alert("ID must be positive!");
        payload.id = id;
      }

      await API.createPayment(payload);
      setForm({ id: "", order_id: "", amount: 0, method: "", status: "Pending" });
      fetchPayments(searchTerm);
    } catch (err) {
      if (err.response?.status === 409) {
        alert("ID already exists! Please choose another ID.");
      } else {
        alert("Error creating payment: " + (err.response?.data?.error || err.message));
      }
    }
  };

  const startEdit = (payment) => {
    setEditingId(payment.id);
    setEditForm({
      id: payment.id,
      order_id: payment.order_id,
      amount: payment.amount,
      method: payment.method,
      status: payment.status
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ id: "", order_id: "", amount: 0, method: "", status: "" });
  };

  // ✅ SỬA: Dùng API.updatePayment
  const saveEdit = async () => {
    if (!editForm.order_id) return alert("Please select an order!");
    if (!editForm.method) return alert("Please select a payment method!");
    if (!editForm.status) return alert("Please select a status!");
    if (!editForm.id) return alert("ID is required!");

    if (parseInt(editForm.id) <= 0) return alert("ID must be positive!");

    try {
      await API.updatePayment(editingId, {
        id: parseInt(editForm.id),
        order_id: parseInt(editForm.order_id),
        amount: parseFloat(editForm.amount),
        method: editForm.method,
        status: editForm.status
      });
      cancelEdit();
      fetchPayments(searchTerm);
    } catch (err) {
      if (err.response?.status === 409) {
        alert("ID already exists! Please choose another ID.");
      } else {
        alert("Error updating payment: " + (err.response?.data?.error || err.message));
      }
    }
  };

  // ✅ SỬA: Dùng API.deletePayment
  const deletePayment = async (id) => {
    if (window.confirm("Delete this payment?")) {
      try {
        await API.deletePayment(id);
        fetchPayments(searchTerm);
      } catch (err) {
        alert("Error deleting payment: " + err.message);
      }
    }
  };

  const getOrderInfo = (orderId) => {
    const order = orders.find(o => o.id === orderId);
    return order ? `Order #${order.id} - ${order.user_name || 'User ' + order.user_id}` : `Order #${orderId}`;
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-4 sm:p-6 pt-20">
      <h2 className="text-2xl sm:text-3xl font-bold text-pink-600 mb-6 text-center">
        💳 PAYMENTS
      </h2>

      {/* Search Bar */}
      <div className="bg-white shadow-lg rounded-2xl p-4 w-full max-w-4xl mb-4 border border-pink-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by ID, Order ID, Method, or Status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          />
          <button
            onClick={handleSearch}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-all flex items-center gap-2"
          >
            <FaSearch /> Search
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-6 w-full max-w-md border border-pink-200">
        <h3 className="text-lg font-semibold text-pink-700 mb-4 flex items-center gap-2">
          <FaPlus /> Create Payment
        </h3>
        
        <input
          type="number"
          placeholder="Payment ID (leave blank for auto-generate)"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />

        <select
          value={form.order_id}
          onChange={(e) => handleOrderSelect(e.target.value)}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        >
          <option value="">Select Order *</option>
          {orders.map(o => (
            <option key={o.id} value={o.id}>
              Order #{o.id} - {o.user_name || `User ${o.user_id}`} - ${o.total.toFixed(2)}
            </option>
          ))}
        </select>

        <div className="w-full mb-3 px-3 py-2 border border-green-300 rounded-lg text-sm bg-green-50">
          <span className="font-semibold text-green-700">Amount: ${form.amount.toFixed(2)}</span>
        </div>

        <select
          value={form.method}
          onChange={(e) => setForm({ ...form, method: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        >
          <option value="">Select Payment Method *</option>
          {paymentMethods.map(method => (
            <option key={method} value={method}>{method}</option>
          ))}
        </select>

        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        >
          <option value="">Select Status *</option>
          {paymentStatuses.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <button
          onClick={createPayment}
          className="w-full bg-pink-500 text-white font-semibold py-2 rounded-xl hover:bg-pink-600 transition-all duration-200 text-sm sm:text-base shadow-md"
        >
          Create Payment
        </button>
      </div>

      {/* Table */}
      <div className="mt-6 sm:mt-8 w-full max-w-5xl bg-white rounded-2xl shadow-lg border border-pink-200 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-center">
          <thead className="bg-pink-100 text-pink-700">
            <tr>
              <th className="py-2 px-2">ID</th>
              <th className="py-2 px-2">Order</th>
              <th className="py-2 px-2">Amount</th>
              <th className="py-2 px-2">Method</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
              payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-pink-100 hover:bg-pink-50 transition-all"
                >
                  {editingId === p.id ? (
                    <>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={editForm.id}
                          onChange={(e) => setEditForm({ ...editForm, id: e.target.value })}
                          className="w-16 px-2 py-1 border border-pink-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-pink-400"
                        />
                      </td>
                      <td className="px-2">
                        <select
                          value={editForm.order_id}
                          onChange={(e) => handleOrderSelect(e.target.value, true)}
                          className="w-full px-2 py-1 border border-pink-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                        >
                          {orders.map(o => (
                            <option key={o.id} value={o.id}>#{o.id}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 font-semibold text-green-600">
                        ${editForm.amount.toFixed(2)}
                      </td>
                      <td className="px-2">
                        <select
                          value={editForm.method}
                          onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}
                          className="w-full px-2 py-1 border border-pink-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                        >
                          {paymentMethods.map(method => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2">
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full px-2 py-1 border border-pink-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                        >
                          {paymentStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="flex justify-center gap-2 py-2">
                        <button
                          onClick={saveEdit}
                          className="text-green-500 hover:text-green-700 text-lg"
                          title="Save"
                        >
                          <FaSave />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-500 hover:text-gray-700 text-lg"
                          title="Cancel"
                        >
                          <FaTimes />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2">{p.id}</td>
                      <td className="text-xs">{getOrderInfo(p.order_id)}</td>
                      <td className="font-semibold text-green-600">${p.amount.toFixed(2)}</td>
                      <td>{p.method}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          p.status === 'Paid' ? 'bg-green-100 text-green-700' :
                          p.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                          p.status === 'Failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="flex justify-center gap-3 py-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deletePayment(p.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-4 text-gray-400 italic">
                  No payments found 💸
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Payments;