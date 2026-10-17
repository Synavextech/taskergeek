// client/src/data/orientationCategories.ts
export const defaultOrientationCategories = [
  {
    id: "main",
    title: "Main Tasks",
    description: "Essential platform tasks that form the foundation of your work. Learn the basics of task completion, submission guidelines, and quality standards.",
    earnings: 0.25
  },
  {
    id: "social",
    title: "Social Media",
    description: "Social engagement tasks including content creation, community management, and social media optimization strategies.",
    earnings: 0.30
  },
  {
    id: "surveys",
    title: "Surveys & Polls",
    description: "Market research tasks involving data collection, opinion gathering, and consumer behavior analysis.",
    earnings: 0.20
  },
  {
    id: "testing",
    title: "App/Website Testing",
    description: "Quality assurance tasks for applications and websites. Test functionality, usability, and report bugs.",
    earnings: 0.35
  },
  {
    id: "ai",
    title: "AI Training",
    description: "Help train AI models through data labeling, content validation, and machine learning task completion.",
    earnings: 0.40
  },
  {
    id: "app",
    title: "Application Tasks",
    description: "Mobile and software application workflows, mobile UI checks, installation verifications, and app engagement.",
    earnings: 0.35
  }
];

// Category info lookup dictionary
export const categoryInfo = {
  main: { title: "Main Tasks", description: "Essential platform tasks" },
  social: { title: "Social Media", description: "Social engagement tasks" },
  surveys: { title: "Surveys & Polls", description: "Market research tasks" },
  testing: { title: "App Testing", description: "Test apps and websites" },
  ai: { title: "AI Training", description: "Help train AI models" },
  app: { title: "Application Tasks", description: "Mobile and desktop application tasks" }
};