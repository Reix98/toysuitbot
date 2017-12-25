var logger;
var sessionKeeper;
var discordBot;

init = function(log, db, sk){
    logger = log;
    discordBot = db;
    sessionKeeper = sk;
}

sendMessage = function(channelID, message, callbackFunction){
    if(Array.isArray(channelID)){
        for(var i=0; i<channelID.length; i++){
            sendMessage(channelID[i], message);
        }
    }else{
        discordBot.sendMessage({
            to: channelID,
            message: message
        }, callbackFunction);
    }
}

sendAction = function(channelID, message){
    message = "`"+message+"`";
    if(Array.isArray(channelID)){
        for(var i=0; i<channelID.length; i++){
            sendAction(channelID[i], message);
        }
    }else{
        discordBot.sendMessage({
            to: channelID,
            message: message
        });
    }
}

module.exports = {
    init: init,
    sendMessage: sendMessage,
    sendAction: sendAction
}