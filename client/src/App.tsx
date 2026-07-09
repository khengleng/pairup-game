import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Completion from "./pages/Completion";
import Leaderboard from "./pages/Leaderboard";
import WalkChallenge from "./pages/WalkChallenge";
import DiceGame from "./pages/DiceGame";
import Klaklok from "./pages/Klaklok";
import PhotoMemory from "./pages/PhotoMemory";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/game/:gameId"} component={Game} />
      <Route path={"/completion/:gameId"} component={Completion} />
      <Route path={"/leaderboard"} component={Leaderboard} />
      <Route path={"/walk"} component={WalkChallenge} />
      <Route path={"/dice"} component={DiceGame} />
      <Route path={"/klaklok"} component={Klaklok} />
      <Route path={"/photos"} component={PhotoMemory} />
      <Route path={"/setup"} component={AdminLogin} />
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
