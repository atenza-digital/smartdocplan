import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useLocalAuth as useAuth } from "@/contexts/LocalAuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Settings,
  Sun,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canManagePlatformSettings } from "@shared/permissions";
import BrandLogo from "@/components/BrandLogo";
import NotificationCenter from "@/components/NotificationCenter";
import PlatformCompanyScopeSwitch from "@/components/PlatformCompanyScopeSwitch";

const SIDEBAR_STORAGE_KEY = "smartdocplan-admin-sidebar-collapsed";

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  visible?: (role?: string | null) => boolean;
};

const navItems: NavItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard Global" },
  { href: "/admin/empresas", icon: Building2, label: "Empresas" },
  { href: "/admin/solicitacoes", icon: ClipboardList, label: "Solicitações" },
  { href: "/admin/chamados", icon: Ticket, label: "Chamados" },
  { href: "/admin/auditoria", icon: ScrollText, label: "Auditoria" },
  { href: "/admin/bi", icon: BarChart3, label: "BI Global" },
  { href: "/admin/usuarios", icon: Users, label: "Usuários", visible: canManagePlatformSettings },
  { href: "/admin/matriz-legal", icon: BookOpen, label: "Matriz Legal", visible: canManagePlatformSettings },
  { href: "/admin/documentos", icon: FileCheck2, label: "Checklist Docs", visible: canManagePlatformSettings },
  { href: "/admin/configuracoes", icon: Settings, label: "Configurações", visible: canManagePlatformSettings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved === "true") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((name) => name[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  const roleLabel: Record<string, string> = {
    platform_admin: "Administrador",
    platform_analyst: "Analista RH",
    platform_auditor: "Auditor",
  };

  const visibleNavItems = navItems.filter((item) => !item.visible || item.visible(user?.role ?? null));

  const NavList = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="flex-1 overflow-y-auto space-y-1 px-2 py-3">
      {visibleNavItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
        const inner = (
          <Link href={item.href}>
            <div
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                !mobile && collapsed && "justify-center px-0"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {(mobile || !collapsed) && <span>{item.label}</span>}
            </div>
          </Link>
        );

        if (!mobile && collapsed) {
          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>{inner}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        }

        return <div key={item.href}>{inner}</div>;
      })}
    </nav>
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-background text-foreground">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <BrandLogo variant="icon" imageClassName="h-9 w-9 rounded-xl" />
          <BrandLogo variant="text" imageClassName="h-5 w-auto" />
          <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <NavList mobile />
      </aside>

      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-card transition-all duration-300 ease-in-out lg:flex",
          collapsed ? "w-[88px]" : "w-72"
        )}
      >
        <div className={cn("flex h-20 items-center gap-3 border-b border-border px-4", collapsed && "justify-center px-0")}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <BrandLogo variant="icon" imageClassName="h-11 w-11 rounded-2xl" />
              <div className="space-y-1">
                <BrandLogo variant="text" imageClassName="h-5 w-auto" />
                <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Plataforma</p>
              </div>
            </div>
          ) : (
            <BrandLogo variant="icon" imageClassName="h-11 w-11 rounded-2xl" />
          )}
        </div>
        <NavList />
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="hidden shrink-0 items-center gap-2 lg:inline-flex"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {collapsed ? "Expandir menu" : "Recolher menu"}
            </Button>
            {title && <h1 className="truncate text-base font-semibold lg:text-lg">{title}</h1>}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <PlatformCompanyScopeSwitch />
            <NotificationCenter />
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex h-9 items-center gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs font-medium leading-tight">{user?.name ?? "Usuário"}</p>
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      {roleLabel[user?.role ?? ""] ?? user?.role}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
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
