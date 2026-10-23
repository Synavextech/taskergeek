import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function generateTaskId() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const timestamp = Date.now().toString().slice(-4);
    return `PTG#${year}#${random}${timestamp}`;
}

async function seedTasks() {
    try {
        const tasksPath = path.join(__dirname, 'data', 'tasks.json');
        if (!fs.existsSync(tasksPath)) {
            console.error('tasks.json not found at', tasksPath);
            return;
        }

        const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
        console.log(`Found ${tasksData.length} tasks in tasks.json`);

        for (const task of tasksData) {
            // Check if task with same title already exists
            const { data: existing } = await supabase
                .from('tasks')
                .select('id')
                .eq('title', task.title)
                .maybeSingle();

            if (existing) {
                console.log(`Task already exists: ${task.title}. Updating...`);
                const { error: updateError } = await supabase
                    .from('tasks')
                    .update({
                        description: task.description,
                        category: task.category,
                        task_type: task.task_type || 'standard',
                        url: task.url || task.link || null,
                        reward: task.reward || 0.10,
                        hourly_rate: task.hourly_rate || null,
                        max_participants: task.max_participants || null,
                        current_participants: task.current_participants || 0,
                        estimated_duration_minutes: task.estimated_duration_minutes || null,
                        required_skills: task.required_skills || [],
                        project_structure: task.project_structure || null,
                        min_tier: task.min_tier || 'member',
                        is_active: true,
                        is_orientation: task.is_orientation ?? true,
                        attachments: task.attachments || [],
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);

                if (updateError) console.error(`Error updating task ${task.title}:`, updateError.message);
                continue;
            }

            const taskId = generateTaskId();
            const { error } = await supabase
                .from('tasks')
                .insert({
                    task_id: taskId,
                    title: task.title,
                    description: task.description,
                    category: task.category,
                    task_type: task.task_type || 'standard',
                    url: task.url || task.link || null,
                    reward: task.reward || 0.10,
                    hourly_rate: task.hourly_rate || null,
                    max_participants: task.max_participants || null,
                    current_participants: task.current_participants || 0,
                    estimated_duration_minutes: task.estimated_duration_minutes || null,
                    required_skills: task.required_skills || [],
                    project_structure: task.project_structure || null,
                    min_tier: task.min_tier || 'member',
                    is_active: true,
                    is_orientation: task.is_orientation ?? true,
                    attachments: task.attachments || [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error(`Error seeding task ${task.title}:`, error.message);
            } else {
                console.log(`Successfully seeded task: ${task.title} [${taskId}]`);
            }
        }

        console.log('Seeding completed!');
    } catch (error) {
        console.error('Seeding failed:', error.message);
    }
}

seedTasks();
