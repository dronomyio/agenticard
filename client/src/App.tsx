import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CardDetail from "./pages/CardDetail";
import Marketplace from "./pages/Marketplace";
import Wallet from "./pages/Wallet";
import Example from "./pages/Example";
import BuyerAgents from "./pages/BuyerAgents";
import AgentRegistration from "./pages/AgentRegistration";
import Monetization from "./pages/Monetization";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/cards/:id" component={CardDetail} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/wallet" component={Wallet} />
      <Route path="/example" component={Example} />
      <Route path="/agents" component={BuyerAgents} />
      <Route path="/agent-registration" component={AgentRegistration} />
      <Route path="/monetization" component={Monetization} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
