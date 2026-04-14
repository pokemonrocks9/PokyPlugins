import { findByStoreName } from '@vendetta/metro';
import { after } from '@vendetta/patcher';

let patches: (() => void)[] = [];

/**
 * Creates a wrapper that inherits from the original object.
 * This returns a shallow copy with decoration properties set to null to avoid mutating the store's data.
 */
const wrapAndHide = (obj: any): any => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;

    const shadowKeys = [
        'avatarDecoration', 'avatar_decoration',
        'avatarDecorationData', 'avatar_decoration_data',
        'profileEffectId', 'profile_effect_id',
        'nameplate', 'nameplate_data', 'nameplateData'
    ];

    // Create a shallow copy to ensure all properties are "own properties" for the RN bridge
    const newObj = { ...obj };

    for (const key of shadowKeys) {
        if (key in newObj) {
            newObj[key] = null;
        }
    }

    // If this is a member or profile, handle the nested user object
    if (newObj.user) {
        newObj.user = wrapAndHide(newObj.user);
    }

    if (newObj.guild_member_profile) {
        newObj.guild_member_profile = wrapAndHide(newObj.guild_member_profile);
    }

    if (newObj.guildMember) {
        newObj.guildMember = wrapAndHide(newObj.guildMember);
    }

    if (newObj.guild_member) {
        newObj.guild_member = wrapAndHide(newObj.guild_member);
    }

    return newObj;
};

export default {
    onLoad: () => {
        try {
            const UserStore = findByStoreName('UserStore');
            const GuildMemberStore = findByStoreName('GuildMemberStore');
            const UserProfileStore = findByStoreName('UserProfileStore');

            if (UserStore) {
                patches.push(after('getUser', UserStore, ([_id], res) => wrapAndHide(res)));
            }

            if (UserProfileStore) {
                patches.push(after('getUserProfile', UserProfileStore, ([_id], res) => wrapAndHide(res)));
            }

            if (GuildMemberStore) {
                patches.push(after('getMember', GuildMemberStore, ([_gId, _uId], res) => wrapAndHide(res)));
                if (GuildMemberStore.getTrueMember) {
                    patches.push(after('getTrueMember', GuildMemberStore, ([_gId, _uId], res) => wrapAndHide(res)));
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
