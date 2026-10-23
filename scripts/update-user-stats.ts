import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ============================================================================
// 🛠️ USER PROFILE & STATS CONFIGURATION (FILL IN YOUR TARGET DETAILS HERE)
// ============================================================================
export const USER_CONFIG = {
  // Target user identifier (fill in user's email or UUID; if blank, uses CLI flag or first user)
  targetEmail: "geofrymarcalister@gmail.com" as string,
  targetUserId: "1e2498e3-daec-44e4-823a-8a0e9cd3764e" as string,

  // Platform Tier & Status
  tier: "vip" as "member" | "silver" | "bronze" | "diamond" | "gold" | "vip" | "universal",
  approvalStatus: "approved" as const,
  orientationComplete: true,
  hasProjectAccess: true,

  // Task & Performance Stats
  completedTasksCount: 130, // 130 completed tasks
  targetQualityRating: 4.90, // Average 4.9 / 5.0 star rating
  completionRate: 100, // 100% completion rate (0 pending, 0 rejected, 0 cancelled)

  // Wallet & Withdrawals
  targetAvailableBalance: 22.00, // Current available balance in USD
  targetPendingBalance: 0.00, // No pending tasks
  withdrawalFrequencyDays: 14, // Biweekly payouts (every 14 days)

  // Historical Timeline (Account created Dec 2025 -> Last task done 16/10/2026)
  accountJoinDate: "2025-12-05T09:00:00.000Z",
  lastTaskDate: "2026-10-16T17:30:00.000Z",
};
// ============================================================================

interface UpdateStatsOptions {
  email?: string;
  userId?: string;
  taskCount?: number;
  tier?: string;
  targetBalance?: number;
  startDate?: string;
  endDate?: string;
  listUsers?: boolean;
}

function parseArgs(): UpdateStatsOptions {
  const args = process.argv.slice(2);
  const options: UpdateStatsOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--email' && args[i + 1]) {
      options.email = args[++i];
    } else if (arg === '--user-id' && args[i + 1]) {
      options.userId = args[++i];
    } else if (arg === '--tasks' && args[i + 1]) {
      options.taskCount = parseInt(args[++i], 10);
    } else if (arg === '--tier' && args[i + 1]) {
      options.tier = args[++i];
    } else if (arg === '--balance' && args[i + 1]) {
      options.targetBalance = parseFloat(args[++i]);
    } else if (arg === '--start-date' && args[i + 1]) {
      options.startDate = args[++i];
    } else if (arg === '--end-date' && args[i + 1]) {
      options.endDate = args[++i];
    } else if (arg === '--list-users') {
      options.listUsers = true;
    }
  }

  return options;
}

async function listAllUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, name, role, skill_upgrade_tier, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to query users:', error);
    return;
  }

  console.log('\n--- Registered Platform Users ---');
  console.table(users);
}

// Generate realistic task templates if database has few tasks
const DEFAULT_TASK_TEMPLATES = [
  // AI Training
  { title: "Data Labeling (Annotation) & Integration", category: "ai", task_type: "standard", reward: 4.50 },
  { title: "Gradient Descent Optimization & Evaluation", category: "ai", task_type: "project", hourly_rate: 18.00, reward: 22.50 },
  { title: "Computer Vision Object Bounding & Tagging", category: "ai", task_type: "standard", reward: 6.20 },
  { title: "LLM Response Quality Comparison & Safety Ranking", category: "ai", task_type: "standard", reward: 5.75 },
  { title: "Sentiment Analysis on Multi-Lingual Product Reviews", category: "ai", task_type: "standard", reward: 3.80 },

  // Testing
  { title: "Cora-Care Chatbot Functional Testing", category: "testing", task_type: "standard", reward: 5.50 },
  { title: "ElectronAI Interface End-to-End Testing", category: "testing", task_type: "project", hourly_rate: 16.00, reward: 20.00 },
  { title: "Cross-Browser Compatibility & Viewport Rendering", category: "testing", task_type: "standard", reward: 7.25 },
  { title: "Checkout Flow & Payment Gateway Edge Case Testing", category: "testing", task_type: "standard", reward: 8.50 },

  // Surveys
  { title: "Enterprise AI Adoption & Workflow Survey", category: "surveys", task_type: "standard", reward: 3.50 },
  { title: "AI in Production Automation Industry Study", category: "surveys", task_type: "standard", reward: 4.25 },
  { title: "Remote Workplace Collaboration Tools Survey", category: "surveys", task_type: "standard", reward: 3.00 },
  { title: "Consumer Digital Security & Privacy Sentiment Poll", category: "surveys", task_type: "standard", reward: 2.75 },

  // Social
  { title: "Cora-Care AI Chatbot Social Review & Feedback", category: "social", task_type: "standard", reward: 2.50 },
  { title: "i-Report News Social Engagement & Community Interaction", category: "social", task_type: "standard", reward: 2.20 },
  { title: "Developer Ecosystem Community Discussion Participation", category: "social", task_type: "standard", reward: 3.10 },
  { title: "Tech Forum Moderation & Q&A Response Thread", category: "social", task_type: "standard", reward: 3.40 },

  // App
  { title: "Mobile App Workflow & UX Validation", category: "app", task_type: "standard", reward: 4.00 },
  { title: "Application Performance & Navigation Flow Analysis", category: "app", task_type: "project", hourly_rate: 15.00, reward: 18.75 },
  { title: "Mobile Push Notification & Deep Link Flow Verification", category: "app", task_type: "standard", reward: 4.80 },
  { title: "Biometric Login & Keyring Storage Verification", category: "app", task_type: "standard", reward: 5.20 },

  // Main / Core Verification
  { title: "i-Report News Platform UI Preference Study", category: "main", task_type: "standard", reward: 2.80 },
  { title: "i-Report Layout Hierarchy & Marketing Section Review", category: "main", task_type: "standard", reward: 3.20 },
  { title: "Content Moderation & Policy Compliance Verification", category: "main", task_type: "standard", reward: 3.60 },
  { title: "Platform Terms of Service & Specialist Onboarding Audit", category: "main", task_type: "standard", reward: 3.00 },
];

async function ensureSeedTasksInDatabase(): Promise<any[]> {
  const { data: existingTasks, error } = await supabase.from('tasks').select('*');
  if (error) {
    console.warn("Could not fetch tasks from database:", error.message);
  }

  const tasksMap: Record<string, any[]> = {
    ai: [],
    testing: [],
    surveys: [],
    social: [],
    app: [],
    main: [],
  };

  if (existingTasks && existingTasks.length > 0) {
    for (const t of existingTasks) {
      if (tasksMap[t.category]) {
        tasksMap[t.category].push(t);
      }
    }
  }

  // Check categories and insert if any category is sparse
  for (const template of DEFAULT_TASK_TEMPLATES) {
    const list = tasksMap[template.category] || [];
    const alreadyExists = list.some((t) => t.title.toLowerCase() === template.title.toLowerCase());
    if (!alreadyExists) {
      const year = 2025;
      const rand = Math.floor(Math.random() * 900 + 100);
      const taskId = `ptg#${year}#${rand}`;

      const { data: inserted, error: insertError } = await supabase.from('tasks').insert({
        task_id: taskId,
        title: template.title,
        description: `Verified deliverable for ${template.title}. Ensure submission meets all platform quality standards.`,
        category: template.category,
        task_type: template.task_type,
        hourly_rate: template.hourly_rate || 0,
        reward: template.reward,
        min_tier: 'member',
        is_active: true,
        is_orientation: false,
      }).select().single();

      if (!insertError && inserted) {
        tasksMap[template.category].push(inserted);
      }
    }
  }

  const { data: allFinalTasks } = await supabase.from('tasks').select('*');
  return allFinalTasks || [];
}

export async function runUpdateUserStats(options: UpdateStatsOptions = {}) {
  const targetEmail = options.email || (USER_CONFIG.targetEmail ? USER_CONFIG.targetEmail.trim() : undefined);
  const targetUserId = options.userId || (USER_CONFIG.targetUserId ? USER_CONFIG.targetUserId.trim() : undefined);
  const taskCount = options.taskCount ?? USER_CONFIG.completedTasksCount ?? 130;
  const tier = options.tier ?? USER_CONFIG.tier ?? 'vip';
  const targetBalance = options.targetBalance ?? USER_CONFIG.targetAvailableBalance ?? 22.00;
  const startDateStr = options.startDate ?? USER_CONFIG.accountJoinDate ?? '2025-12-05T09:00:00.000Z';
  const endDateStr = options.endDate ?? USER_CONFIG.lastTaskDate ?? '2026-10-16T17:30:00.000Z';

  const startTime = new Date(startDateStr).getTime();
  const endTime = new Date(endDateStr).getTime();

  if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
    throw new Error(`Invalid date range: start=${startDateStr}, end=${endDateStr}`);
  }

  console.log(`\n======================================================`);
  console.log(`🚀 Starting User Stats & Profile Backdate Synchronization`);
  console.log(`======================================================`);
  console.log(`Target: ${targetEmail || targetUserId || 'First non-admin user'}`);
  console.log(`Task Count: ${taskCount}`);
  console.log(`Tier: ${tier.toUpperCase()}`);
  console.log(`Target Balance: $${targetBalance.toFixed(2)}`);
  console.log(`Timeline: ${new Date(startTime).toLocaleDateString()} -> ${new Date(endTime).toLocaleDateString()}`);

  // 1. Locate User
  let query = supabase.from('users').select('*');
  if (targetUserId) {
    query = query.eq('id', targetUserId);
  } else if (targetEmail) {
    query = query.eq('email', targetEmail);
  } else {
    query = query.eq('role', 'user').order('created_at', { ascending: true }).limit(1);
  }

  const { data: userRecords, error: userError } = await query;
  if (userError || !userRecords || userRecords.length === 0) {
    throw new Error(`Target user not found: ${userError?.message || 'No matching user'}`);
  }

  const user = userRecords[0];
  const userId = user.id;
  console.log(`\nFound User: ${user.name || 'User'} (${user.email}) [ID: ${userId}]`);

  // 2. Ensure Tasks Exist
  const allTasks = await ensureSeedTasksInDatabase();
  if (!allTasks || allTasks.length === 0) {
    throw new Error('No available tasks found in database.');
  }

  const tasksByCategory: Record<string, any[]> = {
    ai: allTasks.filter((t) => t.category === 'ai'),
    testing: allTasks.filter((t) => t.category === 'testing'),
    surveys: allTasks.filter((t) => t.category === 'surveys'),
    social: allTasks.filter((t) => t.category === 'social'),
    app: allTasks.filter((t) => t.category === 'app'),
    main: allTasks.filter((t) => t.category === 'main'),
  };

  // 3. Clear Old User Records to ensure 100% clean, non-conflicting state
  console.log(`\nCleaning previous records for user ${userId}...`);
  await supabase.from('user_tasks').delete().eq('user_id', userId);
  await supabase.from('transactions').delete().eq('user_id', userId);
  await supabase.from('withdrawals').delete().eq('user_id', userId);
  await supabase.from('notifications').delete().eq('user_id', userId);
  await supabase.from('assessment_submissions').delete().eq('user_id', userId);

  // Record verified passing assessments for user
  console.log(`\nRecording verified passed assessments (Grammar, Hourly, Discipline)...`);
  const grammarPassedDateISO = new Date(startTime + 3600 * 1000 * 3).toISOString();
  await supabase.from('assessment_submissions').insert({
    user_id: userId,
    assessment_type: 'grammar',
    mcq_answers: { g1: 1, g2: 2, g3: 0, g4: 3, g5: 1, g6: 2, g7: 0, g8: 1, g9: 2, g10: 1, g11: 0, g12: 3, g13: 2, g14: 1, g15: 0 },
    score: 15,
    total_questions: 15,
    passed: true,
    attempt_number: 1,
    created_at: grammarPassedDateISO,
  });

  const hourlyPassedDateISO = new Date(startTime + 3600 * 1000 * 6).toISOString();
  await supabase.from('assessment_submissions').insert({
    user_id: userId,
    assessment_type: 'hourly',
    mcq_answers: { h1: 1, h2: 0, h3: 2, h4: 1, h5: 3, h6: 0, h7: 1, h8: 2, h9: 0, h10: 1, h11: 3, h12: 2, h13: 1, h14: 0, h15: 2 },
    score: 15,
    total_questions: 15,
    passed: true,
    attempt_number: 1,
    created_at: hourlyPassedDateISO,
  });

  const disciplinePassedDateISO = new Date(startTime + 3600 * 1000 * 12).toISOString();
  await supabase.from('assessment_submissions').insert({
    user_id: userId,
    assessment_type: 'discipline',
    discipline_id: 'linguistics',
    mcq_answers: { l_mcq_1: 1, l_mcq_2: 0, l_mcq_3: 2, l_mcq_4: 3, l_mcq_5: 1, l_mcq_6: 2, l_mcq_7: 0, l_mcq_8: 3, l_mcq_9: 1, l_mcq_10: 2 },
    written_answers: {
      l_w_1: "Detailed evaluation of morphological parsing and syntactic tree disambiguation across polysemous multilingual token boundaries.",
      l_w_2: "Gold-standard phonetic transcription analysis and phonological shift alignment in frontier speech generation models.",
      l_w_3: "Semantic drift metrics and lexical density evaluation in longitudinal generative dialogue systems.",
      l_w_4: "Pragmatic presupposition verification and implicature detection in multi-turn assistant benchmarks.",
      l_w_5: "Syntactic ambiguity resolution methodologies and contextual parsing validation for high-throughput LLM pipelines.",
      l_w_6: "Dialectical variation analysis and regional vernacular inclusion risk assessment in frontier alignment.",
      l_w_7: "Cross-lingual semantic transfer evaluation and zero-shot benchmark robustness protocols.",
      l_w_8: "Named Entity Disambiguation and fine-grained entity linking rubric for sensitive domain text.",
      l_w_9: "Discourse coherence, rhetorical structure theory, and coreference chain auditing in extended narratives.",
      l_w_10: "Sociolinguistic register adaptation and stylistic register alignment guidelines for enterprise chatbots."
    },
    score: 10,
    total_questions: 20,
    passed: true,
    attempt_number: 1,
    created_at: disciplinePassedDateISO,
  });
  console.log(`✅ Recorded 3 passed assessments in assessment_submissions`);

  // 4. Generate 130 Tasks across the Categories
  // Desired distribution:
  // ai: ~32, testing: ~26, surveys: ~24, social: ~20, app: ~14, main: ~14 = 130
  const categoryTargets = [
    { cat: 'ai', count: 32 },
    { cat: 'testing', count: 26 },
    { cat: 'surveys', count: 24 },
    { cat: 'social', count: 20 },
    { cat: 'app', count: 14 },
    { cat: 'main', count: 14 },
  ];

  const assignedTasks: { task: any; category: string }[] = [];
  for (const target of categoryTargets) {
    const pool = tasksByCategory[target.cat].length > 0 ? tasksByCategory[target.cat] : allTasks;
    for (let i = 0; i < target.count; i++) {
      const task = pool[i % pool.length];
      assignedTasks.push({ task, category: target.cat });
    }
  }

  // Shuffle assigned tasks so categories are realistically interspersed chronologically
  for (let i = assignedTasks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [assignedTasks[i], assignedTasks[j]] = [assignedTasks[j], assignedTasks[i]];
  }

  // Truncate or pad to exact taskCount
  const selectedTasks = assignedTasks.slice(0, taskCount);

  // Distribute timestamps chronologically between startTime and endTime
  const totalDuration = endTime - startTime;
  const interval = totalDuration / selectedTasks.length;

  console.log(`\nGenerating ${selectedTasks.length} approved task records...`);

  const userTasksToInsert: any[] = [];
  const earningsTransactionsToInsert: any[] = [];
  const notificationsToInsert: any[] = [];

  // Account creation & Welcome notifications
  const joinDateISO = new Date(startTime).toISOString();
  notificationsToInsert.push({
    user_id: userId,
    title: "Welcome to TaskerGeek",
    message: "Your specialist account has been created. Welcome to the platform!",
    type: "system",
    is_read: true,
    created_at: joinDateISO,
  });

  const approvalDateISO = new Date(startTime + 3600 * 1000 * 2).toISOString();
  notificationsToInsert.push({
    user_id: userId,
    title: "Account Approved",
    message: "Your specialist profile has been reviewed and approved. You are ready to accept tasks.",
    type: "system",
    is_read: true,
    created_at: approvalDateISO,
  });

  // Passed Assessment Notifications
  notificationsToInsert.push({
    user_id: userId,
    title: "Grammar Assessment Passed",
    message: "Congratulations! You scored 15/15 and passed the Grammar Assessment. Your account is now qualified for standard task assignments.",
    type: "system",
    is_read: true,
    created_at: grammarPassedDateISO,
  });

  notificationsToInsert.push({
    user_id: userId,
    title: "Hourly Qualification Assessment Passed",
    message: "Outstanding! You achieved 15/15 on the Hourly Project Qualification. Your account has unlocked project workspace access!",
    type: "system",
    is_read: true,
    created_at: hourlyPassedDateISO,
  });

  notificationsToInsert.push({
    user_id: userId,
    title: "Discipline Assessment Passed",
    message: "Congratulations! You scored 10/10 on multiple-choice and verified written deliverables for Advanced Computational Linguistics & AI Evaluation. Your specialist credentialing has been updated.",
    type: "system",
    is_read: true,
    created_at: disciplinePassedDateISO,
  });

  const vipUpgradeDateISO = new Date(startTime + 3600 * 1000 * 24).toISOString();
  notificationsToInsert.push({
    user_id: userId,
    title: "VIP Tier Activated",
    message: "Congratulations! Your account has been upgraded to VIP Tier with unrestricted high-yield projects.",
    type: "system",
    is_read: true,
    created_at: vipUpgradeDateISO,
  });

  let totalEarnings = 0;
  const qualityRatings: number[] = [];

  for (let i = 0; i < selectedTasks.length; i++) {
    const { task, category } = selectedTasks[i];

    // Timestamp with jitter
    const taskCreatedAtMs = startTime + (i * interval) + Math.floor(Math.random() * (interval * 0.4));
    const taskCreatedAt = new Date(Math.min(taskCreatedAtMs, endTime - 3600 * 1000)).toISOString();
    const taskApprovedAt = new Date(Math.min(taskCreatedAtMs + 3600 * 1000 * (1 + Math.random() * 4), endTime)).toISOString();

    // High quality rating (4.8 to 5.0 for VIP user)
    // 85% chance of 5.0, 15% chance of 4.5
    const qualityScore = Math.random() < 0.85 ? 5.0 : 4.5;
    qualityRatings.push(qualityScore);

    // Calculate reward
    let reward = parseFloat(task.reward || 3.50);
    let timeSpentSeconds = 1800; // 30 mins
    let hourlyRate = 0;

    if (task.task_type === 'project') {
      hourlyRate = parseFloat(task.hourly_rate || 18.00);
      timeSpentSeconds = Math.floor(1800 + Math.random() * 3600); // 30m - 90m
      reward = parseFloat(((timeSpentSeconds / 3600) * hourlyRate).toFixed(2));
    }

    totalEarnings += reward;

    userTasksToInsert.push({
      user_id: userId,
      task_id: task.id,
      status: 'approved',
      quality_rating: qualityScore,
      hourly_rate: hourlyRate,
      time_spent_seconds: timeSpentSeconds,
      accrued_earnings: reward,
      submission_description: `Completed comprehensive verification deliverables according to platform guidelines for ${task.title}.`,
      proof_attachments: [
        { name: `deliverable_report_${i + 1}.pdf`, url: `https://storage.taskergeek.com/proofs/user_${userId}_task_${task.id}.pdf`, type: "application/pdf" }
      ],
      created_at: taskCreatedAt,
      updated_at: taskApprovedAt,
    });

    earningsTransactionsToInsert.push({
      user_id: userId,
      type: 'earning',
      amount: reward.toFixed(2),
      status: 'completed',
      description: `Reward for ${task.task_type === 'project' ? 'project' : 'task'}: ${task.title}`,
      created_at: taskApprovedAt,
      updated_at: taskApprovedAt,
    });

    notificationsToInsert.push({
      user_id: userId,
      title: "Task Approved",
      message: `Your submission for "${task.title}" has been approved with a ${qualityScore}/5 quality rating. $${reward.toFixed(2)} added to your wallet.`,
      type: "payment",
      is_read: true,
      created_at: taskApprovedAt,
    });
  }

  // Insert user tasks in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < userTasksToInsert.length; i += BATCH_SIZE) {
    const chunk = userTasksToInsert.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase.from('user_tasks').insert(chunk);
    if (insertError) {
      throw new Error(`Failed to insert user tasks batch: ${insertError.message}`);
    }
  }
  console.log(`✅ Successfully inserted ${userTasksToInsert.length} user_tasks`);

  // Insert earning transactions
  for (let i = 0; i < earningsTransactionsToInsert.length; i += BATCH_SIZE) {
    const chunk = earningsTransactionsToInsert.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase.from('transactions').insert(chunk);
    if (insertError) {
      throw new Error(`Failed to insert transactions batch: ${insertError.message}`);
    }
  }
  console.log(`✅ Successfully inserted ${earningsTransactionsToInsert.length} earnings transactions`);

  // 5. Payment Method & Biweekly Withdrawals
  // Ensure user has a primary payment method (PayPal)
  let paymentMethodId: number | null = null;
  const { data: existingMethod } = await supabase
    .from('payment_methods')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMethod) {
    paymentMethodId = existingMethod.id;
  } else {
    const { data: newMethod } = await supabase
      .from('payment_methods')
      .insert({
        user_id: userId,
        type: 'paypal',
        email: user.email,
        is_primary: true,
        is_active: true,
      })
      .select('id')
      .single();
    if (newMethod) paymentMethodId = newMethod.id;
  }

  // Total to withdraw = totalEarnings - targetBalance
  const totalToWithdraw = Math.max(0, totalEarnings - targetBalance);

  // Withdrawal intervals based on frequency (default 14 days / biweekly)
  const biweeklyMs = (USER_CONFIG.withdrawalFrequencyDays || 14) * 24 * 3600 * 1000;
  const withdrawalDates: number[] = [];
  let curTime = startTime + biweeklyMs; // First withdrawal 2 weeks after joining
  while (curTime < endTime - (3 * 24 * 3600 * 1000)) {
    withdrawalDates.push(curTime);
    curTime += biweeklyMs;
  }

  const withdrawalCount = withdrawalDates.length || 1;
  const baseWithdrawalAmount = parseFloat((totalToWithdraw / withdrawalCount).toFixed(2));
  let runningWithdrawn = 0;

  console.log(`\nGenerating ${withdrawalCount} biweekly withdrawals (Total to withdraw: $${totalToWithdraw.toFixed(2)})...`);

  const withdrawalsToInsert: any[] = [];
  const withdrawalTransactionsToInsert: any[] = [];

  for (let w = 0; w < withdrawalCount; w++) {
    const isLast = w === withdrawalCount - 1;
    const amount = isLast
      ? parseFloat((totalToWithdraw - runningWithdrawn).toFixed(2))
      : baseWithdrawalAmount;
    runningWithdrawn += amount;

    const wDate = new Date(withdrawalDates[w]);
    const reqDate = new Date(withdrawalDates[w] - (3600 * 1000 * 12)).toISOString();
    const procDate = wDate.toISOString();

    withdrawalsToInsert.push({
      user_id: userId,
      amount: amount.toFixed(2),
      payment_method_id: paymentMethodId,
      status: 'completed',
      admin_notes: 'Automated biweekly batch payout processed successfully via PayPal.',
      processed_at: procDate,
      created_at: reqDate,
    });

    withdrawalTransactionsToInsert.push({
      user_id: userId,
      type: 'withdrawal',
      amount: amount.toFixed(2),
      status: 'completed',
      description: `Biweekly cashout to PayPal (${user.email})`,
      created_at: procDate,
      updated_at: procDate,
    });

    notificationsToInsert.push({
      user_id: userId,
      title: "Withdrawal Completed",
      message: `Your biweekly withdrawal request for $${amount.toFixed(2)} has been successfully processed to PayPal (${user.email}).`,
      type: "payment",
      is_read: true,
      created_at: procDate,
    });
  }

  if (withdrawalsToInsert.length > 0) {
    const { error: wError } = await supabase.from('withdrawals').insert(withdrawalsToInsert);
    if (wError) throw new Error(`Failed to insert withdrawals: ${wError.message}`);
    console.log(`✅ Successfully inserted ${withdrawalsToInsert.length} completed withdrawals`);

    const { error: wtError } = await supabase.from('transactions').insert(withdrawalTransactionsToInsert);
    if (wtError) throw new Error(`Failed to insert withdrawal transactions: ${wtError.message}`);
    console.log(`✅ Successfully inserted ${withdrawalTransactionsToInsert.length} withdrawal transactions`);
  }

  // 6. Insert All Notifications in Batches
  // Sort notifications chronologically before inserting
  notificationsToInsert.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  for (let i = 0; i < notificationsToInsert.length; i += BATCH_SIZE) {
    const chunk = notificationsToInsert.slice(i, i + BATCH_SIZE);
    const { error: nError } = await supabase.from('notifications').insert(chunk);
    if (nError) {
      throw new Error(`Failed to insert notifications batch: ${nError.message}`);
    }
  }
  console.log(`✅ Successfully inserted ${notificationsToInsert.length} notifications`);

  // 7. Update User Wallet
  const finalAvailable = targetBalance.toFixed(2);
  const finalPending = '0.00';
  const finalEarnings = totalEarnings.toFixed(2);
  const finalWithdrawn = totalToWithdraw.toFixed(2);

  const { error: walletError } = await supabase.from('wallets').upsert({
    user_id: userId,
    available_balance: finalAvailable,
    pending_balance: finalPending,
    total_earnings: finalEarnings,
    total_withdrawn: finalWithdrawn,
    updated_at: new Date(endTime).toISOString(),
  }, { onConflict: 'user_id' });

  if (walletError) throw new Error(`Failed to update wallet: ${walletError.message}`);
  console.log(`✅ Wallet updated: Available: $${finalAvailable}, Pending: $${finalPending}, Earnings: $${finalEarnings}, Withdrawn: $${finalWithdrawn}`);

  // 8. Calculate Quality Rating & Completion Rate
  const avgQualityRating = parseFloat(
    (qualityRatings.reduce((sum, r) => sum + r, 0) / qualityRatings.length).toFixed(2)
  );

  // 9. Update user_stats Table
  const { error: statsError } = await supabase.from('user_stats').upsert({
    user_id: userId,
    tasks_completed: selectedTasks.length,
    tasks_approved: selectedTasks.length,
    tasks_rejected: 0,
    tasks_cancelled: 0,
    rating: 100,
    completion_rate: 100,
    quality_rating: avgQualityRating,
    updated_at: new Date(endTime).toISOString(),
  }, { onConflict: 'user_id' });

  if (statsError) throw new Error(`Failed to update user_stats: ${statsError.message}`);
  console.log(`✅ user_stats updated: Completed: ${selectedTasks.length}, Approved: ${selectedTasks.length}, Rating: 100%, Quality: ${avgQualityRating}/5.0`);

  // 10. Update users Table (Profile & Tier)
  const { error: userUpdateError } = await supabase.from('users').update({
    skill_upgrade_tier: tier,
    skill_upgrade_expiry: new Date(endTime + 365 * 24 * 3600 * 1000).toISOString(), // 1 year forward
    approval_status: 'approved',
    orientation_complete: true,
    has_project_access: true,
    grammar_test_passed: true,
    grammar_test_attempts: 1,
    quality_rating: avgQualityRating,
    completion_rate: 100,
    created_at: joinDateISO,
    updated_at: new Date(endTime).toISOString(),
  }).eq('id', userId);

  if (userUpdateError) throw new Error(`Failed to update user profile: ${userUpdateError.message}`);
  console.log(`✅ users profile updated: Tier: ${tier.toUpperCase()}, Created: ${joinDateISO}, Quality: ${avgQualityRating}`);

  // Ensure active subscription record exists
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingSub) {
    await supabase.from('subscriptions').insert({
      user_id: userId,
      tier: tier,
      amount: '99.00',
      payment_method: 'paypal',
      payment_reference: 'SUB-VIP-DEC2025',
      is_active: true,
      expires_at: new Date(endTime + 365 * 24 * 3600 * 1000).toISOString(),
      created_at: joinDateISO,
    });
    console.log(`✅ Active VIP subscription registered`);
  }

  console.log(`\n======================================================`);
  console.log(`✨ Synchronization Completed Successfully for ${user.email}!`);
  console.log(`======================================================`);
}

// Execute CLI
const options = parseArgs();
if (options.listUsers) {
  listAllUsers().catch(console.error);
} else {
  runUpdateUserStats(options).catch((err) => {
    console.error('\n❌ Error executing script:', err);
    process.exit(1);
  });
}
