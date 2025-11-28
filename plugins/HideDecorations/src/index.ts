import { findByStoreName, findByProps } from '@vendetta/metro';
import { instead, before } from '@vendetta/patcher';

let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        try {
            // Patch 1: UserStore.getUser
            const UserStore = findByStoreName('UserStore');
            if (UserStore?.getUser) {
                patches.push(
                    instead('getUser', UserStore, (args, orig) => {
                        const user = orig(...args);
                        if (user) {
                            // Hide avatar decorations
                            user.avatarDecoration = null;
                            user.avatarDecorationData = null;
                            
                            // Hide profile effects
                            user.profileEffectId = null;
                            
                            // Hide nameplates - try all possible property names
                            user.nameplateId = null;
                            user.nameplate = null;
                            user.nameplateData = null;
                        }
                        return user;
                    })
                );
                console.log("[HideDecorations] UserStore.getUser patched");
            }

            // Patch 2: Try to find and patch the getCurrentUser method too
            if (UserStore?.getCurrentUser) {
                patches.push(
                    instead('getCurrentUser', UserStore, (args, orig) => {
                        const user = orig(...args);
                        if (user) {
                            user.avatarDecoration = null;
                            user.avatarDecorationData = null;
                            user.profileEffectId = null;
                            user.nameplateId = null;
                            user.nameplate = null;
                            user.nameplateData = null;
                        }
                        return user;
                    })
                );
                console.log("[HideDecorations] UserStore.getCurrentUser patched");
            }

            // Patch 3: Try to find the module that handles nameplate rendering
            // This might be named something like "getNameplateForUser" or similar
            const NameplateModule = findByProps('getNameplateForUser');
            if (NameplateModule?.getNameplateForUser) {
                patches.push(
                    instead('getNameplateForUser', NameplateModule, () => null)
                );
                console.log("[HideDecorations] Nameplate module patched");
            }

            // Patch 4: Alternative - look for getUserProfile which might contain this data
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
                console.log("[HideDecorations] UserProfileStore.getUserProfile patched");
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
