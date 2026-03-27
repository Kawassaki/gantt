import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import { jiraDevApiPlugin } from "./server/jira/devPlugin";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [react(), tailwindcss(), jiraDevApiPlugin()],
    server: {
      port: 4000,
    },
  };
});
