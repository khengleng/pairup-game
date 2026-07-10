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
import ScratchList from "./pages/ScratchList";
import ScratchPlay from "./pages/ScratchPlay";
import AdminDashboard from "./pages/AdminDashboard";
import AdminScratch from "./pages/AdminScratch";
import AdminClaims from "./pages/AdminClaims";
import AdminFraud from "./pages/AdminFraud";
import AdminReports from "./pages/AdminReports";
import AdminLogin from "./pages/AdminLogin";

function Router() {
  return (
    <Switch>
      {/* One domain serves both: root is the player game hub; admin is at
          /admin (login-gated). */}
      <Route path={"/"} component={Home} />
      <Route path={"/game/:gameId"} component={Game} />
      <Route path={"/completion/:gameId"} component={Completion} />
      <Route path={"/leaderboard"} component={Leaderboard} />
      <Route path={"/walk"} component={WalkChallenge} />
      <Route path={"/dice"} component={DiceGame} />
      <Route path={"/klaklok"} component={Klaklok} />
      <Route path={"/photos"} component={PhotoMemory} />
      <Route path={"/scratch"} component={ScratchList} />
      <Route path={"/scratch/:campaignId"} component={ScratchPlay} />
      <Route path={"/setup"} component={AdminLogin} />
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/admin/scratch"} component={AdminScratch} />
      <Route path={"/admin/claims"} component={AdminClaims} />
      <Route path={"/admin/fraud"} component={AdminFraud} />
      <Route path={"/admin/reports"} component={AdminReports} />
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
