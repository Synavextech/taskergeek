export interface DatabaseUser {
  id: string; // UUID from Supabase auth.users
  email: string;
  name?: string;
  phone?: string;
  country?: string; // [NEW] Country field
  gender?: string;
  role: 'user' | 'admin';
  skill_upgrade_tier?: 'member' | 'silver' | 'bronze' | 'diamond' | 'gold' | 'vip';
  skill_upgrade_expiry?: string;
  referral_code?: string;
  referred_by?: string;
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  pending_verification: boolean;
  orientation_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTask {
  id: number;
  taskId: string; // [NEW] Universal Task ID (ptg#YYYY#XXX)
  title: string;
  description: string;
  category: 'main' | 'social' | 'surveys' | 'testing' | 'ai' | 'app'; // Added 'app' from json
  url?: string;
  reward: string | number; // JSON has numbers
  min_tier: 'member' | 'silver' | 'bronze' | 'diamond' | 'gold' | 'vip';
  is_active: boolean;
  is_orientation: boolean;
  created_at: string;
}

export interface DatabaseUserTask {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  task_id: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

export interface DatabaseSubscription {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  tier: 'member' | 'silver' | 'bronze' | 'diamond' | 'gold' | 'vip';
  amount: string;
  payment_method?: string;
  payment_reference?: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
}

export interface DatabaseWallet {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  available_balance: string;
  pending_balance: string;
  total_earnings: string;
  total_withdrawn: string;
  updated_at: string;
}

export interface DatabaseTransaction {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  type: 'earning' | 'withdrawal' | 'referral' | 'skill-upgrade';
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  description?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface DatabaseWithdrawal {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  amount: string;
  payment_method_id?: number;
  status: 'pending' | 'completed' | 'failed';
  admin_notes?: string;
  processed_at?: string;
  created_at: string;
}

export interface DatabaseOrder {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  order_id: string;
  payer_id?: string;
  payer_email?: string;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  skill_upgrade_tier: 'member' | 'silver' | 'bronze' | 'diamond' | 'gold' | 'vip';
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface DatabasePaymentMethod {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  type?: string;
  email: string;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseNotification {
  id: number;
  user_id: string; // UUID from Supabase auth.users
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata?: any;
  created_at: string;
}

// Export type aliases for convenience
export type User = DatabaseUser;
export type Task = DatabaseTask;
export type UserTask = DatabaseUserTask;
export type Subscription = DatabaseSubscription;
export type Wallet = DatabaseWallet;
export type Transaction = DatabaseTransaction;
export type Withdrawal = DatabaseWithdrawal;
export type Order = DatabaseOrder;
export type PaymentMethod = DatabasePaymentMethod;
export type Notification = DatabaseNotification;