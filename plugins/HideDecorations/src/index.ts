import { findByStoreName } from '@vendetta/metro';
import { instead } from '@vendetta/patcher';

let patches: (() => void)[] = [];

const nullify = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    const props = [
        'avatarDecoration', 'avatar_decoration',
        'avatarDecorationData', 'avatar_decoration_data',
        'profileEffectId', 'profile_effect_id',
        'nameplate'
    ];

    for (const prop of props) {
        try {
            // Use try-catch in case Discord freezes these objects in certain versions
            obj[prop] = null;
        } catch {
            // Silently fail if property is read-only
        }
    }

    // Recurse if there's a nested user object (common in profiles/members)
    if (obj.user) nullify(obj.user);
};

export default {
    onLoad: () => {
        try {
            const UserStore = findByStoreName('UserStore');
            const GuildMemberStore = findByStoreName('GuildMemberStore');
            const UserProfileStore = findByStoreName('UserProfileStore');

            if (UserStore) {
                patches.push(instead('getUser', UserStore, (args, orig) => {
                    const res = orig(...args);
                    nullify(res);
                    return res;
                }));
            }

            if (UserProfileStore) {
                patches.push(instead('getUserProfile', UserProfileStore, (args, orig) => {
                    const res = orig(...args);
                    nullify(res);
                    return res;
                }));
            }

            if (GuildMemberStore) {
                const patchFn = (args: any, orig: any) => {
                    const res = orig(...args);
                    nullify(res);
                    return res;
                };
                patches.push(instead('getMember', GuildMemberStore, patchFn));
                if (GuildMemberStore.getTrueMember) {
                    patches.push(instead('getTrueMember', GuildMemberStore, patchFn));
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
