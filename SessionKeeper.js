var storage = require('node-persist');

var logger;

var sessions = {};
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

module.exports = {

    init: function(logger, forceCacheRefresh){
        this.logger = logger;
        if(storage.getItemSync("creation date") == undefined || forceCacheRefresh){
            logger.info("No cache found. Creating new cache.");
            storage.clearSync();
            storage.setItemSync("creation date", new Date().toDateString());
            storage.setItemSync("sessions", sessions);
        }else{
            logger.info("Previous cache loaded.");
        }
        logger.info("Cache was created: "+(storage.getItemSync("creation date")));
        var sessionCount = getSessionCount();
        var toyList = getToyList();
        logger.info("There are currently "+sessionCount+" sessions in storage:");
        for(var i=0; i<toyList.length; i++) logger.info("\t- "+toyList[i]);
    },

    createSession: function(targetUserID, targetUsername, channelID){
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
    },
    
    getSessionVerbosity: function(session){
        if(session['verbosity'] == undefined) return 0;
        return session['verbosity'];
    },
    
    setSessionVerbosity: function(session, verbosity){
        session['verbosity'] = verbosity;
        updateSession(session);
    },
    
    deleteSession: function(session){
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
    },
    
    getSessionFromToyName: function(targetUsername){
        var sessions = storage.getItemSync("sessions");
        for(var key in sessions){
            var session = sessions[key];
            if(session['targetUsername'] == targetUsername) return session;
        }
        return undefined;
    },
    
    getSessionFromToyID: getSessionFromToyID,
    
    getToyNameFromToyID: function(toyID){
        var session = getSessionFromToyID(toyID);
        if(session != null){
            return session['targetUsername'];
        }
        return undefined;
    },
    
    getSessionFromUserName: function(targetUsername){
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
    },
    
    getSessionUserNum: function(session){
        var count = 0;
        for(key in session['users']){
            if(session['users'][key] != undefined){
                count++;
            }
        }
        return count;
    },
    
    addUserToSession: function(session, userID, username){
        //logger.info("addUserToSession(["+session+"], ["+userID+"], ["+username+"])");
        session['users'][userID] = username;
        return session;
    },
    
    setUserChannelID: function(session, userID, channelID){
        session['channels'][userID] = channelID;
        return session;
    },
    
    removeUserFromSession: function(session, userID){
        delete session['users'][userID];
        return session;
    },
    
    updateSession: function(session){
        //logger.info("updateSession()");
        var sessions = storage.getItemSync("sessions");
        for(var key in sessions){
            var testSession = sessions[key];
            //logger.info("comparing "+testSession['targetUsername']+" and "+session['targetUsername']);
            if(testSession['targetUsername'] == session['targetUsername']){
                sessions[key] = session;
                //logger.info("Session found. Updating.");
                //logger.info("Session users:");
                //logger.info(session.users);
            }
        }
        storage.setItemSync("sessions", sessions);
    },

}

