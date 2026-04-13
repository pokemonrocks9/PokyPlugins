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

            const userOverrides = {
                avatarDecoration: () => null,
                avatarDecorationData: () => null,
                profileEffectId: () => null,
                nameplate: () => null,
                clan: () => null,
                nameDecoration: () => null,
                name_decoration: () => null,
                nameDecorationId: () => null,
                name_decoration_id: () => null,
                nameDecorationData: () => null,
                name_decoration_data: () => null,
                globalName: (val: any) => normalizeFonts(val),
                username: (val: any) => normalizeFonts(val),
            };

            const createProxy = (target: any, overrides: Record<string, (val: any) => any>): any => {
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
                    return user ? createProxy(user, userOverrides) : user;
                }));
            }

            if (GuildMemberStore) {
                patches.push(after('getMember', GuildMemberStore, (_args, member) => {
                    if (!member) return member;
                    return createProxy(member, {
                        ...userOverrides, // Apply same logic to member fields
                        // Crucially: if member.user is accessed, proxy that too
                        user: (val) => val ? createProxy(val, userOverrides) : val,
                        // Ensure nicknames are also cleaned
                        nick: (val) => normalizeFonts(val),
                        clan: () => null,
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
