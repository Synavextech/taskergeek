import { motion } from "framer-motion";
import { UserX, ShieldAlert, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

export default function Terminated() {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="max-w-md w-full"
            >
                <Card className="border-destructive/20 shadow-2xl overflow-hidden">
                    <div className="h-2 bg-destructive" />
                    <CardHeader className="text-center pb-2 pt-8">
                        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
                            <UserX className="w-10 h-10 text-destructive" />
                        </div>
                        <CardTitle className="text-3xl font-bold text-destructive">Account Terminated</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-8 p-8">
                        <div className="space-y-4">
                            <p className="text-lg font-medium text-foreground">
                                This account has been permanently deactivated.
                            </p>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Access to all platform features, earnings, and data has been revoked.
                                If you believe this is an error, please contact our administrative team
                                within 48 hours.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                variant="destructive"
                                size="lg"
                                className="w-full shadow-lg hover:shadow-destructive/20"
                                onClick={() => logout()}
                            >
                                Exit Application
                            </Button>
                            <Link href="/">
                                <Button variant="ghost" className="w-full gap-2">
                                    <Home className="w-4 h-4" /> Return to Landing
                                </Button>
                            </Link>
                        </div>

                        <div className="pt-4 border-t flex justify-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> Security Policy 2.4a
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
