export interface QueueItem {
    url: string;
    title: string;
    duration: string;
    requestedBy: {
        id: string;
        username: string;
    };
    audioUrl?: string;
}

export interface MusicState {
    currentSong: QueueItem | null;
    queue: QueueItem[];
    loopCount: number;
    loopRemaining: number;
}

export interface SkipVoteStatus {
    required: number;
    current: number;
    voters: string[];
} 