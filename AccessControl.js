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
	var userType = userProfile.getToyType();
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
	
	//Dominants can never be toysuited.
	if(toyProfile['toy mode'] == 'dom') {
		throw "Dominants can't be made into toys.";
	}

	if(toyProfile.isSuited()) {
		throw toyProfile.getName()+" is already in its toysuit!";
	}
	
	//Is the user an owner? Or are there no owners at all?
	//If the wearer is a beta, how about the whitelist?
	//If the wearer is an omega, anyone can toysuit them at any time.
	var toyOwners = getRecursiveOwners(toyProfile);
	if(
		toyOwners.length < 1
		|| toyOwners.indexOf(userID) >= 0
		|| (toyProfile['toy mode'] == 'beta' && toyProfile['beta access list'].indexOf(userID) >= 0)
		|| toyProfile['toy mode'] == 'omega'
	) {
		//Confirm that the toy modes don't conflict.
		if(!canControlType(userProfile, toyProfile)) {
			var userProfileName =userProfile.getName();
			throw userProfileName +" attempted to toysuit "+toyProfile.getName()+", but "+userProfileName+" is a lower toy type!";
		}
		
		//If we got here, the toysuiting will succeed!
		//Set the owner if one isn't set.
		if(toyOwners.length < 1) toyProfile['ownerID'] = userID;
		
		//Into the suit you go!
		toyProfile['mode'] = "suited";
        if(toyID != userID || toyProfile['toy mode'] == null) {
			toyProfile['toy mode'] = getNextLowestToyType(userProfile.getToyType());
		}
        toyProfile['suit timer bonus amount'] = null;
        toyProfile['suit timer bonus count'] = 0;
        toyProfile['suit timer'] = 0;
        toyProfile['suit timestamp'] = 0;
        toyProfile.controlled = false;
        toyProfile.gagged = false;
		
		sessionKeeper.updateProfile(toyProfile);

		var toyName = toyProfile.getName();
		if(userID == toyID) return toyName +" has put on its toysuit!";
		else return toyName +" has been toysuited by "+userProfile.getName()+'!';
	}
	
	throw userProfile.getName()+" attempted to toysuit "+toyProfile.getName()+", but " + (userProfile.isSuited() ? "it didn't" : "they don't") + " have access!";
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
	var toyName = toyProfile.getName();
    var userName = toyProfile.getName();

	//If they're not suited or the timer has run out, there's no point.
	if(!toyProfile.isSuited() || sessionKeeper.getRemainingTimerSeconds(toyProfile)<=0) {
		throw userName+" attempted to clear the timer on "+toyName+", but no timer is active!";
	}
	
	var time = sessionKeeper.readableTime(sessionKeeper.getRemainingTimerSeconds(toyProfile));
	
	//Toys can never clear their own timers, even if they're their only owner.
	if(userID == toyID) {
		throw toyName + " attempted to clear its own timer, but it still reads '" + time + "'...";
	}
	
	//Only owners can clear a timer.
	if(toyOwners.indexOf(userID) < 0) {
		throw userName + " attempted to clear the timer for " + toyName + ", but only an owner can do this! It still reads '" + time + "'...";
	}
	
	//It should be allowed, then.
	return userName + " cleared the timer for " + toyName + "!";
}

//canRelease
//'userID' is attempting to release the toy with profile 'toyProfile.'
//Returns a flavor-text string to output if release succeeds, or throws an error string on failure.
//Author: dawnmew
canRelease = function(userProfile, toyProfile) {
	
	var userID = userProfile['userID'];
	var toyID = toyProfile['userID'];
	var toyOwners = getRecursiveOwners(toyProfile);
	var userName = userProfile.getName();
    var toyName = toyProfile.getName();

	//If the toy isn't suited anyway...
	if(!toyProfile.isSuited()) {
		throw toyName+" is already released from the toysuit!";
	}
	
	//An active timer always prevents release.
	if(sessionKeeper.getRemainingTimerSeconds(toyProfile)>0) {
		var time = sessionKeeper.readableTime(sessionKeeper.getRemainingTimerSeconds(toyProfile));

		if(userID == toyID)  throw toyName+" attempts to release itself, but its timer still reads '"+time+"'.";
		else throw userProfile+" attempts to release "+toyName+", but its timer still reads '"+time+"'.";
	}
	
	//An owner is releasing the toy - always allowed.
	if(toyOwners.indexOf(userID) >= 0) {
		if(userID == toyID) return toyName +" released themselves from the toysuit.";
		else return toyName+" has been released from the toysuit by "+userName+".";
	}
	
	//Toy is attempting to release itself, and is an alpha, so is allowed.
	if(userID == toyProfile['userID'] && toyProfile['toy mode'] == 'alpha') {
		return toyName +" released themselves from the toysuit.";
	}
	
	//Check the access whitelist for beta toys.
	if(toyProfile['toy mode'] == 'beta') {
		var whitelist = toyProfile['beta access list'] || [];
		
		//Is the user whitelisted?
		if(whitelist.indexOf(userID) >= 0) {
			//User is whitelisted, and therefore allowed to release the toy.
			if(userID == toyID) return toyName+" released themselves from the toysuit.";
			else return toyName+" has been released from the toysuit by "+userName+".";
		}
	}
	
	//If they got here, they aren't allowed. Are they the toy?
	if(toyID == userID) throw toyName+" tried to release itself from the toysuit, but it's no use...";
	
	//They're not the toy.
	throw userName+" tried to release "+toyName+" from its toysuit, but it's no use...";
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
	var toyName = toyProfile.getName();
	var userName = userProfile.getName();
	
	//Only an owner can free a toy.
	if(toyOwners.indexOf(userID) < 0) {
		if(userID == toyID) throw toyName + " tried to free itself from the toysuit entirely, but it's no use...";
		throw userName + " tried to free " + toyName + " from its toysuit entirely, but it's no use...";
	}
	
	//Only a released toy can be freed.
	if(toyProfile.isSuited()) {
		if(userID == toyID) throw toyName+" tried to free itself from the toysuit entirely, but it must be released first.";
		throw userName + " tried to free "+toyName+" from its toysuit entirely, but it must be released first.";
	}
	
	//They have access. Free the toy.
	if(userID == toyID) return toyName+" freed themselves from the toysuit entirely!";
	else return userName+" freed "+toyName+" from the toysuit entirely!";
};

//canSafeword
//The toy is attempting to use its safeword.
//This operation, if successful, would *fully delete* that toy's profile.
//This is successful in every case... unless the toy gave up its right to a safeword.
//Returns a flavor-text string to output if the safeword succeeds, or throws an error string on failure.
//Author: dawnmew
canSafeword = function(toyProfile) {
	var toyName = toyProfile.getName();

	//Has the toy lost its ability to safeword...?
	if(!toyProfile['can safeword']) {
		if(toyProfile.isSuited()){
            messageSender.sendMessage(toyProfile['userID'], "Hmm... no. I don't think so, toy. You're mine now.");
			throw toyName + " attempted to use its safeword... but there is no escape for this toy.";
		}else throw toyName + " attempted to use their safeword... but the toysuit still waits to reclaim them.";
	}

	var toyType = toyProfile.getToyType();
	if((toyType == null || toyType == 'dom') && !toyProfile.isSuited()) return toyName + " used their safeword, clearing all toysuit settings.";

	return toyName +" used their safeword, freeing themselves from the toysuit entirely.";
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
		throw toyProfile.getName()+" does not belong to you, so you can't set its info.";
	}
	
	//It should be allowed, then.
	if(toyID == userID) return toyProfile.getName() + " has changed " + toyProfile.getPronoun() + " `!info` description.";
	else return userProfile.getName()+" has changed the `!info` description for " + toyProfile.getName() + ".";
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
	if(toyOwners.indexOf(userID) < 0) throw toyProfile.getName()+" does not belong to you, so you can't set its kinks.";
	
	//It should be allowed, then.
	if(toyID == userID) return toyProfile.getName()+" has changed "+ toyProfile.getPronoun() + " `!kinks`.";
	else return userProfile.getName() +" has changed the `!kinks` for " + toyProfile.getName() + ".";
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
    var oldName = toyProfile.getName();

	//Only owners can do this.
	if(toyOwners.indexOf(userID) < 0) {
		throw oldName + " does not belong to you, so you can't set its nickname.";
	}
	
	//It should be allowed, then.
	if(nickname == '[reset]') {
		nickname = null;
	}
	
	toyProfile['nickname'] = nickname;
	sessionKeeper.updateProfile(toyProfile);
	
	if(toyID == userID) {
		if(nickname == null) return oldName+" has removed "+ toyProfile.getPronoun() +" nickname, and is known as \""+toyProfile['name']+"\" once more.";
		else return oldName+" has changed "+ toyProfile.getPronoun() +" nickname to \""+nickname+"\"!";
	}
	else {
		if(nickname == null) return userProfile.getName()+" has removed the nickname from "+oldName+", who is known as \""+toyProfile['name']+"\" once more.";
		else return userProfile.getName()+" has set the nickname of "+oldName+" to \""+nickname+"\"!";
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