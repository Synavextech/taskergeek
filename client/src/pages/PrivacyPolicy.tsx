import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto p-4 max-w-4xl animate-fade-in">
            <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center text-primary">ProTasker Geek Privacy Policy</CardTitle>
                    <p className="text-center text-muted-foreground">Effective Date: [24/07 of last current year]</p>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[70vh] pr-4">
                        <div className="space-y-6 text-sm md:text-base leading-relaxed">
                            <p> We are committed to protecting your privacy and ensuring the responsible handling and use of your data. This Privacy Policy outlines how we collect, use, and manage information on our platform. </p>
                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2">Information We may or May not Collect</h3>
                                <p>We may collect the following data on user consent:</p>
                                <ul className="list-disc pl-5 space-y-1 mt-2">
                                    <li>Personal details (e.g., name, email, phone number)</li>
                                    <li>Login credentials via third-party services (e.g., Google Sign-In, OTP)</li>
                                    <li>Task interaction data (task completions, earnings, timestamps)</li>
                                    <li>Payment information (via secure third-party processors, e.g; Paypal, card, payoneer, M-honestPay and many other)</li>
                                </ul>
                            </section>
                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2">How above data May or may not be used</h3>
                                <p>Your data is used solely to:</p>
                                <ul className="list-disc pl-5 space-y-1 mt-2">
                                    <li>Verify your identity and manage your account</li>
                                    <li>Assign and track your task progress</li>
                                    <li>Process payments and Deposits</li>
                                    <li>Monitor system usage for security and performance</li>
                                </ul>
                                <p className="mt-2 font-medium">We do not share your personal information with any third-party organizations/firm/government that can hinder your privacy in any way.</p>
                                <p className="mt-2 font-medium">We are not obligated to share any information for refference or confirmation to any third-party organizations/firm/government that can hinder our system users.</p>
                            </section>
                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2">Intellectual Property & Platform Ownership</h3>
                                <p>We Own, Manage and Control all the task management and task completion data in our platform, & By using our platform:</p>
                                <ul className="list-disc pl-5 space-y-1 mt-2">
                                    <li>You agree that all content, tasks, processes, and associated data are the sole property of ProTasker.Geeks</li>
                                    <li>Task results or contributions you make are not subject to personal intellectual ownership & are property of ProTasker.Geeks and any related agreements before dispensing.</li>
                                    <li>Users do not retain control, authorship, or rights to any platform-generated or submitted data.</li>
                                    <li>You acknowledge that all decisions about platform structure, data usage, or task outcomes are solely at the discretion of the platform and can only be used to facilitate task completion on the platform</li>
                                    <li>On instance of dispute, You hold no legal claim or rights to sue ProTasker.Geeks, all final decision are made by ProTasker.Geeks support, in a humanly reasonable consensus approach.</li>
                                </ul>
                            </section>
                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2">User Responsibilities</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Users must provide accurate personal and payment information.</li>
                                    <li>Use of automated bots or unauthorized scripts is prohibited.</li>
                                    <li>Violations may lead to suspension or termination of your account.</li>
                                    <li>We reserve the right to terminate any user account deemed to violate our terms of use or safety of other users in the platform.</li>
                                </ul>
                            </section>
                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2">Data Security</h3>
                                <p> We use industry-standard encryption and security protocols to protect your data. However, no online platform is completely secure. By using our service, you accept this risk.</p>
                            </section>
                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2">Your Consent</h3>
                                <p> By registering and using this platform, you consent to the collection and use of your data as outlined in this policy.</p>
                            </section>
                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2">Updates to This Policy</h3>
                                <p>  We reserve the right to update this Privacy Policy at any time. Users will be notified of significant changes via email or dashboard notification. </p>
                            </section>
                            <div className="mt-8 p-4 bg-muted rounded-lg text-center">
                                <p className="font-semibold">Questions or concerns?</p>
                                <p>Contact us at <a href="mailto:support01@protaskergeek.com" className="text-accent hover:underline">support01@protaskergeek.com</a></p>
                            </div>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
