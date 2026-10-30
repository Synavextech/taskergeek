import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ShieldCheck,
  Cpu,
  Brain,
  Activity,
  MessageSquare,
  Users,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function AboutUs() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 selection:text-accent">
      {/* Hero Header Section */}
      <div className="relative py-16 sm:py-24 px-4 sm:px-6 overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 -z-10">
          <img
            src="/images/1.gif"
            alt="About Background"
            className="w-full h-full object-cover opacity-15 filter blur-[1px]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/90 to-background"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-accent/30 bg-accent/10 backdrop-blur-md shadow-sm">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-accent tracking-wide uppercase">
              Premier Developer AIDE • Human-in-the-Loop Intelligence
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
            About{" "}
            <span className="text-accent bg-gradient-to-r from-accent via-emerald-400 to-yellow-200 bg-clip-text text-transparent">
              ProTasker.Geek
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-medium">
            We are the Premier Developer AIDE - Operating as a secondary task Management Platform
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative py-12 sm:py-20 px-4 sm:px-6">
        <div className="relative z-10 max-w-6xl mx-auto space-y-16 sm:space-y-24">

          {/* Mission & Vision Section */}
          <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-8 sm:p-12 shadow-xl ring-1 ring-white/5">
            <div className="max-w-4xl mx-auto space-y-6 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" /> Strategic Core
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Our Mission & Vision
              </h2>
              <p className="text-foreground/90 text-sm sm:text-base leading-relaxed text-justify sm:text-center">
                Power High-End Technologies by delivering the essential human-in-the-loop intelligence required for high-end system seamless testing and deployment. We aim to present human conscious interaction for critical systems, such as AI model training and software & website testing. Operating as the Program Moderation Group (ProtaskerGeek), a Premier Developer AIDE group, we manage the completion of essential technological and strategic tasks for selected organizations. We integrate specialized skill sets across the entire development lifecycle, maintaining strict alignment with current tech trends. Our services include comprehensive Quality Assurance (App and Website testing, platform evaluation, and pre-launch user-software/website testing), advanced Data Intelligence (critical AI Training, data purification, and model refinement), and Strategic Viability Analysis (product design aid, surveys, polls, and reviews) to ensure market readiness and optimal user experience.
              </p>
            </div>
          </section>

          {/* Who we are and What we Do */}
          <section className="space-y-8">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="border-accent/40 text-accent text-xs py-1 px-3">
                Operations & Identity
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                Who we are and What we Do
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-lg p-6 sm:p-8 space-y-4 hover:border-accent/40 transition-all duration-300 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Brain className="w-6 h-6 text-accent" />
                </div>
                <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
                  We are a Premier Developer AIDE group and leading AI Training & Web Testing Think-tank, where we represent major software companies to achieve crucial in-person review of their newly developed systems. We manage the essential completion of technological and strategic tasks for selected organizations, focusing on securing the quality and integrity of cutting-edge technology by managing all critical system pre-launch testing and review, from technical testing to operational data selection and cleansing.
                </p>
              </div>

              <div className="rounded-3xl border border-accent/30 bg-accent/5 backdrop-blur-lg p-6 sm:p-8 space-y-4 hover:border-accent/50 transition-all duration-300 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                    <Cpu className="w-6 h-6 text-accent" />
                  </div>
                  <p className="text-accent text-sm sm:text-base leading-relaxed font-medium">
                    As a Premier Developer AIDE, we expertly manage the successful completion of essential technological and strategic tasks for select organizations. We integrate specialized skill sets across the entire development life-cycle, maintaining strict alignment with current tech trends to ensure your project's success.
                  </p>
                </div>
                <div className="pt-4 border-t border-accent/20 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-accent" />
                  Human-verified pre-launch system testing
                </div>
              </div>
            </div>
          </section>

          {/* What Motivates Our Focus */}
          <section className="space-y-12">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="border-accent/40 text-accent text-xs py-1 px-3">
                Inspiration & Strategy
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                What Motivates Our Focus
              </h2>
            </div>

            {/* Freelancing & Task Management Highlight */}
            <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-8 sm:p-10 shadow-lg grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <h3 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  Freelancing & Task Management
                </h3>
                <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
                  We deliver specialized services through a sophisticated, seamless, and collaborative work environment, utilizing a high-impact workspace for productivity where rigorous controls are applied to every managed task. Our platform manages tasks from systems that require an in-person review, and we are actively seeking skilled Geeks 🤓 with proficient skills in AI training, App/website testing and review, surveys/polls, and product design aid.
                </p>
              </div>

              <div className="order-first md:order-last">
                <div className="rounded-2xl shadow-xl overflow-hidden h-48 sm:h-64 md:h-72 border border-border/50 ring-1 ring-white/10 group">
                  <img
                    src="/images/1.gif"
                    alt="AI improving business and everyday life"
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {/* Core Domain Glass Cards */}
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {/* Sub-section 1 */}
              <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-md p-6 sm:p-8 space-y-4 hover:border-accent/40 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
                  <Activity className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-accent">
                  AI in business & lifestyle enhancement
                </h3>
                <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
                  We harness network-enabled distribution and targeted engagement to provide efficient, low-cost client reach. Our systems aim to maximize value for clients while creating predictable earning opportunities for contributors by combining human oversight with automated tooling.
                </p>
                <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
                  Outcomes include improved product-market fit, higher quality data for AI training, and scalable workflows that preserve data integrity and user wellbeing.
                </p>
              </div>

              {/* Sub-section 2 */}
              <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-md p-6 sm:p-8 space-y-4 hover:border-accent/40 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                  <Cpu className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-accent">
                  AI in industrialization & productivity
                </h3>
                <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
                  We apply HITL methods to development workflows — optimizing systems with human-reviewed datasets and rigorous testing. This improves automation reliability and reduces costly deployment regressions in production environments. Our approach emphasizes traceability, repeatable validation, and clear feedback loops between human reviewers and model engineers.
                </p>
              </div>

              {/* Sub-section 3 */}
              <div className="rounded-3xl border border-border/60 bg-card/40 backdrop-blur-md p-6 sm:p-8 space-y-4 hover:border-accent/40 transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-accent">
                  AI for human health & wellbeing
                </h3>
                <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
                  In healthcare and wellbeing domains, human oversight is essential. We focus on careful curation and validation of sensitive datasets to reduce bias and improve model safety.
                </p>
                <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
                  Our workflow ensures ethical handling, clear documentation, and human-in-the-loop review at every stage to protect users and drive better clinical and product outcomes.
                </p>
              </div>
            </div>

            {/* AI to Enhance Communication with Media */}
            <div className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-8 sm:p-10 shadow-lg grid md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
                  <MessageSquare className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-accent">
                  Ai to Enhance Communication
                </h3>
                <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
                  We hope to create a collaborative and seamless system integration to break barriers in communication, to ensure real-time knowledge exchange between system intelligence and human intelligence. This dynamic environment maximizes clarity and efficiency, transforming internal communication into a direct accelerator of project quality and innovation. Partner with us to leverage an infrastructure where effective communication directly translates into superior operational value.
                </p>
              </div>

              <div className="order-first md:order-last">
                <div className="rounded-2xl shadow-xl overflow-hidden h-48 sm:h-64 md:h-72 border border-border/50 ring-1 ring-white/10 group">
                  <img
                    src="/images/contact_us.gif"
                    alt="AI supporting human health"
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            {/* AI to Enhance Human Intelligence Card */}
            <div className="rounded-3xl border border-accent/30 bg-card/60 backdrop-blur-xl p-8 sm:p-10 shadow-lg space-y-4 ring-1 ring-accent/20">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-accent">
                AI to Enhance Human Intelligence
              </h3>
              <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
                We are committed to actively training, compensating, and stabilizing a highly skilled human workforce, recognizing that human intelligence is the essential "in-the-loop" component that ensures quality and ethical alignment for cutting-edge systems. Our rigorous process of data purification and output review leverages human judgment to navigate complex edge cases, guaranteeing the integrity and reliability of every AI model and software system we manage. Choose a partner that invests in human intellect to secure the future of your technology.
              </p>
            </div>
          </section>

          {/* Human Intelligence in the Loop Integration Section */}
          <section className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-8 sm:p-12 shadow-xl space-y-6">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="border-accent/40 text-accent text-xs py-1 px-3">
                HITL Methodology
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                Human Intelligence in the Loop Integration
              </h2>
            </div>
            <p className="text-foreground/90 text-sm sm:text-base leading-relaxed text-justify sm:text-center max-w-4xl mx-auto">
              Our platform pioneers Human Intelligence in the Loop (HITL) integration, the optimal approach for high-stakes system development, where manual human testing synergizes with automated processes and new technology systems to ensure superior results. This methodology is crucial in AI Model Training, where our Geeks provide essential data purification, subjective labeling, and continuous feedback to mitigate model bias and enhance accuracy, and in App Testing Before Launch, where human intuition excels at exploratory testing, usability validation, and assessing complex user scenarios that automation alone cannot capture. By strategically filtering AI outputs for human review, and employing our skilled workforce to execute rigorous pre-launch functional and usability testing, we create a robust, continuous feedback cycle that guarantees the integrity of sensitive data and delivers innovation that is reliable, ethical, and fully aligned with real-world user needs.
            </p>
          </section>

          {/* Platform Design Details */}
          <section className="rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-8 sm:p-12 shadow-xl space-y-6">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="border-accent/40 text-accent text-xs py-1 px-3">
                Platform Architecture
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                Our Platform Design
              </h2>
            </div>
            <p className="text-foreground/90 text-sm sm:text-base leading-relaxed text-justify sm:text-center max-w-4xl mx-auto">
              We deliver specialized services through a sophisticated, seamless work platform that cultivates a dynamic in-house environment designed for maximum collaboration and high-impact workspace productivity, ensuring rigorous controls are applied to every managed task. The operational core involves the precise sequence of purifying data, training models, and delivering rigorous testing for complex systems; this procedural rigor and controlled environment ensure the integrity of sensitive data and outputs, directly elevating innovations. Our platform architecture is engineered to optimize value exchange, fulfilling the mandate to minimize client costs while maximizing user earning potential through a robust proprietary system designed to track, reward, and optimize every platform interaction. We convert granular engagement—including actions like AI model training, software/website testing, surveys, and polls—into monetary value evaluations to reward our Geeks, thereby ensuring sustained worker engagement. We aim to control and stabilize the highly skilled workforce required for these tasks, ultimately maximizing platform efficiency and providing superior operational value across every step of the system development journey.
            </p>
          </section>

          {/* Call to Action Banner */}
          <section className="text-center py-6 sm:py-10">
            <div className="relative overflow-hidden rounded-3xl border border-accent/40 bg-gradient-to-br from-card/90 via-card/80 to-accent/10 backdrop-blur-2xl p-8 sm:p-12 max-w-4xl mx-auto shadow-2xl ring-1 ring-white/10">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 space-y-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                  Hey! We are hiring freelance Geeks! Apply now
                </h2>
                <p className="text-accent text-base sm:text-lg max-w-2xl mx-auto font-semibold">
                  We are only looking for 60 more Geeks
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto pt-2">
                  <Button
                    onClick={() => setLocation("/auth")}
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black px-7 py-3.5 text-sm sm:text-base font-bold transform hover:-translate-y-0.5 transition-all rounded-xl shadow-lg shadow-yellow-500/20"
                  >
                    Join Our TaskForce Today <ArrowRight className="w-4 h-4 ml-1.5 inline" />
                  </Button>
                  <Button
                    onClick={() => setLocation("/contact-us")}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto border-border/80 text-foreground hover:bg-white/5 px-7 py-3.5 text-sm sm:text-base font-semibold transition-all rounded-xl backdrop-blur-sm"
                  >
                    Contact Us
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Navigation Back */}
          <div className="text-center pb-8">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              size="lg"
              className="rounded-xl text-muted-foreground hover:text-foreground text-sm font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}