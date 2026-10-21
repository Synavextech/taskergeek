import { callRPC } from './supabase';
import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  User, Task, UserTask, Subscription, Wallet, Transaction, Withdrawal,
  Notification, Order, PaymentMethod, InsertUser, InsertTask, InsertUserTask,
  InsertSkillUpgrade, InsertWithdrawal, InsertOrder, InsertPaymentMethod,
  Friend, TaskRecommendation
} from '@shared/types';
import { generateReferralCode, calculateUserRating, calculateCompletionRate, calculateQualityRating, generateTaskId } from './utils';

export const storage = {
  // User management
  async getUser(client: SupabaseClient, id: string): Promise<User | null> {
    const { data: userRecord, error: userError } = await client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !userRecord) return null;

    const user = { ...userRecord } as any;
    const { data: statsRecord } = await client
      .from('user_stats')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    if (statsRecord) {
      user.tasks_completed = statsRecord.tasks_completed;
      user.tasks_approved = statsRecord.tasks_approved;
      user.rating = statsRecord.completion_rate ?? statsRecord.rating ?? 100;
      user.completion_rate = statsRecord.completion_rate ?? statsRecord.rating ?? 100;
      user.quality_rating = statsRecord.quality_rating != null ? parseFloat(statsRecord.quality_rating) : 5.0;
    } else {
      user.tasks_completed = 0;
      user.tasks_approved = 0;
      user.rating = 100;
      user.completion_rate = 100;
      user.quality_rating = 5.0;
    }

    user.task_preference = userRecord.task_preference || 'all';
    user.has_project_access = userRecord.has_project_access || userRecord.role === 'admin';

    const { data: pendingUpgrade } = await client
      .from('manual_subscriptions')
      .select('id')
      .eq('user_id', id)
      .eq('status', 'pending')
      .maybeSingle();

    user.has_pending_upgrade = !!pendingUpgrade;
    return user as User;
  },

  async getUserByPhone(client: SupabaseClient, phone: string): Promise<User | null> {
    const { data: userRecord, error: userError } = await client
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (userError || !userRecord) return null;
    return this.getUser(client, userRecord.id);
  },

  async getUserByEmail(client: SupabaseClient, email: string): Promise<User | null> {
    const { data: userRecord, error: userError } = await client
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userRecord) return null;
    return this.getUser(client, userRecord.id);
  },

  async createUser(client: SupabaseClient, insertUser: InsertUser): Promise<User> {
    const referralCode = generateReferralCode();
    const userData = {
      name: insertUser.name,
      phone: insertUser.phone || null,
      email: insertUser.email,
      gender: insertUser.gender,
      country: insertUser.country || null,
      role: 'user' as const,
      skill_upgrade_tier: 'member' as const,
      referral_code: referralCode,
      referred_by: insertUser.referredBy || null,
      is_active: true,
      approval_status: insertUser.approvalStatus || 'pending' as const,
      task_preference: (insertUser as any).taskPreference || 'all',
      has_project_access: false,
      quality_rating: 5.0,
      completion_rate: 100,
      orientation_complete: false
    };
    const { data, error } = await client.from('users').insert(userData).select().single();
    if (error) throw error;

    await this.createWallet(client, data.id);
    return data as User;
  },

  async updateUser(client: SupabaseClient, id: string, updates: Partial<User>): Promise<User | null> {
    const { data, error } = await client.from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return null;
    return data as User;
  },

  async updateUserStats(client: SupabaseClient, userId: string): Promise<void> {
    try {
      const { count: approvedCount } = await client.from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'approved');

      const { count: rejectedCount } = await client.from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'rejected');

      const { count: cancelledCount } = await client.from('user_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'cancelled');

      // Fetch quality ratings given by admin
      const { data: ratedTasks } = await client.from('user_tasks')
        .select('quality_rating')
        .eq('user_id', userId)
        .not('quality_rating', 'is', null);

      const approved = approvedCount || 0;
      const rejected = rejectedCount || 0;
      const cancelled = cancelledCount || 0;
      const totalCompleted = approved + rejected;

      const completionRate = calculateCompletionRate(approved, rejected, cancelled);
      const ratingsArray = ratedTasks ? ratedTasks.map((t: any) => parseFloat(t.quality_rating)).filter((n: number) => !isNaN(n)) : [];
      const qualityRating = calculateQualityRating(ratingsArray);

      await client.from('user_stats').upsert({
        user_id: userId,
        tasks_completed: totalCompleted,
        tasks_approved: approved,
        tasks_rejected: rejected,
        tasks_cancelled: cancelled,
        rating: completionRate,
        completion_rate: completionRate,
        quality_rating: qualityRating,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      // Synchronize users table for easy querying
      await client.from('users').update({
        quality_rating: qualityRating,
        completion_rate: completionRate,
        rating: completionRate,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
    } catch (error) {
      console.error(`Error updating stats for user ${userId}:`, error);
    }
  },

  // Tasks
  async getTasks(client: SupabaseClient, category?: string, minTier?: string, isOrientation?: boolean): Promise<Task[]> {
    let query = client.from('tasks').select('*').eq('is_active', true);
    if (category) query = query.eq('category', category);
    if (typeof isOrientation === 'boolean') query = query.eq('is_orientation', isOrientation);
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) return [];
    return data as Task[];
  },

  async createTask(client: SupabaseClient, task: InsertTask): Promise<Task> {
    const newTaskData: any = {
      task_id: generateTaskId(),
      title: task.title,
      description: task.description,
      category: task.category,
      task_type: task.taskType || 'standard',
      url: task.url || null,
      reward: task.reward,
      hourly_rate: task.hourlyRate ? parseFloat(task.hourlyRate) : 0,
      max_participants: task.maxParticipants || 1,
      current_participants: 0,
      estimated_duration_minutes: task.estimatedDurationMinutes || 30,
      required_skills: task.requiredSkills || [],
      project_structure: task.projectStructure || [],
      instructions: task.instructions || null,
      min_tier: task.minTier,
      is_active: task.isActive ?? true,
      is_orientation: task.isOrientation ?? false,
      attachments: task.attachments || []
    };
    const { data, error } = await client.from('tasks').insert(newTaskData).select().single();
    if (error) throw error;
    return data as Task;
  },

  async updateTask(client: SupabaseClient, id: string, updates: Partial<Task>): Promise<Task | null> {
    const { data, error } = await client.from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data as Task;
  },

  async deleteTask(client: SupabaseClient, id: string): Promise<boolean> {
    const { error } = await client.from('tasks').delete().eq('id', id);
    return !error;
  },

  // User Tasks
  async createUserTask(client: SupabaseClient, userTask: InsertUserTask & { userId: string | number }): Promise<UserTask> {
    const { data, error } = await client.from('user_tasks').insert({
      user_id: userTask.userId,
      task_id: userTask.taskId,
      status: userTask.status || 'pending',
      proof_attachments: userTask.proof_attachments || [],
    }).select().single();
    if (error) throw error;
    return data as UserTask;
  },

  async getUserTasks(client: SupabaseClient, userId: string | number): Promise<UserTask[]> {
    const { data, error } = await client.from('user_tasks')
      .select('*, task:tasks(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  },

  async updateUserTask(client: SupabaseClient, id: string, updates: Partial<UserTask>): Promise<UserTask | null> {
    const { data, error } = await client.from('user_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data as UserTask;
  },

  async getPendingTasks(client: SupabaseClient): Promise<any[]> {
    const { data, error } = await client
      .from('user_tasks')
      .select('*, user:users(*), task:tasks(*)')
      .in('status', ['pending', 'submitted']);
    if (error) throw error;
    return data;
  },

  // Wallet
  async getWallet(client: SupabaseClient, userId: string | number): Promise<Wallet | null> {
    const { data, error } = await client.from('wallets').select('*').eq('user_id', userId).single();
    if (error) return null;
    return data as Wallet;
  },

  async createWallet(client: SupabaseClient, userId: string | number): Promise<Wallet> {
    const { data, error } = await client.from('wallets').insert({
      user_id: userId,
      available_balance: '0',
      pending_balance: '0',
      total_earnings: '0',
      total_withdrawn: '0'
    }).select().single();
    if (error) throw error;
    return data as Wallet;
  },

  async updateWallet(client: SupabaseClient, userId: string | number, updates: Partial<Wallet>): Promise<Wallet | null> {
    const { data, error } = await client.from('wallets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single();
    if (error) return null;
    return data as Wallet;
  },

  // Skill Upgrades
  async createSubscription(client: SupabaseClient, sub: InsertSkillUpgrade & { userId: string | number }): Promise<Subscription> {
    const { data, error } = await client.from('subscriptions').insert({
      user_id: sub.userId,
      tier: sub.tier,
      amount: sub.amount,
      payment_method: sub.paymentMethod || 'paypal',
      is_active: true,
      expires_at: sub.expiresAt
    }).select().single();
    if (error) throw error;

    const userUpdates: any = {
      skill_upgrade_tier: sub.tier,
      skill_upgrade_expiry: sub.expiresAt
    };
    if (sub.tier === 'universal') {
      userUpdates.has_project_access = true;
    }
    await this.updateUser(client, sub.userId.toString(), userUpdates);
    return data as Subscription;
  },

  async getUserSubscription(client: SupabaseClient, userId: string | number): Promise<Subscription | null> {
    const { data, error } = await client.from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    if (error) return null;
    return data as Subscription;
  },

  // Transactions
  async createTransaction(client: SupabaseClient, tx: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    const { data, error } = await client.from('transactions').insert(tx).select().single();
    if (error) throw error;
    return data as Transaction;
  },

  async getUserTransactions(client: SupabaseClient, userId: string | number): Promise<Transaction[]> {
    const { data, error } = await client.from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Transaction[];
  },

  // Withdrawals
  async createWithdrawal(client: SupabaseClient, w: InsertWithdrawal & { userId: string | number }): Promise<Withdrawal> {
    const { data, error } = await client.from('withdrawals').insert({
      user_id: w.userId,
      amount: w.amount,
      payment_method_id: w.paymentMethodId || null,
      status: 'pending'
    }).select().single();
    if (error) throw error;
    return data as Withdrawal;
  },

  async getWithdrawals(client: SupabaseClient, userId?: string | number): Promise<Withdrawal[]> {
    let query = client.from('withdrawals').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query;
    if (error) throw error;
    return data as Withdrawal[];
  },

  async updateWithdrawal(client: SupabaseClient, id: string, updates: Partial<Withdrawal>): Promise<Withdrawal | null> {
    const { data, error } = await client.from('withdrawals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data as Withdrawal;
  },

  // Notifications
  async createNotification(client: SupabaseClient, n: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
    const { data, error } = await client.from('notifications').insert(n).select().single();
    if (error) throw error;
    return data as Notification;
  },

  async getUserNotifications(client: SupabaseClient, userId: string | number): Promise<Notification[]> {
    const { data, error } = await client.from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Notification[];
  },

  async markNotificationRead(client: SupabaseClient, id: string): Promise<boolean> {
    const { error } = await client.from('notifications').update({ is_read: true }).eq('id', id);
    return !error;
  },

  // Orders
  async createOrder(client: SupabaseClient, order: InsertOrder): Promise<Order> {
    const { data, error } = await client.from('orders').insert({
      user_id: order.userId,
      order_id: order.orderId,
      amount: order.amount,
      status: order.status || 'pending',
      skill_upgrade_tier: order.skillUpgradeTier
    }).select().single();
    if (error) throw error;
    return data as Order;
  },

  async getOrder(client: SupabaseClient, orderId: string): Promise<Order | null> {
    const { data, error } = await client.from('orders').select('*').eq('order_id', orderId).single();
    if (error) return null;
    return data as Order;
  },

  async getUserOrders(client: SupabaseClient, userId: string | number): Promise<Order[]> {
    const { data, error } = await client.from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  },

  async updateOrder(client: SupabaseClient, id: string, updates: any): Promise<Order | null> {
    const { data, error } = await client.from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return null;
    return data as Order;
  },

  // Payment Methods
  async createPaymentMethod(client: SupabaseClient, pm: InsertPaymentMethod & { userId: string | number }): Promise<PaymentMethod> {
    const { data, error } = await client.from('payment_methods').insert({
      user_id: pm.userId,
      type: pm.type || 'paypal',
      email: pm.email,
      is_primary: pm.isPrimary || false
    }).select().single();
    if (error) throw error;
    return data as PaymentMethod;
  },

  async getUserPaymentMethods(client: SupabaseClient, userId: string | number): Promise<PaymentMethod[]> {
    const { data, error } = await client.from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    if (error) throw error;
    return data as PaymentMethod[];
  },

  async deletePaymentMethod(client: SupabaseClient, id: string): Promise<boolean> {
    const { error } = await client.from('payment_methods').update({ is_active: false }).eq('id', id);
    return !error;
  },

  async setPrimaryPaymentMethod(client: SupabaseClient, userId: string | number, methodId: string): Promise<boolean> {
    await client.from('payment_methods').update({ is_primary: false }).eq('user_id', userId);
    const { error } = await client.from('payment_methods').update({ is_primary: true }).eq('id', methodId);
    return !error;
  },

  // Social Features
  async createFriendRequest(client: SupabaseClient, userId: string, friendId: string): Promise<Friend> {
    const { data, error } = await client.from('friends').insert({
      user_id: userId,
      friend_id: friendId,
      status: 'pending'
    }).select().single();
    if (error) throw error;
    return data as Friend;
  },

  async acceptFriendRequest(client: SupabaseClient, id: string): Promise<boolean> {
    const { error } = await client.from('friends').update({ status: 'accepted' }).eq('id', id);
    return !error;
  },

  async getFriends(client: SupabaseClient, userId: string): Promise<Friend[]> {
    const { data, error } = await client.from('friends')
      .select('*, sender:users!friends_user_id_fkey(*), receiver:users!friends_friend_id_fkey(*)')
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');
    if (error) throw error;
    return data as any[];
  },

  async getFriendRequests(client: SupabaseClient, userId: string): Promise<Friend[]> {
    const { data, error } = await client.from('friends')
      .select('*, sender:users!friends_user_id_fkey(*)')
      .eq('friend_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return data as any[];
  },

  async checkFriendship(client: SupabaseClient, userId1: string, userId2: string): Promise<Friend | null> {
    const { data, error } = await client.from('friends')
      .select('*')
      .or(`and(user_id.eq.${userId1},friend_id.eq.${userId2}),and(user_id.eq.${userId2},friend_id.eq.${userId1})`)
      .maybeSingle();
    if (error) return null;
    return data as Friend;
  },

  async createTaskRecommendation(client: SupabaseClient, rec: { senderId: string, receiverId: string, taskId: string, message?: string }): Promise<TaskRecommendation> {
    const { data, error } = await client.from('task_recommendations').insert({
      sender_id: rec.senderId,
      receiver_id: rec.receiverId,
      task_id: rec.taskId,
      message: rec.message || null
    }).select().single();
    if (error) throw error;
    return data as TaskRecommendation;
  },

  async getTaskRecommendations(client: SupabaseClient, userId: string): Promise<TaskRecommendation[]> {
    const { data, error } = await client.from('task_recommendations')
      .select('*, task:tasks(*), sender:users!task_recommendations_sender_id_fkey(*)')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  },

  async getAllUsers(client: SupabaseClient): Promise<User[]> {
    const { data, error } = await client.from('users').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as User[];
  },

  async getPendingVerifications(client: SupabaseClient): Promise<User[]> {
    const { data, error } = await client
      .from('users')
      .select('*')
      .in('verification_status', ['requested', 'submitted'])
      .eq('pending_verification', true)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data as User[];
  },

  async getUserStats(client: SupabaseClient, userId: string): Promise<any> {
    const { data: stats } = await client
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    return stats || { rating: 100, tasks_completed: 0, tasks_approved: 0 };
  },

  async getRecentActivity(client: SupabaseClient, limit: number = 20): Promise<any[]> {
    // Combine notifications and user_tasks for activity stream
    const { data: tasks } = await client
      .from('user_tasks')
      .select('*, user:users(name), task:tasks(title)')
      .order('created_at', { ascending: false })
      .limit(limit);

    return (tasks || []).map(t => ({
      type: 'task',
      id: t.id,
      userId: t.user_id,
      userName: t.user?.name,
      title: t.task?.title,
      status: t.status,
      timestamp: t.created_at
    }));
  },

  // System Settings
  async getSystemSettings(client: SupabaseClient): Promise<any> {
    const { data: allSettings, error } = await client.from('system_settings').select('*');
    if (error) return {};
    const settingsObj: any = {};
    allSettings.forEach((s: any) => {
      settingsObj[s.key] = s.value;
    });
    return settingsObj;
  },

  async updateSystemSettings(client: SupabaseClient, settings: any): Promise<any> {
    const promises = Object.keys(settings).map(key => {
      return client.from('system_settings').upsert({
        key,
        value: settings[key],
        updated_at: new Date().toISOString()
      });
    });
    await Promise.all(promises);
    return this.getSystemSettings(client);
  }
};