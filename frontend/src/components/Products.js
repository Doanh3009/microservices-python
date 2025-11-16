import React, { useState, useEffect } from "react";

import API from "../api";
import { FaBoxOpen, FaEdit, FaTrash, FaPlus, FaSave, FaTimes, FaSearch } from "react-icons/fa";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ id: "", name: "", price: "" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ id: "", name: "", price: "" });
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ SỬA: Dùng API.getProducts
  const fetchProducts = async (search = "") => {
    try {
      const res = await API.getProducts(search);
      setProducts(res.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = () => {
    fetchProducts(searchTerm);
  };

  // ✅ SỬA: Dùng API.createProduct
  const createProduct = async () => {
    if (!form.name || !form.price) return alert("Please enter name and price!");
    
    if (parseFloat(form.price) <= 0) {
      return alert("Price must be greater than 0!");
    }

    try {
      const payload = { name: form.name, price: parseFloat(form.price) };
      
      if (form.id && form.id.trim() !== "") {
        const id = parseInt(form.id);
        if (id <= 0) return alert("ID must be positive!");
        payload.id = id;
      }
      
      await API.createProduct(payload);
      setForm({ id: "", name: "", price: "" });
      fetchProducts(searchTerm);
    } catch (err) {
      if (err.response?.status === 409) {
        alert("ID already exists! Please choose another ID.");
      } else {
        alert("Error creating product: " + (err.response?.data?.error || err.message));
      }
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({ id: product.id, name: product.name, price: product.price });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ id: "", name: "", price: "" });
  };

  // ✅ SỬA: Dùng API.updateProduct
  const saveEdit = async () => {
    if (!editForm.name || !editForm.price || !editForm.id) {
      return alert("Please fill all fields!");
    }

    if (parseFloat(editForm.price) <= 0) {
      return alert("Price must be greater than 0!");
    }

    if (parseInt(editForm.id) <= 0) {
      return alert("ID must be positive!");
    }

    try {
      await API.updateProduct(editingId, {
        id: parseInt(editForm.id),
        name: editForm.name,
        price: parseFloat(editForm.price),
      });
      cancelEdit();
      fetchProducts(searchTerm);
    } catch (err) {
      if (err.response?.status === 409) {
        alert("ID already exists! Please choose another ID.");
      } else {
        alert("Error updating product: " + (err.response?.data?.error || err.message));
      }
    }
  };

  // ✅ SỬA: Dùng API.deleteProduct
  const deleteProduct = async (id) => {
    if (window.confirm("Delete this product?")) {
      try {
        await API.deleteProduct(id);
        fetchProducts(searchTerm);
      } catch (err) {
        alert("Error deleting product: " + err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center p-4 sm:p-6 pt-20">
      <h2 className="text-2xl sm:text-3xl font-bold text-pink-600 mb-6 text-center">
        🍰 PRODUCTS
      </h2>

      {/* Search Bar */}
      <div className="bg-white shadow-lg rounded-2xl p-4 w-full max-w-3xl mb-4 border border-pink-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search products by name..."
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
          <FaPlus /> Add New Product
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
          placeholder="Product Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Price *"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="w-full mb-3 px-3 py-2 border border-pink-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
        />
        <button
          onClick={createProduct}
          className="w-full bg-pink-500 text-white font-semibold py-2 rounded-xl hover:bg-pink-600 transition-all duration-200 text-sm sm:text-base shadow-md"
        >
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="mt-6 sm:mt-8 w-full max-w-3xl bg-white rounded-2xl shadow-lg border border-pink-200 overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-center">
          <thead className="bg-pink-100 text-pink-700">
            <tr>
              <th className="py-2 sm:py-3 px-2">ID</th>
              <th className="py-2 sm:py-3 px-2">Name</th>
              <th className="py-2 sm:py-3 px-2">Price</th>
              <th className="py-2 sm:py-3 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((p) => (
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
                          type="number"
                          step="0.01"
                          value={editForm.price}
                          onChange={(e) =>
                            setEditForm({ ...editForm, price: e.target.value })
                          }
                          className="w-20 px-2 py-1 border border-pink-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-400"
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
                    <>
                      <td className="py-2">{p.id}</td>
                      <td>{p.name}</td>
                      <td>${p.price.toFixed(2)}</td>
                      <td className="flex justify-center gap-3 py-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteProduct(p.id)}
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
                  No products found 🍩
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Products;