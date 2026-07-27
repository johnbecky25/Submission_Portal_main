import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { isAdminRole, isReviewerRole } from "@/lib/roles";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileText,
  Users,
  FileSignature,
  LogOut,
  CheckCircle,
  Settings,
  FileUp,
  Menu,
  KeyRound,
  CalendarDays,
  Mic2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Building2,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import faviconUrl from "@assets/favicon.png";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  match?: string;
};

type NavGroup = {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

function isGroupActive(group: NavGroup, location: string) {
  return group.items.some((item) =>
    item.match ? location.startsWith(item.match) : location === item.href
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, markLoggedOut } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    markLoggedOut();
    setLocation("/login");
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
      },
    });
  };

  const isPublicRoute =
    location === "/login" ||
    location === "/register" ||
    location === "/forgot-password" ||
    location.startsWith("/reset-password") ||
    location === "/programme" ||
    location.startsWith("/speaker/");

  if (!user || isPublicRoute) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // ── Build nav groups per role ─────────────────────────────────────────────

  const submissionsItems: NavItem[] = [
    ...(isAdminRole(user.role) || isReviewerRole(user.role)
      ? [{ href: "/abstracts", label: "All Submissions", Icon: FileText }]
      : []),
    ...(user.role === "author"
      ? [{ href: "/abstracts", label: "My Submissions", Icon: FileText }]
      : []),
    ...(isReviewerRole(user.role)
      ? [{ href: "/reviews", label: "Review Queue", Icon: CheckCircle, match: "/reviews" }]
      : []),
    ...(isAdminRole(user.role)
      ? [
          { href: "/abstracts/new", label: "New Submission", Icon: FileSignature },
          { href: "/import", label: "Import Submissions", Icon: FileUp },
          { href: "/form-builder", label: "Form Builder", Icon: Settings },
        ]
      : []),
  ];

  const conferenceItems: NavItem[] =
    isAdminRole(user.role) || isReviewerRole(user.role)
      ? [
          ...(isAdminRole(user.role)
            ? [{ href: "/admin/programme", label: "Programme Manager", Icon: CalendarDays }]
            : []),
          { href: "/admin/sessions", label: "Sessions", Icon: CalendarDays, match: "/admin/sessions" },
          { href: "/admin/speakers", label: "Speakers", Icon: Mic2, match: "/admin/speakers" },
        ]
      : [];

  const adminItems: NavItem[] =
    isAdminRole(user.role)
      ? [
          { href: "/users", label: "Users", Icon: Users },
          { href: "/ticket-check", label: "Ticket Cross-Reference", Icon: Ticket },
          { href: "/audit-logs", label: "Audit Logs", Icon: FileText },
          { href: "/settings", label: "Settings", Icon: Settings },
        ]
      : [];

  const navGroups: NavGroup[] = [
    ...(submissionsItems.length
      ? [{ id: "submissions", label: "Submissions", Icon: ClipboardList, items: submissionsItems }]
      : []),
    ...(conferenceItems.length
      ? [{ id: "conference", label: "Conference", Icon: Building2, items: conferenceItems }]
      : []),
    ...(adminItems.length
      ? [{ id: "admin", label: "Administration", Icon: ShieldCheck, items: adminItems }]
      : []),
  ];

  // ── Components ────────────────────────────────────────────────────────────

  const NavLink = ({
    href,
    label,
    Icon,
    match,
    onClick,
  }: NavItem & { onClick?: () => void }) => {
    const active = match ? location.startsWith(match) : location === href;
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`flex items-center gap-3 pl-9 pr-3 py-2 rounded-md text-sm font-medium transition-colors ${
          active
            ? "bg-white/20 text-white"
            : "text-white/65 hover:bg-white/10 hover:text-white"
        }`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </Link>
    );
  };

  const NavGroupSection = ({
    group,
    onNavClick,
  }: {
    group: NavGroup;
    onNavClick?: () => void;
  }) => {
    const active = isGroupActive(group, location);
    const [open, setOpen] = useState(active);

    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
            active
              ? "text-white bg-white/10"
              : "text-white/80 hover:bg-white/8 hover:text-white"
          }`}
        >
          <group.Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 opacity-60" />
          )}
        </button>

        {open && (
          <div className="mt-0.5 space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} onClick={onNavClick} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={faviconUrl} alt="AWS" className="h-9 w-9 flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-serif font-bold text-white text-xs leading-4">
              Africa Water and Sanitation Systems Leadership Symposium
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
        {/* Dashboard — always top-level */}
        <Link
          href="/dashboard"
          onClick={onNavClick}
          className={`flex items-center gap-3 px-3 py-3 rounded-md text-base font-semibold transition-colors ${
            location === "/dashboard"
              ? "bg-white/25 text-white"
              : "text-white hover:bg-white/15 hover:text-white"
          }`}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          Home
        </Link>

        {/* Grouped sections */}
        {navGroups.map((group) => (
          <NavGroupSection key={group.id} group={group} onNavClick={onNavClick} />
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs uppercase flex-shrink-0"
            style={{ background: "#0381ED", color: "#fff" }}
          >
            {user.name.slice(0, 2)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate text-white">{user.name}</p>
            <p className="text-xs text-white/60 capitalize">{user.role}</p>
          </div>
        </div>

        <Link
          href="/change-password"
          onClick={onNavClick}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-1 ${
            location === "/change-password"
              ? "bg-white/15 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <KeyRound className="h-4 w-4 shrink-0" />
          Change Password
        </Link>

        <Button
          variant="ghost"
          className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={handleLogout}
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/20">
      {/* Desktop sidebar */}
      <aside
        className="w-60 flex-col hidden md:flex flex-shrink-0"
        style={{ background: "#015845" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header
        className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40"
        style={{ background: "#015845" }}
      >
        <div className="flex items-center gap-2">
          <img src={faviconUrl} alt="AWS" className="h-7 w-7 flex-shrink-0" />
          <p className="font-serif font-bold text-white text-sm leading-tight">
            Africa Water and Sanitation Systems Leadership Symposium
          </p>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 w-72 border-0 flex flex-col"
            style={{ background: "#015845" }}
          >
            <SidebarContent onNavClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
