import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import HomePage from "./Component/HomePage.jsx";
import TvSeries from "./Component/TvSeries.jsx";
import Country from "./Component/Country.jsx";
import Watch from "./Component/Watch.jsx";
import PlayerPage from "./Component/Player.jsx";
import Years from "./Component/Years.jsx";
import YearsDetail from "./Component/YearsDetail.jsx";
import SeriesPage from "./Component/SeriesPage.jsx";
import CategoryPage from "./Component/CategoryPage.jsx";
import { HelmetProvider } from "react-helmet-async";
import SearchPage from "./Component/SearchPage.jsx";
import Upload from "./Component/Upload.jsx";
import AdminLogin from "./Component/AdminLogin.jsx";
import About from "./Pages/About.jsx";
import PrivacyPolicy from "./Pages/PrivacyPolicy.jsx";
import Terms from "./Pages/Terms.jsx";
import Auth from "./Component/Auth.jsx";
import { AuthProvider } from "./AuthContext";
import Profile from "./Component/Profile.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import AccountSettings from "./Pages/AccountSettings.jsx";
import CopyrightPolicy from "./Pages/CopyrightPolicy";
import News from "./Pages/News.jsx";
import ResetFlow from "./Pages/ResetFlow.jsx";
import Browse from "./Component/Browse.jsx";

function App() {
  // ✅ Adsterra Popunder Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://pl28957278.effectivecpmnetwork.com/3a/5c/84/3a5c847ae5ae475749cf0f05b706d3b1.js";
    script.type = "text/javascript";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <AuthProvider>
      <HelmetProvider>
        {/* ✅ Future Flags එකතු කර ඇති අතර Router එක නිවැරදි කර ඇත */}
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* 🔓 Public routes */}
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />

            {/* 🔒 Protected (login required) routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tvseries"
              element={
                <ProtectedRoute>
                  <TvSeries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/countries"
              element={
                <ProtectedRoute>
                  <Country />
                </ProtectedRoute>
              }
            />
            <Route
              path="/country/:country"
              element={
                <ProtectedRoute>
                  <Country />
                </ProtectedRoute>
              }
            />
            <Route
              path="/category/:name"
              element={
                <ProtectedRoute>
                  <CategoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/years"
              element={
                <ProtectedRoute>
                  <Years />
                </ProtectedRoute>
              }
            />
            <Route
              path="/years/:year"
              element={
                <ProtectedRoute>
                  <YearsDetail />
                </ProtectedRoute>
              }
            />
            {/* ✅ Watch Detail Page */}
            <Route
              path="/watch/:id"
              element={
                <ProtectedRoute>
                  <Watch />
                </ProtectedRoute>
              }
            />
            {/* ✅ Player Page */}
            <Route
              path="/play/:id"
              element={
                <ProtectedRoute>
                  <PlayerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/series/:title"
              element={
                <ProtectedRoute>
                  <SeriesPage />
                </ProtectedRoute>
              }
            />
            <Route path="/upload" element={<Upload />} />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AccountSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/browse"
              element={
                <ProtectedRoute>
                  <Browse />
                </ProtectedRoute>
              }
            />
            <Route
              path="/news"
              element={
                <ProtectedRoute>
                  <News />
                </ProtectedRoute>
              }
            />
            <Route path="/reset-flow" element={<ResetFlow />} />
            <Route
              path="/copyright-policy"
              element={
                <ProtectedRoute>
                  <CopyrightPolicy />
                </ProtectedRoute>
              }
            />

            {/* 🔁 Unknown routes redirect - මෙය සැමවිටම Routes ඇතුළත අවසානයට තිබිය යුතුය */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </HelmetProvider>
    </AuthProvider>
  );
}

export default App;