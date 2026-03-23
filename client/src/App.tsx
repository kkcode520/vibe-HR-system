import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import Leaves from "./pages/Leaves";
import ApiDocs from "./pages/ApiDocs";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/employees"} component={Employees} />
      <Route path={"/employees/:id"} component={EmployeeDetail} />
      <Route path={"/leaves"} component={Leaves} />
      <Route path={"/api-docs"} component={ApiDocs} />
      <Route path={"/404"} component={NotFound} />
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
