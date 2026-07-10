import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
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
import AdminLogin from "./pages/AdminLogin";

// Hostnames whose landing page should open the Scratch & Win game directly
// instead of the general games hub (player-facing branded entry).
const SCRATCH_ENTRY_HOSTS = new Set(["pickme.cambobia.com"]);
function isScratchEntryHost(): boolean {
  return (
    typeof window !== "undefined" &&
    SCRATCH_ENTRY_HOSTS.has(window.location.hostname)
  );
}

function Router() {
  return (
    <Switch>
      <Route path={"/"}>
        {isScratchEntryHost() ? <Redirect to="/scratch" /> : <Home />}
      </Route>
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
