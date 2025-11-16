// src/api.js
import axios from "axios";

// Base URL của API Gateway
const API_GATEWAY_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 5000,
});

// Hàm xử lý lỗi chung
const handleError = (error) => {
  if (error.response) {
    console.error("API Response Error:", error.response.status, error.response.data);
  } else if (error.request) {
    console.error("No response from server:", error.request);
  } else {
    console.error("API Error:", error.message);
  }
  throw error;
};

const API = {
  // === Users ===
  getUsers: async (search = "") => {
    try {
      const res = await api.get("/users/", { params: { search } });
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  createUser: async (data) => {
    try {
      const res = await api.post("/users/", data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  updateUser: async (id, data) => {
    try {
      const res = await api.put(`/users/${id}/`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  deleteUser: async (id) => {
    try {
      const res = await api.delete(`/users/${id}/`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  // === Products ===
  getProducts: async (search = "") => {
    try {
      const res = await api.get("/products/", { params: { search } });
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  createProduct: async (data) => {
    try {
      const res = await api.post("/products/", data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  updateProduct: async (id, data) => {
    try {
      const res = await api.put(`/products/${id}/`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  deleteProduct: async (id) => {
    try {
      const res = await api.delete(`/products/${id}/`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  // === Orders ===
  getOrders: async (search = "") => {
    try {
      const res = await api.get("/orders/", { params: { search } });
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  createOrder: async (data) => {
    try {
      const res = await api.post("/orders/", data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  updateOrder: async (id, data) => {
    try {
      const res = await api.put(`/orders/${id}/`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  deleteOrder: async (id) => {
    try {
      const res = await api.delete(`/orders/${id}/`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },

  // === Payments ===
  getPayments: async (search = "") => {
    try {
      const res = await api.get("/payments/", { params: { search } });
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  createPayment: async (data) => {
    try {
      const res = await api.post("/payments/", data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  updatePayment: async (id, data) => {
    try {
      const res = await api.put(`/payments/${id}/`, data);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
  deletePayment: async (id) => {
    try {
      const res = await api.delete(`/payments/${id}/`);
      return res.data;
    } catch (err) {
      handleError(err);
    }
  },
};

export { api };
export default API;
