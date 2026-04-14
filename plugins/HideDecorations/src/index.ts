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

    // Get all property descriptors (including non-enumerable properties and Symbols)
    const descriptors = Object.getOwnPropertyDescriptors(obj);

    // Shadow the decoration keys by forcing them to null in the descriptors
    for (const key of shadowKeys) {
        descriptors[key] = {
            value: null,
            enumerable: true,
            configurable: true,
            writable: true
        };
    }

    // Create the twin object with the same prototype and our modified descriptors
    const newObj = Object.create(Object.getPrototypeOf(obj), descriptors);

    // Mark as processed to prevent infinite loops and redundant wrapping
    Object.defineProperty(newObj, '__v_hidden', { value: true, enumerable: false });

    // Recursively handle nested objects where decorations might hide
    const nested = ['user', 'guild_member_profile', 'guildMember', 'guild_member'];
    for (const key of nested) {
        const val = newObj[key];
        if (val && typeof val === 'object') {
            Object.defineProperty(newObj, key, {
                value: wrapAndHide(val),
                enumerable: true,
                configurable: true,
                writable: true
            });
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
