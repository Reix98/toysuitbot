var storage = require('node-persist');

var logger;

var sessions = {};
var profiles = {};
storage.initSync();

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

init = function(log, forceCacheRefresh){
    logger = log;
    if(storage.getItemSync("creation date") == undefined || forceCacheRefresh){
        logger.info("No cache found. Creating new cache.");
        storage.clearSync();
        storage.setItemSync("creation date", new Date().toDateString());
        storage.setItemSync("sessions", sessions);
        storage.setItemSync("profiles", profiles);
    }else{
        logger.info("Previous cache loaded.");
        //profiles = storage.getItemSync("profiles");
        //logger.info("profiles data: "+profiles);
    }
    logger.info("Cache was created: "+(storage.getItemSync("creation date")));
    var sessionCount = getSessionCount();
    var toyList = getToyList();
    logger.info("There are currently "+sessionCount+" sessions in storage:");
    for(var i=0; i<toyList.length; i++) logger.info("\t- "+toyList[i]);

    /*
    setInterval(function(){
        logger.info("profiles data: "+profiles);
        storage.setItemSync("profiles", profiles);
        logger.info("-Syncing Profile Data-");
    }, 5000);
    */
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

getProfileFromUserID = function(userID){
    //logger.info("getProfileFromUserID("+userID+")");
    var profiles = storage.getItemSync("profiles");
    //logger.info("profiles: "+profiles.length);
    for(var key in profiles){
        var profile = profiles[key];
        //logger.info("Comparing '"+profile['userID']+"' and '"+userID+"'.");
        if(profile['userID'] == userID){
            //logger.info("getProfileFromUserID("+userID+"):\n"+profile);
            return profile;
        }
    }
    return undefined;
}

getProfileFromUserName = function(username){
    //logger.info("getProfileFromUserName("+username+")");
    var profiles = storage.getItemSync("profiles");
    //logger.info("profiles: "+profiles.length);
    for(var key in profiles){
        var profile = profiles[key];
        //logger.info("Comparing '"+profile['name']+"' and '"+username+"'.");
        if(profile['name'] == username){
            //logger.info("getProfileFromUserName("+username+"):\n"+profile);
            return profile;
        }
    }
    return undefined;
}

createProfile = function(userID, name, str, res, wil){
    //logger.info("createProfile("+userID+", "+name+", "+str+", "+res+", "+wil+")");
    var profiles = storage.getItemSync("profiles");
    var profile = {};
    profile['userID'] = userID;
    profile['name'] = name;
    profile['nickname'] = undefined;
    profile['lastChannelID'] = undefined;
    profile['str'] = str;
    profile['res'] = res;
    profile['wil'] = wil;
    profile['controlled'] = false;
    profile['gagged'] = false;
    profile['mode'] = "unsuited";
    profile['suit timestamp'] = 0;
    profile['suit timer'] = 0;
    profile['suit timer bonus count'] = 0;
    profile['suit timer bonus amount'] = undefined;
    profile['toys'] = [];
    profile['ownerID'] = null;
    profile['info'] = "[Info not set]";
    profile['kinks'] = "[Kinks not set]";
    profile['toy mode'] = undefined;
    //logger.info(profiles[userID]);
    profiles[userID] = profile;
    //logger.info(profiles[userID]);
    storage.setItemSync("profiles", profiles);
    profiles = storage.getItemSync("profiles");
    //logger.info(profiles[userID]);
    return profile;
}

getName = function(profile){
    if(profile['nickname'] == undefined) return profile['name'];
    else return profile['nickname'];
}

getOwner = function(profile){
    if(profile['ownerID'] == undefined) return undefined;
    return getProfileFromUserID(profile['ownerID']);
}

getToyType = function(profile){
    return profile['toy mode'];
}

getNextLowestToyType = function(type){
    switch(type){
        case(undefined): return "alpha";
        case("alpha"): return "beta";
        case("beta"): return "omega";
        case("omega"): throw "Omega toys cannot do that";
    }
    throw "Toy type unknown";
}

getRemainingTimerSeconds = function(profile){
    logger.info("getRemainingTimerSeconds("+profile+")");
    if(profile['suit timestamp'] == undefined) return 0;
    var now = (Date.now()/1000);
    var endTimestamp = profile['suit timestamp'] + profile['suit timer'];
    //endTimestamp += profile['suit timer bonus count'] * profile['suit timer bonus amount'];
    logger.info(endTimestamp + " - " + now);
    return endTimestamp - now;
}

updateProfile = function(profile){
    //logger.info("updateProfile("+profile+")");
    var profiles = storage.getItemSync("profiles");
    for(var key in profiles){
        var testProfile = profiles[key];
        if(testProfile['userID'] == profile['userID']){
            profiles[key] = profile;
        }
    }
    storage.setItemSync("profiles", profiles);
}

getUserIDFromUserName = function(username){
    //logger.info("getUserIDFromUserName("+username+")");
    var profiles = storage.getItemSync("profiles");
    for(var key in profiles){
        var profile = profiles[key];
        //logger.info("Comparing '"+profile['name']+"' and '"+username+"'.");
        if(profile['name'] == username) return userID;
    }
    return undefined;
}

module.exports = {
    init: init,
    getSessionFromToyName: getSessionFromToyName,
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
    getSessionVerbosity: getSessionVerbosity,
    getProfileFromUserID: getProfileFromUserID,
    getProfileFromUserName: getProfileFromUserName,
    createProfile: createProfile,
    updateProfile: updateProfile,
    getRemainingTimerSeconds: getRemainingTimerSeconds,
    getName: getName,
    getOwner: getOwner,
    getToyType: getToyType,
    getNextLowestToyType: getNextLowestToyType
}

