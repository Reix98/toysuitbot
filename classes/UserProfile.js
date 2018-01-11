class UserProfile{
	constructor(props){
		
		props = props || {}

		var profile = this
		profile['userID'] = null
		profile['name'] = null
		profile['discriminator'] = null
		profile['nickname'] = null
		profile['lastChannelID'] = null
		profile['str'] = 2 // str;
		profile['res'] = 2 // res;
		profile['wil'] = 2 // wil;
		profile['controlled'] = false
		profile['gagged'] = false
		profile['mode'] = 'unsuited'
		profile['suit timestamp'] = 0
		profile['suit timer'] = 0
		profile['suit timer bonus count'] = 0
		profile['suit timer bonus amount'] = null
		profile['ownerID'] = null
		profile['info'] = '[Info not set]'
		profile['kinks'] = '[Kinks not set]'
		profile['toyType'] = null
		profile['beta access list'] = []
		profile['can safeword'] = true
		profile['sync level'] = 0
		profile['sync level history'] = []
		profile['parens allowed'] = true
		profile['sync state'] = 0
		profile['last activity'] = 0
	
		for (let [property, value] of Object.entries(props)) {
			this[property] = value;
		}
	}

	/**
	 * Gets the name of the user / toy
	 * @return String
	 */
	getName() {
		if (!this.nickname || !this.isSuited()) {
			return this.name; // The real name
		}

		return this.nickname; // The toy name
	}

	/**
	 * Checks if the user is a toy (suited)
	 * @return Boolean
	 */
	isSuited () {
		return this.mode === 'suited';
	}

	/**
	 * Gets the users pronoun.
	 *
	 *	If the user is suited its: it otherwise: their
	 *
	 * @return String
	 */
	getPronoun () {
		return this.isSuited() ? 'its' : 'their';
	}

	/**
	 * Returns the the differences between the user and the empty TemplateUser.
	 *
	 * @param {*boolean} includeID: Should the Id be saved
	 * @returns {*Object}
	 */
	differenceFromTemplate (includeID) {
		var diff = {};
		const TemplateProfile = new UserProfile();
		for (var prop in TemplateProfile) {
			if (typeof this[prop] === 'function') { continue; }
			if (!includeID && (prop === 'userID' || prop === 'name' || prop === 'discriminator')) { continue; }
			if (typeof this[prop] === 'object') {
				try {
					if (JSON.stringify(this[prop]) !== JSON.stringify(TemplateProfile[prop])) {
						diff[prop] = this[prop]
					}
				} catch (e) {
					console.log('[ERROR]: Could not save stringifier profile');
					// If it's gonna crash the JSON stringifier, we can't save it anyway, so...
				}
			} else if (this[prop] !== TemplateProfile[prop]) {
				diff[prop] = this[prop]
			}
		}

		return diff
	}

	/**
	 * Gets the last activity timestamp or 0 if it's empty
	 *
	 * @return {*int}
	 */
	getLastActivity () {
		var lastActivity = this['last activity']

		return lastActivity || 0
	}

	/**
	 * Gets the type of toy
	 *
	 * @returns String
	 */
	getToyType () {
		return this.toyType;
	}
	
	/**
	 * Gets the toy type symbol
	 */
	getToyTypeSymbol(){
		switch(this.getToyType()) {
			case('alpha'): return "α";
			case('beta'): return "β";
			case('omega'): return "ω";
		}
		return "?";
	}

	setType(toyType){
		this.toyType = toyType;
	}

	isGagged () {
		return this.gagged;
	}

	toggleGag () {
		this.gagged = !this.gagged;
	}

	isControlled () {
		return this.controlled;
	}

	toggleControl () {
		this.controlled = !this.controlled;
	}
}

module.exports = {
	UserProfile: UserProfile
}
