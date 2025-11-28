import { findByStoreName, findByProps } from '@vendetta/metro';
import { instead } from '@vendetta/patcher';

let patches: (() => void)[] = [];

export default {
    onLoad: () => {
        try {
            // Patch 1: UserStore.getUser
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
                            user.nameplate = null;
                        }
                        return user;
                    })
                );
            }

            // Patch 2: UserProfileStore
            const UserProfileStore = findByStoreName('UserProfileStore');
            if (UserProfileStore?.getUserProfile) {
                patches.push(
                    instead('getUserProfile', UserProfileStore, (args, orig) => {
                        const profile = orig(...args);
                        if (profile) {
                            profile.profileEffectId = null;
                            profile.nameplateId = null;
                        }
                        return profile;
                    })
                );
            }

            // Patch 3: Try MemberStore
            const GuildMemberStore = findByStoreName('GuildMemberStore');
            if (GuildMemberStore?.getMember) {
                patches.push(
                    instead('getMember', GuildMemberStore, (args, orig) => {
                        const member = orig(...args);
                        if (member) {
                            if (member.nameplateId !== undefined) member.nameplateId = null;
                        }
                        return
