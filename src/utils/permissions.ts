import { GuildMember } from 'discord.js';
import { config } from '../config';

export function isStaff(member: GuildMember): boolean {
    return member.roles.cache.some(role => config.staffRoleIds.includes(role.id));
} 