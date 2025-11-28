import { findByStoreName, findByProps } from '@vendetta/metro';
import { instead, after } from '@vendetta/patcher';

let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        try {
            // Patch 1: Data layer
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

            // Patch 2: Find and patch the Video component to hide nameplate videos
            try {
                const { Video } = require('react-native');
                const OriginalVideo = Video;
                
                // Wrap Video component to filter out nameplate videos
                const PatchedVideo = (props) => {
                    // If the source contains "nameplates", don't render it
                    if (props?.source?.uri?.includes('nameplates') || 
                        props?.src?.includes('nameplates')) {
                        return null;
                    }
                    return OriginalVideo(props);
                };
                
                // Replace the Video component
                require('react-native').Video = PatchedVideo;
                
            } catch (e) {
                console.log("[HideDecorations] Could not patch Video component");
            }

            // Patch 3: Find any component/module that renders nameplates
            try {
                // Look for modules that might handle nameplate rendering
                const NameplateModule = findByProps('renderNameplate', 'NameplateContainer');
                if (NameplateModule) {
                    Object.keys(NameplateModule).forEach(key => {
                        if (typeof NameplateModule[key] === 'function') {
                            patches.push(
                                instead(key, NameplateModule, () => null)
                            );
                        }
                    });
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
