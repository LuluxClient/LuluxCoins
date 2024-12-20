export interface HarassmentState {
    active: boolean;
    targetId: string | null;
    message: string | null;
    intervalId: NodeJS.Timeout | null;
    startTime: number | null;
}

export interface HarassmentDatabase {
    activeHarassment: {
        active: boolean;
        targetId: string | null;
        message: string | null;
        startTime: number | null;
    } | null;
} 