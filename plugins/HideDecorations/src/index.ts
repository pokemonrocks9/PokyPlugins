import { findByStoreName } from '@vendetta/metro';
import { after } from '@vendetta/patcher';

let patches: (() => void)[] = [];

/**
 * Creates a wrapper that inherits from the original object.
 * This shadows decoration properties with null without mutating the store's data.
 */
const wrapAndHide = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    const wrapper = Object.create(obj);
    const keysToNull = [
        'avatarDecoration', 'avatar_decoration',
        'avatarDecorationData', 'avatar_decoration_data',
        'profileEffectId', 'profile_effect_id',
        'nameplate'
    ];

    keysToNull.forEach(key => {
        wrapper[key] = null;
    });

    // If this is a member or profile, handle the nested user object
    if (obj.user) wrapper.user = wrapAndHide(obj.user);

    return wrapper;
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
