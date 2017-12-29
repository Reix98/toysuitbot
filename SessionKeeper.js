var fs = require('fs');

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

/*

getSessionCount = function(){
    //logger.info("getSessionCount()");
    var sessions = storage.getItemSync("sessions");
    var count = 0;
    for(var key in sessions){
        if(sessions[key] != undefined) count++;
    }
    return count;
}

getToyList = function(){
    //logger.info("getSessionCount()");
    var sessions = storage.getItemSync("sessions");
    var toyList = [];
    for(var key in sessions){
        if(sessions[key] != undefined) toyList.push(sessions[key]['targetUsername']);
    }
    return toyList;
}

getSessionFromToyID = function(toyID){
    var sessions = storage.getItemSync("sessions");
    for(var key in sessions){
        var session = sessions[key];
        if(session['targetUserID'] == toyID) return session;
    }
    return undefined;
}

getSessionVerbosity = function(session){
    if(session['verbosity'] == undefined) return 0;
    return session['verbosity'];
}

createSession = function(targetUserID, targetUsername, channelID){
    //logger.info("createSession()");
    var sessions = storage.getItemSync("sessions");
    var session = {};
    session['targetUserID'] = targetUserID;
    session['targetUsername'] = targetUsername;
    session['channelID'] = channelID;
    session['gag'] = false;
    session['control'] = false;
    session['paren'] = true;
    session['verbose'] = false;
    session['verbosity'] = 0;
    session['users'] = {};
    session['channels'] = {};
    sessions[targetUserID] = session;
    //logger.info("Sessions: "+sessions);
    storage.setItemSync("sessions", sessions);
    return session;
}

setSessionVerbosity = function(session, verbosity){
    session['verbosity'] = verbosity;
    updateSession(session);
}

deleteSession = function(session){
    //logger.info("deleteSession()");
    var sessions = storage.getItemSync("sessions");
    for(var key in sessions){
        var testSession = sessions[key];
        //logger.info("comparing "+testSession['targetUsername']+" and "+session['targetUsername']);
        if(testSession['targetUsername'] == session['targetUsername']){
            delete sessions[key];
        }
    }
    storage.setItemSync("sessions", sessions);
}

getSessionFromToyName = function(targetUsername){
    var sessions = storage.getItemSync("sessions");
    for(var key in sessions){
        var session = sessions[key];
        if(session['targetUsername'] == targetUsername) return session;
    }
    return undefined;
}

getToyNameFromToyID = function(toyID){
    var session = getSessionFromToyID(toyID);
    if(session != null){
        return session['targetUsername'];
    }
    return undefined;
}

getSessionFromUserName = function(targetUsername){
    var sessions = storage.getItemSync("sessions");
    for(var key in sessions){
        var session = sessions[key];
        var users = session['users'];
        for(var userID in users){
            var username = users[userID];
            if(username == targetUsername) return session;
        }
    }
    return undefined;
}

getSessionUserNum = function(session){
    var count = 0;
    for(key in session['users']){
        if(session['users'][key] != undefined){
            count++;
        }
    }
    return count;
}

addUserToSession = function(session, userID, username){
    //logger.info("addUserToSession(["+session+"], ["+userID+"], ["+username+"])");
    session['users'][userID] = username;
    return session;
}

setUserChannelID = function(session, userID, channelID){
    session['channels'][userID] = channelID;
    return session;
}

removeUserFromSession = function(session, userID){
    delete session['users'][userID];
    return session;
}

updateSession = function(session){
    var sessions = storage.getItemSync("sessions");
    for(var key in sessions){
        var testSession = sessions[key];
        if(testSession['targetUsername'] == session['targetUsername']){
            sessions[key] = session;
        }
    }
    storage.setItemSync("sessions", sessions);
}

/* --- */

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

getOwner = function(profile){
    if(!profile['ownerID']) return null;
    return getProfileFromUserID(profile['ownerID']);
}

getToyType = function(profile){
    return profile['toy mode'];
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
    /*getSessionFromToyName: getSessionFromToyName,
    getSessionFromUserName: getSessionFromUserName,
    createSession: createSession,
    addUserToSession: addUserToSession,
    setUserChannelID: setUserChannelID,
    updateSession: updateSession,
    deleteSession: deleteSession,
    getSessionUserNum: getSessionUserNum,
    setUserChannelID: setUserChannelID,
    getSessionFromToyID: getSessionFromToyID,
    getToyNameFromToyID: getToyNameFromToyID,
    getSessionVerbosity: getSessionVerbosity,*/
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
    getNextLowestToyType: getNextLowestToyType,
	readableTime: readableTime
}

