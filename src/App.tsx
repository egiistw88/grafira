import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./app/Layout";
import { ProjectProvider } from "./lib/ProjectContext";

const Dashboard = lazy(() => import("./app/Dashboard"));
const Inkubasi = lazy(() => import("./app/Inkubasi"));
const Visualisasi = lazy(() => import("./app/Visualisasi"));
const Studio = lazy(() => import("./app/Studio"));
const PraCetak = lazy(() => import("./app/PraCetak"));

export default function App() {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inkubasi" element={<Inkubasi />} />
            <Route path="visualisasi" element={<Visualisasi />} />
            <Route path="studio" element={<Studio />} />
            <Route path="pra-cetak" element={<PraCetak />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  );
}
