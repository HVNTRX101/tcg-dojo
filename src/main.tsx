import { createRoot } from "react-dom/client";
import App from "./router.tsx";
import "./index.css";
import { setupGlobalErrorHandlers } from "./utils/errorLogging";

// Initialize global error handlers
setupGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
  