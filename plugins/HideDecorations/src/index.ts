import { findByStoreName, findByProps } from '@vendetta/metro';
import { instead } from '@vendetta/patcher';

let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        try {
            // Patch 1: UserStore
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

            // Patch 2: UserProfileStore
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

            // NEW: Force stores to refresh/invalidate their cache
            try {
                // Try to force UserStore to emit updates
                if (UserStore?._changeCallbacks) {
                    UserStore._changeCallbacks.forEach(cb => {
                        try { cb(); } catch {}
                    });
                }
                
                // Try to invalidate cached data
                if (UserStore?.emitChange) {
                    UserStore.emitChange();
                }
                
                // Try UserProfileStore too
                if (UserProfileStore?.emitChange) {
                    UserProfileStore.emitChange();
                }
            } catch (e) {
                console.log("[HideDecorations] Could not force refresh");
            }

            // Alternative: Dispatch a fake action to trigger re-renders
            try {
                const Dispatcher = findByProps('dispatch', 'subscribe');
                if (Dispatcher?.dispatch) {
                    // Dispatch a harmless action that forces user data to refresh
                    setTimeout(() => {
                        try {
                            Dispatcher.dispatch({
                                type: 'OVERLAY_INITIALIZE',
                                user: UserStore?.getCurrentUser?.()
                            });
                        } catch {}
                    }, 1000);
                }
            } catch {}

        } catch (error) {
            console.error("[HideDecorations] Error:", error);
        }
    },
    onUnload: () => {
        patches.forEach((unpatch) => unpatch());
        patches = [];
    }
};
