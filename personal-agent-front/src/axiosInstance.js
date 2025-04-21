// ------------------------------------------------------------------
// Module:    axiosInstance.js
// Author:    John Gibson
// Created:   2025‑04‑21
// Purpose:   Configures a shared Axios instance with JWT auth and
//            manages a global loading indicator based on active
//            API requests.
// ------------------------------------------------------------------

/**
 * @module axiosInstance
 * @description
 *   - Initializes Axios with a base URL from environment variables.
 *   - Attaches JWT Bearer token to requests when present.
 *   - Shows and hides a global loader based on active request count.
 */

// ─────────────── Dependencies ───────────────
import axios from "axios";

// ─────────────── Configuration ───────────────
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─────────────── Axios Instance Setup ───────────────
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// ─────────────── Global Loader Utilities ───────────────

/**
 * Number of currently active API requests.
 * @type {number}
 */
let activeRequests = 0;

/**
 * Show the global loading indicator.
 *
 * @remarks
 * Replace this stub with your app’s loader activation logic
 * (e.g., updating React context or state).
 * @returns {void}
 */
function showGlobalLoader() {
  // TODO: Implement loader activation (e.g., set loading state in context).
}

/**
 * Hide the global loading indicator.
 *
 * @remarks
 * Replace this stub with your app’s loader deactivation logic
 * (e.g., updating React context or state).
 * @returns {void}
 */
function hideGlobalLoader() {
  // TODO: Implement loader deactivation.
}

// ─────────────── Request Interceptor ───────────────

/**
 * Attaches JWT and triggers the global loader on request start.
 *
 * @param {import("axios").AxiosRequestConfig} config
 *   The outgoing request configuration.
 * @returns {import("axios").AxiosRequestConfig}
 *   The modified request configuration.
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // If a token exists, include it in the Authorization header.
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Increment activeRequests and show loader on first request.
    activeRequests++;
    if (activeRequests === 1) {
      showGlobalLoader();
    }

    return config;
  },
  (error) => {
    // Propagate request errors without altering loader count.
    return Promise.reject(error);
  }
);

// ─────────────── Response Interceptor ───────────────

/**
 * Hides the global loader when all requests complete.
 *
 * @param {import("axios").AxiosResponse} response
 *   The successful response object.
 * @returns {import("axios").AxiosResponse}
 *   The unmodified response object.
 */
axiosInstance.interceptors.response.use(
  (response) => {
    // Decrement and hide loader when no active requests remain.
    activeRequests--;
    if (activeRequests === 0) {
      hideGlobalLoader();
    }
    return response;
  },
  (error) => {
    // Ensure loader hides even on errors.
    activeRequests--;
    if (activeRequests === 0) {
      hideGlobalLoader();
    }
    return Promise.reject(error);
  }
);

// ─────────────── Public API ───────────────

export default axiosInstance;
