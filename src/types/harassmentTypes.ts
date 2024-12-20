export interface HarassmentState {
    active: boolean;
    targetId: string | null;
    message: string | null;
    intervalId: NodeJS.Timeout | null;
} 