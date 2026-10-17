import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Star, MapPin, Phone, Award, Settings } from "lucide-react";

interface ProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
    const { user, logout } = useAuth();
    const [, setLocation] = useLocation();

    if (!user) return null;

    const genderEmoji = {
        male: '🙍🏻‍♂️',
        female: '🙎‍♀️',
        geek: '🤓',
    };

    const tierEmoji = {
        member: '👤',
        silver: '🥈',
        bronze: '🥉',
        diamond: '💎',
        gold: '🏅',
        vip: '💰',
    };

    const handleLogout = async () => {
        await logout();
        onOpenChange(false);
        setLocation("/");
    };

    const handleManageProfile = () => {
        onOpenChange(false);
        setLocation("/profile");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] overflow-hidden">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Profile Summary
                    </DialogTitle>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    {/* Header Summary */}
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16 border-2 border-primary/20">
                            <AvatarFallback className="text-3xl bg-primary/10">
                                {user.gender ? genderEmoji[user.gender as keyof typeof genderEmoji] : '🤓'}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="text-xl font-bold">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>

                    {/* Stats/Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> Phone
                            </Label>
                            <p className="text-sm font-medium">{user.phone || "Not set"}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> Country
                            </Label>
                            <p className="text-sm font-medium">{user.country || "Not set"}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Award className="h-3 w-3" /> Skill Level
                            </Label>
                            <div className="pt-0.5">
                                {user.skill_upgrade_tier ? (
                                    <Badge variant="secondary" className="gap-1 px-1.5 py-0 h-5">
                                        {tierEmoji[user.skill_upgrade_tier as keyof typeof tierEmoji]}
                                        <span className="capitalize">{user.skill_upgrade_tier}</span>
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-xs h-5">No Training</Badge>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Star className="h-3 w-3" /> Rating
                            </Label>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-bold">{user.rating || 0}%</span>
                                <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[60px]">
                                    <div
                                        className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${user.rating || 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
                    <Button variant="outline" className="w-full sm:flex-1" onClick={handleManageProfile}>
                        <Settings className="mr-2 h-4 w-4" /> My Profile
                    </Button>
                    <Button variant="destructive" className="w-full sm:w-auto" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
