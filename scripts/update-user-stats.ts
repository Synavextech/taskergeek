import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function calculateCompletionRate(approved: number, rejected: number, cancelled: number): number {
  const total = approved + rejected + cancelled;
  if (total === 0) return 100;
  return Math.round((approved / total) * 100);
}

function calculateQualityRating(ratings: number[]): number {
  if (!ratings || ratings.length === 0) return 5.0;
  const sum = ratings.reduce((acc, curr) => acc + curr, 0);
  const avg = sum / ratings.length;
  return Math.round(avg * 10) / 10;
}

async function syncUserStats(userId: string) {
  try {
    const { count: approvedCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'approved');

    const { count: rejectedCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'rejected');

    const { count: cancelledCount } = await supabase
      .from('user_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'cancelled');

    const { data: ratedTasks } = await supabase
      .from('user_tasks')
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

    await supabase.from('user_stats').upsert({
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

    await supabase.from('users').update({
      quality_rating: qualityRating,
      completion_rate: completionRate,
      updated_at: new Date().toISOString()
    }).eq('id', userId);

    console.log(`[SYNC SUCCESS] User ${userId}: Approved=${approved}, Rejected=${rejected}, Quality=${qualityRating}, Completion=${completionRate}%`);
  } catch (err: any) {
    console.error(`[SYNC ERROR] User ${userId}:`, err.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetUserArg = args.find(a => a.startsWith('--user='));
  const targetUserId = targetUserArg ? targetUserArg.split('=')[1] : null;

  if (targetUserId) {
    console.log(`Synchronizing stats for user: ${targetUserId}`);
    await syncUserStats(targetUserId);
  } else {
    console.log('Fetching all users to synchronize statistics...');
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, name');

    if (error) {
      console.error('Failed to fetch users:', error.message);
      process.exit(1);
    }

    console.log(`Found ${users.length} users. Commencing recalculation...`);
    for (const u of users) {
      await syncUserStats(u.id);
    }
  }

  console.log('User stats synchronization completed successfully.');
}

main().catch(console.error);
