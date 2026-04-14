import { findByStoreName } from '@vendetta/metro';
import { after } from '@vendetta/patcher';

let patches: (() => void)[] = [];

/**
 * Creates a wrapper that inherits from the original object.
 * This returns a shallow copy with decoration properties set to null to avoid mutating the store's data.
 */
const wrapAndHide = (obj: any): any => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj.__v_hidden) return obj;

    const shadowKeys = [
        'avatarDecoration', 'avatar_decoration',
        'avatarDecorationData', 'avatar_decoration_data',
        'profileEffectId', 'profile_effect_id',
        'nameplate', 'nameplate_data', 'nameplateData'
    ];

    // Create a copy that preserves the prototype chain for native compatibility
    const newObj = Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);

    // Mark as processed to prevent infinite loops and redundant wrapping
    Object.defineProperty(newObj, '__v_hidden', { value: true, enumerable: false });

    for (const key of shadowKeys) {
        if (key in newObj) {
            newObj[key] = null;
        }
    }

    // Recursively handle nested objects where decorations might hide
    const nested = ['user', 'guild_member_profile', 'guildMember', 'guild_member'];
    for (const key of nested) {
        if (newObj[key] && typeof newObj[key] === 'object') {
            newObj[key] = wrapAndHide(newObj[key]);
        }
    }

    return newObj;
};

export default {
    onLoad: () => {
        try {
            const UserStore = findByStoreName('UserStore');
            const GuildMemberStore = findByStoreName('GuildMemberStore');
            const UserProfileStore = findByStoreName('UserProfileStore');

            if (UserStore) {
                patches.push(after('getUser', UserStore, ([_id], res) => wrapAndHide(res)));
            }

            if (UserProfileStore) {
                patches.push(after('getUserProfile', UserProfileStore, ([_id], res) => wrapAndHide(res)));
            }

            if (GuildMemberStore) {
                patches.push(after('getMember', GuildMemberStore, ([_gId, _uId], res) => wrapAndHide(res)));
                if (GuildMemberStore.getTrueMember) {
                    patches.push(after('getTrueMember', GuildMemberStore, ([_gId, _uId], res) => wrapAndHide(res)));
                }
            }
        } catch (error) {
            console.error("[HideDecorations] Error:", error);
        }
    },
    onUnload: () => {
        patches.forEach((unpatch) => unpatch());
        patches = [];
    }
};
