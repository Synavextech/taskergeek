import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import {
  Home,
  ClipboardList,
  Wallet,
  Bell,
  User,
  Settings,
  Moon,
  Sun,
  Menu,
  LogOut,
  HelpCircle,
  Shield,
  FileText,
  UserX,
  Star,
  Sparkles,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import { ProfileDialog } from "@/components/ProfileDialog";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState("home");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { data: notifications } = useQuery<any[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  useEffect(() => {
    if (location.includes('tasks')) setCurrentPage('tasks');
    else if (location.includes('wallet')) setCurrentPage('wallet');
    else if (location.includes('notifications')) setCurrentPage('notifications');
    else if (location.includes('profile')) setCurrentPage('profile');
    else setCurrentPage('home');
  }, [location]);

  const genderEmoji = {
    male: '🙍🏻‍♂️',
    female: '🙎‍♀️',
    geek: '🤓',
  };

  const tierEmoji: Record<string, string> = {
    member: '👤',
    silver: '🥈',
    bronze: '🥉',
    diamond: '💎',
    gold: '🏅',
    vip: '💰',
    universal: '🌐',
    premium: '👑',
  };

  const openSupport = (mode: 'task' | 'general' = 'general') => {
    window.dispatchEvent(new CustomEvent('open-support', { detail: { mode } }));
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/home' },
    { id: 'tasks', label: 'Tasks', icon: ClipboardList, path: '/tasks' },
    { id: 'wallet', label: 'Wallet', icon: Wallet, path: '/wallet' },
    { id: 'notifications', label: 'Notifications', icon: Bell, path: '/notifications', badge: unreadCount },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-accent/20 selection:text-accent">
      {/* Top Navigation Bar - Adaptive Desktop & Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/85 backdrop-blur-md border-b border-border/50 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div
            onClick={() => setLocation('/home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent to-emerald-600 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:scale-105 transition-transform">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-1">
                ProTasker<span className="text-accent">.Geek</span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold -mt-1 hidden sm:block">
                Workspace
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setLocation(item.path)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all relative ${
                    isActive
                      ? 'bg-accent/15 text-accent font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1 text-[10px] font-bold rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: User Tier Chip, Theme Toggle, Profile Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Level Chip (Desktop) */}
            {user && (
              <div
                onClick={() => setLocation('/skill-upgrade')}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 text-xs cursor-pointer hover:border-accent/40 transition-colors"
                title="Skill Upgrade Tier"
              >
                <span>{tierEmoji[user.skill_upgrade_tier || 'member'] || '👤'}</span>
                <span className="font-semibold capitalize text-foreground">
                  {user.skill_upgrade_tier || 'Member'}
                </span>
                <span className="text-muted-foreground/50">|</span>
                <div className="flex items-center gap-1 text-amber-500 font-bold" title="Admin Quality Score (0-5.0★)">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <span>{user.quality_rating !== undefined && user.quality_rating !== null ? Number(user.quality_rating).toFixed(1) : '5.0'}</span>
                </div>
                <span className="text-muted-foreground/50">|</span>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold" title="Task Completion Rate (0-100%)">
                  <span className="text-xs">🎯</span>
                  <span>{user.completion_rate ?? user.rating ?? 100}%</span>
                </div>
              </div>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl text-muted-foreground hover:text-foreground"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
            </Button>

            {/* User Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-accent/30 transition-all outline-none">
                  <Avatar className="h-9 w-9 border border-border/60">
                    <AvatarFallback className="bg-accent/10 text-base">
                      {user?.gender ? genderEmoji[user.gender as keyof typeof genderEmoji] : '🤓'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border-border/60">
                <div className="p-3 bg-muted/40 rounded-xl mb-1.5">
                  <p className="font-bold text-sm text-foreground truncate">{user?.name || 'Geek Tasker'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-2 pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Quality Score:</span>
                      <span className="font-bold text-amber-500 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500" />
                        {user?.quality_rating !== undefined && user?.quality_rating !== null ? Number(user.quality_rating).toFixed(1) : '5.0'} / 5.0
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Success Rate:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {user?.completion_rate ?? user?.rating ?? 100}%
                      </span>
                    </div>
                  </div>
                </div>

                <DropdownMenuItem onClick={() => setLocation("/profile")} className="rounded-xl cursor-pointer">
                  <User className="mr-2.5 h-4 w-4 text-muted-foreground" /> My Profile
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => setLocation("/skill-upgrade")} className="rounded-xl cursor-pointer">
                  <Zap className="mr-2.5 h-4 w-4 text-accent" /> Skill-set Upgrade
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => openSupport("general")} className="rounded-xl cursor-pointer">
                  <HelpCircle className="mr-2.5 h-4 w-4 text-emerald-500" /> Help & Support
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem onClick={() => setLocation("/faq")} className="rounded-xl cursor-pointer text-xs text-muted-foreground">
                  FAQ & Guides
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/privacy-policy")} className="rounded-xl cursor-pointer text-xs text-muted-foreground">
                  Privacy Policy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/user-agreement")} className="rounded-xl cursor-pointer text-xs text-muted-foreground">
                  User Agreement
                </DropdownMenuItem>

                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem onClick={() => setLocation("/admin")} className="rounded-xl cursor-pointer font-semibold text-accent">
                      <Settings className="mr-2.5 h-4 w-4" /> Admin Console
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuItem onClick={logout} className="rounded-xl cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2.5 h-4 w-4" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Drawer Toggle (additional quick links) */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-xl">
                  <DropdownMenuItem onClick={() => setLocation("/skill-upgrade")}>
                    <Zap className="mr-2 h-4 w-4 text-accent" /> Skill Upgrade
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openSupport("general")}>
                    <HelpCircle className="mr-2 h-4 w-4 text-emerald-500" /> Support Desk
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/faq")}>
                    <FileText className="mr-2 h-4 w-4" /> FAQ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/user-agreement")}>
                    <Shield className="mr-2 h-4 w-4" /> User Agreement
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => setLocation("/admin")} className="text-accent font-semibold">
                      <Settings className="mr-2 h-4 w-4" /> Admin Console
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem onClick={logout} className="text-destructive font-semibold cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-20 pb-24 md:pb-12 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 animate-fade-in">
        {children}
      </main>

      {/* Bottom Navigation Bar - Mobile ONLY (`md:hidden`) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/50 shadow-lg md:hidden">
        <div className="flex items-center justify-around py-2 px-2 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setLocation(item.path)}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
                  isActive
                    ? 'text-accent font-bold scale-105'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[11px] mt-1 font-medium">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="absolute top-0 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {/* WhatsApp Support Floating Action Button */}
      <WhatsAppSupport />

      {/* Profile Dialog */}
      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </div>
  );
}
