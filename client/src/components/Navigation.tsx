import { Link, useLocation } from "wouter";
import { LayoutDashboard, Receipt, FileText, Settings, LogOut, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/transactions", label: "Transactions", icon: Receipt },
    { href: "/statements", label: "Statements", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 hidden lg:flex flex-col glass-panel border-r border-white/5">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">MaNo</span>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}>
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <img 
            src={user?.profileImageUrl || "https://ui-avatars.com/api/?name=User"} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border border-white/10"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.firstName || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={() => logout()}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [location] = useLocation();
  const { logout } = useAuth();
  
  const navItems = [
    { href: "/", label: "Dash", icon: LayoutDashboard },
    { href: "/transactions", label: "Txns", icon: Receipt },
    { href: "/statements", label: "Files", icon: FileText },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-panel border-t border-white/5 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => logout()}
          className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
          data-testid="button-mobile-logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
