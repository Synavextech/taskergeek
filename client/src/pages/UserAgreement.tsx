import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function UserAgreement() {
    return (
        <div className="container mx-auto p-4 max-w-4xl animate-fade-in">
            <Card className="bg-card/50 backdrop-blur-sm border-accent/20">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center text-primary">USER AGREEMENT</CardTitle>
                    <p className="text-center text-muted-foreground">Last Updated: [01/07 of last current year]</p>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[70vh] pr-4">
                        <div className="space-y-6 text-sm md:text-base leading-relaxed">
                            <p> Welcome to ProTasker Geek platform , all our operations are governed by the terms outlined in this User Agreement. By accessing or using our services, you agree to be bound by the terms stated herein.</p>
                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2">GENERAL TERMS OF SERVICE</h3>
                                <h4 className="font-semibold mt-4">Introduction</h4>
                                <p>This User Agreement governs your use of ProTasker Geek ("the Platform") operated by ProTasker.Geek. This includes all services, features, and content made available through the platform.</p>
                                <h4 className="font-semibold mt-4">Eligibility</h4>
                                <p>To use this platform, you must be at least 18 years old or have the permission of a legal guardian. You must also provide accurate, complete registration details, including a valid phone. </p>
                                <h4 className="font-semibold mt-4">Account Usage</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>You agree to use your account responsibly and in good faith.</li>
                                    <li>We reserve the right to suspend or terminate any account found engaging in fraud, abuse, spamming, multiple account creation, or any activity deemed malicious.</li>
                                </ul>
                                <h4 className="font-semibold mt-4">Content & User Conduct</h4>
                                <p>You are solely responsible for the content you submit or actions you take within the platform. Any illegal, abusive, or misleading behavior will result in immediate suspension. </p>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2"> User Training</h3>

                                <h4 className="font-semibold mt-4">User training and Task Access Terms</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Access to certain tasks require intensive training handled by paid professionals.</li>
                                    <li>All training are geared to ensuring intergrity with out clients. We are trusted with sensitive production that require high relevel reliance and discretion for system secrecy and security.</li>
                                    <li>Training fee my vary based on required skills to complete certain tasks - applicatble if new task category are introduced into the system or more skills is needed for tasker competency improvemnt.</li>
                                </ul>

                                <h4 className="font-semibold mt-4">Payment Policy</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Training fees are used to pay training personnel and therefore charges are considered infrastructure facilitation fees.</li>
                                    <li>You are responsible for ensuring successful transactions and maintaining trust by providing real and verifiable information - Use requested, verified and working payment method.</li>
                                </ul>

                                <h4 className="font-semibold mt-4">Training Cancellations</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Canceling Your training midway will not guarantee a full refund fees but refundable amount calculated based on our trainers time, resource usage and system set terms.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-lg font-semibold text-accent mb-2">LEGAL AGREEMENTS & TERMINATION</h3>

                                <h4 className="font-semibold mt-4">Modifications to Agreement</h4>
                                <p> We reserve the right to modify this agreement at any time. Continued use of the platform after changes are published constitutes acceptance of those changes. </p>
                                <h4 className="font-semibold mt-4">Termination</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>We may suspend or terminate your account without notice if you violate these terms.</li>
                                    <li>Upon termination, all rights and access to the platform will be revoked.</li>
                                </ul>

                                <h4 className="font-semibold mt-4">Limitation of Liability</h4>
                                <p>Our platform shall not be held liable for any damages or losses arising from service interruptions, content loss, or third-party service issues related to using our platform</p>
                                <h4 className="font-semibold mt-4">Governing Law</h4>
                                <p> This agreement is governed by our internal operation rules and regulations, therefore on instance of any disputes, all cases shall be resolved under personal level agreement with ProTasker Geek having the final decision. </p>
                            </section>

                            <section className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                                <h3 className="text-lg font-semibold text-accent mb-2">ACCEPTANCE</h3>
                                <p>By subscribing to or using Our platform, you agree to these terms in full, including but not limited to:</p>
                                <ul className="list-disc pl-5 space-y-1 mt-2">
                                    <li>Being highly co-operative and responsive upon communication</li>
                                    <li>Arising charges and service fees - fines for policy violations </li>
                                    <li>Account termination on abuse</li>
                                </ul>
                                <p className="mt-4 font-semibold">If you do not agree with these terms, please do not use or subscribe to the platform.</p>
                            </section>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
