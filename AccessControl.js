var logger;
var sessionKeeper;
var messageSender;

init = function(log, sk, ms){
    logger = log;
	sessionKeeper = sk;
	messageSender = ms;
}

//getRecursiveOwners
//Returns all owners of the toy specified by toyProfile.
//While toys can only have one owner set, toys can be owned by other toys.
//The owners of owners should also have access, etc.
//This function returns *every* owner above the specified toy in that hierarchy.
//Author: dawnmew
getRecursiveOwners = function(toyProfile) {
	var nextOwner = toyProfile['ownerID'];
	var out = [];
	
	while(nextOwner != null) {
		//Keep recursively-looped owners from breaking everything.
		if(out.indexOf(nextOwner) >= 0) break;
		
		out.push(nextOwner);
		var nextOwnerProfile = sk.getProfileFromUserID(nextOwner);
		if(nextOwnerProfile != null && nextOwnerProfile['ownerID'] != null) nextOwner = nextOwnerProfile['ownerID'];
		else nextOwner = null;
	}
	
	return out;
}

//canControlType
//'userProfile' is attempting an operation with 'toyProfile.'
//If both are toys, lower-type toys can't control higher ones.
//Returns 'true' if this is permitted, 'false' if otherwise.
//Author: dawnmew
canControlType = function(userProfile, toyProfile) {
	var userType = userProfile['toy mode'];
	var toyType = toyProfile['toy mode'];
	
	//Dominants and alphas can control everything. So can typeless toys.
	if(userType == 'dom' || userType == 'alpha' || userType == null) return true;
	
	//Betas can't control alphas.
	if(userType == 'beta' && toyType == 'alpha') return false;
	
	//Omegas can only control omegas.
	if(userType == 'omega' && toyType != 'omega') return false;
	
	//Should be okay, then.
	return true;
}

//attemptToysuit
//'userProfile' is attempting to place 'toyProfile' into a toysuit.
//Returns a flavor-text string to output if capture succeeds, or throws an error string on failure.
//Note: On success, this function WILL set the session details itself!
//Author: dawnmew
attemptToysuit = function(userProfile, toyProfile) {
	var userID = userProfile['userID'];
	var toyID = toyProfile['userID'];
	var toyOwners = getRecursiveOwners(toyProfile);
	
	//Dominants can never be toysuited.
	if(toyProfile['toy mode'] == 'dom') {
		throw "Dominants can't be made into toys.";
	}
	
	//Are they already toysuited?
	if(toyProfile['mode'] == 'suited') {
		throw sessionKeeper.getName(toyProfile)+" is already in its toysuit!";
	}
	
	//Is the user an owner? Or are there no owners at all?
	//If the wearer is a beta, how about the whitelist?
	//If the wearer is an omega, anyone can toysuit them at any time.
	if(
		toyOwners.length < 1
		|| toyOwners.indexOf(userID) >= 0
		|| (toyProfile['toy mode'] == 'beta' && toyProfile['beta access list'].indexOf(userID) >= 0)
		|| toyProfile['toy mode'] == 'omega'
	) {
		//Confirm that the toy modes don't conflict.
		if(!canControlType(userProfile, toyProfile)) {
			throw sessionKeeper.getName(userProfile)+" attempted to toysuit "+sessionKeeper.getName(toyProfile)+", but "+sessionKeeper.getName(userProfile)+" is a lower toy type!";
		}
		
		//If we got here, the toysuiting will succeed!
		//Set the owner if one isn't set.
		if(toyOwners.length < 1) toyProfile['ownerID'] = userID;
		
		//Into the suit you go!
		toyProfile['mode'] = "suited";
        if(toyID != userID || toyProfile['toy mode'] == null) {
			toyProfile['toy mode'] = getNextLowestToyType(getToyType(userProfile));
		}
        toyProfile['suit timer bonus amount'] = null;
        toyProfile['suit timer bonus count'] = 0;
        toyProfile['suit timer'] = 0;
        toyProfile['suit timestamp'] = 0;
        toyProfile['controlled'] = false;
        toyProfile['gagged'] = false;
		
		sessionKeeper.updateProfile(toyProfile);
		
		if(userID == toyID) return sessionKeeper.getName(toyProfile)+" has put on its toysuit!";
		else return sessionKeeper.getName(toyProfile)+" has been toysuited by "+sessionKeeper.getName(userProfile)+'!';
	}
	
	throw sessionKeeper.getName(userProfile)+" attempted to toysuit "+sessionKeeper.getName(toyProfile)+", but "+((userProfile['mode'] == 'suited')?"it didn't":"they don't")+" have access!";
}

//canClearTimer
//'userID' is attempting to clear the active timer on 'toyProfile'.
//Only an owner can do this, and only if they are not the wearer!
//Returns a flavor-text string to output if the clear succeeds, or throws an error string on failure.
//Author: dawnmew
canClearTimer = function(userProfile, toyProfile) {
	var userID = userProfile['userID'];
	var toyID = toyProfile['userID'];
	var toyOwners = getRecursiveOwners(toyProfile);
	
	//If they're not suited or the timer has run out, there's no point.
	if(toyProfile['mode'] != 'suited' || sessionKeeper.getRemainingTimerSeconds(toyProfile)<=0) {
		throw sessionKeeper.getName(userProfile)+" attempted to clear the timer on "+sessionKeeper.getName(toyProfile)+", but no timer is active!";
	}
	
	var time = sessionKeeper.readableTime(sessionKeeper.getRemainingTimerSeconds(toyProfile));
	
	//Toys can never clear their own timers, even if they're their only owner.
	if(userID == toyID) {
		throw sessionKeeper.getName(toyProfile)+" attempted to clear its own timer, but it still reads '"+time+"'...";
	}
	
	//Only owners can clear a timer.
	if(toyOwners.indexOf(userID) < 0) {
		throw sessionKeeper.getName(userProfile)+" attempted to clear the timer for "+sessionKeeper.getName(toyProfile)+", but only an owner can do this! It still reads '"+time+"'...";
	}
	
	//It should be allowed, then.
	return sessionKeeper.getName(userProfile)+" cleared the timer for "+sessionKeeper.getName(toyProfile)+"!";
}

//canRelease
//'userID' is attempting to release the toy with profile 'toyProfile.'
//Returns a flavor-text string to output if release succeeds, or throws an error string on failure.
//Author: dawnmew
canRelease = function(userProfile, toyProfile) {
	
	var userID = userProfile['userID'];
	var toyID = toyProfile['userID'];
	var toyOwners = getRecursiveOwners(toyProfile);
	
	//If the toy isn't suited anyway...
	if(toyProfile['mode'] != 'suited') {
		throw sessionKeeper.getName(toyProfile)+" is already released from the toysuit!";
	}
	
	//An active timer always prevents release.
	if(sessionKeeper.getRemainingTimerSeconds(toyProfile)>0) {
		var time = sessionKeeper.readableTime(sessionKeeper.getRemainingTimerSeconds(toyProfile));
		if(userID == toyID) throw sessionKeeper.getName(toyProfile)+" attempts to release itself, but its timer still reads '"+time+"'.";
		else throw sessionKeeper.getName(userProfile)+" attempts to release "+sessionKeeper.getName(toyProfile)+", but its timer still reads '"+time+"'.";
	}
	
	//An owner is releasing the toy - always allowed.
	if(toyOwners.indexOf(userID) >= 0) {
		if(userID == toyID) toyProfile['name']+" released themselves from the toysuit.";
		else return toyProfile['name']+" has been released from the toysuit by "+sessionKeeper.getName(userProfile)+".";
	}
	
	//Toy is attempting to release itself, and is an alpha, so is allowed.
	if(userID == toyProfile['userID'] && toyProfile['toy mode'] == 'alpha') {
		return toyProfile['name']+" released themselves from the toysuit.";
	}
	
	//Check the access whitelist for beta toys.
	if(toyProfile['toy mode'] == 'beta') {
		var whitelist = toyProfile['beta access list'] || [];
		
		//Is the user whitelisted?
		if(whitelist.indexOf(userID) >= 0) {
			//User is whitelisted, and therefore allowed to release the toy.
			if(userID == toyID) return toyProfile['name']+" released themselves from the toysuit.";
			else return toyProfile['name']+" has been released from the toysuit by "+sessionKeeper.getName(userProfile)+".";
		}
	}
	
	//If they got here, they aren't allowed. Are they the toy?
	if(toyID == userID) {
		throw sessionKeeper.getName(toyProfile)+" tried to release itself from the toysuit, but it's no use...";
	}
	
	//They're not the toy.
	throw sessionKeeper.getName(userProfile)+" tried to release "+sessionKeeper.getName(toyProfile)+" from its toysuit, but it's no use...";
};

//canFree
//'userID' is attempting to free the toy with profile 'toyProfile.'
//This operation, if successful, would *fully delete* that toy's profile.
//It can generally only be done by the toy's owner, and requires them to be released already.
//Returns a flavor-text string to output if the free succeeds, or throws an error string on failure.
//Author: dawnmew
canFree = function(userProfile, toyProfile) {
	
	var userID = userProfile['userID'];
	var toyID = toyProfile['userID'];
	var toyOwners = getRecursiveOwners(toyProfile);
	
	//Only an owner can free a toy.
	if(toyOwners.indexOf(userID) < 0) {
		if(userID == toyID) throw sessionKeeper.getName(toyProfile)+" tried to free itself from the toysuit entirely, but it's no use...";
		else throw sessionKeeper.getName(userProfile)+" tried to free "+sessionKeeper.getName(toyProfile)+" from its toysuit entirely, but it's no use...";
	}
	
	//Only a released toy can be freed.
	if(toyProfile['mode'] == 'suited') {
		if(userID == toyID) throw sessionKeeper.getName(toyProfile)+" tried to free itself from the toysuit entirely, but it must be released first.";
		else throw sessionKeeper.getName(userProfile)+" tried to free "+sessionKeeper.getName(toyProfile)+" from its toysuit entirely, but it must be released first.";
	}
	
	//They have access. Free the toy.
	if(userID == toyID) return sessionKeeper.getName(toyProfile)+" freed themselves from the toysuit entirely!";
	else return sessionKeeper.getName(userProfile)+" freed "+sessionKeeper.getName(toyProfile)+" from the toysuit entirely!";
};

//canSafeword
//The toy is attempting to use its safeword.
//This operation, if successful, would *fully delete* that toy's profile.
//This is successful in every case... unless the toy gave up its right to a safeword.
//Returns a flavor-text string to output if the safeword succeeds, or throws an error string on failure.
//Author: dawnmew
canSafeword = function(toyProfile) {
	//Has the toy lost its ability to safeword...?
	if(!toyProfile['can safeword']) {
		if(toyProfile['mode'] == 'suited'){
            messageSender.sendMessage(toyProfile['userID'], "Hmm... no. I don't think so, toy. You're mine now.");
			throw sessionKeeper.getName(toyProfile)+" attempted to use its safeword... but there is no escape for this toy.";
		}else throw sessionKeeper.getName(toyProfile)+" attempted to use their safeword... but the toysuit still waits to reclaim them.";
	}
	
	if((toyProfile['toy mode'] == null || toyProfile['toy mode'] == 'dom') && toyProfile['mode'] != 'suited') return toyProfile['name']+" used their safeword, clearing all toysuit settings.";
	
	return toyProfile['name']+" used their safeword, freeing themselves from the toysuit entirely.";
};

//canSetInfo
//'userID' is attempting to set the profile info on 'toyProfile'.
//Only an owner can do this.
//Returns a flavor-text string to output if the clear succeeds, or throws an error string on failure.
//Author: dawnmew
canSetInfo = function(userProfile, toyProfile) {
	var userID = userProfile['userID'];
	var toyID = toyProfile['userID'];
	var toyOwners = getRecursiveOwners(toyProfile);
	
	//Only owners can do this.
	if(toyOwners.indexOf(userID) < 0) {
		throw sessionKeeper.getName(toyProfile)+" does not belong to you, so you can't set its info.";
	}
	
	//It should be allowed, then.
	if(toyID == userID) return sessionKeeper.getName(toyProfile)+" has changed "+((toyProfile['mode']=='suited')?'its':'their')+" `!info` description.";
	else return sessionKeeper.getName(userProfile)+" has changed the `!info` description for "+sessionKeeper.getName(toyProfile)+".";
}

//canSetKinks
//'userID' is attempting to set the kink info on 'toyProfile'.
//Only an owner can do this.
//Returns a flavor-text string to output if the clear succeeds, or throws an error string on failure.
//Author: dawnmew
canSetKinks = function(userProfile, toyProfile) {
	var userID = userProfile['userID'];
	var toyID = toyProfile['userID'];
	var toyOwners = getRecursiveOwners(toyProfile);
	
	//Only owners can do this.
	if(toyOwners.indexOf(userID) < 0) {
		throw sessionKeeper.getName(toyProfile)+" does not belong to you, so you can't set its kinks.";
	}
	
	//It should be allowed, then.
	if(toyID == userID) return sessionKeeper.getName(toyProfile)+" has changed "+((toyProfile['mode']=='suited')?'its':'their')+" `!kinks`.";
	else return sessionKeeper.getName(userProfile)+" has changed the `!kinks` for "+sessionKeeper.getName(toyProfile)+".";
}

//attemptSetNickname
//'userID' is attempting to set the nickname of 'toyProfile'.
//Only an owner can do this.
//Returns a flavor-text string to output if the clear succeeds, or throws an error string on failure.
//Author: dawnmew
attemptSetNickname = function(userProfile, toyProfile, nickname) {
	var userID = userProfile['userID'];
	var toyID = toyProfile['userID'];
	var toyOwners = getRecursiveOwners(toyProfile);
	
	//Only owners can do this.
	if(toyOwners.indexOf(userID) < 0) {
		throw sessionKeeper.getName(toyProfile)+" does not belong to you, so you can't set its nickname.";
	}
	
	//It should be allowed, then.
	
	var oldName = sessionKeeper.getName(toyProfile);
	
	if(nickname == '[reset]') {
		nickname = null;
	}
	
	toyProfile['nickname'] = nickname;
	sessionKeeper.updateProfile(toyProfile);
	
	if(toyID == userID) {
		if(nickname == null) return oldName+" has removed "+((toyProfile['mode']=='suited')?'its':'their')+" nickname, and is known as \""+toyProfile['name']+"\" once more.";
		else return oldName+" has changed "+((toyProfile['mode']=='suited')?'its':'their')+" nickname to \""+nickname+"\"!";
	}
	else {
		if(nickname == null) return sessionKeeper.getName(userProfile)+" has removed the nickname from "+oldName+", who is known as \""+toyProfile['name']+"\" once more.";
		else return sessionKeeper.getName(userProfile)+" has set the nickname of "+oldName+" to \""+nickname+"\"!";
	}
}

module.exports = {
    init: init,
	attemptToysuit: attemptToysuit,
	canClearTimer: canClearTimer,
	canRelease: canRelease,
	canFree: canFree,
	canSafeword: canSafeword,
	canSetInfo: canSetInfo,
	canSetKinks: canSetKinks,
	attemptSetNickname: attemptSetNickname
}