import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Add global error handler to catch JSON parsing errors
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  if (event.reason?.message?.includes('JSON')) {
    console.error('JSON parsing error detected. Check API responses.');
  }
});

createRoot(document.getElementById("root")!).render(<App />);