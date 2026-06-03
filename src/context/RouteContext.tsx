import React, { createContext, useContext, useState, useEffect } from "react";
import { AppRoute } from "../lib/types";

interface RouteContextType {
  route: AppRoute;
  navigate: (to: AppRoute) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<AppRoute>("/");

  // Listen to hash or history state for standard browser navigation syncing
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.replace("#", "") as AppRoute;
      if (hash && hash.startsWith("/")) {
        setRoute(hash);
      } else {
        setRoute("/");
      }
    };

    window.addEventListener("hashchange", handleLocationChange);
    handleLocationChange(); // Initial check

    return () => {
      window.removeEventListener("hashchange", handleLocationChange);
    };
  }, []);

  const navigate = (to: AppRoute) => {
    window.location.hash = `#${to}`;
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
