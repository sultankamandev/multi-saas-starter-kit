import { Routes, Route } from "react-router";
import Layout from "@/components/Layout";
import UserRoute from "@/components/UserRoute";
import AdminRoute from "@/components/AdminRoute";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import Verify2FA from "@/pages/Verify2FA";
import Setup2FA from "@/pages/Setup2FA";
import RecoveryLogin from "@/pages/RecoveryLogin";
import Admin from "@/pages/Admin";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="verify-2fa" element={<Verify2FA />} />
          <Route path="recovery-login" element={<RecoveryLogin />} />
          <Route
            path="dashboard"
            element={<UserRoute><Dashboard /></UserRoute>}
          />
          <Route
            path="profile"
            element={<UserRoute><Profile /></UserRoute>}
          />
          <Route
            path="setup-2fa"
            element={<UserRoute><Setup2FA /></UserRoute>}
          />
          <Route
            path="admin/*"
            element={<AdminRoute><Admin /></AdminRoute>}
          />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
