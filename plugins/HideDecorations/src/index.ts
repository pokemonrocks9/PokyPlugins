import { findByStoreName } from '@vendetta/metro';
import { instead } from '@vendetta/patcher';

let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        try {
            // ONLY patch UserStore - this is safe and we know it works
            const UserStore = findByStoreName('UserStore');
            if (UserStore?.getUser) {
                patches.push(
                    instead('getUser', UserStore, (args, orig) => {
                        const user = orig(...args);
                        if (user) {
                            user.avatarDecoration = null;
                            user.avatarDecorationData = null;
                            user.profileEffectId = null;
                            user.nameplateId = null;
                        }
                        return user;
                    })
                );
            }

            // Also patch getCurrentUser if it exists
            if (UserStore?.getCurrentUser) {
                patches.push(
                    instead('getCurrentUser', UserStore, (args, orig) => {
                        const user = orig(...args);
                        if (user) {
                            user.avatarDecoration = null;
                            user.avatarDecorationData = null;
                            user.profileEffectId = null;
                            user.nameplateId = null;
                        }
                        return user;
                    })
                );
            }

            // Patch UserProfileStore too
            const UserProfileStore = findByStoreName('UserProfileStore');
            if (UserProfileStore?.getUserProfile) {
                patches.push(
                    instead('getUserProfile', UserProfileStore, (args, orig) => {
                        const profile = orig(...args);
                        if (profile) {
                            profile.profileEffectId = null;
                            profile.nameplateId = null;
                        }
                        return profile;
                    })
                );
            }

            if (UserProfileStore?.getGuildMemberProfile) {
                patches.push(
                    instead('getGuildMemberProfile', UserProfileStore, (args, orig) => {
                        const profile = orig(...args);
                        if (profile) {
                            profile.profileEffectId = null;
                            profile.nameplateId = null;
                        }
                        return profile;
                    })
                );
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
