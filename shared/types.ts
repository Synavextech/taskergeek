import { z } from "zod";
export const genderEnum = ['male', 'female', 'geek'] as const;
export const skillUpgradeTierEnum = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'premium', 'universal'] as const;
export const taskCategoryEnum = ['main', 'social', 'surveys', 'testing', 'ai', 'app'] as const;
export const taskTypeEnum = ['standard', 'project'] as const;
export const taskPreferenceEnum = ['standard', 'project', 'all'] as const;
export const taskStatusEnum = ['pending', 'approved', 'rejected', 'claimed', 'revision_requested', 'cancelled', 'submitted'] as const;
export const transactionTypeEnum = ['earning', 'withdrawal', 'referral', 'skill-upgrade'] as const;
export const transactionStatusEnum = ['pending', 'completed', 'failed'] as const;
export const roleEnum = ['user', 'admin'] as const;
export const approvalStatusEnum = ['pending', 'approved', 'rejected'] as const;
export const paymentMethodEnum = ['paypal', 'manual'] as const;
export const orderStatusEnum = ['pending', 'completed', 'failed', 'refunded'] as const;

export const SUPPORTED_COUNTRIES = [
  { code: 'USA', name: 'United States', flag: '🇺🇸' },
  { code: 'GBR', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CAN', name: 'Canada', flag: '🇨🇦' },
  { code: 'AUS', name: 'Australia', flag: '🇦🇺' },
  { code: 'GER', name: 'Germany', flag: '🇩🇪' },
  { code: 'FRA', name: 'France', flag: '🇫🇷' },
  { code: 'ESP', name: 'Spain', flag: '🇪🇸' },
  { code: 'ITA', name: 'Italy', flag: '🇮🇹' },
  { code: 'SWE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'IRE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'JPN', name: 'Japan', flag: '🇯🇵' },
  { code: 'SGP', name: 'Singapore', flag: '🇸🇬' },
  { code: 'ARE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷' },
  { code: 'BRA', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MEX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'IND', name: 'India', flag: '🇮🇳' },
  { code: 'TUR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'RUS', name: 'Russia', flag: '🇷🇺' },
  { code: 'CHN', name: 'China', flag: '🇨🇳' },
] as const;

export const REGION_UNAVAILABLE_NOTICE = `ProtaskerGeek Registration - unavailable notices
Hello,
Thank you for your interest in joining Protaskergeek.
However, we regret to inform you that at the moment, we are not able to provide service in your location. We apologize for any inconvenience this may have caused.
Best regards,
The ProtaskerGeek Team`;

export function matchSupportedCountry(input: string | undefined | null): { code: string; name: string; flag: string } | null {
  if (!input || !input.trim()) return null;
  const clean = input.trim().toLowerCase();

  const aliasMap: Record<string, string> = {
    'us': 'USA', 'usa': 'USA', 'u.s.': 'USA', 'u.s.a.': 'USA', 'united states': 'USA', 'united states of america': 'USA', 'america': 'USA',
    'uk': 'GBR', 'gbr': 'GBR', 'u.k.': 'GBR', 'united kingdom': 'GBR', 'great britain': 'GBR', 'england': 'GBR', 'scotland': 'GBR', 'wales': 'GBR',
    'ca': 'CAN', 'can': 'CAN', 'canada': 'CAN',
    'au': 'AUS', 'aus': 'AUS', 'australia': 'AUS',
    'de': 'GER', 'ger': 'GER', 'germany': 'GER', 'deutschland': 'GER',
    'fr': 'FRA', 'fra': 'FRA', 'france': 'FRA',
    'es': 'ESP', 'esp': 'ESP', 'spain': 'ESP', 'españa': 'ESP',
    'it': 'ITA', 'ita': 'ITA', 'italy': 'ITA', 'italia': 'ITA',
    'se': 'SWE', 'swe': 'SWE', 'sweden': 'SWE', 'sverige': 'SWE',
    'ie': 'IRE', 'ire': 'IRE', 'ireland': 'IRE',
    'jp': 'JPN', 'jpn': 'JPN', 'japan': 'JPN',
    'sg': 'SGP', 'sgp': 'SGP', 'singapore': 'SGP',
    'ae': 'ARE', 'are': 'ARE', 'uae': 'ARE', 'u.a.e.': 'ARE', 'united arab emirates': 'ARE', 'dubai': 'ARE', 'abu dhabi': 'ARE',
    'ar': 'ARG', 'arg': 'ARG', 'argentina': 'ARG',
    'br': 'BRA', 'bra': 'BRA', 'brazil': 'BRA', 'brasil': 'BRA',
    'mx': 'MEX', 'mex': 'MEX', 'mexico': 'MEX', 'méxico': 'MEX',
    'in': 'IND', 'ind': 'IND', 'india': 'IND',
    'tr': 'TUR', 'tur': 'TUR', 'turkey': 'TUR', 'türkiye': 'TUR',
    'ru': 'RUS', 'rus': 'RUS', 'russia': 'RUS',
    'cn': 'CHN', 'chn': 'CHN', 'china': 'CHN'
  };

  if (aliasMap[clean]) {
    const code = aliasMap[clean];
    return SUPPORTED_COUNTRIES.find(c => c.code === code) || null;
  }

  const found = SUPPORTED_COUNTRIES.find(
    c => c.code.toLowerCase() === clean || c.name.toLowerCase() === clean
  );
  if (found) return found;

  return null;
}

export interface TaskDisciplineMeta {
  category: TaskCategory;
  name: string;
  icon: string;
  description: string;
  recommendedMinTier: SkillUpgradeTier;
  badgeClass: string;
}

export const TASK_DISCIPLINES: TaskDisciplineMeta[] = [
  {
    category: 'ai',
    name: 'AI Training',
    icon: '🤖',
    description: 'Train frontier AI models via reasoning validation, RLHF, and prompt-response ranking.',
    recommendedMinTier: 'vip',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  },
  {
    category: 'testing',
    name: 'App & Web Testing',
    icon: '⚙️',
    description: 'Quality assurance, functional validation, UX inspection, and pre-launch bug hunts.',
    recommendedMinTier: 'gold',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    category: 'surveys',
    name: 'Surveys & Polls',
    icon: '📊',
    description: 'Market intelligence, demographic surveys, and product viability evaluations.',
    recommendedMinTier: 'diamond',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    category: 'social',
    name: 'Social Engagement',
    icon: '👥',
    description: 'Community engagement, platform content validation, and discussion management.',
    recommendedMinTier: 'silver',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    category: 'app',
    name: 'Application Tasks',
    icon: '📱',
    description: 'Mobile app workflows, software installation verification, UX engagement, and beta testing.',
    recommendedMinTier: 'bronze',
    badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  },
  {
    category: 'main',
    name: 'Core Verification',
    icon: '📋',
    description: 'Foundational data purification, basic tasks, and platform benchmarks.',
    recommendedMinTier: 'member',
    badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
  },
];

// TypeScript types for Supabase
export type Gender = typeof genderEnum[number];
export type SkillUpgradeTier = typeof skillUpgradeTierEnum[number];
export type TaskCategory = typeof taskCategoryEnum[number];
export type TaskType = typeof taskTypeEnum[number];
export type TaskPreference = typeof taskPreferenceEnum[number];
export type TaskStatus = typeof taskStatusEnum[number];
export type TransactionType = typeof transactionTypeEnum[number];
export type TransactionStatus = typeof transactionStatusEnum[number];
export type Role = typeof roleEnum[number];
export type ApprovalStatus = typeof approvalStatusEnum[number];
export type PaymentMethodType = typeof paymentMethodEnum[number];
export type OrderStatus = typeof orderStatusEnum[number];

// Project structure interfaces
export interface ProjectTaskItem {
  id: string;
  title: string;
  description: string;
  type?: 'question' | 'checklist' | 'text' | 'file' | 'choice';
  estimated_duration_minutes: number;
  options?: string[];
  required?: boolean;
}

export interface ProjectSubsection {
  id: string;
  title: string;
  description?: string;
  tasks: ProjectTaskItem[];
}

export interface ProjectSection {
  id: string;
  title: string;
  description?: string;
  subsections: ProjectSubsection[];
}

export interface UserStats {
  user_id: string;
  tasks_completed: number;
  tasks_approved: number;
  tasks_rejected?: number;
  tasks_cancelled?: number;
  rating?: number;          // Legacy/Completion rate
  completion_rate?: number; // Completion/Success rate from 0-100%
  quality_rating?: number;  // Quality rating from 0.00 to 5.00
  updated_at?: string;
}

export interface User {
  id: string; // UUID from Supabase auth.users
  name: string;
  phone: string | null;
  email: string;
  gender: Gender;
  role: Role;
  skill_upgrade_tier: SkillUpgradeTier | null;
  skill_upgrade_expiry: string | null;
  referral_code?: string;
  referred_by?: string;
  is_active: boolean;
  is_suspended?: boolean;
  suspension_end_date?: string | null;
  approval_status: ApprovalStatus;
  verification_status?: string;
  pending_verification: boolean;
  verification_documents?: string[];
  orientation_complete: boolean;
  grammar_test_attempts?: number;
  grammar_test_passed?: boolean;
  grammar_test_score?: number;
  tasks_completed?: number; // Total tasks completed
  tasks_approved?: number;  // Tasks that were approved
  rating?: number;          // Completion rate from 0-100%
  completion_rate?: number; // Success/Completion rate from 0-100%
  quality_rating?: number;  // Quality rating from 0.00 to 5.00
  task_preference?: TaskPreference; // Preferred task types: standard, project, or all
  has_project_access?: boolean;     // Whether user has unlocked project-based hourly tasks
  has_pending_upgrade?: boolean;
  country?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    session?: any;
  };
  redirect?: string;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export interface Task {
  id: string; // UUID from Supabase
  is_orientation: boolean;
  title: string;
  description: string;
  category: TaskCategory;
  task_type?: TaskType;            // 'standard' (fixed reward) or 'project' (hourly rate)
  url?: string;
  reward: string | number;         // Fixed reward amount for standard tasks or base reference
  hourly_rate?: string | number;   // Specific compensation rate per hour for project tasks
  max_participants?: number;       // Maximum participants cap for the project
  current_participants?: number;   // Number of active participants claimed
  estimated_duration_minutes?: number; // Approximated completion duration
  required_skills?: string[];      // Required qualifications/skills
  project_structure?: ProjectSection[]; // Structured sections, subsections, and questions/tasks
  spotsRemaining?: number;         // Dynamic remaining spots (max_participants - current_participants)
  min_tier: SkillUpgradeTier;
  is_active: boolean;
  attachments?: any;
  instructions?: string;
  created_at: string;
}

// UserTask
export interface UserTask {
  id: string; // UUID
  user_id: string; // UUID from Supabase auth.users
  task_id: string; // UUID
  status: TaskStatus;
  submission_description?: string; // Submitter's deliverable notes
  rejection_reason?: string;
  feedback?: string; // For revision requests
  quality_rating?: number;         // Quality rating 0.00 - 5.00 awarded on approval/rejection
  time_spent_seconds?: number;     // Tracked working time in seconds
  hourly_rate?: string | number;   // Hourly compensation rate active at claim time
  accrued_earnings?: string | number; // Calculated earnings based on working time
  project_responses?: Record<string, any>; // User answers and progress on project sections
  proof_attachments?: any;
  feedback_attachments?: any;
  created_at: string;
  task?: Task; // Joined task details
}

export interface Subscription {
  id: string; // UUID
  user_id: string; // UUID from Supabase auth.users
  tier: SkillUpgradeTier;
  amount: string;
  payment_method: PaymentMethod;
  payment_reference?: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export interface Wallet {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  available_balance: string;
  pending_balance: string;
  total_earnings: string;
  total_withdrawn: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  type: TransactionType;
  amount: string;
  status: TransactionStatus;
  reference?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface Withdrawal {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  amount: string;
  payment_method_id?: number;
  status: TransactionStatus;
  admin_notes?: string;
  processed_at?: string;
  created_at: string;
}

export interface Order {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  order_id: string;
  payer_id?: string;
  payer_email?: string;
  amount: string;
  currency: string;
  status: OrderStatus;
  skill_upgrade_tier: SkillUpgradeTier;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  type: PaymentMethodType;
  email: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata?: any;
  created_at: string;
}

export interface Friend {
  id: number;
  user_id: string; // The one who sent the request
  friend_id: string; // The one who received the request
  status: 'pending' | 'accepted';
  created_at: string;
  sender?: User;
  receiver?: User;
}

export interface TaskRecommendation {
  id: string; // UUID
  sender_id: string;
  receiver_id: string;
  task_id: string; // UUID
  message?: string;
  is_read: boolean;
  created_at: string;
  task?: Task; // For joined queries
  sender?: User; // For joined queries
}

// Orientation status type
export interface CategoryProgress {
  completedTasks: number[];
  isCompleted: boolean;
}

export interface OrientationStatus {
  main: CategoryProgress;
  social: CategoryProgress;
  surveys: CategoryProgress;
  testing: CategoryProgress;
  ai: CategoryProgress;
  app?: CategoryProgress;
  overallCompleted: boolean;
}

// Input schemas using Zod
export const insertUserSchema = z.object({
  name: z.string().min(1, "Please enter your legal full name"),
  phone: z.string().min(1, "Please enter your phone number").refine((val) => {
    if (!val || val.trim() === "") return false;
    return /^\+[1-9]\d{1,14}$/.test(val.replace(/\s+/g, ''));
  }, {
    message: "Please enter a valid phone number with country code (e.g., +1234567890)"
  }),
  email: z.string().min(1, "Please enter your email address").refine((email) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }, "Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  gender: z.enum(genderEnum),
  country: z.string().min(1, "Please enter your country of residence"),
  referredBy: z.string().optional(),
  approvalStatus: z.enum(approvalStatusEnum).optional().default('pending'),
  taskPreference: z.enum(taskPreferenceEnum).optional().default('all'),
});

export const insertTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(taskCategoryEnum),
  taskType: z.enum(taskTypeEnum).optional().default('standard'),
  url: z.string().url().optional().or(z.literal("")),
  reward: z.coerce.string().refine((val) => /^\d*\.?\d*$/.test(val) && val !== "", "Invalid reward amount"),
  hourlyRate: z.coerce.string().optional(),
  maxParticipants: z.coerce.number().int().positive().optional().default(1),
  currentParticipants: z.coerce.number().int().nonnegative().optional().default(0),
  estimatedDurationMinutes: z.coerce.number().int().positive().optional(),
  requiredSkills: z.any().optional(),
  projectStructure: z.any().optional(),
  minTier: z.enum(skillUpgradeTierEnum),
  isActive: z.boolean().optional(),
  isOrientation: z.boolean().optional(),
  attachments: z.any().optional(),
  instructions: z.string().optional(),
});

export const insertUserTaskSchema = z.object({
  taskId: z.string().uuid("Invalid Task ID"),
  status: z.enum(taskStatusEnum).optional(),
  rejectionReason: z.string().optional(),
  qualityRating: z.number().min(0).max(5).optional(),
  timeSpentSeconds: z.number().int().nonnegative().optional(),
  hourlyRate: z.coerce.string().optional(),
  accruedEarnings: z.coerce.string().optional(),
  projectResponses: z.any().optional(),
  proof_attachments: z.any().optional(),
  feedback_attachments: z.any().optional(),
});

export const insertSkillUpgradeSchema = z.object({
  tier: z.enum(skillUpgradeTierEnum),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  paymentMethod: z.enum(paymentMethodEnum).optional(),
  paymentReference: z.string().optional(),
  transactionCode: z.string().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime(),
});

export const insertWithdrawalSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  paymentMethodId: z.number().optional(),
  status: z.enum(transactionStatusEnum).optional(),
});

export const insertOrderSchema = z.object({
  userId: z.string().min(1, "User ID is required"), // UUID from Supabase auth.users
  orderId: z.string().min(1, "Order ID is required"),
  payerId: z.string().optional(),
  payerEmail: z.string().optional().refine((email) => {
    if (!email) return true; // Optional field, so empty is valid
    // More permissive email validation that accepts most valid formats
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }, "Please enter a valid email address"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  currency: z.string().default("USD"),
  status: z.enum(orderStatusEnum).optional(),
  skillUpgradeTier: z.enum(skillUpgradeTierEnum),
  metadata: z.any().optional(),
});

export const insertPaymentMethodSchema = z.object({
  type: z.enum(paymentMethodEnum).optional(),
  email: z.string().min(1, "Email is required").refine((email) => {
    // More permissive email validation that accepts most valid formats
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }, "Please enter a valid email address"),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").refine((email) => {
    // More permissive email validation that accepts most valid formats
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
  }, "Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type InsertUserTask = z.infer<typeof insertUserTaskSchema>;
export type InsertSkillUpgrade = z.infer<typeof insertSkillUpgradeSchema>;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Assessment Interfaces
export interface AssessmentQuestionMCQ {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: number;
  category?: string;
  explanation?: string;
}

export interface AssessmentQuestionWritten {
  id: string;
  question: string;
  category?: string;
  minWords?: number; // 1500 words minimum
  maxWords?: number; // 5000 words maximum
  instructions?: string;
}

export interface AssessmentSubmission {
  id?: string;
  user_id: string;
  assessment_type: 'grammar' | 'discipline' | 'hourly';
  discipline_id?: string;
  mcq_answers?: Record<string, number>;
  written_answers?: Record<string, string>;
  score?: number;
  total_questions?: number;
  passed: boolean;
  attempt_number?: number;
  created_at?: string;
}