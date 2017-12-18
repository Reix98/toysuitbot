var logger;
var sessionKeeper;
var messageSender;
var discordBot;
var textComp = require("./TextComparator.js");

init = function(log, bot, sk, ms){
    logger = log;
    discordBot = bot;
    sessionKeeper = sk;
    messageSender = ms;
    textComp.init(logger, sessionKeeper);
}

handleMessage = function(user, userID, channelID, message, evt){
    var userProfile = sessionKeeper.getProfileFromUserID(userID);
    if(userProfile == undefined) return 0;

    userProfile['lastChannelID'] = channelID;
    sessionKeeper.updateProfile(userProfile);
    
    if(userProfile['mode'] == "suited"){
        var name = userProfile['name'];
        if(userProfile['nickname'] != undefined) name = userProfile['nickname'];
        deleteMessage(channelID, evt.d.id);

        if(userProfile['controlled']){
            //Do nothing with the message.
        }else if(userProfile['gagged']){
            message = textComp.gaggedMessage(message);
            messageSender.sendMessage(channelID, "**" + name + "**: " + message);
        }else{
            message = textComp.processToyText(message);
            messageSender.sendMessage(channelID, "**" + name + "**: " + message);
        }
        
    }

}

deleteMessage = function(channelID, messageID){
    discordBot.deleteMessage({
        channelID: channelID,
        messageID: messageID //evt.d.id
    });
}

module.exports = {
    init: init,
    handleMessage: handleMessage
}