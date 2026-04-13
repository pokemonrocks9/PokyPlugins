import { findByStoreName } from '@vendetta/metro';
import { after } from '@vendetta/patcher';

const normalizeFonts = (text: string) => 
    typeof text === 'string' ? text.normalize("NFKC") : text;

let patches: (() => void)[] = [];
const proxyCache = new WeakMap();

export default {
    onLoad: () => {
        try {
            const UserStore = findByStoreName('UserStore');
            const GuildMemberStore = findByStoreName('GuildMemberStore');

            const createProxy = (target: any, overrides: Record<string, (val: any) => any>) => {
                if (!target || typeof target !== 'object') return target;
                if (proxyCache.has(target)) return proxyCache.get(target);

                const proxy = new Proxy(target, {
                    get(t, prop, receiver) {
                        if (typeof prop === 'string' && prop in overrides) {
                            return overrides[prop](Reflect.get(t, prop, receiver));
                        }
                        return Reflect.get(t, prop, receiver);
                    }
                });

                proxyCache.set(target, proxy);
                return proxy;
            };

            if (UserStore) {
                patches.push(after('getUser', UserStore, (_args, user) => {
                    if (!user) return user;
                    return createProxy(user, {
                        avatarDecoration: () => null,
                        avatarDecorationData: () => null,
                        profileEffectId: () => null,
                        // Nameplates are often non-configurable getters, Proxy bypasses this
                        nameplate: () => null,
                        // Custom name decorations (official Discord fonts and colors)
                        clan: () => null,
                        nameDecoration: () => null,
                        name_decoration: () => null,
                        nameDecorationData: () => null,
                        name_decoration_data: () => null,
                        // Global Name and Username fonts
                        globalName: (val) => normalizeFonts(val),
                        username: (val) => normalizeFonts(val),
                    });
                }));
            }

            if (GuildMemberStore) {
                patches.push(after('getMember', GuildMemberStore, (_args, member) => {
                    if (!member) return member;
                    return createProxy(member, {
                        // Custom name decorations can also appear on guild member objects
                        clan: () => null,
                        nameDecoration: () => null,
                        name_decoration: () => null,
                        nameDecorationData: () => null,
                        name_decoration_data: () => null,
                        // Normalize fonts in server-specific nicknames
                        nick: (val) => normalizeFonts(val),
                    });
                }));
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
