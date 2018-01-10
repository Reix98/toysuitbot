var logger;
var sessionKeeper;
var messageSender;
var accessControl;
var messageHandler;
var discordBot;

var pendingCommands = [];
var commandTimeout = 60*3;

init = function(log, sk, ms, ac, mh, bot){
    logger = log;
    sessionKeeper = sk;
    messageSender = ms;
	accessControl = ac;
	messageHandler = mh;
	discordBot = bot;
}

setPendingCommand = function(userID, cmd, args){
    command = {};
    command.userID = userID;
    command.cmd = cmd;
    command.args = args;
    command.timestamp = Date.now;
    pendingCommands[userID] = command;
}

hasPendingCommand = function(userID){
    var command = pendingCommands[userID];
    if(command != null){
        if((Date.now - command.timestamp)/1000 < commandTimeout){
            return true;
        }
    }
    return false;
}

getPendingCommand = function(userID){
    return pendingCommands[userID];
}

handleCommand = function(user, userID, channelID, message, evt){
    var profile = sessionKeeper.getProfileFromUserID(userID);
    var cmd;
    var args;
    if(message.indexOf(" ")>-1){
        cmd = message.substring(0, message.indexOf(" "));
        args = message.substring(message.indexOf(" ")+1);
    }else{
        cmd = message;
        args = "";
    }
    args = args.split(',');
    for(i in args){ args[i] = args[i].trim(); }
    if(args.length==1 && args[0]=="") args = [];
    cmd = cmd.toLowerCase();
    logger.info(cmd);
    logger.info(args);
    var context = {
        user: user,
        userID: userID,
        channelID: channelID,
        message: message,
        evt: evt
    };
	var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
    try{
        if(cmd != '!ping' /*&& cmd !='!register'*/){
            if(userProfile == null) throw "User profile missing. This should not be possible..."
        }
        switch(cmd) {
            case('!ping'): ping(profile, args, context); break;
            //case('!register'): register(profile, args, context); break;
            case('!toysuit'): toysuit(profile, args, context); break;
            case('!release'): release(profile, args, context); break;
            case('!free'): free(profile, args, context); break;
            case('!safeword'): safeword(profile, args, context); break;
            case('!remove_safeword'): removeSafeword(profile, args, context); break;
            case('!info'): info(profile, args, context); break;
			case('!setinfo'):
            case('!set_info'): setInfo(profile, args, context); break;
            case('!kinks'): kinks(profile, args, context); break;
			case('!setkinks'):
            case('!set_kinks'): setKinks(profile, args, context); break;
			case('!setnickname'):
            case('!set_nickname'): setNickname(profile, args, context); break;
			case('!settimer'):
            case('!set_timer'): setTimer(profile, args, context); break;
            case('!timer'): timer(profile, args, context); break;
			case('!cleartimer'):
			case('!clear_timer'): clearTimer(profile, args, context); break;
			case('!settoytype'):
            case('!set_toy_type'): setToyType(profile, args, context); break;
			case('!toytype'):
            case('!toy_type'): toyType(profile, args, context); break;
			case('!settimerbonus'):
            case('!set_timer_bonus'): setTimerBonus(profile, args, context); break;
			case('!triggerbonus'):
            case('!trigger_bonus'): triggerBonus(profile, args, context); break;
            case('!control'): control(profile, args, context); break;
            case('!gag'): gag(profile, args, context); break;
            case('!say'): say(profile, args, context); break;
            case('!voice'): voice(profile, args, context); break;
            case('!debug'): debug(profile, args, context); break;
            case('!me'): me(profile, args, context); break;
			//It's not a valid command.
			//Remove the '!' prefix and send it back into the parser.
			default: messageHandler.handleMessage(user, userID, channelID, message.substr(1), evt); return;
        }
    }catch(e){
        if((e+"").indexOf("[silent]") == -1){
            messageSender.sendMessage(context.channelID, 'Error: "'+e+'"');
        }
        logger.info("!!!"+e);
        logger.info(e.stack);
    }

	//If the sender is suited, delete the command message.
	//Otherwise, they could do something like "!gag HELP ME", and it would display...
	if(userProfile != null && userProfile.isSuited()) {
		discordBot.deleteMessage({
			channelID: context.evt.d.channel_id,
			messageID: context.evt.d.id
		});
	}
}

debug = function(profile, args, context){
    var syncLevel = profile['sync level'];
    messageSender.sendMessage(context.userID, 'Sync level: '+syncLevel);
}

ping = function(profile, args, context){
    messageSender.sendMessage(context.userID, 'Pong! ('+args+')');
}

/*register = function(profile, args, context){
    var profile = sessionKeeper.getProfileFromUserID(context.userID);
    if(profile == undefined){
        var str = 2;
        var res = 2;
        var wil = 2;
        if(args.length == 0){

        }else if(args.length == 3){
            if(isNaN(args[0]) || isNaN(args[1]) || isNaN(args[2])) throw "Bad command arguments";
            str = limit(args[0], 1, 3);
            res = limit(args[1], 1, 3);
            wil = limit(args[2], 1, 3);
        }else{
            throw "Wrong number of arguments"
        }
        profile = sessionKeeper.createProfile(context.userID, context.user, str, res, wil);
        sessionKeeper.updateProfile(profile);
        messageSender.sendMessage(context.channelID, 'You have successfully registered.');
    }else{
        messageSender.sendMessage(context.channelID, 'You are already registered.');
    }
}*/

requirePM = function(context, override){
    if(override) return true;
    return true;
    logger.info(context);
    for(var key in context.evt.d){
        logger.info("  "+key);
    }
    logger.info("type: "+context.evt.d.type);
    logger.info("requirePM() -> "+context.channelID+" == "+context.userID);
    if(context.channelID != context.userID){
        messageSender.sendMessage(context.channelID, "Sorry, that command is only available via PM. Please try again via pm! :)");
        throw "[silent] Command requires PM";
    }
}

toysuit = function(profile, args, context){
    var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
	var toyProfile;
	if(args.length > 0) toyProfile = sessionKeeper.getProfileFromUserName(args[0], context.channelID);
	else toyProfile = sessionKeeper.getProfileFromUserID(context.userID);
    if(toyProfile == null) throw "That user doesn't exist."

	var result = accessControl.attemptToysuit(userProfile, toyProfile);
    messageSender.sendMessage(context.channelID, result);
}

release = function(profile, args, context){

    var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
	var toyProfile;
	if(args.length > 0) toyProfile = sessionKeeper.getProfileFromUserName(args[0], context.channelID);
	else toyProfile = sessionKeeper.getProfileFromUserID(context.userID);
    if(toyProfile == null) throw "That user doesn't exist."

	var result = accessControl.canRelease(userProfile, toyProfile);

    messageSender.sendMessage(context.channelID, result);
	toyProfile['mode'] = 'unsuited';
	sessionKeeper.updateProfile(toyProfile);

    /*if(toyProfile['mode'] == "unsuited"){
        toyProfile['mode'] = "unsuited";
        toyProfile['ownerID'] = null;
        sessionKeeper.updateProfile(toyProfile);
        throw "Target is not toysuited";
    }else if(toyProfile['userID'] == userProfile['userID']){
        //Toy attempting to release themselves.
        if(sessionKeeper.getRemainingTimerSeconds(toyProfile)>0){
            //Timer's not up.
            var time = readableTime(sessionKeeper.getRemainingTimerSeconds(toyProfile));
            messageSender.sendAction(context.channelID, getName(toyProfile)+" attempts to release itself, but its timer still reads '"+time+"'.");
        }else{
            //Timer's up. Check suit settings.
            //Whatever. Just do it for now.
            toyProfile['mode'] = "unsuited";
            toyProfile['ownerID'] = null;
            sessionKeeper.updateProfile(toyProfile);
            messageSender.sendMessage(context.channelID, getName(userProfile)+' released '+getName(toyProfile)+'.');
        }
    }else if(toyProfile['owner'] == null){
        //No owner. Check suit settings.
        //Whatever. Just do it for now.
        toyProfile['mode'] = "unsuited";
        toyProfile['ownerID'] = null;
        sessionKeeper.updateProfile(toyProfile);
        messageSender.sendMessage(context.channelID, getName(userProfile)+' released '+getName(toyProfile)+'.');
    }else if(toyProfile['ownerID'] != userProfile['userID']){
        //User isn't the toy's owner.
        throw "You are not the toy's owner";
    }else{
        toyProfile['mode'] = "unsuited";
        toyProfile['ownerID'] = null;
        sessionKeeper.updateProfile(toyProfile);
        messageSender.sendMessage(context.channelID, getName(userProfile)+' released '+getName(toyProfile)+'.');
    }*/
}

free = function(profile, args, context){
    var toyProfile = sessionKeeper.getProfileFromUserName(args[0], context.channelID);
    var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
    if(toyProfile == null) throw "That user doesn't exist."

	var result = accessControl.canFree(userProfile, toyProfile);

    messageSender.sendMessage(context.channelID, result);
	sessionKeeper.deleteProfile(toyProfile);
}

safeword = function(profile, args, context){
    var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
    if(userProfile == null) throw "That user doesn't exist.";

	var result = accessControl.canSafeword(userProfile);

    messageSender.sendMessage(context.channelID, result);
	sessionKeeper.deleteProfile(userProfile);
}

removeSafeword = function(profile, args, context){
    if(args.length > 1) throw "Wrong number of arguments";
    var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
    if(args.length == 0){
        messageSender.sendMessage(profile['userID'], "Are you sure you want to do that? Reply `!remove_safeword yes` if you are, toy.");
    }
    if(args.length == 1){
        if(args[0] == "yes"){
            profile['can safeword'] = false;
            sessionKeeper.updateProfile(profile);
            messageSender.sendMessage(profile['userID'], "Very well toy. You're mine now.");
            messageSender.sendMessage(profile['lastChannelID'], userProfile.getName()+" has removed their safeword. What a good toy.");
        }
    }
}

info = function(profile, args, context){
    if(args.length > 1) throw "Wrong number of arguments";
    var userProfile;
    if(args.length == 0){
        userProfile = sessionKeeper.getProfileFromUserID(context.userID);
    }else if(args.length == 1){
        userProfile = sessionKeeper.getProfileFromUserName(args[0]);
    }
    if(userProfile == null) throw "That user doesn't exist."

    var info = "";
    if(userProfile.isSuited()){
        info += userProfile.getName()+" is a toy. ";
        if(userProfile['ownerID'] == null) info += "They have no owner.";
        else info += "They are owned by " + getOwner(userProfile)['name'];
    }
    info += "\nInfo: "+userProfile['info'];
    messageSender.sendMessage(context.userID, info);
}

setInfo = function(profile, args, context){
    if(args.length == 0) throw "Wrong number of arguments";
    var info;

	var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
	var toyProfile = null;
	if(args.length > 1) {
		toyProfile = sessionKeeper.getProfileFromUserName(args[0], context.channelID);
		info = args.slice(1);
	}
	if(toyProfile == null) {
		toyProfile = sessionKeeper.getProfileFromUserID(context.userID);
		info = args;
	}
    if(toyProfile == null) throw "That user doesn't exist."

	var result = accessControl.canSetInfo(userProfile, toyProfile);

    toyProfile['info'] = info.join(', ');
    sessionKeeper.updateProfile(toyProfile);

    messageSender.sendMessage(context.channelID, result);
}

kinks = function(profile, args, context){
    if(args.length > 1) throw "Wrong number of arguments";
    var userProfile;
    if(args.length == 0){
        userProfile = sessionKeeper.getProfileFromUserID(context.userID);
    }else if(args.length == 1){
        userProfile = sessionKeeper.getProfileFromUserName(args[0]);
    }
    if(userProfile == null) throw "That user doesn't exist."

    var kinks = userProfile['kinks'];
    messageSender.sendMessage(context.userID, userProfile['name']+"'s kinks:\n"+kinks);
}

setKinks = function(profile, args, context){
    if(args.length == 0) throw "Wrong number of arguments";
    var kinks;

	var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
	var toyProfile = null;
	if(args.length > 1) {
		toyProfile = sessionKeeper.getProfileFromUserName(args[0], context.channelID);
		kinks = args.slice(1);
	}
	if(toyProfile == null) {
		toyProfile = sessionKeeper.getProfileFromUserID(context.userID);
		kinks = args;
	}
    if(toyProfile == null) throw "That user doesn't exist."

	var result = accessControl.canSetKinks(userProfile, toyProfile);

    toyProfile['kinks'] = kinks.join(', ');
    sessionKeeper.updateProfile(toyProfile);

    messageSender.sendMessage(context.channelID, result);
}

setNickname = function(profile, args, context){
    var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
    requirePM(context);
    if(args.length == 0 || args.length > 2) throw "Wrong number of arguments";
    var toyProfile;
    var nickname;
    if(args.length == 1){
        toyProfile = sessionKeeper.getProfileFromUserID(context.userID);
        nickname = args[0];
    }else if(args.length == 2){
        toyProfile = sessionKeeper.getProfileFromUserName(args[0]);
        if(toyProfile == null) throw "That user doesn't exist.";
        nickname = args[1];
    }

	var result = accessControl.attemptSetNickname(userProfile, toyProfile, nickname);

    messageSender.sendMessage(context.channelID, result);
}

setTimer = function(profile, args, context){
    requirePM(context);
    if(args.length == 0 || args.length > 2) throw "Wrong number of arguments";
    var targetProfile;
    var time;
    if(args.length == 1){
        targetProfile = sessionKeeper.getProfileFromUserID(context.userID);
        time = args[0];
    }else if(args.length == 2){
        targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
        if(targetProfile == null) throw "That user doesn't exist.";
        if(targetProfile['ownerID'] != context.userID &&
            !(targetProfile['toy mode'] == "omega" && targetProfile['ownerID'] == targetProfile['userID'])
        ) throw "You do not own them"
        time = args[1];
    }
    if(!targetProfile.isSuited()) throw "Target not wearing a toysuit"
    if(sessionKeeper.getRemainingTimerSeconds(targetProfile) > 0) throw "Cannot edit existing suit timer"

    time = time.split(':');
    var timeAmt = 0;
    for(var i=0; i<time.length; i++){
        var j = time.length-i-1;
        switch(j){
            case(0): timeAmt += time[i]*1; break;
            case(1): timeAmt += time[i]*60; break;
            //case(2): timeAmt += time[i]*60*60; break;
        }
    }
    timeAmt = Math.min(60*30, timeAmt);

    targetProfile['suit timer'] = timeAmt;
    targetProfile['suit timestamp'] = Math.floor(Date.now() / 1000);
    targetProfile['suit timer bonus'] = 0;
    sessionKeeper.updateProfile(targetProfile);
}

timer = function(profile, args, context){
    requirePM(context);
    if(args.length > 1) throw "Wrong number of arguments";
    var targetProfile;
    var time;
    if(args.length == 0){
        targetProfile = sessionKeeper.getProfileFromUserID(context.userID);
        if(!targetProfile.isSuited()) throw "Target not toysuited"
    }else if(args.length == 1){
        targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
        if(targetProfile == null) throw "That user doesn't exist.";
        if(!targetProfile.isSuited()) throw "Target not toysuited"
    }
    time = sessionKeeper.getRemainingTimerSeconds(targetProfile);

    if(time < 0){
        time = 0;
    }

    messageSender.sendAction(context.channelID, targetProfile.getName()+"'s timer reads: \n"+sessionKeeper.readableTime(time));
}

clearTimer = function(profile, args, context) {
	requirePM(context);
    if(args.length > 1) throw "Wrong number of arguments";
	var userProfile = sessionKeeper.getProfileFromUserID(context.userID);
    var targetProfile;
    if(args.length == 0){
        targetProfile = sessionKeeper.getProfileFromUserID(context.userID);
    }else if(args.length == 1){
        targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
        if(targetProfile == null) throw "That user doesn't exist.";
    }

	var result = accessControl.canClearTimer(userProfile, targetProfile);

	targetProfile['suit timer bonus amount'] = null;
	targetProfile['suit timer bonus count'] = 0;
	targetProfile['suit timer'] = 0;
	targetProfile['suit timestamp'] = 0;
	sessionKeeper.updateProfile(targetProfile);

	messageSender.sendAction(context.channelID, result);
};

setToyType = function(profile, args, context){
    requirePM(context);
    if(args.length != 2) throw "Wrong number of arguments";
    var targetProfile;
    var userProfile
    var type;
    if(args.length == 2){
        targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
        userProfile = sessionKeeper.getProfileFromUserID(context.userID);
        if(targetProfile == null) throw "That user doesn't exist.";
        if(targetProfile['ownerID'] != context.userID) throw "You do not own them"
        if(userProfile.isSuited() && userProfile['toy mode'] == null) throw "Toys without a set type cannot set other toys' types"
        type = args[1];
    }
    if(!targetProfile.isSuited()) throw "Target not wearing a toysuit"
    if(targetProfile['toy mode'] != null && sessionKeeper.getRemainingTimerSeconds(targetProfile) > 0) throw "Cannot change toy type once timer is set"

    type = type.toLowerCase();
    switch(type){
        case("alpha"):
            if(userProfile.isSuited()) throw "Toys cannot create alpha toys"
            targetProfile['toy mode'] = "alpha";
			messageSender.sendAction(context.channelID, targetProfile.getName()+" is now an alpha (α) toy!");
            break;
        case("beta"):
            if(userProfile.isSuited() && userProfile['toy mode'] != "alpha") throw "Non-alpha toys cannot create beta toys"
            targetProfile['toy mode'] = "beta";
			messageSender.sendAction(context.channelID, targetProfile.getName()+" is now a beta (β) toy!");
            break;
        case("omega"):
            if(userProfile.isSuited() && userProfile['toy mode'] == "omega") throw "Omega toys cannot create toys"
            targetProfile['toy mode'] = "omega";
			messageSender.sendAction(context.channelID, targetProfile.getName()+" is now an omega (ω) toy!");
            break;
    }

    sessionKeeper.updateProfile(targetProfile);

}

toyType = function(profile, args, context){
    requirePM(context);
    if(args.length > 1) throw "Wrong number of arguments";
    var targetProfile;
    var time;
    if(args.length == 0){
        targetProfile = sessionKeeper.getProfileFromUserID(context.userID);
        if(!targetProfile.isSuited()) throw "Target not toysuited"
    }else if(args.length == 1){
        targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
        if(targetProfile == null) throw "That user doesn't exist.";
        if(!targetProfile.isSuited()) throw "Target not toysuited"
    }
    type = targetProfile['toy mode'];
    if(type == null) throw "Toy type not set"

    var typeText = "";
    switch(type){
		case("dom"): typeText = "a dominant"; break;
        case("alpha"): typeText = "an alpha (α) toy"; break;
        case("beta"): typeText = "a beta (β) toy"; break;
        case("omega"): typeText = "an omega (ω) toy"; break;
    }

    messageSender.sendAction(context.channelID, targetProfile.getName()+" is "+typeText+".");
}

setTimerBonus = function(profile, args, context){
    requirePM(context);
    if(args.length != 2) throw "Wrong number of arguments";
    var targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
    if(targetProfile == null) throw "That user doesn't exist.";
    if(targetProfile['ownerID'] != context.userID &&
        !(targetProfile['toy mode'] == "omega" && targetProfile['ownerID'] == targetProfile['userID'])
    ) throw "You do not own them"
    if(!targetProfile.isSuited()) throw "Target not wearing a toysuit"
    if(targetProfile['suit timer bonus amount'] != null) throw "Suit timer bonus already set"

    var time = args[1];
    time = time.split(':');
    var timeAmt = 0;
    for(var i=0; i<time.length; i++){
        var j = time.length-i-1;
        switch(j){
            case(0): timeAmt += time[i]*1; break;
            case(1): timeAmt += time[i]*60; break;
            //case(2): timeAmt += time[i]*60*60; break;
        }
    }
    timeAmt = Math.min(60*30, timeAmt);
    targetProfile['suit timer bonus amount'] = timeAmt;
    sessionKeeper.updateProfile(targetProfile);
    messageSender.sendAction(context.channelID, targetProfile.getName()+"'s timer bonus was set to "+sessionKeeper.readableTime(timeAmt));
}

triggerBonus = function(profile, args, context){
    requirePM(context);
    if(args.length != 1) throw "Wrong number of arguments";
    var targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
    if(targetProfile == null) throw "That user doesn't exist.";
    if(targetProfile['ownerID'] != context.userID &&
        !(targetProfile['toy mode'] == "omega" && targetProfile['ownerID'] == targetProfile['userID'])
    ) throw "You do not own them"
    if(!targetProfile.isSuited()) throw "Target not wearing a toysuit"

    var bonusAmount = targetProfile['suit timer bonus amount'];
    targetProfile['suit timer bonus count']++;
    targetProfile['suit timer'] += targetProfile['suit timer bonus amount'];
    sessionKeeper.updateProfile(targetProfile);
    messageSender.sendAction(context.channelID, targetProfile.getName()+"'s timer bonus was triggered, adding "+sessionKeeper.readableTime(bonusAmount)+" to their timer.");
}

control = function(profile, args, context, override){
    requirePM(context, override);
    if(args.length != 1) throw "Wrong number of arguments";
    var targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
    if(targetProfile == null) throw "That user doesn't exist.";
    if(!override){
        if(targetProfile['ownerID'] != context.userID &&
            !(targetProfile['toy mode'] == "omega" && targetProfile['ownerID'] == targetProfile['userID'])
        ) throw "You do not own them"
        if(!targetProfile.isSuited()) throw "Target not wearing a toysuit"
    }

    if(targetProfile['controlled']) targetProfile['controlled'] = false;
    else targetProfile['controlled'] = true;

    sessionKeeper.updateProfile(targetProfile);
    if(targetProfile['controlled']){
        messageSender.sendAction(context.channelID, targetProfile.getName()+"'s suit has taken full control of their body.");
        messageSender.sendAction(targetProfile['userID'], 'You feel the suit take full control of your body.');
    }else{
        messageSender.sendAction(context.channelID, targetProfile.getName()+"'s suit has relaxed control of their body.");
        messageSender.sendAction(targetProfile['userID'], 'You feel the suit relax control of your body.');
    }
}

gag = function(profile, args, context){
    requirePM(context);
    var username = args.length !== 1 ? profile.getName() : args[0];
    var targetProfile = sessionKeeper.getProfileFromUserName(username);

    if(targetProfile == null) throw "That user doesn't exist.";
    if(targetProfile['ownerID'] != context.userID) throw "You do not own them"
    if(!targetProfile.isSuited()) throw "Target not wearing a toysuit"

    targetProfile.toggleGag();
    
    sessionKeeper.updateProfile(targetProfile);
    
    var message = '';
    var targetProfileName = targetProfile.getName();
    if(targetProfile.isGagged()){
        if(sk.getSyncState(targetProfile) == -2){
            message = targetProfileName +" is already gagged by their toysuit.";
        }else{
            message = targetProfileName +"'s gag swells, leaving its mouth usable only as a hole to fuck.";
        }
    }else{
        if(sk.getSyncState(targetProfile) == -2){
            message = targetProfileName +"'s gag would have deflated if their suit would allow it.";
        }else{
            message = targetProfileName +"'s gag deflates, allowing it to talk again.";
        }
    }

    messageSender.sendAction(context.channelID, message);
}

me = function(profile, args, context){
    args = args.join(', ');
    var message = '```' + profile.getName() + ' ' + args.trim() + '```';
    messageSender.sendMessage(context.channelID, message);
}

say = function(profile, args, context){
    requirePM(context);
    if(args.length < 2) throw "Wrong number of arguments";
    var targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
    args.splice(0, 1);
    var message = args.join(", ");
    if(targetProfile == null) throw "That user doesn't exist.";
    if(targetProfile['ownerID'] != context.userID &&
        !(targetProfile['toy mode'] == "omega" && targetProfile['ownerID'] == targetProfile['userID'])
    ) throw "You do not own them"
    if(!targetProfile.isSuited()) throw "Target not wearing a toysuit"

    var syncLevel = sk.getSyncLevel(targetProfile);
    var sync = Math.max(-99, Math.min(100, Math.round(syncLevel)))+"%";
    while(sync.length<4) sync = " "+sync;
    sync = "`"+sk.getToyTypeSymbol(targetProfile)+"["+sync+"]`";

    messageSender.sendMessage(profile['lastChannelID'], sync + "**" + targetProfile.getName() + "**: " + "__"+message+"__");
}

voice = function(profile, args, context){
    requirePM(context);
    if(args.length < 2) throw "Wrong number of arguments";
    var targetProfile = sessionKeeper.getProfileFromUserName(args[0]);
    args.splice(0, 1);
    var message = args.join(", ");
    if(targetProfile == null) throw "That user doesn't exist.";
    if(targetProfile['ownerID'] != context.userID &&
        !(targetProfile['toy mode'] == "omega" && targetProfile['ownerID'] == targetProfile['userID'])
    ) throw "You do not own them"
    if(!targetProfile.isSuited()) throw "Target not wearing a toysuit"

    messageSender.sendMessage(targetProfile['userID'], "**Toysuit**: " + "*"+message+"*");
}

limit = function(val, min, max){
    return Math.min(max, Math.max(min, val));
}

module.exports = {
    init: init,
    handleCommand: handleCommand,
    control: control
}