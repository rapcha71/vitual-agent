import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Optimización para reducir tiempo de splash screen
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// Renderizado inmediato para reducir splash screen
root.render(<App />);
