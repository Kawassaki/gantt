import { Route, Routes } from "react-router-dom";

import { GanttChartPage } from "../features/gantt/pages";

export const AppRoutes = () => (
  <Routes>
    <Route path="*" element={<GanttChartPage />} />
  </Routes>
);
