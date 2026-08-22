import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import queryClient from "./lib/queryClient";
import { useLenis } from "./lib/lenis";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { PageTransition } from "./components/layout/PageTransition";
import { LoginPage } from "./features/auth/LoginPage";
import { SignupPage } from "./features/auth/SignupPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { CreateTripPage } from "./features/trips/CreateTripPage";
import { MyTripsPage } from "./features/trips/MyTripsPage";
import { CitySearchPage } from "./features/cities/CitySearchPage";
import { NotFoundPage } from "./features/shared/NotFoundPage";
import { ItineraryBuilderPage } from "./features/itinerary/ItineraryBuilderPage";
import { BudgetPage } from "./features/budget/BudgetPage";
import { ItineraryViewPage } from "./features/itinerary/ItineraryViewPage";
import { CalendarPage } from "./features/calendar/CalendarPage";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageTransition>
                    <DashboardPage />
                  </PageTransition>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips/new"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageTransition>
                    <CreateTripPage />
                  </PageTransition>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageTransition>
                    <MyTripsPage />
                  </PageTransition>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips/:id/cities"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageTransition>
                    <CitySearchPage />
                  </PageTransition>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips/:id"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageTransition>
                    <ItineraryViewPage />
                  </PageTransition>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips/:id/build"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageTransition>
                    <ItineraryBuilderPage />
                  </PageTransition>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips/:id/calendar"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageTransition>
                    <CalendarPage />
                  </PageTransition>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trips/:id/budget"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <PageTransition>
                    <BudgetPage />
                  </PageTransition>
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <AppShell>
                    <PageTransition>
                  <NotFoundPage />
                </PageTransition>
                  </AppShell>
              }
            />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useLenis();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
