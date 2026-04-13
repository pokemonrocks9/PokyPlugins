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

                        const safeDefine = (prop: string, valueGetter: () => any) => {
                            try {
                                Object.defineProperty(user, prop, {
                                    get: valueGetter,
                                    configurable: true,
                                    enumerable: true
                                });
                            } catch (e) {
                                // Fail silently to prevent the 1:372 component rendering crash.
                                // This happens if the property is non-configurable.
                            }
                        };

                        // Hide decorations, animations, and nameplates
                        if (user.avatarDecoration != null) safeDefine('avatarDecoration', () => null);
                        if (user.avatarDecorationData != null) safeDefine('avatarDecorationData', () => null);
                        if (user.profileEffectId != null) safeDefine('profileEffectId', () => null);
                        
                        // @ts-ignore - Nameplates are a recent addition
                        if (user.nameplate != null) safeDefine('nameplate', () => null);

                        // Fix Fonts by normalizing stylized Unicode (e.g. 𝕽𝖊𝖆𝖑 -> Real)
                        // We target both globalName and username. 
                        // user.clan is left untouched so clan tags remain visible.
                        const fontProps = ['globalName', 'username'] as const;
                        for (const prop of fontProps) {
                            const val = user[prop];
                            if (val) {
                                const normalized = normalizeFonts(val);
                                if (normalized !== val) {
                                    safeDefine(prop, () => normalized);
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
