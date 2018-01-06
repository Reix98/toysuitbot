var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var stringSimilarity = require('string-similarity');
var tagger = require( 'wink-pos-tagger' );
var myTagger = tagger();
var tokenize = require( 'wink-tokenizer' )().tokenize;
const Inflectors = require("en-inflectors").Inflectors;
var inflectors = new Inflectors("book");

sk = require("./SessionKeeper.js");
ac = require("./AccessControl.js");
ms = require("./MessageSender.js");
ch = require("./CommandHandler.js");
mh = require("./MessageHandler.js");
tb = require("./ToyBrain.js");
tw = require("./ToyWhisperer.js");


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
var firstboot = true;
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');

	if(firstboot) {
        firstboot = false;
        tb.init(logger);
		sk.init(logger, bot);
		ac.init(logger, sk, ms);
		ms.init(logger, bot, sk);
		mh.init(logger, bot, sk, ms, tb);
        ch.init(logger, sk, ms, ac, mh, bot);
        tw.init(logger, bot, sk, ms, ch);
	}
});

/*
var info = "";
for(var key in bot){
    info += key+", ";
}
logger.info("  "+info);
*/

bot.on('presence', function(user, userID, status, game, evt) {
	//Alert SessionKeeper to presence changes.
	//If a new user is added to the server, a presence change event will fire.
	//Between this and the SK's initialization check of the user list, it knows every user.
	//This way, it will always have a profile for every user.
	if(!user.bot) sk.noteUser(userID);
});

bot.on('any', function(event) { 
    //console.log("bot.on('any', {})");
    //console.log(event.t);
    var emoji;
    var polarity;
    if(event.t == "MESSAGE_REACTION_ADD" || event.t == "MESSAGE_REACTION_REMOVE"){
        console.log(event);
        emoji = event.d.emoji.name;
        if(emoji == "⭕" || emoji == "❌"){
            if(emoji == "⭕"){
                polarity = 1;
            }else if(emoji == "❌"){
                polarity = -1;
            }
            if(event.t == "MESSAGE_REACTION_ADD") polarity *= 1;
            if(event.t == "MESSAGE_REACTION_REMOVE") polarity *= -1;

            //console.log("--------------");
    
            bot.getMessage({
                messageID: event.d.message_id, 
                channelID: event.d.channel_id
            }, function(error, message){
                //console.log("--------------");
                //console.log(message.content);
                text = message.content;
                var toyType = text.substring(text.indexOf("[")-1, text.indexOf("["));
                text = text.substring(text.indexOf(":")+1).trim();
                if(text.indexOf("[")>-1)
                    text = text.substring(0, text.indexOf("["));
                if(text.indexOf("*") == -1 && text.indexOf("(") == -1){
                    //console.log("--------------");
                    console.log(toyType);
                    switch(toyType){
                        case("α"): toyType = "alpha"; break;
                        case("β"): toyType = "beta"; break;
                        case("ω"): toyType = "omega"; break;
                        default: toyType = "beta";
                    }
                    console.log(toyType);
                    tb.learn(text, polarity, toyType);
                }
            });
        }
    }
});

bot.on('messageUpdate', function(oldMsg, newMsg) {
	
	//Clever toys may edit messages to speak out of turn.
	//Just delete anything they edit if they're suited.
	
	var authorId = null;
	if(newMsg && newMsg.author && newMsg.author.id) authorId = newMsg.author.id;
	else if(oldMsg && oldMsg.author && oldMsg.author.id) authorId = oldMsg.author.id;
	
	if(authorId == null) {
		console.log('ERROR: oldMsg and newMsg are both empty?');
		return;
	}
	
	var author = sk.getProfileFromUserID(authorId);
	if(author != null && author['mode'] == 'suited') {
		bot.deleteMessage({
			channelID: newMsg.channel_id,
			messageID: newMsg.id
		});
	}
});

bot.on('message', function (user, userID, channelID, message, evt) {
    try{
        if(userID == bot.id){
            return; // Ignore bot messages
        }
        
        if (message.substring(0, 1) == '!') {
            //User Command.
            ch.handleCommand(user, userID, channelID, message, evt);
        }else{
            //User Message.
            mh.handleMessage(user, userID, channelID, message, evt);
        }

        var userProfile = sk.getProfileFromUserID(userID);
        if(userProfile['mode'] == "suited"){
            userProfile['last activity'] = Math.floor(Date.now() / 1000);
            tw.queueToy(userProfile);
        }
    }catch(exception){
        logger.error(exception);
    }
});