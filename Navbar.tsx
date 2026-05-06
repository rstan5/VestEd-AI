import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Brain, Trophy, BarChart3, Menu, X, LogOut, User, Tag } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const navItems = [
  { to: "/", label: "Home", icon: null },
  { to: "/analyze", label: "AI Professor", icon: Brain },
  { to: "/trade", label: "Trade Lab", icon: BarChart3 },
  { to: "/compete", label: "Compete", icon: Trophy },
  { to: "/pricing", label: "Pricing", icon: Tag },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("profiles").select("display_name, username").eq("user_id", session.user.id).maybeSingle()
          .then(({ data }) => setDisplayName(data?.username || data?.display_name || session.user.email));
      } else {
        setDisplayName(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("profiles").select("display_name, username").eq("user_id", session.user.id).maybeSingle()
          .then(({ data }) => setDisplayName(data?.username || data?.display_name || session.user.email));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out" });
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="VestEd logo" className="w-9 h-9 object-contain" />
          <span className="font-display text-xl font-bold text-foreground">VestEd</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                location.pathname === item.to
                  ? "bg-primary/10 text-primary neon-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {item.icon && <item.icon className="w-4 h-4" />}
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="max-w-[120px] truncate">{displayName || user.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <Button variant="hero" size="sm" onClick={() => navigate("/auth")}>Get Started</Button>
          )}
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden glass-card border-t border-border/30 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                location.pathname === item.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              {item.icon && <item.icon className="w-5 h-5" />}
              {item.label}
            </Link>
          ))}
          {user ? (
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2 px-4 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="truncate">{displayName || user.email}</span>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setMobileOpen(false); handleSignOut(); }}>
                <LogOut className="w-4 h-4 mr-1" /> Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="hero" className="w-full mt-2" onClick={() => { setMobileOpen(false); navigate("/auth"); }}>Get Started</Button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
