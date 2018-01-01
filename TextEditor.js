
var logger;
var sw = require('stopword');
var hash = require("string-hash")
var speakeasy = require('speakeasy-nlp');
var nlp = require('compromise');
var conjugate = require('conjugate');
var synonyms = require("synonyms");


init = function(log){
    logger = log;
}

editText = function(text, amount){
    text = text.split(' ');
    for(key in text){
        if(text[key].indexOf("[") == -1){
            if(Math.random() < amount){
                var options = synonyms(text[key]);
                var opts = [];
                for(type in options){
                }
                console.log(options);
            }
        }
    }
}


module.exports = {
    init: init,
    editText: editText
}