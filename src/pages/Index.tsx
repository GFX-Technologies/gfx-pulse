import { useAuth } from "@/lib/auth-context";
import Login from "./Login";
import Dashboard from "./Dashboard";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg bg-primary animate-pulse flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">GFX</span>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;
  return <Dashboard />;
};

export default Index;
