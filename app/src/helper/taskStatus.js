import supabase from './supabaseClient';

// The one list of task statuses used everywhere in the app:
//   open -> (swap accepted) assigned -> (helper says done) completion_requested
//        -> (owner accepts) completed   |  (owner rejects) back to assigned
export const TASK_STATUS = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  COMPLETION_REQUESTED: 'completion_requested',
  COMPLETED: 'completed',
};

export const STATUS_LABELS = {
  open: 'Open',
  assigned: 'In progress',
  completion_requested: 'Awaiting confirmation',
  completed: 'Completed',
};

/**
 * The helper (not the owner) tells the task owner they've finished the task.
 * Creates a completion request the owner can accept or reject from their
 * profile, and marks the task as awaiting confirmation.
 */
export async function requestTaskCompletion({ taskId, taskOwnerId, currentUserId }) {
  if (!currentUserId) throw new Error('You must be logged in to complete a task.');
  if (currentUserId === taskOwnerId) throw new Error('You cannot mark your own task as completed.');

  // Don't create duplicates if a request is already waiting
  const { data: existing, error: existingError } = await supabase
    .from('task_completion_requests')
    .select('id')
    .eq('task_id', taskId)
    .eq('requester_id', currentUserId)
    .eq('status', 'pending')
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    throw new Error('You have already asked the owner to confirm this task.');
  }

  const { error } = await supabase
    .from('task_completion_requests')
    .insert({
      task_id: taskId,
      requester_id: currentUserId,
      task_owner_id: taskOwnerId,
      status: 'pending',
    });
  if (error) throw error;

  const { error: taskError } = await supabase
    .from('tasks')
    .update({
      status: TASK_STATUS.COMPLETION_REQUESTED,
      completed_by: currentUserId,
      completion_requested_at: new Date().toISOString(),
    })
    .eq('id', taskId);
  if (taskError) throw taskError;
}

/** Today's date as YYYY-MM-DD (local time), for hiding tasks past their "needed by" date. */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
