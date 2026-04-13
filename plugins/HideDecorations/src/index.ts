import { findByStoreName } from '@vendetta/metro';
import { instead } from '@vendetta/patcher';
let patches: (() => void)[] = [];
export default {
    onLoad: () => {
        try {
            // TEST 2: Patch UserStore.getUser
            const UserStore = findByStoreName('UserStore');
            if (UserStore?.getUser) {
                patches.push(
                    instead('getUser', UserStore, (args, orig) => {
                        const user = orig(...args);
                        if (user) {
                            user.avatarDecoration = null;
                            user.avatarDecorationData = null;
                        }
                        return user;
                    })
                );
                console.log("[HideDecorations] Test 2: UserStore.getUser patched");
            } else {
                console.log("[HideDecorations] Test 2: UserStore.getUser NOT found");
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
