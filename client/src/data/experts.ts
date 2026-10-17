export interface ExpertProfile {
  id: string;
  name: string;
  role: string;
  specialty: string;
  country: string;
  countryCode: string;
  avatar: string;
  rating: number;
  tasksCompleted: number;
  hourlyRate: string;
  verified: boolean;
}

export const EXPERTS_DATA: ExpertProfile[] = [
  {
    id: "exp-1",
    name: "Dr. Elena Rostova",
    role: "AI Alignment Researcher",
    specialty: "LLM Reasoning & Safety",
    country: "Estonia",
    countryCode: "EE",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80",
    rating: 4.98,
    tasksCompleted: 840,
    hourlyRate: "$45/hr",
    verified: true
  },
  {
    id: "exp-2",
    name: "Kenji Sato",
    role: "Senior Python & ML Engineer",
    specialty: "Code Generation & RLHF",
    country: "Japan",
    countryCode: "JP",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80",
    rating: 4.95,
    tasksCompleted: 1250,
    hourlyRate: "$50/hr",
    verified: true
  },
  {
    id: "exp-3",
    name: "Amara Okafor",
    role: "Computational Linguist",
    specialty: "Multilingual NLP & Semantics",
    country: "Nigeria",
    countryCode: "NG",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
    rating: 5.0,
    tasksCompleted: 980,
    hourlyRate: "$42/hr",
    verified: true
  },
  {
    id: "exp-4",
    name: "Dr. Lucas Silva",
    role: "Bioinformatics Specialist",
    specialty: "Genomic Data & Clinical AI",
    country: "Brazil",
    countryCode: "BR",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80",
    rating: 4.97,
    tasksCompleted: 620,
    hourlyRate: "$48/hr",
    verified: true
  },
  {
    id: "exp-5",
    name: "Sofia Lindström",
    role: "Mathematical Logician",
    specialty: "Formal Proof Verification",
    country: "Sweden",
    countryCode: "SE",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80",
    rating: 4.99,
    tasksCompleted: 1140,
    hourlyRate: "$55/hr",
    verified: true
  },
  {
    id: "exp-6",
    name: "Devansh Patel",
    role: "Full-Stack System Architect",
    specialty: "TypeScript & Systems Architecture",
    country: "India",
    countryCode: "IN",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&auto=format&fit=crop&q=80",
    rating: 4.96,
    tasksCompleted: 1420,
    hourlyRate: "$46/hr",
    verified: true
  },
  {
    id: "exp-7",
    name: "Claire Dupont",
    role: "Ethics & Governance Analyst",
    specialty: "AI Governance & Bias Auditing",
    country: "France",
    countryCode: "FR",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=160&auto=format&fit=crop&q=80",
    rating: 4.94,
    tasksCompleted: 710,
    hourlyRate: "$40/hr",
    verified: true
  },
  {
    id: "exp-8",
    name: "Mateo Hernandez",
    role: "Computer Vision Lead",
    specialty: "3D Spatial & Video Annotation",
    country: "Mexico",
    countryCode: "MX",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160&auto=format&fit=crop&q=80",
    rating: 4.98,
    tasksCompleted: 890,
    hourlyRate: "$44/hr",
    verified: true
  },
  {
    id: "exp-9",
    name: "Ingrid Krause",
    role: "Quantum Computing Fellow",
    specialty: "Quantum Circuit Synthesis",
    country: "Germany",
    countryCode: "DE",
    avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=160&auto=format&fit=crop&q=80",
    rating: 5.0,
    tasksCompleted: 530,
    hourlyRate: "$60/hr",
    verified: true
  },
  {
    id: "exp-10",
    name: "Tariq Al-Mansoor",
    role: "Quantitative Risk Analyst",
    specialty: "Financial Modeling & Algo Testing",
    country: "UAE",
    countryCode: "AE",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=160&auto=format&fit=crop&q=80",
    rating: 4.93,
    tasksCompleted: 670,
    hourlyRate: "$47/hr",
    verified: true
  },
  {
    id: "exp-11",
    name: "Chloe MacLeod",
    role: "Cognitive Scientist",
    specialty: "Human-in-the-Loop Interaction",
    country: "United Kingdom",
    countryCode: "GB",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&auto=format&fit=crop&q=80",
    rating: 4.99,
    tasksCompleted: 1100,
    hourlyRate: "$52/hr",
    verified: true
  },
  {
    id: "exp-12",
    name: "Chen Wei",
    role: "Deep Learning Specialist",
    specialty: "Transformer Architectures & SFT",
    country: "Singapore",
    countryCode: "SG",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160&auto=format&fit=crop&q=80",
    rating: 4.97,
    tasksCompleted: 1310,
    hourlyRate: "$50/hr",
    verified: true
  },
  {
    id: "exp-13",
    name: "Ananya Sharma",
    role: "Algorithm Optimization Lead",
    specialty: "Graph Theory & Combinatorics",
    country: "Canada",
    countryCode: "CA",
    avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=160&auto=format&fit=crop&q=80",
    rating: 4.96,
    tasksCompleted: 950,
    hourlyRate: "$45/hr",
    verified: true
  },
  {
    id: "exp-14",
    name: "Liam O'Connor",
    role: "Security & Red Teaming Lead",
    specialty: "Jailbreak Testing & LLM Defense",
    country: "Ireland",
    countryCode: "IE",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=160&auto=format&fit=crop&q=80",
    rating: 4.99,
    tasksCompleted: 1470,
    hourlyRate: "$55/hr",
    verified: true
  },
  {
    id: "exp-15",
    name: "Yuki Tanaka",
    role: "Robotics Perception Engineer",
    specialty: "Sensor Fusion & SLAM",
    country: "South Korea",
    countryCode: "KR",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160&auto=format&fit=crop&q=80",
    rating: 4.95,
    tasksCompleted: 780,
    hourlyRate: "$48/hr",
    verified: true
  },
  {
    id: "exp-16",
    name: "Santiago Rossi",
    role: "Legal Tech & IP Expert",
    specialty: "Contract Intelligence & Legal AI",
    country: "Argentina",
    countryCode: "AR",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&auto=format&fit=crop&q=80",
    rating: 4.92,
    tasksCompleted: 640,
    hourlyRate: "$40/hr",
    verified: true
  },
  {
    id: "exp-17",
    name: "Fatima Zahra",
    role: "Data Quality Specialist",
    specialty: "Ground Truth Label Verification",
    country: "Morocco",
    countryCode: "MA",
    avatar: "https://images.unsplash.com/photo-1548142813-c348350df52b?w=160&auto=format&fit=crop&q=80",
    rating: 4.98,
    tasksCompleted: 860,
    hourlyRate: "$42/hr",
    verified: true
  },
  {
    id: "exp-18",
    name: "Markus Vance",
    role: "Cloud Systems Architect",
    specialty: "Distributed Model Serving & Scale",
    country: "United States",
    countryCode: "US",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=160&auto=format&fit=crop&q=80",
    rating: 4.96,
    tasksCompleted: 1540,
    hourlyRate: "$55/hr",
    verified: true
  },
  {
    id: "exp-19",
    name: "Zuzanna Kowalska",
    role: "NLP Corpus Specialist",
    specialty: "Dialogue Evaluation & SFT",
    country: "Poland",
    countryCode: "PL",
    avatar: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=160&auto=format&fit=crop&q=80",
    rating: 4.97,
    tasksCompleted: 910,
    hourlyRate: "$44/hr",
    verified: true
  },
  {
    id: "exp-20",
    name: "Kofi Mensah",
    role: "Edge Computing Engineer",
    specialty: "Model Quantization & Mobile AI",
    country: "Ghana",
    countryCode: "GH",
    avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=160&auto=format&fit=crop&q=80",
    rating: 5.0,
    tasksCompleted: 1190,
    hourlyRate: "$46/hr",
    verified: true
  }
];
