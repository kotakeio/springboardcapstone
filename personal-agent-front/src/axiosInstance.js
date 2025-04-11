// axiosInstance.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Create an Axios instance with the base URL.
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// This variable tracks the number of active API requests.
let activeRequests = 0;

// Functions to show or hide the global loading indicator.
// Replace these with your actual implementation (e.g., updating React context).
function showGlobalLoader() {
  console.log("Global loader shown");
  // You can add code here to update a global state or trigger a UI update.
}

function hideGlobalLoader() {
  console.log("Global loader hidden");
  // You can add code here to update a global state or trigger a UI update.
}

// Add a request interceptor that includes both the JWT token and global loader logic.
axiosInstance.interceptors.request.use(
  (config) => {
    // Retrieve the token from localStorage.
    const token = localStorage.getItem("token");
    if (token) {
      // Set the Authorization header using the Bearer scheme.
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Increase the count of active requests.
    activeRequests++;
    if (activeRequests === 1) {
      showGlobalLoader();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for managing the global loader.
axiosInstance.interceptors.response.use(
  (response) => {
    activeRequests--;
    if (activeRequests === 0) {
      hideGlobalLoader();
    }
    return response;
  },
  (error) => {
    activeRequests--;
    if (activeRequests === 0) {
      hideGlobalLoader();
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
