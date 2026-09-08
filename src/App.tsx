import React from "react";
import { StoreProvider, useStore } from "./lib/data";
import { ToastProvider } from "./components/ui";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Teachers from "./pages/Teachers";
import RecapDaily from "./pages/RecapDaily";
import RecapMonthly from "./pages/RecapMonthly";
import OperatorPage from "./pages/OperatorPage";
import AdminPage from "./pages/AdminPage";
import Settings from "./pages/Settings";
import AktivitasPage from "./pages/AktivitasPage";

function Shell() {
  const { currentUser, page } = useStore();

  if (!currentUser) return <Login />;

  return (
    <Layout>
      <div key={page} className="anim-fade-up">
        {page === "dashboard" && <Dashboard />}
        {page === "teachers" && <Teachers />}
        {page === "recap-daily" && <RecapDaily />}
        {page === "recap-monthly" && <RecapMonthly />}
        {page === "operator" && <OperatorPage />}
        {page === "admin" && <AdminPage />}
        {page === "settings" && <Settings />}
        {page === "aktivitas" && <AktivitasPage />}
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}
