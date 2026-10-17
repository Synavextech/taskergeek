import { motion } from "framer-motion";
import { Ban, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export default function Suspended() {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full"
            >
                <Card className="border-orange-500/20 shadow-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                            <Ban className="w-8 h-8 text-orange-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-orange-600">Account Suspended</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-6">
                        <p className="text-muted-foreground">
                            Your account has been temporarily suspended due to a violation of our terms of service or pending administrative review.
                        </p>

                        <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-3 text-left">
                            <h4 className="font-semibold text-foreground">Need help?</h4>
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-primary" />
                                <span>support@protaskergeek.com</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-primary" />
                                <span>+254 123 456 789</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => logout()}
                                className="w-full"
                            >
                                Log Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
