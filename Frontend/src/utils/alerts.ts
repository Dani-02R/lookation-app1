// src/utils/alerts.ts
import { showMessage } from "react-native-flash-message";

const colors = {
  success: "#34C759", // verde Apple style
  danger: "#FF3B30",  // rojo
  warning: "#FF9500", // naranja
  info: "#007AFF",    // azul (solo si quieres conservar info)
};

export const toast = {
  success: (message: string, description?: string) =>
    showMessage({
      message,
      description,
      type: "success",
      backgroundColor: colors.success,
      color: "#fff",
      icon: "success",
      duration: 2500,
    }),
  error: (message: string, description?: string) =>
    showMessage({
      message,
      description,
      type: "danger",
      backgroundColor: colors.danger,
      color: "#fff",
      icon: "danger",
      duration: 3000,
    }),
  warn: (message: string, description?: string) =>
    showMessage({
      message,
      description,
      type: "warning",
      backgroundColor: colors.warning,
      color: "#fff",
      icon: "warning",
      duration: 3000,
    }),
  info: (message: string, description?: string) =>
    showMessage({
      message,
      description,
      type: "info",
      backgroundColor: colors.info,
      color: "#fff",
      icon: "info",
      duration: 2500,
    }),
};

