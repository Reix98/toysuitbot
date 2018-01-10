var logger;
var sessionKeeper;
var messageSender;
var discordBot;
var toyBrain;
var textComp = require("./TextComparator.js");
var lzw = require("node-lzw");
var messageHeartBar = 2;
var textEditor = require("./TextEditor.js");

var fs = require('fs');

init = function(log, bot, sk, ms, tb){
    logger = log;
    discordBot = bot;
    sessionKeeper = sk;
    messageSender = ms;
    textComp.init(logger, sessionKeeper);
    toyBrain = tb;
}

handleMessage = function(user, userID, channelID, message, evt){
    //logger.info("evt.d: ");
    for(key in evt.d){
        //logger.info(key+": "+evt.d[key]);
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

    

    fs.appendFile('wordcloud/data/'+(Math.floor(Date.now() / 1000 / 60 / 60 / 24))+".txt", message+"\r\n", function (err) {
        if (err) console.log(err);
        console.log('Saved!');
    });

    
    if(userProfile['mode'] == "suited"){
        var name = userProfile['name'];
        if(userProfile['nickname'] != null) name = userProfile['nickname'];
        deleteMessage(channelID, evt.d.id);
        var syncLevel = sk.getSyncLevel(userProfile);
        var syncState = sk.getSyncState(userProfile);
        var sync = Math.max(-99, Math.min(100, Math.round(syncLevel)))+"%";
        while(sync.length<4) sync = " "+sync;
        sync = "`"+sk.getToyTypeSymbol(userProfile)+"["+sync+"]`";

        if(message.charAt(0) == "(" && userProfile['parens allowed']){
            //Repost message as-is.
            messageSender.sendMessage(channelID, sync + "**" + name + "**: " + message);
        }else if(userProfile['controlled']){
            //Do nothing with the message.
        }else if(userProfile.isGagged()){
            message = textComp.gaggedMessage(message);
            messageSender.sendMessage(channelID, sync + "**" + name + "**: " + message);
        }else{
            var text = message;
            if(text.indexOf("[")>-1)
                text = text.substring(0, text.indexOf("["));
            var toyType = userProfile.getToyType();
            var toyBrainData = toyBrain.evaluate(text, toyType);
            console.log(toyBrainData);

            var tbData = " [" + Math.round(toyBrainData*10)/10 + "]";

            var syncChange = 0;

            if(!isNaN(toyBrainData) && Math.sign(toyBrainData) == Math.sign(syncLevel)){
                syncChange = Math.min(10, 400/Math.abs(syncLevel)) * toyBrainData;
            }else{
                syncChange = Math.min(10, 800/Math.abs(syncLevel)) * toyBrainData;
            }
            
            sk.changeSyncLevel(userProfile, syncChange);
            syncLevel = sk.getSyncLevel(userProfile);
            var stateChange = sk.updateSyncState(userProfile);
            syncState = sk.getSyncState(userProfile);

            sync = Math.max(-99, Math.min(100, Math.round(syncLevel)))+"%";
            while(sync.length<4) sync = " "+sync;
            sync = "`"+sk.getToyTypeSymbol(userProfile)+"["+sync+"]`";

            var opinion = syncLevel + toyBrainData*20;

            if(opinion < -50){
                //much editing
                message = toyBrain.simpleFix(message, toyType);
                message = textComp.processToyText(message, true).text;
            }else if(opinion < 0){
                message = toyBrain.simpleFix(message, toyType);
                message = textComp.processToyText(message).text;
            }else if(opinion < 50){
                textEditor.editText(message, 1);
                message = toyBrain.simpleFix(message, toyType);
            }else{
                //no editing
            }

            var debug = {};
            debug.syncState = syncState;
            debug.stateChange = stateChange;
            debug.syncLevel = syncLevel;
            console.log(debug);

            if(syncState == -2){
                message = textComp.gaggedMessage(message);
            }

            if(channelID == "396608148326318080"){
                messageSender.sendMessage(channelID, sync + "**" + name + "**: " + message + tbData);
            }else{
                messageSender.sendMessage(channelID, sync + "**" + name + "**: " + message);
            }

            if(stateChange != 0){
                var stateChangeText = "";
                if(syncState == -2 && stateChange == -1){
                    stateChangeText = "[name]'s suit tightens controllingly, its motions becoming smooth and mechanical as the suit grows thick and restrictive. [name]'s features become totally artificial and toylike, its expression fixed and staring, all its paws round and useless.";
                    if(userProfile.isGagged() == false){
                        setTimeout(function(){
                            messageSender.sendAction(channelID, name+"'s gag swells, leaving its mouth usable only as a hole to fuck.");
                        }, 750);
                    }
                }
                if(syncState == -1 && stateChange == -1){
                    stateChangeText = "[name]'s suit tightens restrictively, features becoming more rounded and toylike as the suit reshapes their body. Their body grows more toyish, their expression loses some mobility, and their paws lose dexterity.";
                }
                if(syncState == -1 && stateChange == 1){
                    stateChangeText = "[name]'s suit squirms as its features become more mobile, though still rounded and artificial. Its expression becomes more mobile as its paws grow more dextrous, while remaining rounded and toyish.";
                    if(userProfile.isGagged() == false){
                        setTimeout(function(){
                            messageSender.sendAction(channelID, name+"'s gag deflates, allowing it to talk again.");
                        }, 750);
                    }
                }
                if(syncState == 0 && stateChange == -1){
                    stateChangeText = "[name]'s suit constricts around them, losing its natural appearance as they become toylike and artificial. They retain some of their freedom, but their paws lose some definition and their  range of expression becomes limited.";
                }
                if(syncState == 0 && stateChange == 1){
                    stateChangeText = "[name]'s suit caresses the toy's body, rewarding its good behavior with a bit of pleasure as the suit's features grow less artifical, though still toyish. Some dexterity returns as their forepaws regain mobility and their motion becomes more fluid and easy.";
                }
                if(syncState == 1 && stateChange == -1){
                    stateChangeText = "[name]'s suit squeezes gently around its wearer, as the toy finds its actions gently corrected. The suit ripples and reforms itself around [name], losing some definition as it shapes them into a more toylike version of themselves.";
                }
                if(syncState == 1 && stateChange == 1){
                    stateChangeText = "[name]'s suit briefly vibrates around them as it rewards them for being a good toy. Their features become less toylike and look even more natural. Their paws regain dexterity and their expression becomes more mobile as their bodies become more defined.";
                }
                if(syncState == 2 && stateChange == 1){
                    stateChangeText = "[name] is a good toy. Its suit appears to caresses its body and releases almost all control. The suit reshapes the toy into a latex replica of their original body, allowing full range of motion and expression.";
                }
                //stateChangeText = textEditor.editText(stateChangeText, 0.25);

                while(stateChangeText.indexOf("[name]") > -1)
                    stateChangeText = stateChangeText.replace("[name]", name);

    
                setTimeout(function(){
                    messageSender.sendMessage(channelID, "```" + stateChangeText + "```");
                }, 500);
            }

            

            /*
            message = textComp.processToyText(message);
            message.points -= originalMessage.length/7;
            var points = Math.floor(message.points*Math.pow(compressionPercent/100, 2)*10)/10;
            //message = message.text + " ("+points+") ["+compressionPercent+"%] => ("+compressedPoints+")";
            message = message.text;
            if(message == "") return;
            
            if(points > messageHeartBar){ //If points is greater than the current bar for hearting messages...
                messageHeartBar += 0.5;
                messageSender.sendMessage(channelID, "**" + name + "**: " + message, function(error, response){

                    discordBot.addReaction({
                        channelID: channelID,
                        messageID: response.id,
                        reaction: "❤",
                    }, function (err,res){
                        if (err) console.log(err);
                    });
                });
            }else{
                messageHeartBar -= 0.01;
                messageSender.sendMessage(channelID, "**" + name + "**: " + message);
            }
            */
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