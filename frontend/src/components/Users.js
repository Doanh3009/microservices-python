import React, { useState, useEffect } from "react";
// ✅ SỬA: Import API thay vì axios
import API from "../api";
import { FaEdit, FaTrash, FaUserPlus, FaSave, FaTimes, FaSearch } from "react-icons/fa";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ id: "", name: "", email: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ id: "", name: "", email: "" });
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ SỬA: Dùng API.getUsers
  const fetchUsers = async (search = "") => {
    try {
      const res = await API.getUsers(search);
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = () => {
    fetchUsers(searchTerm);
  };

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  // ✅ SỬA: Dùng API.createUser
  const createUser = async () => {
    if (!form.name || !form.email) return alert("Please enter name and email!");
    
    if (!validateEmail(form.email)) {
      return alert("Invalid email format! Email must contain @ and domain (e.g., user@gmail.com)");
    }

    try {
      const payload = {
        name: form.name,
        email: form.email
      };
      
      if (form.id && form.id.trim() !== "") {
        const id = parseInt(form.id);
        if (id <= 0) return alert("ID must be positive!");
        payload.id = id;
      }
      
      await API.createUser(payload);
      setForm({ id: "", name: "", email: "" });
      fetchUsers(searchTerm);
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response?.data?.error || "ID or Email already exists!");
      } else {
        alert("Error creating user: " + (err.response?.data?.error || err.message));
      }
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditForm({ id: user.id, name: user.name, email: user.email });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ id: "", name: "", email: "" });
  };

  // ✅ SỬA: Dùng API.updateUser
  const saveEdit = async () => {
    if (!editForm.name || !editForm.email || !editForm.id) {
      return alert("Please fill all fields!");
    }

    if (!validateEmail(editForm.email)) {
      return alert("Invalid email format! Email must contain @ and domain (e.g., user@gmail.com)");
    }

    if (parseInt(editForm.id) <= 0) {
      return alert("ID must be positive!");
    }

    try {
      await API.updateUser(editingId, {
        id: parseInt(editForm.id),
        name: editForm.name,
        email: editForm.email,
      });
      cancelEdit();
      fetchUsers(searchTerm);
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response?.data?.error || "ID or Email already exists!");
      } else {
        alert("Error updating user: " + (err.response?.data?.error || err.message));
      }
    }
  };

  // ✅ SỬA: Dùng API.deleteUser
  const deleteUser = async (id) => {
    if (window.confirm("Are you sure to delete this user?")) {
      try {
        await API.deleteUser(id);
        fetchUsers(searchTerm);
      } catch (err) {
        alert("Error deleting user: " + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-4 sm:p-6 pt-20">
      <h2 className="text-2xl sm:text-3xl font-bold text-pink-600 mb-6 text-center">
        👥 USERS
      </h2>

      {/* Search Bar */}
      <div className="bg-white shadow-lg rounded-2xl p-4 w-full max-w-3xl mb-4 border border-pink-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search users by name or email..."
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
          <FaUserPlus /> Add New User
        </h3>
        <input
          type="number"
          placeholder="ID (leave blank for auto-generate)"
          value={form.id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <input
          type="text"
          placeholder="Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <input
          type="email"
          placeholder="Email * (e.g., user@gmail.com)"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <button
          onClick={createUser}
          className="w-full bg-pink-500 text-white font-semibold py-2 rounded-xl hover:bg-pink-600 transition-all duration-200 text-sm sm:text-base shadow-md"
        >
          Add User
        </button>
      </div>

      {/* List */}
      <div className="mt-6 sm:mt-8 w-full max-w-3xl bg-white rounded-2xl shadow-lg border border-pink-200 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-center">
          <thead className="bg-pink-100 text-pink-700">
            <tr>
              <th className="py-2 sm:py-3 px-2">ID</th>
              <th className="py-2 sm:py-3 px-2">Name</th>
              <th className="py-2 sm:py-3 px-2">Email</th>
              <th className="py-2 sm:py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-pink-100 hover:bg-pink-50 transition-all"
                >
                  {editingId === u.id ? (
                    // Edit mode
                    <>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={editForm.id}
                          onChange={(e) =>
                            setEditForm({ ...editForm, id: e.target.value })
                          }
                          className="w-16 px-2 py-1 border border-pink-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-pink-400"
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-pink-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-400"
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-pink-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-400"
                        />
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
                    // View mode
                    <>
                      <td className="py-2">{u.id}</td>
                      <td>{u.name}</td>
                      <td className="truncate max-w-[150px]">{u.email}</td>
                      <td className="flex justify-center gap-3 py-2">
                        <button
                          onClick={() => startEdit(u)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteUser(u.id)}
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
                <td colSpan="4" className="py-4 text-gray-400 italic">
                  No users found 🧑‍💤
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;