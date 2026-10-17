
export const TASK_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CLAIMED: 'claimed',
    REVISION_REQUESTED: 'revision_requested',
    CANCELLED: 'cancelled',
    SUBMITTED: 'submitted',
} as const;

export type TaskStatusType = typeof TASK_STATUS[keyof typeof TASK_STATUS];

export const SUBSCRIPTION_TIERS = {
    MEMBER: 'member',
    SILVER: 'silver',
    BRONZE: 'bronze',
    DIAMOND: 'diamond',
    GOLD: 'gold',
    VIP: 'vip',
} as const;
