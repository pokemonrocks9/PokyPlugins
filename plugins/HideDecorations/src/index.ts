import { findByStoreName } from '@vendetta/metro';
import { after } from '@vendetta/patcher';

const normalizeFonts = (text: string) => 
    typeof text === 'string' ? text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "") : text;

let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        try {
            const UserStore = findByStoreName('UserStore');

            if (UserStore?.getUser) {
                patches.push(
                    after('getUser', UserStore, (_args, user) => {
                        if (!user) return;

                        // Use defineProperty to bypass "read-only" assignment errors
                        // which cause the 1:372 rendering crash.
                        const hide = { get: () => null, configurable: true, enumerable: true };

                        if (user.avatarDecoration !== null) Object.defineProperty(user, 'avatarDecoration', hide);
                        if (user.avatarDecorationData !== null) Object.defineProperty(user, 'avatarDecorationData', hide);
                        if (user.profileEffectId !== null) Object.defineProperty(user, 'profileEffectId', hide);
                        
                        // @ts-ignore - Nameplates are a recent addition
                        if (user.nameplate !== null) Object.defineProperty(user, 'nameplate', hide);

                        // Fix Fonts by normalizing stylized Unicode (e.g. 𝕽𝖊𝖆𝖑 -> Real)
                        // This targets globalName (Display Name). Clan tags are in user.clan and remain untouched.
                        if (user.globalName) {
                            const normalized = normalizeFonts(user.globalName);
                            if (normalized !== user.globalName) {
                                try {
                                    Object.defineProperty(user, 'globalName', {
                                        get: () => normalized,
                                        configurable: true,
                                        enumerable: true
                                    });
                                } catch (e) {
                                    // Fallback for cases where the property is non-configurable
                                }
                            }
                        }
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
