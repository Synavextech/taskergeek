import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Footer from "./components/Footer";
import "./index.css";

// Browser compatibility polyfills
if (typeof window !== 'undefined') {
  // Polyfill for IntersectionObserver (Safari < 12.1)
  if (!('IntersectionObserver' in window)) {
    // Simple fallback for browsers without IntersectionObserver
    (window as any).IntersectionObserver = class IntersectionObserver {
      constructor() { }
      observe() { }
      unobserve() { }
      disconnect() { }
    };
  }

  // Polyfill for WebP support detection
  if (!window.HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function (callback: BlobCallback, type?: string, quality?: any) {
        const binStr = atob((this as any).toDataURL(type, quality).split(',')[1]);
        const len = binStr.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i);
        }
        callback(new Blob([arr], { type: type || 'image/png' }));
      }
    });
  }

  // Viewport height fix for mobile browsers
  const setVH = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
  setVH();
}

// Register Service Worker for PWA installation & offline performance
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service worker registration failed:', err);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <App />
      </div>

    </div>
  </React.StrictMode>
);
