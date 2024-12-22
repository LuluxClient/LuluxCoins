import { musicManager } from '../../../managers/musicManager';

// Fonction utilitaire pour vérifier si un utilisateur est banni
export async function isBanned(userId: string): Promise<boolean> {
    return musicManager.isUserBanned(userId);
}

// Export des handlers
export { play } from './play';
export { stop } from './stopHandler';
export { skip } from './skipHandler';
export { info } from './infoHandler';
export { loop } from './loopHandler';
export { connect } from './connectHandler';
export { disconnect } from './disconnectHandler';
export { clearQueue } from './clearQueueHandler';
export { ban } from './banHandler';
export { unban } from './unbanHandler'; 