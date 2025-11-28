import { findByStoreName, findByProps } from '@vendetta/metro';
import { instead, before, after } from '@vendetta/patcher';
import { logger } from '@vendetta';

let patches: (() => void)[] = [];
let logs: string[] = [];

// Helper to add logs that we can display
function addLog(msg: string) {
    logs.push(msg);
    logger.log("[HideDecorations] " + msg);
}

export default {
    onLoad: () => {
        try {
            addLog("Plugin started!");

            // Patch 1: UserStore.getUser
            const UserStore = findByStoreName('UserStore');
            if (UserStore?.getUser) {
                patches.push(
                    instead('getUser', UserStore, (args, orig) => {
                        const user = orig(...args);
                        if (user) {
                            // Log what properties the user has (ONLY ONCE to avoid spam)
                            if (logs.length < 20) {
                                addLog("User keys: " + Object.keys(user).filter(k => k.includes('plate') || k.includes('effect') || k.includes('decoration')).join(', '));
                            }
                            
                            user.avatarDecoration = null;
                            user.avatarDecorationData = null;
                            user.profileEffectId = null;
                            user.nameplateId = null;
                        }
                        return user;
                    })
                );
                addLog("UserStore.getUser patched ✓");
            } else {
                addLog("UserStore.getUser NOT FOUND ✗");
            }

            // Patch 2: UserProfileStore
            const UserProfileStore = findByStoreName('UserProfileStore');
            if (UserProfileStore) {
                addLog("Found UserProfileStore!");
                
                if (UserProfileStore.getUserProfile) {
                    patches.push(
                        instead('getUserProfile', UserProfileStore, (args, orig) => {
                            const profile = orig(...args);
                            if (profile && logs.length < 20) {
                                addLog("Profile keys: " + Object.keys(profile).filter(k => k.includes('plate') || k.includes('effect')).join(', '));
                            }
                            if (profile) {
                                profile.profileEffectId = null;
                                profile.nameplateId = null;
                            }
                            return profile;
                        })
                    );
                    addLog("UserProfileStore.getUserProfile patched ✓");
                }
            } else {
                addLog("UserProfileStore NOT FOUND ✗");
            }

            // Patch 3: Search for NameplateStore
            try {
                const NameplateStore = findByStoreName('NameplateStore');
                if (NameplateStore) {
                    addLog("Found NameplateStore! Methods: " + Object.keys(NameplateStore).join(', '));
                } else {
                    addLog("NameplateStore NOT FOUND ✗");
                }
            } catch (e) {
                addLog("NameplateStore search error");
            }

            // Patch 4: Search for nameplate functions
            try {
                const NameplateModule = findByProps('getNameplateForUser');
                if (NameplateModule) {
                    addLog("Found getNameplateForUser module!");
                    patches.push(
                        instead('getNameplateForUser', NameplateModule, () => {
                            addLog("getNameplateForUser blocked!");
                            return null;
                        })
                    );
                } else {
                    addLog("getNameplateForUser NOT FOUND ✗");
                }
            } catch (e) {
                addLog("getNameplateForUser search error");
            }

            addLog("=== SETUP COMPLETE ===");
            addLog("Total patches applied: " + patches.length);

        } catch (error) {
            addLog("ERROR: " + error.toString());
        }
    },
    onUnload: () => {
        patches.forEach((unpatch) => unpatch());
        patches = [];
        addLog("Plugin unloaded");
    },
    // Add a settings page to view logs
    getSettings: () => ({
        type: "custom",
        component: () => {
            const { Text, ScrollView } = require("react-native");
            const React = require("react");
            
            return React.createElement(
                ScrollView,
                { style: { padding: 10 } },
                logs.map((log, i) => 
                    React.createElement(
                        Text,
                        { key: i, style: { color: 'white', marginBottom: 5 } },
                        log
                    )
                )
            );
        }
    })
};
