import React, { useState, useEffect } from "react";
// SỬA LỖI: Chỉ cần import API (object đã đóng gói)
import API from "../api";
// SỬA: Thêm FaTruck
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaSearch, FaTruck } from "react-icons/fa";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ id: "", user_id: "", product_ids: [], total: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ id: "", user_id: "", product_ids: [], total: 0 });
  const [searchTerm, setSearchTerm] = useState("");

  // === API CALLS (Đã sửa để dùng API Gateway) ===
  
  const fetchOrders = async (search = "") => {
    try {
      const res = await API.getOrders(search); // Dùng API.getOrders
      // Sắp xếp lại: Đơn 'Pending' lên đầu
      const sortedOrders = res.data.sort((a, b) => {
        if (a.status === 'Pending' && b.status !== 'Pending') return -1;
        if (a.status !== 'Pending' && b.status === 'Pending') return 1;
        return b.id - a.id; // Sắp xếp theo ID mới nhất
      });
      setOrders(sortedOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.getUsers(); // Dùng API.getUsers
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await API.getProducts(); // Dùng API.getProducts
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    const loadAllData = async () => {
      await fetchOrders(searchTerm);
      await fetchUsers();
      await fetchProducts();
    };
    loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); 

  const handleSearch = () => {
    fetchOrders(searchTerm);
  };

  const calculateTotal = (productIds) => {
    return productIds.reduce((sum, pid) => {
      const product = products.find(p => p.id === parseInt(pid));
      return sum + (product ? product.price : 0);
    }, 0);
  };

  const handleProductToggle = (productId, isEdit = false) => {
    if (isEdit) {
      const newProductIds = editForm.product_ids.includes(productId)
        ? editForm.product_ids.filter(id => id !== productId)
        : [...editForm.product_ids, productId];
      setEditForm({ 
        ...editForm, 
        product_ids: newProductIds,
        total: calculateTotal(newProductIds)
      });
    } else {
      const newProductIds = form.product_ids.includes(productId)
        ? form.product_ids.filter(id => id !== productId)
        : [...form.product_ids, productId];
      setForm({ 
        ...form, 
        product_ids: newProductIds,
        total: calculateTotal(newProductIds)
      });
    }
  };

  // SỬA LỖI: Dùng API.createOrder
  const createOrder = async () => {
    if (!form.user_id) return alert("Please select a user!");
    if (form.product_ids.length === 0) return alert("Please select at least one product!");

    try {
      const payload = {
        user_id: parseInt(form.user_id),
        product_ids: form.product_ids.map(id => parseInt(id))
      };

      if (form.id && form.id.trim() !== "") {
        const id = parseInt(form.id);
        if (id <= 0) return alert("ID must be positive!");
        payload.id = id;
      }

      await API.createOrder(payload); 
      setForm({ id: "", user_id: "", product_ids: [], total: 0 });
      fetchOrders(searchTerm);
    } catch (err) {
      if (err.response?.status === 409) {
        alert("ID already exists! Please choose another ID.");
      } else {
        alert("Error creating order: " + (err.response?.data?.error || err.message));
      }
    }
  };

  const startEdit = (order) => {
    // Sửa: Đảm bảo product_ids là một mảng ngay cả khi nó rỗng
    const productIds = (order.product_ids || "").split(',')
      .filter(id => id) // Lọc bỏ chuỗi rỗng
      .map(id => parseInt(id));
    
    setEditingId(order.id);
    setEditForm({ 
      id: order.id, 
      user_id: order.user_id, 
      product_ids: productIds,
      total: order.total 
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ id: "", user_id: "", product_ids: [], total: 0 });
  };

  // SỬA LỖI: Dùng API.updateOrder
  const saveEdit = async () => {
    if (!editForm.user_id) return alert("Please select a user!");
    if (editForm.product_ids.length === 0) return alert("Please select at least one product!");
    if (!editForm.id) return alert("ID is required!");

    if (parseInt(editForm.id) <= 0) return alert("ID must be positive!");

    try {
      const payload = {
        id: parseInt(editForm.id),
        user_id: parseInt(editForm.user_id),
        product_ids: editForm.product_ids.map(id => parseInt(id))
      };
      await API.updateOrder(editingId, payload); 
      
      cancelEdit();
      fetchOrders(searchTerm);
    } catch (err) {
      if (err.response?.status === 409) {
        alert("ID already exists! Please choose another ID.");
      } else {
        alert("Error updating order: " + (err.response?.data?.error || err.message));
      }
    }
  };

  // SỬA LỖI: Dùng API.deleteOrder
  const deleteOrder = async (id) => {
    if (window.confirm("Delete this order?")) {
      try {
        await API.deleteOrder(id); 
        fetchOrders(searchTerm);
      } catch (err) {
        alert("Error deleting order: " + err.message);
      }
    }
  };

  const getProductNames = (productIdsStr) => {
    if (!productIdsStr) return "N/A";
    const ids = productIdsStr.split(',');
    const names = ids.map(id => {
      const product = products.find(p => p.id === parseInt(id));
      return product ? product.name : `ID:${id}`;
    });
    return names.join(', ');
  };

  // === LOGIC ĐIỀU PHỐI DRONE ===
  const handleDispatchDrone = async (orderId) => {
    try {
      // Bước 1: Báo cho BE biết là "Bắt đầu giao"
      await API.updateOrder(orderId, { status: "Delivering" });
      fetchOrders(searchTerm); // Cập nhật UI ngay lập tức

      console.log(`Drone bắt đầu giao đơn #${orderId}... (Mô phỏng 10 giây)`);

      // Bước 2: Mô phỏng thời gian Drone bay (10 giây)
      setTimeout(async () => {
        // Bước 3: Sau 10s, báo cho BE là "Đã giao xong"
        await API.updateOrder(orderId, { status: "Completed" });
        console.log(`Đơn #${orderId} đã giao hàng thành công!`);
        fetchOrders(searchTerm); // Cập nhật UI lần nữa
      }, 10000); // 10.000ms = 10 giây

    } catch (err) {
      console.error("Lỗi điều phối drone:", err);
    }
  };

  // === THÊM LOGIC MỚI: Render cột Actions (Trạng thái Drone) ===
  const renderActions = (order) => {
    // Nếu đang edit, chỉ hiển thị Save/Cancel
    if (editingId === order.id) {
      return (
        <td className="flex justify-center gap-2 py-2">
          <button onClick={saveEdit} className="text-green-500 hover:text-green-700 text-lg" title="Save">
            <FaSave />
          </button>
          <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700 text-lg" title="Cancel">
            <FaTimes />
          </button>
        </td>
      );
    }

    // Logic mới cho Drone dựa trên trạng thái
    switch (order.status) {
      case "Pending":
        return (
          <td className="py-2 px-2">
            <button
              onClick={() => handleDispatchDrone(order.id)}
              className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 text-xs flex items-center gap-1"
              title="Điều Drone"
            >
              <FaTruck /> Giao hàng
            </button>
          </td>
        );
      case "Delivering":
        return (
          <td className="py-2 px-2 text-yellow-600 font-semibold italic text-xs">
            Drone đang bay...
          </td>
        );
      case "Completed":
        return (
          <td className="py-2 px-2 text-gray-500 text-xs">
            Đã hoàn thành
          </td>
        );
      default: // Fallback bao gồm cả các nút Edit/Delete (có thể giữ lại)
        return (
          <td className="flex justify-center gap-3 py-2">
            <button onClick={() => startEdit(order)} className="text-blue-500 hover:text-blue-700" title="Edit">
              <FaEdit />
            </button>
            <button onClick={() => deleteOrder(order.id)} className="text-red-500 hover:text-red-700" title="Delete">
              <FaTrash />
            </button>
          </td>
        );
    }
  };
  
  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-4 sm:p-6 pt-20">
      <h2 className="text-2xl sm:text-3xl font-bold text-pink-600 mb-6 text-center">
        🍓 TRẠM ĐIỀU HÀNH DRONE
      </h2>

      {/* Search Bar */}
      <div className="bg-white shadow-lg rounded-2xl p-4 w-full max-w-4xl mb-4 border border-pink-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by Order ID or User ID..."
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
      <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-6 w-full max-w-2xl border border-pink-200">
        <h3 className="text-lg font-semibold text-pink-700 mb-4 flex items-center gap-2">
          <FaPlus /> Create New Order
        </h3>
        
        <input
          type="number"
          placeholder="Order ID (leave blank for auto-generate)"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />

        <select
          value={form.user_id}
          onChange={(e) => setForm({ ...form, user_id: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        >
          <option value="">Select User *</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.name} (ID: {u.id})
            </option>
          ))}
        </select>

        <div className="mb-3 p-3 border border-pink-300 rounded-lg bg-pink-50">
          <p className="text-sm font-semibold text-pink-700 mb-2">Select Products *</p>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {products.map(p => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer hover:bg-pink-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={form.product_ids.includes(p.id)}
                  onChange={() => handleProductToggle(p.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{p.name} - ${p.price.toFixed(2)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-3 p-3 bg-green-50 border border-green-300 rounded-lg">
          <p className="text-sm font-semibold text-green-700">
            Total: ${form.total.toFixed(2)}
          </p>
        </div>

        <button
          onClick={createOrder}
          className="w-full bg-pink-500 text-white font-semibold py-2 rounded-xl hover:bg-pink-600 transition-all duration-200 shadow-md"
        >
          Create Order
        </button>
      </div>

      {/* Table */}
      <div className="mt-6 sm:mt-8 w-full max-w-5xl bg-white rounded-2xl shadow-lg border border-pink-200 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-center">
          <thead className="bg-pink-100 text-pink-700">
            <tr>
              <th className="py-2 px-2">Order ID</th>
              <th className="py-2 px-2">User</th>
              <th className="py-2 px-2">Products</th>
              <th className="py-2 px-2">Total</th>
              <th className="py-2 px-2">Drone Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-pink-100 hover:bg-pink-50 transition-all"
                >
                  {editingId === o.id ? (
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
                          value={editForm.user_id}
                          onChange={(e) => setEditForm({ ...editForm, user_id: e.target.value })}
                          className="w-full px-2 py-1 border border-pink-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                        >
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2">
                        <div className="max-h-32 overflow-y-auto text-left">
                          {products.map(p => (
                            <label key={p.id} className="flex items-center gap-1 text-xs">
                              <input
                                type="checkbox"
                                checked={editForm.product_ids.includes(p.id)}
                                onChange={() => handleProductToggle(p.id, true)}
                                className="w-3 h-3"
                              />
                              <span>{p.name}</span>
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 font-semibold text-green-600">
                        ${editForm.total.toFixed(2)}
                      </td>
                      {renderActions(o)}
                    </>
                  ) : (
                    <>
                      <td className="py-2">{o.id}</td>
                      <td>{o.user_name || `ID: ${o.user_id}`}</td>
                      <td className="text-xs max-w-xs truncate">{getProductNames(o.product_ids)}</td>
                      <td className="font-semibold text-green-600">${o.total.toFixed(2)}</td>
                      {renderActions(o)}
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-4 text-gray-400 italic">
                  No orders found 🍰
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;