
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Enhanced global error handler
window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  
  // Check if it's a JSON parsing error
  if (event.reason?.message?.includes('JSON') || 
      event.reason?.message?.includes('object Object')) {
    console.error('JSON Parsing Error Details:', {
      error: event.reason,
      stack: event.reason?.stack,
      message: event.reason?.message
    });
    
    // Prevent the error from propagating if it's just a JSON parsing issue
    event.preventDefault();
  }
});

// Override console.error to catch more details
const originalConsoleError = console.error;
console.error = function(...args) {
  // Check if any argument contains JSON parsing error
  const hasJSONError = args.some(arg => 
    typeof arg === 'string' && 
    (arg.includes('[object Object]') || arg.includes('JSON.parse'))
  );
  
  if (hasJSONError) {
    originalConsoleError('JSON Error intercepted:', ...args);
    // Don't let these errors crash the app
    return;
  }
  
  originalConsoleError(...args);
};

createRoot(document.getElementById("root")!).render(<App />);
