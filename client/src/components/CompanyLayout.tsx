import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useLocalAuth as useAuth } from "@/contexts/LocalAuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard, Users, ClipboardList, Ticket, AlertTriangle,
  ChevronLeft, ChevronRight, Sun, Moon, LogOut, Menu, X, BarChart3, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/empresa", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/empresa/solicitacoes", icon: ClipboardList, label: "Solicitações de RH" },
  { href: "/empresa/colaboradores", icon: Users, label: "Colaboradores" },
  { href: "/empresa/pendencias", icon: AlertTriangle, label: "Pendências" },
  { href: "/empresa/chamados", icon: Ticket, label: "Chamados" },
  { href: "/empresa/bi", icon: BarChart3, label: "BI / Relatórios" },
  { href: "/empresa/configuracoes", icon: Settings, label: "Configurações" },
];

interface CompanyLayoutProps { children: React.ReactNode; title?: string; }

export default function CompanyLayout({ children, title }: CompanyLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => { setMobileOpen(false); }, [location]);
  useEffect(() => {
    const h = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const handleLogout = async () => { await logout(); window.location.href = "/login"; };
  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : "EM";
  const roleLabel: Record<string, string> = {
    company_admin: "Administrador", company_hr: "RH",
    company_manager: "Gestor", company_viewer: "Consulta",
  };

  const NavList = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/empresa" && location.startsWith(item.href));
        const inner = (
          <Link href={item.href}>
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              !mobile && collapsed && "justify-center px-0"
            )}>
              <item.icon className="w-4 h-4 shrink-0" />
              {(mobile || !collapsed) && <span>{item.label}</span>}
            </div>
          </Link>
        );
        if (!mobile && collapsed) return (
          <Tooltip key={item.href} delayDuration={0}>
            <TooltipTrigger asChild>{inner}</TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
        return <div key={item.href}>{inner}</div>;
      })}
    </nav>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar mobile */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-card border-r border-border transition-transform duration-300 lg:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center border-b border-border h-14 px-4 gap-3">
          <span className="text-sm font-bold">Smart<span className="text-primary">Doc</span>Plan</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Empresa</span>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setMobileOpen(false)}><X className="w-4 h-4" /></Button>
        </div>
        <NavList mobile />
      </aside>

      {/* Sidebar desktop */}
      <aside className={cn("hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out shrink-0", collapsed ? "w-16" : "w-64")}>
        <div className={cn("flex items-center border-b border-border h-16 px-4 gap-3", collapsed && "justify-center px-0")}>
          {!collapsed ? (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold">Smart<span className="text-primary">Doc</span>Plan</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Painel Empresa</span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><span className="text-primary-foreground text-xs font-bold">E</span></div>
          )}
        </div>
        <NavList />
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 lg:h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></Button>
            {title && <h1 className="text-base lg:text-lg font-semibold truncate">{title}</h1>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                  <Avatar className="w-7 h-7"><AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback></Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-medium leading-tight">{user?.name ?? "Usuário"}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{roleLabel[user?.role ?? ""] ?? user?.role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
