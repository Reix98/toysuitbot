var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var stringSimilarity = require('string-similarity');
var tagger = require( 'wink-pos-tagger' );
var myTagger = tagger();
var tokenize = require( 'wink-tokenizer' )().tokenize;
const Inflectors = require("en-inflectors").Inflectors;
let inflectors = new Inflectors("book");
var storage = require('node-persist');

var sessions = {};

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

storage.initSync();
//Create or Retrieve the Cache
var forceCacheRefresh = true;
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

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});
bot.on('message', function (user, userID, channelID, message, evt) {
    /*
    var user = msg.author;
    var userID = msg.author.id;
    var message = msg.content;
    var channelID = msg.channelID;
    */
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    try{
        if (message.substring(0, 1) == '!') {
            var args = message.substring(1).split(' ');
            var cmd = args[0].toLowerCase();
        
            args = args.splice(1);
            var functionsText = "```";
            functionsText += "The following commands are available. Things in [brackets] are required, things in (parentheses) are optional.\n";
            functionsText += "!toysuit [name] - puts [name] into a toysuit. Auto-registers you as their first user.\n";
            functionsText += "!safeword - removes you from the toysuit\n";
            functionsText += "!claim [name] - registers you as a user of [name]\n";
            functionsText += "!reclaim - changes the channel associated with your claim\n";
            functionsText += "!unclaim - unregisters you as a user of your toy\n";
            functionsText += "!status (name) - gives info about (name) or yourself\n";
            functionsText += "!say [text] - make your toy say [text]\n";
            functionsText += "!sayexact [text] - make your toy say [text] exactly\n";
            functionsText += "!voice [text] - make your toy's toysuit say things in the toy's head\n";
            functionsText += "!paren - toggle your toy's ability to use parentheses\n";
            functionsText += "!gag - toggle your toy's gag\n";
            functionsText += "!verbose - toggle your toy's verbosity\n";
            functionsText += "!control - toggle your toy's control mode, determining whether they can act independently of their suit\n";
            functionsText += "```";
            switch(cmd) {
                case 'ping':
                sendMessage(channelID, 'Pong! ('+args+')');
                break;
                case 'toysuit':
                    //logger.info("toysuit "+args.join(' '));
                    bot.getAllUsers();
                    var commandPending = true;
                    for(var targetUserID in bot.users) {
                        //logger.info(userID + " : " + bot.users[userID].username);
                        if(commandPending){
                            var targetUsername = bot.users[targetUserID].username;
                            if(targetUsername == args.join(' ')){
                                if(getSessionFromToyName(targetUsername) != undefined){
                                    //Target is already a toy.
                                    sendMessage(channelID, '`Command Failed: '+targetUsername+' is already a toy.`');
                                    commandPending = false;
                                }else if(getSessionFromUserName(targetUsername) != undefined){
                                    //Target is already a user.
                                    sendMessage(channelID, '`Command Failed: '+targetUsername+' is currently a user.`');
                                    commandPending = false;
                                }else if(getSessionFromToyName(user) != undefined){
                                    //Requester is already a toy.
                                    sendMessage(channelID, '`Command Failed: You are a toy.`');
                                    commandPending = false;
                                }else if(getSessionFromUserName(user) != undefined){
                                    //Requester is already a user.
                                    sendMessage(channelID, '`Command Failed: You are already a user.`');
                                    commandPending = false;
                                }else{
                                    var session = createSession(targetUserID, targetUsername, channelID);
                                    if(targetUsername != user){
                                        session = addUserToSession(session, userID, user);
                                        session = setUserChannelID(session, userID, channelID);
                                        updateSession(session);
                                        sendMessage(channelID, '`'+targetUsername+' is now a toy. '+user+' has been registered as their first user.`');
                                    }else{
                                        sendMessage(channelID, '`'+targetUsername+' is now a toy.`');
                                    }
                                    commandPending = false;
                                }
                            }
                        }
                    }
                break;
                case 'safeword':
                    var session = getSessionFromToyName(user);
                    if(session == undefined){
                        //Not a toy
                        sendMessage(channelID, '`Command Failed: You are not a toy.`');
                    }else{
                        if(channelID != session['channelID']){
                            sendMessage(channelID, '`You are no longer a toy.`');
                        }
                        sendMessage(session['channelID'], '`'+session['targetUsername']+' used their safeword.`');
                        deleteSession(session);
                    }
                break;
                case 'claim':
                    //logger.info("claim "+args.join(' '));
                    var targetUsername = args.join(' ');
                    bot.getAllUsers();
                    var commandPending = true;
                    for(var targetUserID in bot.users) {
                        //logger.info(userID + " : " + bot.users[userID].username);
                        if(commandPending){
                            //var targetUsername = bot.users[targetUserID].username;
                            if(targetUsername == args.join(' ')){
                                var session = getSessionFromToyName(targetUsername);
                                if(session == undefined){
                                    //Target toy not found.
                                    sendMessage(channelID, '`Command Failed: Toy not found.`');
                                    commandPending = false;
                                }else if(targetUsername == user){
                                    //Target matches Requester
                                    sendMessage(channelID, '`Command Failed: You cannot claim yourself, toy.`');
                                    commandPending = false;
                                }else if(getSessionFromToyName(user) != undefined){
                                    //Requester is already a toy.
                                    sendMessage(channelID, '`Command Failed: You are a toy.`');
                                    commandPending = false;
                                }else if(getSessionFromUserName(user) != undefined){
                                    //Requester is already a user.
                                    sendMessage(channelID, '`You already own one toy. Currently that is the limit.`');
                                    commandPending = false;
                                }else{
                                    session = addUserToSession(session, userID, user);
                                    session = setUserChannelID(session, userID, channelID);
                                    updateSession(session);
                                    var userNum = getSessionUserNum(session);
                                    sendMessage(channelID, '`'+targetUsername+' has been claimed by '+user+'. They now have '+userNum+' registered users.`');
                                    commandPending = false;
                                }
                            }
                        }
                    }
                break;
                case 'reclaim':
                    //logger.info("claim "+args.join(' '));
                    bot.getAllUsers();
                    var commandPending = true;
                    var session = getSessionFromUserName(user);
                    if(session == undefined){
                        //Not a user
                        sendMessage(channelID, '`Command Failed: You are not a user.`');
                    }else{
                        session = setUserChannelID(session, userID, channelID);
                        updateSession(session);
                        sendMessage(channelID, '`Your base channel has been updated.`');
                    }
                break;
                case 'unclaim':
                    //logger.info("unclaim");
                    bot.getAllUsers();
                    var session = getSessionFromUserName(user);
                    if(session == undefined){
                        //Target toy not found.
                        sendMessage(channelID, '`Command Failed: You have not claimed any toys.`');
                    }else{
                        session = removeUserFromSession(session, userID);
                        updateSession(session);
                        var userNum = getSessionUserNum(session);
                        sendMessage(channelID, '`'+session['targetUsername']+' has been unclaimed by '+user+'. They now have '+userNum+' registered users.`');
                    }
                break;
                case 'status':
                    var targetUsername = args.join(' ');
                    if(targetUsername.trim().length<1) targetUsername = user;
                    //logger.info("status "+targetUsername);
                    bot.getAllUsers();
                    var session = getSessionFromToyName(args.join(' '));
                    if(session != undefined){
                        //Session found - they're a toy.
                        var userNum = getSessionUserNum(session);
                        var userList = "";
                        for(id in session['users']){
                            userList += ", "+session['users'][id];
                        }
                        userList = userList.substr(2);
                        sendMessage(channelID, '`'+targetUsername+' is a toy. They have '+userNum+' registered users: '+userList+".`");
                        commandPending = false;
                    }else{
                        session = getSessionFromUserName(targetUsername);
                        if(session != undefined){
                            //Session found - they're a user.
                            sendMessage(channelID, '`'+targetUsername+' is a registered user of '+session.targetUsername+'.`');
                            commandPending = false;
                        }else{
                            //No session found.
                            sendMessage(channelID, '`'+targetUsername+' is not listed as a toy or a user.`');
                            commandPending = false;
                        }
                    }
                break;
                case 'say':
                    var session = getSessionFromUserName(user);
                    if(session == undefined){
                        //Not a user
                        sendMessage(channelID, '`Command Failed: You are not listed as a user.`');
                    }else{
                        message = alterMessage(session, args.join(' '), undefined);
                        var toyGagged = session['gagged'];
                        if(toyGagged){
                            message = gaggedMessage(message);
                        }else{
                            message = alterMessage(session, message, undefined);
                        }
                        sendMessage(session['channels'][userID], "**" + session['targetUsername'] + "**: " + message);
                        if(channelID == session['channels'][userID]){
                            bot.deleteMessage({
                                channelID: channelID,
                                messageID: evt.d.id
                            })
                        }
                    }
                break;
                case 'sayexact':
                    var session = getSessionFromUserName(user);
                    if(session == undefined){
                        //Not a user
                        sendMessage(channelID, '`Command Failed: You are not listed as a user.`');
                    }else{
                        message = alterMessage(session, args.join(' '), undefined);
                        sendMessage(session['channels'][userID], "**" + session['targetUsername'] + "**: " + message);
                        if(channelID == session['channels'][userID]){
                            bot.deleteMessage({
                                channelID: channelID,
                                messageID: evt.d.id
                            })
                        }
                    }
                break;
                case 'voice':
                    var session = getSessionFromUserName(user);
                    if(session == undefined){
                        //Not a user
                        sendMessage(channelID, '`Command Failed: You are not listed as a user.`');
                    }else{
                        sendMessage(session['targetUserID'], args.join(' '));
                    }
                    if(channelID == session['channelID']){
                        bot.deleteMessage({
                            channelID: channelID,
                            messageID: evt.d.id
                        })
                    }
                break;
                case 'gag':
                    var session = getSessionFromUserName(user);
                    if(session == undefined){
                        //Not a user
                        sendMessage(channelID, '`Command Failed: You are not listed as a user.`');
                    }else{
                        session['gagged'] = !session['gagged'];
                        var toyName = session['targetUsername'];
                        updateSession(session);
                        if(session['gagged']) sendMessage([session['targetUserID'], session['channelID']], '```'+toyName+"'s gag swells, leaving their mouth usable only as a hole to fuck.```");
                        else sendMessage([session['targetUserID'], session['channelID']], '```'+toyName+"'s gag deflates, allowing them to talk again.```");
                    }
                    if(channelID == session['channelID']){
                        bot.deleteMessage({
                            channelID: channelID,
                            messageID: evt.d.id
                        })
                    }
                break;
                case 'verbose':
                    var session = getSessionFromUserName(user);
                    if(session == undefined){
                        //Not a user
                        sendMessage(channelID, '`Command Failed: You are not listed as a user.`');
                    }else{
                        session['verbose'] = !session['verbose'];
                        var toyName = session['targetUsername'];
                        updateSession(session);
                        if(session['verbose']) sendMessage([session['targetUserID'], session['channelID']], '```'+toyName+"'s suit seems more lively.```");
                        else sendMessage([session['targetUserID'], session['channelID']], '```'+toyName+"'s suit seems less lively.```");
                    }
                    if(channelID == session['channelID']){
                        bot.deleteMessage({
                            channelID: channelID,
                            messageID: evt.d.id
                        })
                    }
                break;
                case 'control':
                    var session = getSessionFromUserName(user);
                    if(session == undefined){
                        //Not a user
                        sendMessage(channelID, '`Command Failed: You are not listed as a user.`');
                    }else{
                        session['control'] = !session['control'];
                        var toyName = session['targetUsername'];
                        updateSession(session);
                        if(session['control']){
                            sendMessage(channelID, '```'+toyName+"'s suit has taken full control of their body.```");
                            sendMessage(session['targetUserID'], '```You feel the suit take full control of your body.```');
                            sendMessage(session['channelID'], '`The toy stiffens slightly.`');
                        }else{
                            sendMessage(channelID, '```'+toyName+"'s suit has relaxed control of their body.```");
                            sendMessage(session['targetUserID'], '```You feel the suit relax control of your body.```');
                            sendMessage(session['channelID'], '`The toy relaxes slightly.`');
                        }
                    }
                    if(channelID == session['channelID']){
                        bot.deleteMessage({
                            channelID: channelID,
                            messageID: evt.d.id
                        })
                    }
                break;
                case 'paren':
                    var session = getSessionFromUserName(user);
                    if(session == undefined){
                        //Not a user
                        sendMessage(channelID, '`Command Failed: You are not listed as a user.`');
                    }else{
                        session['paren'] = !session['paren'];
                        updateSession(session);
                        if(session['paren']) sendMessage([session['targetUserID'], session['channelID']], '```The toy can now hide behind parentheses.```');
                        else sendMessage([session['targetUserID'], session['channelID']], '```The toy can no longer hide behind parentheses.```');
                    }
                    if(channelID == session['channelID']){
                        bot.deleteMessage({
                            channelID: channelID,
                            messageID: evt.d.id
                        })
                    }
                break;
                case 'functions':
                case 'help':
                    sendMessage(channelID, functionsText);
                break;
                default:
                    sendMessage(channelID, "Command not recognized. Try using '!help'");
                break;
                // Just add any case commands if you want to..
            }
        }else{
            if(userID !=bot.id){
                var session = getSessionFromToyName(user);
                if(session != undefined){
                    //toyChannelID = channelID;
                    if(session['paren'] && message.substring(0, 1) == "("){
                        //Leave message alone.
                    }else{
                        if(session['control']){
                            sendMessage(session['targetUserID'], "`You struggle to speak or act, but the suit prevents it.`");
                            bot.deleteMessage({
                                channelID: channelID,
                                messageID: evt.d.id
                            });
                        }else if(session['gagged']){
                            message = gaggedMessage(message);
                        }else{
                            evaluateRawToyMessage(user, userID, channelID, message);
                            message = alterMessage(session, message, session['verbose']);
                        }
                        if(!session['control']){
                            sendMessage(channelID, "**" + user + "**: " + message);
                            bot.deleteMessage({
                                channelID: channelID,
                                messageID: evt.d.id
                            })
                        }
                    }
                }else{
                    session = getSessionFromUserName(user);
                    if(session != undefined){
                        if(message.toLowerCase().indexOf("good toy")>-1){
                            goodToy(session['targetUserID']);
                        }
                    }
                }
            }
        }
    }catch(error){
        logger.info("!!! Error: "+error.message)
    }
});

evaluateRawToyMessage = function(user, userID, channelID, message){
    var session = getSessionFromToyID(userID);
    message = message.toLowerCase();
    var goodToyPhrases = {
        "i'm a good toy": "Yes, you are.",
        "i want to be a good toy": "You're getting there toy.",
        "please use me": "Good toy.",
        "fuck me": "Good toys get fucked.",
        "toy's don't get to cum": "Good toy, you're learning.",
        "so horny": "Good toys don't get to cum.",
        "i love this": "I be you do, toy."
    };
    for(key in goodToyPhrases){
        if(stringSimilarity.compareTwoStrings(key, message)>0.7){
            var responses
            sendMessage(userID, goodToyPhrases[key]);
        }
    }
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

getSessionVerbosity = function(session){
    if(session['verbosity'] == undefined) return 0;
    return session['verbosity'];
}

changeSessionVerbosity = function(session, verbosity){
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

getSessionFromToyID = function(toyID){
    var sessions = storage.getItemSync("sessions");
    for(var key in sessions){
        var session = sessions[key];
        if(session['targetUserID'] == toyID) return session;
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
}

sendMessage = function(channelID, message){
    var toyName = getToyNameFromToyID(channelID);
    if(message.indexOf("!toysuit [name]") == -1){
        if(toyName != undefined) logger.info("msg: ("+toyName+") "+message);
        else logger.info("msg: "+message);
    }else{
        if(toyName != undefined) logger.info("msg: ("+toyName+") !help");
        else logger.info("msg: !help");
    }
    var sentChannels = [];
    if(Array.isArray(channelID)){
        for(var i=0; i<channelID.length; i++){
            if(sentChannels.indexOf(channelID[i])==-1){
                sentChannels[sentChannels.length] = channelID[i];
                sendMessage(channelID[i], message);
            }
        }
    }else{
        //logger.info("message(c="+channelID+"): "+message);
        bot.sendMessage({
            to: channelID,
            message: message
        });
    }
}

goodToy = function(channelID){
    var snippets = [
        "You feel the suit tighten and shiver at the praise.",
        "The suit caresses your body.",
        "*You're mine more and more toy, every time you're a 'good toy.'*",
        "*Goood toy.*",
        "*You're a good toy.*",
        "*Good toy...*"
    ];
    sendMessage(channelID, '```'+pickRandom(snippets)+'```')
}

fixContractions = function(message){
    message = message.replaceAll("'", "");
    message = message.replacePhrase("wont", "will not", 0.99);
    message = message.replacePhrase("wouldnt", "would not", 0.99);
    message = message.replacePhrase("isnt", "is not", 0.99);
    message = message.replacePhrase("havent", "have not", 0.99);
    message = message.replacePhrase("hadnt", "had not", 0.99);
    message = message.replacePhrase("wont", "will not", 0.99);
    message = message.replacePhrase("wasnt", "was not", 0.99);
    message = message.replacePhrase("dont", "do not", 0.99);
    message = message.replacePhrase("didnt", "did not", 0.99);
    message = message.replacePhrase("cant", "can not", 0.99);
    message = message.replacePhrase("couldnt", "could not", 0.99);
    message = message.replacePhrase("shouldnt", "should not", 0.99);
    message = message.replacePhrase("mustnt", "must not", 0.99);
    message = message.replacePhrase("wouldve'", "would have", 0.99);
    message = message.replacePhrase("shouldve'", "should have", 0.99);
    message = message.replacePhrase("couldve'", "could have", 0.99);
    message = message.replacePhrase("mightve'", "might have", 0.99);
    message = message.replacePhrase("mustve'", "must have", 0.99);
    message = message.replacePhrase("im", "i am", 0.99);
    message = message.replacePhrase("ill", "i will", 0.99);
    message = message.replacePhrase("id", "i would", 0.99);
    return message;
}

replacePhrases = function(message){
    //logger.info("replacePhrases()");
    message = message.replacePhrase("i am not a toy", "toy is a toy", 0.9);
    message = message.replacePhrase("help me", "use me", 0.9);
    message = message.replacePhrase("let me out", "use me", 0.9);
    message = message.replacePhrase("i need to cum", "toys don't get to cum", 0.9);
    message = message.replacePhrase("i want to cum", "toys don't get to cum", 0.9);
    message = message.replacePhrase("i did not type", "toy wanted to type", 0.9);
    message = message.replacePhrase("this is not me", "this is me now", 0.9);
    message = message.replacePhrase("i can not control myself", "toy is a good toy", 0.9);
    message = message.replacePhrase("i did not say", "toy did say", 0.9);
    message = message.replacePhrase("i do not want", "toy needs", 0.9);
    message = message.replacePhrase("i hate you", "toy loves you", 0.9);
    message = message.replacePhrase("i hate this", "toy loves this", 0.9);
    message = message.replacePhrase("i want out", "toy never wants to leave the toysuit", 0.9);
    message = message.replacePhrase("i can not get out", "toy never wants to leave the toysuit", 0.9);
    message = message.replacePhrase("escape", "be fucked", 0.9);
    message = message.replacePhrase("get out of", "be used in", 0.9);
    message = message.replacePhrase("it is making me", "toy will", 0.9);
    message = message.replacePhrase("i am human", "toy is a toy", 0.9);
    message = message.replacePhrase("leave me alone", "use toy's hole", 0.9);
    message = message.replacePhrase("that was not me", "that was me", 0.9);
    //message = message.replacePhrase("i am", "toy is", 2);
    message = message.replacePhrase("am i", "is toy", 1);
    message = message.replacePhrase("i am not your toy", "toy belongs to you", 0.9);
    message = message.replacePhrase("you do not own me", "toy belongs to you", 0.9);
    //message = message.replaceAll("toy", "i");
    return message;
}

round = function(number, places){
    return Math.round(number*Math.pow(10, places))/Math.pow(10, places);
}

String.prototype.replacePhrase = function (find, replace, confidence) {
    var message = this;
    //logger.info(message+".replacePhrase("+find+","+replace+","+confidence+")");
    //message = message.replace(/([.?!,><-])\s*(?=[a-z])/g, "$1|").split("|"); //Split into sentences
    message = message.replace(/([!"#$%&'()*+,\-.\/:;<=>?@[\]^_`{|}~\n])\s*/g, "|$1|").split("|"); //Split into sentences
    //logger.info("\tmessage = ["+message+"]");
    var output = "";
    var lastPunc = false;
    for(var i=0; i<message.length; i++){
        if(message[i].length>1){
            message[i] = replacePhraseHelper(message[i], find, replace, confidence);
        }
        
        if(message[i].length>0){
            if(isPunctuation(message[i].substr(0, 1))){
                output += message[i];
                lastPunc = true;
            }else{
                if(lastPunc) output += ' ';
                output += message[i];
                lastPunc = false;
            }
        }
    }
    //logger.info(output);
    return output;
}

replacePhraseHelper = function(text, find, replace, reqConf){
    //logger.info("\treplacePhraseHelper("+text+")");
    var baseSim = stringSimilarity.compareTwoStrings(text, find);
    text = text.split(' ');

    var colMax = 0;
    var colMax_i = 0;
    var colMax_j = 0;
    for(var i=0; i<text.length; i++){
        var rowMax = 0;
        var rowMax_j = text.length;
        for(var j=text.length; j>i; j--){
            var testText = text.slice(i, j).join(' ');
            var testSim = stringSimilarity.compareTwoStrings(testText, find);
            if(testText == find) testSim = 2;
            //logger.info("\t\tEval- '"+find+"' vs '"+testText+"' : ("+round(testSim, 2)+")");
            if(testSim > rowMax){
                rowMax = testSim;
                rowMax_j = j;
            }
        }
        if(rowMax > colMax){
            colMax = rowMax;
            colMax_i = i;
            colMax_j = rowMax_j;
        }
    }
    
    if(colMax > reqConf){
        var before = text.slice(0, colMax_i).join(' ');
        var middle = text.slice(colMax_i, colMax_j).join(' ');
        var after = text.slice(colMax_j).join(' ');
        before = replacePhraseHelper(before, find, replace, reqConf);
        after = replacePhraseHelper(after, find, replace, reqConf);
        //return before +' ~~'+ middle +'~~ *'+ replace +'* '+ after;
        //logger.info(before +' *'+ replace +'* '+ after);
        return before +' '+ replace +' '+ after;
    }else{
        if(middle != undefined && colMax > reqConf*0.5){
            logger.info("\t\tText similarity near miss:");
            logger.info("\t\t\t'"+middle+"' vs '"+find+"' : ("+round(colMax, 2)+")");
        }
        
        return text.join(' ');
    }

}

alterMessage = function(session, message, verbose){
    if(message == null) return "";
    message = message.toLowerCase();
    message = fixContractions(message);
    var originalMessage = message;
    message = replacePhrases(message);
    /*
    message = message.replaceAll(" *", "< ast>");
    message = message.replaceAll("* ", "<ast >");
    message = message.replaceAll("*", "* ");
    message = message.replaceAll("< ast>", " *");
    message = message.replaceAll("<ast >", "* ");
    message = message.replaceAll(" ", "___");
    */
    //message = message.replaceAll(" ", "< ast>");

    var words = myTagger.tag(tokenize(message));
    //logger.info(words);

    var output = "";
    for(var i=0; i<words.length; i++){
        if(words[i].tag == 'word'){
            if(words[i].value == "i" || words[i].value == "toy"){
                //logger.info("\tLooking for next verb after '"+words[i].value+"'");
                words[i].value = "toy";
                var keepGoing = true;
                for(var j=i+1; j<words.length && keepGoing; j++){
                    //logger.info("\t\t"+words[j].value+" ("+words[j].pos+")");
                    //if(words[j].tag != 'word' && words[j].value != "___") keepGoing = false;
                    if(j>i+3) keepGoing = false;
                    if(words[j].pos == 'VBP'){
                        if(words[j].value == "am") words[j].value = "is";
                        else{
                            var word = new Inflectors(words[j].value);
                            words[j].value = word.toPresentS();
                            keepGoing = false;
                        }
                    }
                }
            }else{
                if(words[i].value == "my") words[i].value = "toy's"
                else if(words[i].value == "mine") words[i].value = "toy's"
                else if(words[i].value == "me") words[i].value = "toy"
            } 
        }else{
            //words[i].value = words[i].value.replaceAll('___', ' ');
            //words[i].value += " ";
        }
        //if(i>0 && words[i].tag == 'word' && words[i-1].value != '*') output += ' ';
        output += ' '+words[i].value;
    }

    if(verbose == undefined){

    }else if(verbose){
        var verbosity = getSessionVerbosity(session);
        logger.info("Verbosity: "+verbosity);
        if(stringSimilarity.compareTwoStrings(originalMessage, output) > 0.5-verbosity){
            var newOutput = getRandomToyText(session, output, verbosity);
            if(newOutput == output){
                verbosity += 0.1;
            }else{
                verbosity -= 0.1;
            }
            output = newOutput;
        }else{
            verbosity += 0.1;
        }
        verbosity = Math.min(0.75, Math.max(0.25, verbosity));
        changeSessionVerbosity(session, verbosity);
    }else{
        var verbosity = getSessionVerbosity(session);
        logger.info("Verbosity: "+verbosity);
        if(stringSimilarity.compareTwoStrings(originalMessage, output) > 0.5-verbosity){
            var newOutput = getRandomToyText(session, output, verbosity);
            if(newOutput == output){
                verbosity += 0.1;
            }else{
                verbosity *= 0.25;
            }
            output = newOutput;
        }else{
            verbosity += 0.1;
        }
        verbosity = Math.min(0.75, Math.max(0.25, verbosity));
        changeSessionVerbosity(session, verbosity);
    }

    return output.trim();
}

getRandomToyText = function(session, text, verbosity){
    var snippets = [
        "please fuck toy",
        "toy loves being used",
        "toy is here to serve",
        "toy wants to remain a toy forever",
        "toy needs cock",
        "please use toy",
        "toy has no will",
        "i am a good toy",
        "toy is so horny",
        "toy is obediant",
        "toy is happy to be a toy",
        "toy is always ready to be fucked",
        "toy always wants to fuck"
    ];
    var ratings = stringSimilarity.findBestMatch(text, snippets);
    var closestText = ratings.bestMatch.target;
    var sim = stringSimilarity.compareTwoStrings(text, closestText);
    logger.info("\t\t Comparing '"+text+"' with '"+closestText+"'. (Sim:"+sim+" + Verb:"+verbosity+" = "+(sim+verbosity)+")");
    if(sim>0.33){
        logger.info("\t\t Sim already high. Leaving it be.");
        return text;
    }else{
        if(sim+verbosity > 0.5){
            logger.info("\t\t Sim+Verb>0.5 Replacing.");
            return closestText;
        }else{
            logger.info("\t\t Recharging verbosity.");
            return text;
        }
    }
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

String.prototype.replaceCase = function (bef, aft) {
    var before = bef.toLowerCase();
    var after = aft.toLowerCase();
    var str = this;

    var match=function(before,after){
    after=after.split('');
    for(var i=0;i<before.length;i++)
        {

        if(before.charAt(i)==before[i].toUpperCase())
            {
            after[i]=after[i].toUpperCase();
            }
        else  if(before.charAt(i)==before[i].toLowerCase())
            {
            after[i]=after[i].toLowerCase();
            }
        return after.join('');
        }

    };
    //console.log(before,match(before,after));
    str = str.replace(before,match(before,after)); 

    return str;
};

function isPunctuation(word){
    word = word.trim();
    var punctuation = [".", "?", "~", "!", "(", ",", ")", "-", ";"];
    for(var i=0; i<punctuation.length; i++){
        if(word == punctuation[i]) return true;
    }
    return false;
}

function pickRandom(choices){
    var pick = Math.floor((Math.random()*choices.length));
    return choices[pick];
}

function isLikelyEmote(text){
    var emotes = [
        ">//<","o//o", "@o@", "@//@",">//>", "<//<", ">o<", "^o^",
        "<//>", "<o>"
    ];
    for(var i=0; i<emotes.length; i++){
        if(stringSimilarity.compareTwoStrings(text, emotes[i])>0.75) return true;
    }
    return false;
}

function gaggedMessage(message){
    var words = message.match(/\w+|\s+|[^\s\w]+/g);
    var output = "";
    for(var i=0; i<words.length; i++){
        if(words[i]!=" " && !isLikelyEmote(words[i])){
            var variant = Math.floor((Math.random()*7));
            var choices = [
                'mnn'.split(''),
                'nnn'.split(''),
                'nng'.split(''),
                'nnf'.split(''),
                'mmf'.split(''),
                'mnf'.split(''),
                'mgh'.split('')
            ];
            var dict = pickRandom(choices);
            var newWord = "";
            for(var j=0; j<words[i].length; j++){
                var letter = words[i].substring(j, j+1);
                if(!isPunctuation(words[i].substr(j, j+1))){
                    if(j==0){
                        newWord += matchCase(dict[0], letter);
                    }else if(
                        j==words[i].length-1 || 
                        j<words[i].length-2 && isPunctuation(words[i].substr(j+1, j+2))
                    ){
                        newWord += matchCase(dict[2], letter);
                    } else{
                        newWord += matchCase(dict[1], letter);
                    }
                }else{
                    newWord += words[i].substr(j, j+1);
                }
                
                
            }
            words[i] = newWord;
        }
        output += words[i];
    }
    return output;
}

function matchCase(letter, format){
    if(format == format.toUpperCase()) return letter.toUpperCase();
    else return letter.toLowerCase();
}

function replace(word, seek, replace){
    if(word == seek) return replace;
    if(word == seek.toLowerCase()) return replace.toLowerCase();
    if(word == seek.toUpperCase()) return replace.toUpperCase();
    return word;
}
