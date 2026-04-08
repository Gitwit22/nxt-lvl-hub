import { createRoot } from "react-dom/client";
import { validateProgramDomain } from "./config/runtimeCheck";
import App from "./App.tsx";
import "./index.css";

validateProgramDomain();

createRoot(document.getElementById("root")!).render(<App />);
