import { useState, useEffect } from "react";
export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      return JSON.parse(savedMode);
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
    if (window.electron) {
      window.electron.ipcRenderer.send("dark-mode-changed", isDarkMode);
    }
  }, [isDarkMode]);
  useEffect(() => {
    const handleDarkModeUpdate = (_event: any, newDarkMode: boolean) => {
      setIsDarkMode(newDarkMode);
    };
    if (window.electron) {
      window.electron.ipcRenderer.on("dark-mode-updated", handleDarkModeUpdate);
    }
    return () => {
      if (window.electron) {
        window.electron.ipcRenderer.removeListener(
          "dark-mode-updated",
          handleDarkModeUpdate
        );
      }
    };
  }, []);
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };
  return { isDarkMode, toggleDarkMode };
};
