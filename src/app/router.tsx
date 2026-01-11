import { Routes, Route, Navigate } from "react-router-dom"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { DashboardLayout } from "@/layouts/DashboardLayout"
import { HomePage } from "@/features/maps/pages/HomePage"
import { UserManagementPage } from "@/features/users/pages/UserManagementPage"
import { ObservationFormPage } from "@/features/observations/pages/ObservationFormPage"
import { HeatmapPage } from "@/features/visualization/pages/HeatMapPage"
import { PredictiveRoutesPage } from "@/features/visualization/pages/PredictiveRoutesPage"
import { MyObservationsPage } from "@/features/observations/pages/MyObservationPage"
import { DataLoadPage } from "@/features/simulation/pages/DataLoadPage"
import { VariablesConfigPage } from "@/features/simulation/pages/VariableConfigPage"
import { RulesEditorPage } from "@/features/simulation/pages/RulesEditorPage"
import { ExecutionPanelPage } from "@/features/simulation/pages/ExecutionPanelPage"
import { ValidationPage } from "@/features/simulation/pages/ValidationPage"
import { GeographicAuditPage } from "@/features/audit/pages/GeographicAuditPage"
import { CalibrationPage } from "@/features/simulation/pages/CalibrationPage"
import { SimulationHistoryPage } from "@/features/simulation/pages/SimulationHistoryPage"
import { ExecutiveDashboardPage } from "@/features/dashboard/pages/ExecutiveDashboardPage"
import { MapViewerPage } from "@/features/visualization/pages/MapViewerPage"
import { ScenarioComparatorPage } from "@/features/visualization/pages/ScenarioComparatorPage"
import { ReportCenterPage } from "@/features/reports/pages/ReportCenterPage"
import { SimulationApprovalPage } from "@/features/approval/pages/SimulationApprovalPage"

export const AppRouter = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="observation/new" element={<ObservationFormPage />} />
        <Route path="heatmap" element={<HeatmapPage />} />
        <Route path="predictive-routes" element={<PredictiveRoutesPage />} />
        <Route path="my-observations" element={<MyObservationsPage />} />
        <Route path="data-load" element={<DataLoadPage />} />
        <Route path="variables-config" element={<VariablesConfigPage />} />
        <Route path="rules-editor" element={<RulesEditorPage />} />
        <Route path="execution" element={<ExecutionPanelPage />} />
        <Route path="validation" element={<ValidationPage />} />
        <Route path="geographic-audit" element={<GeographicAuditPage />} />
        <Route path="calibration" element={<CalibrationPage />} />
        <Route path="simulation-history" element={<SimulationHistoryPage />} />
        <Route path="executive-dashboard" element={<ExecutiveDashboardPage />} />
        <Route path="map-viewer" element={<MapViewerPage />} />
        <Route path="scenario-comparator" element={<ScenarioComparatorPage />} />
        <Route path="reports" element={<ReportCenterPage />} />
        <Route path="approval" element={<SimulationApprovalPage />} />
      </Route>
    </Routes>
  )
}
