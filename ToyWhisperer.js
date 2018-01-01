var fs = require('fs');

var logger;
var discordBot;
var sessionKeeper;
var sw = require('stopword');
var hash = require("string-hash")
var speakeasy = require('speakeasy-nlp');
var nlp = require('compromise');
var conjugate = require('conjugate');
var toyQueue = [];
var rwc = require('random-weighted-choice');
var messageSender;
var actionQueue;

var fs = require('fs');
var goodToyText;


init = function(log, db, sk, ms, ch){
    logger = log;
    discordBot = db;
    sessionKeeper = sk;
    messageSender = ms;
    actionQueue = [];
    commandHandler = ch;

    fs.readFile("goodtoy.txt", 'utf8', function(err, data) {
        if (err) throw err;
        data2 = data.replaceAll(" ", "");
        goodToyText = data.split("\n");
        for(key in goodToyText){
            var item = {weight: 1, id: goodToyText[key].trim()};
            goodToyText[key] = item;
        }
        //console.log(goodToyText);
    });

    setInterval(function(){
        whisperToys();
        checkActionQueue();
    }, 1000);
}

queueToy = function(profile){
    var userID = profile['userID'];
    if(toyQueue.indexOf(userID) == -1)
        toyQueue.push(userID);
}

whisperToys = function(){
    if(toyQueue.length > 0){
        for(key in toyQueue){
            var profile = sk.getProfileFromUserID(toyQueue[key]);
            var deltaTime = Math.floor(Date.now() / 1000) - profile['last activity'];
            if(deltaTime > 30){
                whisperToy(toyQueue.splice(key, 1));
            }
        }
    }
}

whisperToy = function(userID){
    var profile = sk.getProfileFromUserID(userID);
    if(profile['mode'] == "suited"){ //They could have unsuited since we last checked
        console.log("---------whisperToy: "+profile['name']);
        var trend = sk.getSyncLevelTrend(profile, 5);
        var toyType = sk.getToyType(profile);

        var syncLevel = sk.getSyncLevel(profile);
        var syncText = Math.max(-99, Math.min(100, Math.round(syncLevel)))+"%";
        while(syncText.length<4) syncText = " "+syncText;
        syncText = "`"+sk.getToyTypeSymbol(profile)+"["+syncText+"]`";

        var status = {};
        status.profile = profile;
        status.sync = syncLevel;
        status.trend = trend;
        status.toyType = toyType;
        var toyID = profile.userID;
        var options = [];
        var optionActions = [];
        var msgPrefix = syncText + "**" + sk.getName(profile) + "**: ";
        var lastChannelID = profile['lastChannelID'];


        var dataset = {};
        dataset.options = options;
        dataset.optionActions = optionActions;
        
        if(matches(status, null, [0, null], [0, null])) dataset = addOption(dataset, 1, 0, [
            {type: "message", time: 0, channelID: toyID, text: "What a good toy you're being."},
            {type: "message", time: 2, channelID: toyID, text: "Keep it up, toy."}
        ]);
    
        if(!profile['controlled'] && matches(status, null, [null, 0], [null, -1])) dataset = addOption(dataset, 1, 0, [
            {type: "message", time: 0,          channelID: toyID,           text: "I think you need some motivation, toy."},
            {type: "command", time: 1,          userID: toyID,              name: "control"},
            {type: "message", time: 2,          channelID: lastChannelID,   text: msgPrefix+"*"+rwc(goodToyText)+"*"},
            {type: "message", time: 6+r()*4,    channelID: lastChannelID,   text: msgPrefix+"*"+rwc(goodToyText)+"*"},
            {type: "message", time: 14+r()*4,   channelID: lastChannelID,   text: msgPrefix+"*"+rwc(goodToyText)+"*"},
            {type: "message", time: 22+r()*4,   channelID: lastChannelID,   text: msgPrefix+"*"+rwc(goodToyText)+"*"},
            {type: "command", time: 26,         userID: toyID,              name: "control"},
            {type: "message", time: 28,         channelID: toyID,           text: "There, perhaps that will help."}
        ]);

        options = dataset.options;
        optionActions = dataset.optionActions;

        //console.log(options);
        //console.log(optionActions);

        var highestPriority = -1000;
        for(key in options){
            highestPriority = Math.max(highestPriority, options[key].priority);
        }
        for(key in options){
            if(options[key].priority < highestPriority){
                options[key].weight = 0;
            }
        }

        //console.log(options);

        var optionIndex = rwc(options);
        //console.log(optionIndex);

        var actions = optionActions[optionIndex];
        //console.log(actions);

        for(key in actions){
            console.log("actions["+key+"]: "+actions[key]);
            var action = actions[key];
            //console.log(action);
            if(action.type == "message"){
                var message = action.text;
                message = message.replaceAll("[name]", profile['name']);
                message = message.replaceAll("[type]", toyType);
                action.text = message;
            }
            queueAction(action);
        }
    }
}

r = function(){
    return Math.random();
}

matches = function(status, toyType, syncLevel, trend){
    if(toyType != null && toyType != status.toyType) return false;
    if(syncLevel != null){
        if(syncLevel[0] != null && status.sync < syncLevel[0]) return false;
        if(syncLevel[1] != null && status.sync > syncLevel[1]) return false;
    }
    if(trend != null){
        if(trend[0] != null && status.trend < trend[0]) return false;
        if(trend[1] != null && status.trend > trend[1]) return false;
    }

    return true;
}

queueAction = function(action){
    action.time += Math.floor(Date.now() / 1000);
    actionQueue.push(action);
}

checkActionQueue = function(){
    var time = Math.floor(Date.now() / 1000);
    for(key in actionQueue){
        var action = actionQueue[key];
        if(action.time <= time){
            performAction(action);
            delete actionQueue[key];
        }
    }
}

performAction = function(action){
    switch(action.type){
        case("message"):
            messageSender.sendMessage(action.channelID, action.text);
        break;
        case("command"):
            var profile = sk.getProfileFromUserID(action.userID);
            var args = [profile['name']];
            var context = {};
            context.channelID = profile['lastChannelID'];
            if(action.name == "control"){
                ch.control(profile, args, context, true);
            }
        break;
    }
}

addOption = function(dataset, w, p, actions){
    var index = dataset.options.length;
    dataset.optionActions[index] = actions;
    dataset.options.push({weight: w, priority: p, id: index});
    return dataset;
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

module.exports = {
    init: init,
    queueToy: queueToy
}