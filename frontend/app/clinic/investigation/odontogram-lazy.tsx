"use client";

/**
 * Isolates the heavy odontogram package + its CSS so the investigation list
 * view does not pay the cost (or inherit global CSS) until a chart is opened.
 */
import "./odontogram.css";

export {
  OdontogramShell,
  getStatusChart,
  importStatus,
} from "react-advanced-odontogram";
