import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, HelpCircle, Book, Rocket, DollarSign, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function FAQ() {
    const [searchQuery, setSearchQuery] = useState("");

    const faqCategories = [
        {
            title: "Getting Started",
            icon: <Rocket className="w-5 h-5 text-accent" />,
            items: [
                {
                    question: "How do I start earning money?",
                    answer: "To start earning, create an account and complete your profile. Browse available tasks in the Task Manager corresponding to your subscription tier. Complete tasks accurately to earn rewards."
                },
                {
                    question: "What is the Orientation process?",
                    answer: "New users must complete a brief orientation which involves reviewing 2 sample tasks from each category. This helps you understand the quality standards required for different task types."
                },
                {
                    question: "Do I need to Skill-Upgrade to work?",
                    answer: "No,  you are currently on apprentice level that allows you to complete tasks within your skill level. Only those who do not want to undergo the appreniceship programm and feel like they are ready to unlock more lucrative tasks (e.g., AI Training, Website Testing) need to Skill-Upgrade."
                }
            ]
        },
        {
            title: "Payments & Wallet",
            icon: <DollarSign className="w-5 h-5 text-green-500" />,
            items: [
                {
                    question: "How and when do I get paid?",
                    answer: "Earnings are credited to your Wallet upon task approval. You can request a withdrawal once you reach the minimum threshold using supported payment methods like PayPal, payoneer, transfer or ny other digital wallet of your choosing."
                },
                {
                    question: "What is the referral bonus?",
                    answer: "Invite friends using your unique referral link! You earn a 10% bonus on their training fee immediately when they upgrade their skill-set level."
                },
                {
                    question: "Why is my balance pending?",
                    answer: "Earnings from recently submitted tasks may appear as 'Pending' until the task is reviewed and approved by our quality assurance team."
                }
            ]
        },
        {
            title: "Tasks & Ratings",
            icon: <Book className="w-5 h-5 text-blue-500" />,
            items: [
                {
                    question: "What happens if I fail a task?",
                    answer: "If a task is rejected, you will receive feedback explaining why. Consistently poor performance may lower your rating, affecting your access to future tasks."
                },
                {
                    question: "Can I upgrade my level later?",
                    answer: "Yes! You can Skill-Upgrade at any time to unlock higher-paying task categories like AI Training and App Testing."
                },
                {
                    question: "How does the rating system work?",
                    answer: "Every user starts with a 100% rating. Successfully completing tasks maintains this rating. Cancelling multiple tasks or having tasks rejected will lower your score."
                }
            ]
        },
        {
            title: "Account & Security",
            icon: <Shield className="w-5 h-5 text-red-500" />,
            items: [
                {
                    question: "Is my personal information safe?",
                    answer: "Absolutely. We use industry-standard encryption to protect your data. We never share your personal details with third parties without your consent."
                },
                {
                    question: "I forgot my password, what do I do?",
                    answer: "Use the 'Forgot Password' link on the login page to reset your password via email. If you have issues, contact support."
                }
            ]
        }
    ];

    const filteredCategories = faqCategories.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.items.length > 0);

    return (
        <div className="min-h-screen bg-background pb-12">
            {/* Hero Section */}
            <div className="bg-primary/5 py-16 mb-12">
                <div className="container mx-auto px-4 text-center max-w-3xl">
                    <Badge variant="outline" className="mb-4 bg-background">Help Center</Badge>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">How can we help you today?</h1>
                    <p className="text-muted-foreground text-lg mb-8">
                        Find answers to common questions about earning, tasks, and payments.
                    </p>

                    <div className="relative max-w-xl mx-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            className="pl-10 h-12 text-lg bg-background shadow-sm"
                            placeholder="Search for answers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 max-w-4xl">
                {filteredCategories.length > 0 ? (
                    <div className="space-y-8">
                        {filteredCategories.map((category, idx) => (
                            <Card key={idx} className="border-none shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        {category.icon}
                                        {category.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Accordion type="single" collapsible className="w-full">
                                        {category.items.map((item, index) => (
                                            <AccordionItem key={index} value={`item-${idx}-${index}`}>
                                                <AccordionTrigger className="text-left font-medium">
                                                    {item.question}
                                                </AccordionTrigger>
                                                <AccordionContent className="text-muted-foreground leading-relaxed">
                                                    {item.answer}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No results found</h3>
                        <p className="text-muted-foreground">
                            Try adjusting your search terms or browse the categories above.
                        </p>
                    </div>
                )}

                {/* Contact CTA */}
                <div className="mt-16 text-center bg-secondary/50 rounded-2xl p-8">
                    <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
                    <p className="text-muted-foreground mb-6">
                        Our support team is just a click away. We usually respond within 24 hours.
                    </p>
                    <a
                        href="/contact"
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    >Contact Support
                    </a>
                </div>
            </div>
        </div>
    );
}
