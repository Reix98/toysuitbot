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

    for(var prop in props) {
        this[prop] = props[prop];
    }
}

UserProfile.prototype.getName = function () {
    if (!this['nickname'] || !this.isSuited()) {
        return this['name']; // The real name
    }

    return this['nickname']; // The toy name
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
                console.log('[ERROR]: Could not save stringifier profile');
                //If it's gonna crash the JSON stringifier, we can't save it anyway, so...
            }
        } else if (this[prop] != TemplateProfile[prop]) {
            diff[prop] = this[prop];
        }
    }

    return diff;
};

UserProfile.prototype.getLastActivity = function () {
    var lastActivity = this['last activity'];

    return lastActivity ? lastActivity : 0;
};

UserProfile.prototype.getToyType = function () {
    return this['toy mode'];
}

module.exports = {
    UserProfile: UserProfile
};
