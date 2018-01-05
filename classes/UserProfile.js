const TemplateProfile = new UserProfile();

function UserProfile(props) {

    props = props || {};

    var profile = this;
    profile['userID'] = null;
    profile['name'] = null;
    profile['discriminator'] = null;
    profile['nickname'] = null;
    profile['lastChannelID'] = null;
    profile['str'] = 2; //str;
    profile['res'] = 2; //res;
    profile['wil'] = 2; //wil;
    profile['controlled'] = false;
    profile['gagged'] = false;
    profile['mode'] = "unsuited";
    profile['suit timestamp'] = 0;
    profile['suit timer'] = 0;
    profile['suit timer bonus count'] = 0;
    profile['suit timer bonus amount'] = null;
    profile['ownerID'] = null;
    profile['info'] = "[Info not set]";
    profile['kinks'] = "[Kinks not set]";
    profile['toy mode'] = null;
    profile['beta access list'] = [];
    profile['can safeword'] = true;
    profile['sync level'] = 0;
    profile['sync level history'] = [];
    profile['parens allowed'] = true;
    profile['sync state'] = 0;
    profile['last activity'] = 0;

    for(index in props)
        this[index] = property;
}

UserProfile.prototype.isSuited = function () {
    return this.mode === 'suited';
};

UserProfile.prototype.getPronoun = function () {
    return this.isSuited() ? 'its' : 'their';
};

UserProfile.prototype.differenceFromTemplate = function (includeID) {
    var diff = {};
    for (var prop in TemplateProfile) {
        if (typeof this[prop] == 'function')
            continue;
        if (!includeID && (prop === 'userID' || prop == 'name' || prop == 'discriminator'))
            continue;
        if (typeof this[prop] == 'object') {
            try {
                if (JSON.stringify(this[prop]) != JSON.stringify(TemplateProfile[prop])) {
                    diff[prop] = this[prop];
                }
            } catch (e) {
                //If it's gonna crash the JSON stringifier, we can't save it anyway, so...
            }
        } else if (this[prop] != TemplateProfile[prop]) {
            diff[prop] = this[prop];
        }
    }

    return diff;
};

module.exports = {
    UserProfile: UserProfile
};
