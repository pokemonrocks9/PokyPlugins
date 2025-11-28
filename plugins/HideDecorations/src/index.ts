import { findByStoreName, findByProps } from '@vendetta/metro';
import { instead, before } from '@vendetta/patcher';

let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        try {
            // Patch 1: Still patch user data
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

            // Patch 2: Find the asset/CDN loader and block nameplate assets
            try {
                const AssetUtils = findByProps('getAssetImage', 'getAssetIds');
                if (AssetUtils) {
                    // Patch any function that might load assets
                    Object.keys(AssetUtils).forEach(key => {
                        const fn = AssetUtils[key];
                        if (typeof fn === 'function') {
                            patches.push(
                                before(key, AssetUtils, (args) => {
                                    // If any argument contains "nameplate", block it
                                    const argsStr = JSON.stringify(args);
                                    if (argsStr.includes('nameplate')) {
                                        // Return early with null/empty
                                        return [null];
                                    }
                                })
                            );
                        }
                    });
                }
            } catch {}

            // Patch 3: Find image/video loader modules
            try {
                const ImageResolver = findByProps('resolveImageUri', 'getImageUri');
                if (ImageResolver) {
                    Object.keys(ImageResolver).forEach(key => {
                        const fn = ImageResolver[key];
                        if (typeof fn === 'function') {
                            patches.push(
                                instead(key, ImageResolver, (args, orig) => {
                                    const result = orig(...args);
                                    // If result contains nameplate URL, return null
                                    if (typeof result === 'string' && result.includes('nameplate')) {
                                        return null;
                                    }
                                    if (result?.uri?.includes('nameplate')) {
                                        return null;
                                    }
                                    return result;
                                })
                            );
                        }
                    });
                }
            } catch {}

            // Patch 4: Try to find constants/config with nameplate data
            try {
                const Constants = findByProps('API_ENDPOINT', 'CDN_HOST');
                // Might not work but worth a shot - try to find nameplate-related constants
            } catch {}

            // Patch 5: Nuclear option - patch ALL stores to remove nameplateId
            try {
                const Dispatcher = findByProps('dispatch', 'subscribe');
                if (Dispatcher) {
                    patches.push(
                        before('dispatch', Dispatcher, (args) => {
                            const event = args[0];
                            if (event && typeof event === 'object') {
                                // Recursively remove nameplateId from all dispatch payloads
                                const removeNameplates = (obj) => {
                                    if (obj && typeof obj === 'object') {
                                        if (obj.nameplateId !== undefined) obj.nameplateId = null;
                                        if (obj.nameplate !== undefined) obj.nameplate = null;
                                        Object.values(obj).forEach(val => {
                                            if (val && typeof val === 'object') {
                                                removeNameplates(val);
                                            }
                                        });
                                    }
                                };
                                removeNameplates(event);
                            }
                        })
                    );
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
