import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";

export default function AboutUs() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen">

      {/* Header Section */}
      <div className="hero-gradient relative py-12 sm:py-16 px-4 sm:px-6">
        <div className="absolute inset-0">
          <img
            src="/images/1.gif"
            alt="About Background"
            className="w-full h-full object-cover opacity-20"
            loading="eager"
          />
        </div>
        <div className="absolute inset-0 hero-gradient"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-center"> About <span className="text-accent bg-gradient-to-r from-accent to-yellow-200 bg-clip-text text-transparent">ProTasker.Geek</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto"> We are the Premier Developer AIDE - Operating as a secondary task Management Platform </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="content-gradient relative">
        <div className="relative z-10 max-w-6xl mx-auto py-12 sm:py-16 px-4 sm:px-6">
          {/* Mission Statement */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-foreground">Our Mission & Vision</h2>
            <p className="text-foreground/90 text-sm sm:text-base leading-relaxed"> Power High-End Technologies by delivering the essential human-in-the-loop intelligence required for high-end system seamless testing and deployment. We aim to present human conscious interaction for critical systems, such as AI model training and software & website testing. Operating as the Program Moderation Group (ProtaskerGeek), a Premier Developer AIDE group, we manage the completion of essential technological and strategic tasks for selected organizations. We integrate specialized skill sets across the entire development lifecycle, maintaining strict alignment with current tech trends. Our services include comprehensive Quality Assurance (App and Website testing, platform evaluation, and pre-launch user-software/website testing), advanced Data Intelligence (critical AI Training, data purification, and model refinement), and Strategic Viability Analysis (product design aid, surveys, polls, and reviews) to ensure market readiness and optimal user experience. </p>
          </section>

          {/* What We Do */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-foreground">Who we are and What we Do</h2>
            <div className="grid gap-8 mb-8">
              <p className="text-foreground/90 text-sm sm:text-base mb-6 leading-relaxed">
                We are a Premier Developer AIDE group and leading AI Training & Web Testing Think-tank, where we represent major software companies to achieve crucial in-person review of their newly developed systems. We manage the essential completion of technological and strategic tasks for selected organizations, focusing on securing the quality and integrity of cutting-edge technology by managing all critical system pre-launch testing and review, from technical testing to operational data selection and cleansing.
              </p>
              <p className="text-accent text-sm sm:text-base leading-relaxed">
                As a Premier Developer AIDE, we expertly manage the successful completion of essential technological and strategic tasks for select organizations. We integrate specialized skill sets across the entire development life-cycle, maintaining strict alignment with current tech trends to ensure your project's success.
              </p>
            </div>
          </section>

          {/* Our Knowledge Inspiration */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-foreground">What Motivates Our Focus</h2>
            <div className="text-left mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 text-foreground">  Freelancing & Task Management </h2>
              <p>We deliver specialized services through a sophisticated, seamless, and collaborative work environment, utilizing a high-impact workspace for productivity where rigorous controls are applied to every managed task. Our platform manages tasks from systems that require an in-person review, and we are actively seeking skilled Geeks 🤓 with proficient skills in AI training, App/website testing and review, surveys/polls, and product design aid. </p>
              <div className="order-first md:order-last">
                <div className="rounded-xl shadow-lg overflow-hidden h-48 sm:h-64 md:h-80">
                  <img
                    src="/images/1.gif"
                    alt="AI improving business and everyday life"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8 sm:space-y-12">
              {/* Sub-section 1 */}

                <div className="glass-panel rounded-xl p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 text-accent">AI in business & lifestyle enhancement</h3>
                  <p className="text-foreground/90 text-sm sm:text-base mb-4 leading-relaxed"> We harness network-enabled distribution and targeted engagement to provide efficient,  low-cost client reach. Our systems aim to maximize value for clients while creating predictable earning opportunities for contributors by combining human oversight with automated tooling.</p>
                  <p className="text-foreground/90 text-sm sm:text-base leading-relaxed"> Outcomes include improved product-market fit, higher quality data for AI training, and  scalable workflows that preserve data integrity and user wellbeing.</p>
                </div>
              {/* Sub-section 2 */}
                <div className="glass-panel rounded-xl p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 text-accent">AI in industrialization & productivity</h3>
                  <p className="text-foreground/90 text-sm sm:text-base mb-4 leading-relaxed">
                    We apply HITL methods to development workflows — optimizing systems with human-reviewed datasets and rigorous testing. This improves automation reliability and reduces costly  deployment regressions in production environments. Our approach emphasizes traceability, repeatable validation, and clear feedback loops between human reviewers and model engineers.</p>
                </div>
              {/* Sub-section 3 */}
                <div className="glass-panel rounded-xl p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 text-accent">AI for human health & wellbeing</h3>
                  <p className="text-foreground/90 text-sm sm:text-base mb-4 leading-relaxed">  In healthcare and wellbeing domains, human oversight is essential. We focus on careful curation and validation of sensitive datasets to reduce bias and improve model safety.
                  </p>
                  <p className="text-foreground/90 text-sm sm:text-base leading-relaxed"> Our workflow ensures ethical handling, clear documentation, and human-in-the-loop review  at every stage to protect users and drive better clinical and product outcomes. </p>
                </div>
              <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
                <div className="glass-panel rounded-xl p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 text-accent">Ai to Enhance Communication</h3>
                  <p className="text-foreground/90 text-sm sm:text-base mb-4 leading-relaxed">We hope to create a collaborative and seamless system integration to break barriers in communication, to ensure real-time knowledge exchange between system intelligence and human intelligence. This dynamic environment maximizes clarity and efficiency, transforming internal communication into a direct accelerator of project quality and innovation. Partner with us to leverage an infrastructure where effective communication directly translates into superior operational value. </p>
                </div>

                <div className="order-first md:order-last">
                  <div className="rounded-xl shadow-lg overflow-hidden h-48 sm:h-64 md:h-80">
                    <img
                      src="/images/contact_us.gif"
                      alt="AI supporting human health"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

                <div className="glass-panel rounded-xl p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 text-accent">AI to Enhance Human Intelligence</h3>
                  <p className="text-foreground/90 text-sm sm:text-base mb-4 leading-relaxed"> We are committed to actively training, compensating, and stabilizing a highly skilled human workforce, recognizing that human intelligence is the essential "in-the-loop" component that ensures quality and ethical alignment for cutting-edge systems. Our rigorous process of data purification and output review leverages human judgment to navigate complex edge cases, guaranteeing the integrity and reliability of every AI model and software system we manage. Choose a partner that invests in human intellect to secure the future of your technology. </p>
                </div>
            </div>
          </section>

          {/* Human Intelligence in the Loop */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-foreground">Human Intelligence in the Loop Integration</h2>
            <p> Our platform pioneers Human Intelligence in the Loop (HITL) integration, the optimal approach for high-stakes system development, where manual human testing synergizes with automated processes and new technology systems to ensure superior results. This methodology is crucial in AI Model Training, where our Geeks provide essential data purification, subjective labeling, and continuous feedback to mitigate model bias and enhance accuracy, and in App Testing Before Launch, where human intuition excels at exploratory testing, usability validation, and assessing complex user scenarios that automation alone cannot capture. By strategically filtering AI outputs for human review, and employing our skilled workforce to execute rigorous pre-launch functional and usability testing, we create a robust, continuous feedback cycle that guarantees the integrity of sensitive data and delivers innovation that is reliable, ethical, and fully aligned with real-world user needs. </p>
          </section>

          {/* Platform Details */}
          <section className="mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center text-foreground">Our Platform Design</h2>
            <p className="text-foreground/90 text-sm sm:text-base leading-relaxed">
              We deliver specialized services through a sophisticated, seamless work platform that cultivates a dynamic in-house environment designed for maximum collaboration and high-impact workspace productivity, ensuring rigorous controls are applied to every managed task. The operational core involves the precise sequence of purifying data, training models, and delivering rigorous testing for complex systems; this procedural rigor and controlled environment ensure the integrity of sensitive data and outputs, directly elevating innovations. Our platform architecture is engineered to optimize value exchange, fulfilling the mandate to minimize client costs while maximizing user earning potential through a robust proprietary system designed to track, reward, and optimize every platform interaction. We convert granular engagement—including actions like AI model training, software/website testing, surveys, and polls—into monetary value evaluations to reward our Geeks, thereby ensuring sustained worker engagement. We aim to control and stabilize the highly skilled workforce required for these tasks, ultimately maximizing platform efficiency and providing superior operational value across every step of the system development journey. </p>
          </section>

          {/* Call to Action */}
          <section className="text-center py-12 sm:py-16">
            <div className="glass-panel rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-foreground">Hey! We are hiring freelance Geeks! Apply now</h2>
              <p className="text-foreground/90 text-sm sm:text-base mb-8 max-w-2xl mx-auto leading-relaxed">  We are only looking for 60 more Geeks
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                <Button
                  onClick={() => setLocation("/auth")}
                  size="lg"
                  className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 text-sm sm:text-base font-semibold transform hover:scale-105 transition-all rounded-xl shadow-lg hover:shadow-xl">Join Our TaskForce Today
                </Button>
                <Button
                  onClick={() => setLocation("/contact-us")}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto border-2 border-foreground/50 text-foreground hover:bg-foreground/10 hover:border-foreground px-6 py-3 text-sm sm:text-base font-semibold transition-all rounded-xl backdrop-blur-sm" > Contact Us
                </Button>
              </div>
            </div>
          </section>

          {/* Back to Home */}
          <div className="text-center">
            <Button onClick={() => setLocation("/")} variant="ghost" size="lg" className="text-foreground hover:bg-foreground/10 px-6 py-3 text-sm sm:text-base font-semibold transition-all rounded-xl" > ← Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}