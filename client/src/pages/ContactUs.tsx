import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Mail, MapPin, Phone, MessageSquare, ArrowRight } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  service: z.string().min(1, "Please select a service"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const serviceOptions = [
  {
    id: "general",
    label: "General Inquiry",
    description: "For general questions about the platform, account access, or how things work."
  },
  {
    id: "payment",
    label: "Payment & Withdrawal Issue",
    description: "Issues related to Skill-Upgrade payments, wallet balances, or withdrawal requests."
  },
  {
    id: "technical",
    label: "Technical Support",
    description: "Report bugs, page load errors, or other technical difficulties."
  },
  {
    id: "task_dispute",
    label: "Task Dispute",
    description: "Dispute a rejected task or report issues with task instructions."
  },
  {
    id: "partnership",
    label: "Partnership & Business",
    description: "For business proposals, advertising, or partnership opportunities."
  },
];

export default function ContactUs() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedService, setSelectedService] = useState<string>("");

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      service: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    // Construct mailto URL
    const subject = encodeURIComponent(`[${data.service.toUpperCase()}] ${data.subject}`);
    const body = encodeURIComponent(
      `Name: ${data.name}\nEmail: ${data.email}\nService: ${data.service}\n\nMessage:\n${data.message}`
    );

    // Open mail client
    window.location.href = `mailto:support@protaskergeek.com?subject=${subject}&body=${body}`;

    // Show success and redirect
    toast({
      title: "Email Client Opened",
      description: "Please send the email from your mail client. We'll get back to you soon!",
    });

    // Optional: Redirect to home after a delay
    setTimeout(() => {
      setLocation("/");
    }, 2000);
  };

  const currentServiceDescription = serviceOptions.find(s => s.id === selectedService)?.description;

  return (
    <div className="min-h-screen bg-background py-12 animate-fade-in">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">Contact Us</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We're here to help! Choose a topic below and let us know how we can assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Info Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <Card className="bg-primary/5 border-none">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-6">
                  <Mail className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <p className="text-sm text-muted-foreground">support@protaskergeek.com</p>
                    <p className="text-xs text-muted-foreground mt-1">Response time: ~24 hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 mb-6">
                  <MessageSquare className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Live Chat</h3>
                    <p className="text-sm text-muted-foreground">Available Mon-Fri</p>
                    <p className="text-xs text-muted-foreground mt-1">9:00 AM - 5:00 PM EST</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Location</h3>
                    <p className="text-sm text-muted-foreground">San Francisco, CA</p>
                    <p className="text-xs text-muted-foreground mt-1">Global & Remote Team</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-secondary/50 rounded-xl p-6 text-center">
              <h3 className="font-semibold mb-2">Check our FAQ</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Most common questions are answered in our Help Center.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setLocation("/faq")}>
                Visit FAQ <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll route your request to the right team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        placeholder="Your Name"
                        {...form.register("name")}
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        placeholder="your@email.com"
                        {...form.register("email")}
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Service Needed</label>
                    <Select
                      onValueChange={(value) => {
                        form.setValue("service", value);
                        setSelectedService(value);
                      }}
                      defaultValue={form.getValues("service")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a topic..." />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.service && (
                      <p className="text-sm text-destructive">{form.formState.errors.service.message}</p>
                    )}

                    {currentServiceDescription && (
                      <div className="bg-muted/50 p-3 rounded-md mt-2 text-sm text-muted-foreground flex items-start gap-2">
                        <div className="mt-0.5 min-w-[16px]"><HelpCircleIcon className="w-4 h-4" /></div>
                        {currentServiceDescription}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      placeholder="Brief summary of your issue"
                      {...form.register("subject")}
                    />
                    {form.formState.errors.subject && (
                      <p className="text-sm text-destructive">{form.formState.errors.subject.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      placeholder="Please describe your issue in detail..."
                      className="min-h-[150px]"
                      {...form.register("message")}
                    />
                    {form.formState.errors.message && (
                      <p className="text-sm text-destructive">{form.formState.errors.message.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" size="lg">
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function HelpCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24" height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  )
}