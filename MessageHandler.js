var logger;
var sessionKeeper;
var messageSender;
var discordBot;
var textComp = require("./TextComparator.js");
var lzw = require("node-lzw");

init = function(log, bot, sk, ms){
    logger = log;
    discordBot = bot;
    sessionKeeper = sk;
    messageSender = ms;
    textComp.init(logger, sessionKeeper);
}

handleMessage = function(user, userID, channelID, message, evt){
    logger.info("evt.d: ");
    for(key in evt.d){
        logger.info(key+": "+evt.d[key]);
    }
    var userProfile = sessionKeeper.getProfileFromUserID(userID);
    if(userProfile == null) return 0;

    userProfile['lastChannelID'] = channelID;
    sessionKeeper.updateProfile(userProfile);

    var originalMessage = message;
    var compressedMessage = lzw.encode(originalMessage);
    var obtainedMessage = lzw.decode(compressedMessage);
    var compression = compressedMessage.length/originalMessage.length;
    var compressionPercent = Math.round(100*compression);
    //logger.info("Original Message: "+message);
    //logger.info("Compressed Message: "+compressedMessage);
    //logger.info("Obtained Message: "+obtainedMessage);
    //logger.info("("+compressionPercent+"%)");
    
    if(userProfile['mode'] == "suited"){
        var name = userProfile['name'];
        if(userProfile['nickname'] != null) name = userProfile['nickname'];
        deleteMessage(channelID, evt.d.id);

        if(userProfile['controlled']){
            //Do nothing with the message.
        }else if(userProfile['gagged']){
            message = textComp.gaggedMessage(message);
            messageSender.sendMessage(channelID, "**" + name + "**: " + message);
        }else{
            message = textComp.processToyText(message);
            message.points -= originalMessage.length/7;
            var points = Math.floor(message.points*Math.pow(compressionPercent/100, 2)*10)/10;
            //message = message.text + " ("+points+") ["+compressionPercent+"%] => ("+compressedPoints+")";
            message = message.text;
            if(message == "") return;
            
            if(points > 1 + Math.random()*1){ //If points is greater than 1-2...
                messageSender.sendMessage(channelID, "**" + name + "**: " + message, function(error, response){
                    /*logger.info("error: "+error);
                    logger.info("response: "+response);
                    for(key in response){
                        logger.info(key+": "+response[key]);
                    }*/
                    discordBot.addReaction({
                        channelID: channelID,
                        messageID: response.id,
                        reaction: "❤",
                    }, function (err,res){
                        if (err) console.log(err);
                    });
                });
            }else{
                messageSender.sendMessage(channelID, "**" + name + "**: " + message);
            }
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