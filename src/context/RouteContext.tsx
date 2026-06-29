import React, { createContext, useContext, useState, useEffect } from "react";
import { AppRoute } from "../lib/types";

interface RouteContextType {
  route: string;
  navigate: (to: AppRoute | string) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<string>("/");

  // Listen to browser history state and keep legacy hash links working.
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && hash.startsWith("/")) {
        window.history.replaceState({}, "", hash);
        setRoute(`${window.location.pathname}${window.location.search}`);
        return;
      }

      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (currentPath && currentPath.startsWith("/")) {
        setRoute(currentPath);
      } else {
        setRoute("/");
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    window.addEventListener("hashchange", handleLocationChange);
    handleLocationChange(); // Initial check

    return () => {
      window.removeEventListener("popstate", handleLocationChange);
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const navigate = (to: AppRoute | string) => {
    window.history.pushState({}, "", to);
    setRoute(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <RouteContext.Provider value={{ route, navigate }}>
      {children}
    </RouteContext.Provider>
  );
};

export const useRoute = () => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRoute must be used within a RouteProvider");
  }
  return context;
};
