import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EditMenu from "./pages/EditMenu";
import PublicMenu from "./pages/PublicMenu";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import PrintMenu from "./pages/PrintMenu";
import LandingPage from "./pages/LandingPage";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";

function RequireAuth({ children }: { children: ReactElement }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "var(--color-bg)",
        }}
      >
        <div
          className="spinner"
          style={{
            width: "30px",
            height: "30px",
            border: "2px solid var(--color-border)",
            borderTopColor: "var(--color-primary)",
            borderRadius: "50%",
          }}
        ></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/menu"
          element={
            <RequireAuth>
              <EditMenu />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />

        {/* Public Routes */}
        <Route path="/m/:restaurantId" element={<PublicMenu />} />
        <Route path="/m/:restaurantId/print" element={<PrintMenu />} />
      </Routes>
    </Router>
  );
}

export default App;
