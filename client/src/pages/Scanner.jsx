import { Navigate } from "react-router-dom";
import { useRutas } from "../lib/panel.jsx";

export default function Scanner() {
  const { inicio } = useRutas();
  return <Navigate to={inicio} replace />;
}