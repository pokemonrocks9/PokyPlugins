import { findByStoreName } from '@vendetta/metro';
import { instead } from '@vendetta/patcher';

const normalizeFonts = (text: string) => 
    text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

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
                            // Hide avatar decorations and frames
                            user.avatarDecoration = null;
                            user.avatarDecorationData = null;

                            // Hide profile effects (animations) and nameplates
                            user.profileEffectId = null;
                            // @ts-ignore - nameplate is a newer field in the Discord User object
                            user.nameplate = null;

                            // "Fix" fonts by normalizing stylized unicode in display names
                            // We do not modify user.clan, so clan tags remain untouched
                            if (user.globalName) user.globalName = normalizeFonts(user.globalName);
                        }
                        return user;
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
