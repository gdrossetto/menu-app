import { lazy, Suspense, useEffect, useState } from "react";
import type { ReactElement } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { supabase } from "./lib/supabase";
import type { Session } from "@supabase/supabase-js";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const EditMenu = lazy(() => import("./pages/EditMenu"));
const PublicMenu = lazy(() => import("./pages/PublicMenu"));
const Login = lazy(() => import("./pages/Login"));
const Settings = lazy(() => import("./pages/Settings"));
const PrintMenu = lazy(() => import("./pages/PrintMenu"));
const LandingPage = lazy(() => import("./pages/LandingPage"));

function RouteFallback() {
  return (
    <div className="app-screen-center">
      <div className="app-spinner" />
    </div>
  );
}

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
      <div className="app-screen-center">
        <div className="app-spinner" />
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
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    </Router>
  );
}

export default App;
