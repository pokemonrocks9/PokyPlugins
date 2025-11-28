import { findByStoreName } from '@vendetta/metro';
import { instead } from '@vendetta/patcher';

let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        try {
            const UserStore = findByStoreName('UserStore');
            if (UserStore?.getUser) {
                patches.push(
                    instead('getUser', UserStore, (args, orig) => {
                        const user = orig(...args);
                        if (user) {
                            // LOG ALL PROPERTIES to find the nameplate one
                            console.log("[HideDecorations] User object keys:", Object.keys(user));
                            console.log("[HideDecorations] User object:", JSON.stringify(user, null, 2));
                            
                            // Hide everything we know about
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
                console.log("[HideDecorations] Debug mode active - check console for user object properties");
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
