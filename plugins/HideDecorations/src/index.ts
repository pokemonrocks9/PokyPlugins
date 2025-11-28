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
                            // Hide avatar decorations
                            user.avatarDecoration = null;
                            user.avatarDecorationData = null;
                            
                            // Hide profile effects
                            user.profileEffectId = null;
                            
                            // Hide nameplates (the glowing highlight)
                            user.nameplateId = null;
                        }
                        return user;
                    })
                );
                console.log("[HideDecorations] UserStore.getUser patched - hiding decorations, effects, and nameplates");
            } else {
                console.log("[HideDecorations] UserStore.getUser NOT found");
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
