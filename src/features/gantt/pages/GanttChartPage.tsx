import { lazy, Suspense } from "react";

const GanttChart = lazy(() => import("../../../screens/GanttChart"));

const LoadingFallback = () => (
  <div
    style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--app-bg, #F4F5F7)",
      color: "var(--app-text, #5E6C84)",
      fontSize: 14,
      letterSpacing: "0.02em",
    }}
  >
    Loading...
  </div>
);

export const GanttChartPage = () => (
  <Suspense fallback={<LoadingFallback />}>
    <GanttChart />
  </Suspense>
);
