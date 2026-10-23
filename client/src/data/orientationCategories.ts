// client/src/data/orientationCategories.ts
export interface OrientationCategoryMeta {
  id: string;
  title: string;
  discipline: string;
  description: string;
  earnings: number;
}

export const defaultOrientationCategories: OrientationCategoryMeta[] = [
  {
    id: "main",
    title: "Core Verification & Benchmarks",
    discipline: "Advanced Reasoning & Quality Standards",
    description: "Foundational data purification, benchmark verification, platform rubric integrity, and high-context factual consistency checks.",
    earnings: 0.25
  },
  {
    id: "social",
    title: "Social Media & Community Engagement",
    discipline: "Multilingual & Computational NLP",
    description: "Community engagement, conversational empathy evaluation, cross-cultural idiom verification, and discussion sentiment moderation.",
    earnings: 0.30
  },
  {
    id: "surveys",
    title: "Surveys, Polls & Market Intelligence",
    discipline: "Natural Sciences & STEM Research",
    description: "Empirical market intelligence, clinical study data validation, demographic opinion gathering, and statistical consistency analysis.",
    earnings: 0.20
  },
  {
    id: "testing",
    title: "App & Web Quality Assurance",
    discipline: "Software & Code Generation",
    description: "Rigorous quality assurance, end-to-end regression testing, accessibility audits, usability inspection, and bug reports.",
    earnings: 0.35
  },
  {
    id: "ai",
    title: "AI Training & Model Alignment",
    discipline: "AI Safety, Ethics & Red Teaming",
    description: "Frontier model alignment via RLHF pairwise ranking, adversarial jailbreak testing, hallucination mitigation, and reasoning evaluation.",
    earnings: 0.40
  },
  {
    id: "app",
    title: "Application Workflows & UI Inspection",
    discipline: "Software Engineering & Mobile Systems",
    description: "Mobile and software application workflows, session persistence checks, responsive layout across viewports, and beta testing.",
    earnings: 0.35
  }
];

// Category info lookup dictionary
export const categoryInfo: Record<string, { title: string; description: string; discipline: string }> = {
  main: {
    title: "Core Verification",
    description: "Foundational data purification and platform quality standards",
    discipline: "Advanced Reasoning"
  },
  social: {
    title: "Social Media",
    description: "Community engagement, conversational sentiment, and content moderation",
    discipline: "Computational NLP"
  },
  surveys: {
    title: "Surveys & Polls",
    description: "Market intelligence, demographic surveys, and empirical research",
    discipline: "Natural Sciences & STEM"
  },
  testing: {
    title: "App Testing",
    description: "Quality assurance, functional regression, and UI bug hunts",
    discipline: "Software & Code Generation"
  },
  ai: {
    title: "AI Training",
    description: "Frontier model training, RLHF feedback, and safety red teaming",
    discipline: "AI Safety & Ethics"
  },
  app: {
    title: "Application Tasks",
    description: "Mobile workflows, session persistence, and responsive UI testing",
    discipline: "Mobile & Desktop Systems"
  }
};