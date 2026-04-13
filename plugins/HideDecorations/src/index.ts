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
            const UserProfileStore = findByStoreName('UserProfileStore');

            const userOverrides = {
                avatarDecoration: () => null,
                avatar_decoration: () => null,
                avatarDecorationData: () => null,
                avatar_decoration_data: () => null,
                profileEffectId: () => null,
                profile_effect_id: () => null,
                nameplate: () => null,
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

            if (UserProfileStore) {
                patches.push(after('getUserProfile', UserProfileStore, (_args, profile) => {
                    if (!profile) return profile;
                    return createProxy(profile, {
                        ...userOverrides,
                        user: (val) => val ? createProxy(val, userOverrides) : val,
                    });
                }));
            }

            if (GuildMemberStore) {
                const patchMember = (member: any) => {
                    if (!member) return member;
                    return createProxy(member, {
                        ...userOverrides,
                        // Crucially: if member.user is accessed, proxy that too
                        user: (val) => val ? createProxy(val, userOverrides) : val,
                        // Ensure nicknames are also cleaned
                        nick: (val) => normalizeFonts(val),
                    });
                };

                patches.push(after('getMember', GuildMemberStore, (_args, member) => patchMember(member)));
                if (GuildMemberStore.getTrueMember) {
                    patches.push(after('getTrueMember', GuildMemberStore, (_args, member) => patchMember(member)));
                }
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
