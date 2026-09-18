import { REPORTS_DASHBOARD } from "../data/reports";
import type { MockRoutes } from "../lib/router";

export const reportsRoutes: MockRoutes = {
  "GET /reports/dashboard": () => REPORTS_DASHBOARD,
};
