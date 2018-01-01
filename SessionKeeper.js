var fs = require('fs');
var regression = require('regression');

var logger;
var discordBot;

//var sessions = {};
var profileCache = {};


var TemplateProfile = null;

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

UserProfile.prototype.differenceFromTemplate = function(includeID) {
	var diff = {};
	for(var prop in TemplateProfile) {
		if(!includeID && (prop == 'userID' || prop == 'name' || prop == 'discriminator')) continue;
		if(typeof this[prop] == 'function') continue;
		if(typeof this[prop] == 'object') {
			try {
				if(JSON.stringify(this[prop]) != JSON.stringify(TemplateProfile[prop])) diff[prop] = this[prop];
			}catch(e){
				//If it's gonna crash the JSON stringifier, we can't save it anyway, so...
			}
		}else if(this[prop] != TemplateProfile[prop]) diff[prop] = this[prop];
	}
	
	return diff;
}

TemplateProfile = new UserProfile();

init = function(log, bot){
    logger = log;
	discordBot = bot;
	
	if(!fs.existsSync('profiles')) {
		logger.info('No profiles folder exists. Creating one now...');
		fs.mkdirSync('profiles');
	}
	
	var proFiles = fs.readdirSync('profiles');
	
	for(var i = 0, l = proFiles.length; i < l; i++) {
		var file = proFiles[i];
		var insensitive = file.toLowerCase();
		if(!insensitive.startsWith('profile-') || !insensitive.endsWith('.json')) continue;
		
		//Remove 'profile-' prefix and '.json' suffix.
		var profName = file.substr(8);
		profName = profName.substr(0, profName.length-5);
		try {
			var newProf = new UserProfile(JSON.parse(fs.readFileSync('profiles/'+file)));
			profileCache[profName] = newProf;
		}catch(e) {
			logger.error('Couldn\'t load profile "'+file+'" because it is inaccessible or corrupted:',e);
		}
	}
	
	var users = discordBot.users;
	
	for(var key in users) {
		var user = users[key];
		if(user.bot) continue;
		if(!profileCache.hasOwnProperty(user.id)) profileCache[user.id] = new UserProfile();
		var prof = profileCache[user.id];
		prof['userID'] = user.id;
		prof['name'] = user.username;
		prof['discriminator'] = user.discriminator;
	}
	
    //var sessionCount = getSessionCount();
    //var toyList = getToyList();
    //logger.info("There are currently "+sessionCount+" sessions in storage:");
    //for(var i=0; i<toyList.length; i++) logger.info("\t- "+toyList[i]);

}


noteUser = function(userID) {
	//This is triggered by main.js when a user's presence status changes.
	//We can use this to ensure that every user that enters the server is known to our profiles.
	//If this user doesn't have a profile, make one.
	if(!profileCache.hasOwnProperty(userID)) createProfileFromUserID(userID);
}

writeProfileToDisk = function(userID) {
	var profile = profileCache[userID];
	var differences = (profile||TemplateProfile).differenceFromTemplate(false);
	var diffKeys = Object.keys(differences);
	if(diffKeys.length < 1 || (diffKeys.length == 1 && diffKeys[0] == 'lastChannelID')) {
		try{
			fs.unlinkSync('profiles/profile-'+userID+'.json');
		}catch(e){}
	}else {
		fs.writeFileSync('profiles/profile-'+userID+'.json', JSON.stringify(differences));
	}
}

getProfileFromUserID = function(userID){
    //logger.info("getProfileFromUserID("+userID+")");
    var profile = profileCache[userID];
    
	if(profile) return profile;
	
    //There is no user profile.
	//Create one.
	return createProfileFromUserID(userID);
}

getProfileFromUserName = function(username){
    for(var key in profileCache){
        var profile = profileCache[key];
        //logger.info("Comparing '"+profile['name']+"' and '"+username+"'.");
        if(username && ((profile['name']||'').toLowerCase().trim() == username.toLowerCase().trim() || ('<@'+key+'>' == username))){
            //logger.info("getProfileFromUserName("+username+"):\n"+profile);
            return profile;
        }
    }
    return createProfileFromUsername(username);
}

createProfileFromUserID = function(userID){
	
	var users = discordBot.users;
	
	if(!users.hasOwnProperty(userID)) {
		logger.error('User ID "'+userID+'" does not exist, but was passed to createProfileFromUserID?');
		console.trace("DEBUG: Stack trace for bad createProfileFromUserID call:");
		return null;
	}
	
	var user = users[userID];
	var name = user.username;
	
    var profile = new UserProfile();
    profile['userID'] = userID;
    profile['name'] = name;
	profile['discriminator'] = user.discriminator;
	profileCache[userID] = profile;
	writeProfileToDisk(userID);
    return profile;
}

createProfileFromUsername = function(username) {
	var users = discordBot.users;
	
	for(var i = 0, l = users.length; i < l; i++) {
		var user = users[i];
		if(username && (user.username.toLowerCase().trim() == username.toLowerCase().trim() || ('<@'+user.id+'>' == username))) {
			return createProfileFromUserID(user.id);
		}
	}
	
	return null; //Couldn't find that username.
}

deleteProfile = function(profileOrUserID) {
	
	var uid;
	
	if(typeof profileOrUserID === 'object' && profileOrUserID && profileOrUserID.userID) uid = profileOrUserID.userID;
	else uid = profileOrUserID;
	
	delete profileCache[uid];
	
	try{
		fs.unlinkSync('profiles/profile-'+uid+'.json');
	}catch(e){}
	
	createProfileFromUserID(uid);
}

getName = function(profile){
    if(!profile['nickname'] || profile['mode'] != 'suited') return profile['name'];
    else return profile['nickname'];
}

getSyncLevel = function(profile){
    var sync = profile['sync level'];
    if(sync != undefined && sync != null){
        if(isNaN(sync)) return 0;
        return sync;
    }
    return 0;
}

changeSyncLevel = function(profile, delta){
    if(isNaN(delta)) return profile;
    var sync = getSyncLevel(profile);
    profile['sync level'] = Math.min(100, Math.max(-100, sync + delta));
    profile['sync level history'].push(profile['sync level']);
    if(profile['sync level history'].length>100){
        profile['sync level history'].shift();
    }
    updateProfile(profile);
}

getSyncLevelTrend = function(profile, time){
    var data = [];
    var x = 0-profile['sync level history'].length;
    for(key in profile['sync level history']){
        if(x >= -1 * time){
            data.push([x, profile['sync level history'][key]]);
        }
        x++;
    }
    //console.log(data);
    var result = regression.linear(data);
    var prediction = result.predict(1)[1];
    var trend = prediction - profile['sync level'];
    //console.log(prediction + " (" + trend + ")");
    if(trend == "NaN") return 0;
    return trend;
}

getSyncState = function(profile){
    var syncState = profile['sync state'];
    if(syncState != undefined && syncState != null){
        return syncState;
    }
    return 0;
}

setSyncState = function(profile, state){
    profile['sync state'] = state;
    updateProfile(profile);
}

updateSyncState = function(profile){
    var syncState = getSyncState(profile);
    var prevState = syncState;
    var sync = getSyncLevel(profile);
    switch(syncState){
        case(-2):   //Very low sync
            if(sync > -70) setSyncState(profile, -1);
        break;
        case(-1):   //Low sync
            if(sync < -80) setSyncState(profile, -2);
            if(sync > -20) setSyncState(profile, 0);
        break;
        case(0):    //Neutral sync
            if(sync < -30) setSyncState(profile, -1);
            if(sync > 30) setSyncState(profile, 1);
        break;
        case(1):    //High sync
            if(sync < 20) setSyncState(profile, 0);
            if(sync > 80) setSyncState(profile, 2);
        break;
        case(2):    //Very high sync
            if(sync < 70) setSyncState(profile, 1);
        break;
    }
    syncState = getSyncState(profile);
    return (syncState - prevState);
}

getOwner = function(profile){
    if(!profile['ownerID']) return null;
    return getProfileFromUserID(profile['ownerID']);
}

getToyType = function(profile, exclusive){
    if(exclusive){
        var type = profile['toy mode'];
        if(type == "alpha") return "alpha";
        if(type == "beta")  return "beta";
        if(type == "omega") return "omega";
        return "beta";
    }
    return profile['toy mode'];
}

getToyTypeSymbol = function(profile){
    switch(profile['toy mode']){
        case('alpha'): return "α";
        case('beta'): return "β";
        case('omega'): return "ω";
    }
    return "?";
}

getNextLowestToyType = function(type){
    switch(type){
		case("dom"): return "alpha";
        case(null): return "alpha";
        case("alpha"): return "beta";
        case("beta"): return "omega";
        case("omega"): throw "Omega toys cannot do that";
    }
    throw "Toy type unknown";
}

getRemainingTimerSeconds = function(profile){
    logger.info("getRemainingTimerSeconds("+profile+")");
    if(!profile['suit timestamp']) return 0;
    var now = (Date.now()/1000);
    var endTimestamp = profile['suit timestamp'] + profile['suit timer'];
    //endTimestamp += profile['suit timer bonus count'] * profile['suit timer bonus amount'];
    logger.info(endTimestamp + " - " + now);
    return endTimestamp - now;
}

updateProfile = function(profile){
    var prof = profileCache[profile.userID];
	for(var key in profile) {
		if(typeof prof[key] == 'function') continue;
		prof[key] = profile[key];
	}
	writeProfileToDisk(prof.userID);
}

getUserIDFromUserName = function(username){
    //logger.info("getUserIDFromUserName("+username+")");
    for(var key in profileCache){
        var profile = profileCache[key];
        //logger.info("Comparing '"+profile['name']+"' and '"+username+"'.");
        if(username && (profile['name'].toLowerCase().trim() == username.toLowerCase().trim() || ('<@'+key+'>' == username))) return userID;
    }	
    return null;
}

readableTime = function(time){
    var timeText = "";
    var minutes = 0;
    var seconds = 0;
    if(time >= 60){
        minutes = Math.floor(time/60);
        time -= 60*minutes;
    }
    seconds = Math.floor(time);

    if(minutes < 10) timeText += "0";
    timeText += minutes+":";
    if(seconds < 10) timeText += "0";
    timeText += seconds;

    return timeText;
}

module.exports = {
    init: init,
	noteUser: noteUser,
    getProfileFromUserID: getProfileFromUserID,
    getProfileFromUserName: getProfileFromUserName,
    createProfileFromUserID: createProfileFromUserID,
    updateProfile: updateProfile,
	deleteProfile: deleteProfile,
    getRemainingTimerSeconds: getRemainingTimerSeconds,
    getName: getName,
    getOwner: getOwner,
    getToyType: getToyType,
    getToyTypeSymbol: getToyTypeSymbol,
    getNextLowestToyType: getNextLowestToyType,
    readableTime: readableTime,
    getSyncLevel: getSyncLevel,
    getSyncLevelTrend: getSyncLevelTrend,
    changeSyncLevel: changeSyncLevel,
    getSyncState: getSyncState,
    updateSyncState: updateSyncState
}

