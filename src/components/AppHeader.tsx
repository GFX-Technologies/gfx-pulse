import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, History } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export function AppHeader() {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="border-b border-border bg-card">
      <div className="container max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">GFX</span>
          </div>
          <span className="font-semibold text-foreground hidden sm:block">Status Center</span>
        </div>
        <div className="flex items-center gap-2">
          {location.pathname !== "/" && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              Dashboard
            </Button>
          )}
          {isAdmin && location.pathname !== "/admin" && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <Shield className="w-4 h-4 mr-1" />
              Admin
            </Button>
          )}
          {location.pathname !== "/history" && (
            <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
              <History className="w-4 h-4 mr-1" />
              Histórico
            </Button>
          )}
          <span className="text-sm text-muted-foreground hidden md:block">
            {profile?.nome}
          </span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
