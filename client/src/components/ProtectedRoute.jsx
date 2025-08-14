// client/src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute({ children }) {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to="/"
        replace
        state={{ next: location.pathname + location.search }}
      />
    );
    // Or to a dedicated login route if you have one:
    // <Navigate to="/login" replace state={{ next: ... }} />
  }

  // Support both usages:
  //  - parent route usage -> render <Outlet />
  //  - wrapper usage      -> render {children}
  return children ?? <Outlet />;
}
