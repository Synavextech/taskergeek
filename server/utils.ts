import crypto from 'crypto';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function generateTaskId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const timestamp = Date.now().toString().slice(-4);
  return `PTG#${year}#${random}${timestamp}`;
}

export async function hashPassword(password: string): Promise<string> {
  // Use bcrypt with cost factor of 12 (≥ 10 as required)
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export function validatePhone(phone: string): boolean {
  // Basic Kenyan phone number validation
  const phoneRegex = /^(\+254|254|0)?[7-9]\d{8}$/;
  return phoneRegex.test(phone);
}

export function formatPhone(phone: string): string {
  // Normalize phone number to +254 format
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('254')) {
    // Already in correct format
  } else if (cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }

  return '+' + cleaned;
}

export function generateTransactionReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN_${timestamp}_${random}`.toUpperCase();
}

export function calculateSubscriptionExpiry(tier: string): Date {
  // All subscriptions last 30 days
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

export function getTierLimits(tier: string): { dailyTasks: number; categories: string[] } {
  const tierConfig = {
    member: { dailyTasks: 1, categories: ['main'] },
    silver: { dailyTasks: 5, categories: ['main', 'social'] },
    bronze: { dailyTasks: 10, categories: ['main', 'social'] },
    diamond: { dailyTasks: 15, categories: ['main', 'social', 'surveys'] },
    gold: { dailyTasks: 20, categories: ['main', 'social', 'surveys', 'testing'] },
    vip: { dailyTasks: 25, categories: ['main', 'social', 'surveys', 'testing', 'ai'] },
    universal: { dailyTasks: 50, categories: ['main', 'social', 'surveys', 'testing', 'ai', 'app'] },
    premium: { dailyTasks: 999, categories: ['main', 'social', 'surveys', 'testing', 'ai', 'app'] },
  };

  return tierConfig[tier as keyof typeof tierConfig] || tierConfig.member;
}

export function canAccessTask(userTier: string, taskTier: string): boolean {
  const tierOrder = ['member', 'silver', 'bronze', 'diamond', 'gold', 'vip', 'universal', 'premium'];
  const userTierIndex = tierOrder.indexOf(userTier);
  const taskTierIndex = tierOrder.indexOf(taskTier);

  return userTierIndex >= taskTierIndex;
}

export function calculateReferralBonus(subscriptionAmount: number): number {
  // 10% referral bonus
  return subscriptionAmount * 0.1;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  // Basic input sanitization
  return input.trim().replace(/[<>]/g, '');
}

export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createAuditLog(action: string, userId: number, metadata?: any): any {
  return {
    action,
    userId,
    timestamp: new Date(),
    ip: 'system', // In real implementation, get from request
    userAgent: 'system',
    metadata: metadata || {},
  };
}

// Helper to load config files with fallback paths for dev/production
function loadConfigFile(filename: string): any {
  const devPath = path.join(__dirname, '..', 'server', 'config', filename);
  const prodPath = path.join(__dirname, 'config', filename);
  const bundledPath = path.join(process.cwd(), 'dist', 'config', filename);

  // Try production/bundled path first, then dev path
  const paths = [prodPath, bundledPath, devPath];

  for (const filePath of paths) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (error) {
      continue;
    }
  }

  console.warn(`Could not load ${filename} from any of the paths:`, paths);
  return {};
}

// Load enums from JSON file
let enums: Record<string, string[]>;
try {
  enums = loadConfigFile('enums.json');
} catch (error) {
  console.error('Error loading enums.json:', error);
  enums = {};
}

export function validateEnum(type: string, value: string): boolean {
  return enums[type]?.includes(value) || false;
}

export function getEnumValues(type: string): string[] {
  return enums[type] || [];
}

// Load config from JSON file
let config: Record<string, string>;
try {
  config = loadConfigFile('config.json');
} catch (error) {
  console.error('Error loading config.json:', error);
  config = {};
}

export function getConfig(key: string, defaultValue: string | null = null): string | null {
  return config[key] || defaultValue;
}

export function getConfigNumber(key: string, defaultValue: number = 0): number {
  const value = config[key];
  const parsed = value ? parseFloat(value) : defaultValue;
  return isNaN(parsed) ? defaultValue : parsed;
}

export function getConfigBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = config[key];
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
}

// Completion / Success rate calculation function (0-100 scale)
// Enforced automatically based on tasks stats: increases on approval, reduces on cancellation/rejection
export function calculateCompletionRate(tasksApproved: number, tasksRejected: number, tasksCancelled: number): number {
  const totalHandled = tasksApproved + tasksRejected + tasksCancelled;
  if (totalHandled === 0) return 100; // New users start with 100% completion rate
  return Math.round((tasksApproved / totalHandled) * 100);
}

// User quality rating calculation function (0.00 - 5.00 scale)
// Represents the quality of tasks submitted after completion - rated by admin on task review
export function calculateQualityRating(ratings: number[]): number {
  if (!ratings || ratings.length === 0) return 5.0; // New users start with 5.0 quality rating
  const validRatings = ratings.filter(r => typeof r === 'number' && !isNaN(r) && r >= 0 && r <= 5);
  if (validRatings.length === 0) return 5.0;
  const sum = validRatings.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / validRatings.length).toFixed(2));
}

// User rating calculation function (1-100 scale) - backwards compatible alias
export function calculateUserRating(tasksApproved: number, tasksCompleted: number): number {
  if (tasksCompleted === 0) return 100; // New users start with 100% rating
  return Math.round((tasksApproved / tasksCompleted) * 100);
}
