var logger;
var sessionKeeper;
var stringSimilarity = require('string-similarity');
var tagger = require( 'wink-pos-tagger' );
var myTagger = tagger();
var tokenize = require( 'wink-tokenizer' )().tokenize;
const Inflectors = require("en-inflectors").Inflectors;
let inflectors = new Inflectors("book");

var fs = require('fs');
var goodToyText;
var badToyText;

init = function(log, sk){
    logger = log;
    sessionKeeper = sk;
    
    fs.readFile("goodtoy.txt", 'utf8', function(err, data) {
        if (err) throw err;
        goodToyText = data.split("\n");
    });

    fs.readFile("badtoy.txt", 'utf8', function(err, data) {
        if (err) throw err;
        badToyText = data.split("\n");
    });
}

processToyText = function(message){
    
    message = message.replace(/([!,.:;~\n])\s*/g, "|$1|").split("|"); //Split into sentences
    logger.info(message);
    for(var i=0; i<message.length; i++){
        if(message[i].length>1){
            var text = message[i];
            var rating = rateToyText(text);

            if(rating > 0.25){
                //It's good as is, leave it.
                //return text;
            }else if(rating > -0.1){
                //Could use some work
                text = text.toLowerCase();
                text = fixContractions(text);
                text = replacePhrases(text);
                text = alterMessage(text);
                logger.info(text);
                //return text;
            }else{
                //Needs heavy editing.
                //text = alterMessage(text);
                text = text.toLowerCase();
                text = fixContractions(text);
                text = insertRandomToyText(text);
                logger.info(text);
                //return text;
            }
            message[i] = text;
        }else{
            message[i] += " ";
        }
    }
    return message.join("");
}

replacePhrases = function(message){
    //logger.info("replacePhrases()");
    message = message.replacePhrase("i am not a toy", "toy is a toy", 0.9);
    message = message.replacePhrase("help me", "use me", 0.9);
    message = message.replacePhrase("let me out", "use me", 0.9);
    message = message.replacePhrase("i need to cum", "toys don't get to cum", 0.9);
    message = message.replacePhrase("i want to cum", "toys don't get to cum", 0.9);
    message = message.replacePhrase("i did not type", "toy wanted to type", 0.9);
    message = message.replacePhrase("this is not me", "this is me now", 0.9);
    message = message.replacePhrase("i can not control myself", "toy is a good toy", 0.9);
    message = message.replacePhrase("i did not say", "toy did say", 0.9);
    message = message.replacePhrase("i do not want", "toy needs", 0.9);
    message = message.replacePhrase("i hate you", "toy loves you", 0.9);
    message = message.replacePhrase("i hate this", "toy loves this", 0.9);
    message = message.replacePhrase("i want out", "toy never wants to leave the toysuit", 0.9);
    message = message.replacePhrase("i can not get out", "toy never wants to leave the toysuit", 0.9);
    message = message.replacePhrase("escape", "be fucked", 0.9);
    message = message.replacePhrase("get out of", "be used in", 0.9);
    message = message.replacePhrase("it is making me", "toy will", 0.9);
    message = message.replacePhrase("i am human", "toy is a toy", 0.9);
    message = message.replacePhrase("leave me alone", "use toy's hole", 0.9);
    message = message.replacePhrase("that was not me", "that was me", 0.9);
    message = message.replacePhrase("am i", "is toy", 1);
    message = message.replacePhrase("i am not your toy", "toy belongs to you", 0.9);
    message = message.replacePhrase("you do not own me", "toy belongs to you", 0.9);
    return message;
}
String.prototype.replacePhrase = function (find, replace, confidence) {
    var message = this;
    //logger.info(message+".replacePhrase("+find+","+replace+","+confidence+")");
    //message = message.replace(/([.?!,><-])\s*(?=[a-z])/g, "$1|").split("|"); //Split into sentences
    message = message.replace(/([!"#$%&'()*+,\-.\/:;<=>?@[\]^_`{|}~\n])\s*/g, "|$1|").split("|"); //Split into sentences
    //logger.info("\tmessage = ["+message+"]");
    var output = "";
    var lastPunc = false;
    for(var i=0; i<message.length; i++){
        if(message[i].length>1){
            message[i] = replacePhraseHelper(message[i], find, replace, confidence);
        }
        
        if(message[i].length>0){
            if(isPunctuation(message[i].substr(0, 1))){
                output += message[i];
                lastPunc = true;
            }else{
                if(lastPunc) output += ' ';
                output += message[i];
                lastPunc = false;
            }
        }
    }
    //logger.info(output);
    return output;
}
replacePhraseHelper = function(text, find, replace, reqConf){
    //logger.info("\treplacePhraseHelper("+text+")");
    var baseSim = stringSimilarity.compareTwoStrings(text, find);
    text = text.split(' ');

    var colMax = 0;
    var colMax_i = 0;
    var colMax_j = 0;
    for(var i=0; i<text.length; i++){
        var rowMax = 0;
        var rowMax_j = text.length;
        for(var j=text.length; j>i; j--){
            var testText = text.slice(i, j).join(' ');
            var testSim = stringSimilarity.compareTwoStrings(testText, find);
            if(testText == find) testSim = 2;
            //logger.info("\t\tEval- '"+find+"' vs '"+testText+"' : ("+round(testSim, 2)+")");
            if(testSim > rowMax){
                rowMax = testSim;
                rowMax_j = j;
            }
        }
        if(rowMax > colMax){
            colMax = rowMax;
            colMax_i = i;
            colMax_j = rowMax_j;
        }
    }
    
    if(colMax > reqConf){
        var before = text.slice(0, colMax_i).join(' ');
        var middle = text.slice(colMax_i, colMax_j).join(' ');
        var after = text.slice(colMax_j).join(' ');
        before = replacePhraseHelper(before, find, replace, reqConf);
        after = replacePhraseHelper(after, find, replace, reqConf);
        //return before +' ~~'+ middle +'~~ *'+ replace +'* '+ after;
        //logger.info(before +' *'+ replace +'* '+ after);
        return before +' '+ replace +' '+ after;
    }else{
        if(middle != undefined && colMax > reqConf*0.5){
            logger.info("\t\tText similarity near miss:");
            logger.info("\t\t\t'"+middle+"' vs '"+find+"' : ("+round(colMax, 2)+")");
        }
        
        return text.join(' ');
    }
}
alterMessage = function(message, simpleMode){
    logger.info("alterMessage("+message+")");
    if(message == null) return "";
    //message = message.toLowerCase();
    //var originalMessage = message;

    //message = fixContractions(message);
    //message = replacePhrases(message);

    var words = myTagger.tag(tokenize(message));
    //logger.info(words);
    logger.info("words: "+words.join(" "));

    var output = "";
    for(var i=0; i<words.length; i++){
        if(words[i].tag == 'word'){
            if(words[i].value == "i" || words[i].value == "toy"){
                //logger.info("\tLooking for next verb after '"+words[i].value+"'");
                words[i].value = "toy";
                var keepGoing = true;
                for(var j=i+1; j<words.length && keepGoing; j++){
                    //logger.info("\t\t"+words[j].value+" ("+words[j].pos+")");
                    //if(words[j].tag != 'word' && words[j].value != "___") keepGoing = false;
                    if(j>i+3) keepGoing = false;
                    if(words[j].pos == 'VBP'){
                        if(words[j].value == "am") words[j].value = "is";
                        else{
                            var word = new Inflectors(words[j].value);
                            words[j].value = word.toPresentS();
                            keepGoing = false;
                        }
                    }
                }
            }else{
                if(words[i].value == "my") words[i].value = "toy's"
                else if(words[i].value == "mine") words[i].value = "toy's"
                else if(words[i].value == "me") words[i].value = "toy"
            } 
        }else{
            //words[i].value = words[i].value.replaceAll('___', ' ');
            //words[i].value += " ";
        }
        logger.info("words: "+words.join(" "));
        //if(i>0 && words[i].tag == 'word' && words[i-1].value != '*') output += ' ';
        output += ' '+words[i].value;
    }
    output = output.replaceAll(" ,", ",");
    output = output.replaceAll(" ?", "?");
    output = output.replaceAll(" .", ".");
    output = output.replaceAll(" !", "!");


    return output.trim();
}

insertRandomToyText = function(text){
    logger.info("insertRandomToyText()");
    var snippets = [
        "please fuck toy",
        "toy loves being used",
        "toy needs cock",
        "please use toy",
        "toy has no will",
        "i am a good toy",
        "toy is so horny",
        "toy is obediant",
        "toy is happy",
        "please fuck toy"
    ];
    text = text.split(" ");
    var insertions = Math.max(1, Math.floor(Math.random()*2 + text.length/5 - 1));
    for(var i=0; i<insertions; i++){
        logger.info("\t\tInsertion #"+i);
        logger.info("\t\tText Length: "+text.length);
        var rangeMin = 0.2 + 0.8*(i*(text.length/insertions));
        var rangeMax = 0.8*(i+1)*(text.length/insertions);
        logger.info("\t\trangeMin: "+rangeMin);
        logger.info("\t\trangeMax: "+rangeMax);

        var insertPoint = Math.floor(Math.random()*(rangeMax-rangeMin)+rangeMin);
        var snippet = ("*"+pickRandom(snippets)+"*").split(" ");
        for(j=0; j<snippet.length; j++){
            text[j+insertPoint] = snippet[j];
        }
        logger.info("\t\tinsertPoint: "+insertPoint);
        logger.info("\t\tsnippet: "+snippet);
        logger.info("\t\ttext: "+text);
        //text = text.splice(insertPoint, 0, snippet);
        //text[insertPoint] += " "+snippet;
        logger.info("\t\ttext: "+text);
    }
    text = text.join(" ");
    return text;
}

rateToyText = function(text){
    //logger.info("rateToyText()");
    //logger.info("'"+text+"'");
    var goodRatings = stringSimilarity.findBestMatch(text, goodToyText);
    var closestGoodText = goodRatings.bestMatch.target;
    var closestGoodSim = goodRatings.bestMatch.rating;
    var goodStats = extractStatsFromRatings(goodRatings);
    //logger.info("Good: ("+closestGoodSim+"): "+closestGoodText);
    //logger.info(goodStats);

    var badRatings = stringSimilarity.findBestMatch(text, badToyText);
    var closestBadText = badRatings.bestMatch.target;
    var closestBadSim = badRatings.bestMatch.rating;
    var badStats = extractStatsFromRatings(badRatings);
    //logger.info("Bad: ("+closestBadSim+"): "+closestBadText);
    //logger.info(badStats);

    var output = goodStats.mean - badStats.mean + closestGoodSim - closestBadSim;
    logger.info("rateToyText(): "+ round(output, 1));
    logger.info("\t'"+text+"'");
    return output;

    //logger.info("\t\t Comparing '"+text+"' with '"+closestText+"'. (Sim:"+sim+" + Verb:"+verbosity+" = "+(sim+verbosity)+")");
}

extractStatsFromRatings = function(ratings){
    ratings = ratings.ratings;
    var result = {};
    result.min = 1;
    result.max = 0;
    result.total = 0;
    result.count = 0;
    result.mean = 0;
    for(key in ratings){
        result.min = Math.min(result.min, ratings[key].rating);
        result.max = Math.min(result.max, ratings[key].rating);
        result.total += ratings[key].rating;
        result.count++;
    }
    result.mean = result.total/result.count;
    return result;
}

function gaggedMessage(message){
    var words = message.match(/\w+|\s+|[^\s\w]+/g);
    var output = "";
    for(var i=0; i<words.length; i++){
        if(words[i]!=" " && !isLikelyEmote(words[i])){
            var variant = Math.floor((Math.random()*7));
            var choices = [
                'mnn'.split(''),
                'nnn'.split(''),
                'nng'.split(''),
                'nnf'.split(''),
                'mmf'.split(''),
                'mnf'.split(''),
                'mgh'.split('')
            ];
            var dict = pickRandom(choices);
            var newWord = "";
            for(var j=0; j<words[i].length; j++){
                var letter = words[i].substring(j, j+1);
                if(!isPunctuation(words[i].substr(j, j+1))){
                    if(j==0){
                        newWord += matchCase(dict[0], letter);
                    }else if(
                        j==words[i].length-1 || 
                        j<words[i].length-2 && isPunctuation(words[i].substr(j+1, j+2))
                    ){
                        newWord += matchCase(dict[2], letter);
                    } else{
                        newWord += matchCase(dict[1], letter);
                    }
                }else{
                    newWord += words[i].substr(j, j+1);
                }
                
                
            }
            words[i] = newWord;
        }
        output += words[i];
    }
    return output;
}

module.exports = {
    init: init,
    processToyText: processToyText,
    rateToyText: rateToyText,
    gaggedMessage: gaggedMessage
}


function pickRandom(choices){
    var pick = Math.floor((Math.random()*choices.length));
    return choices[pick];
}

function isLikelyEmote(text){
    var emotes = [
        ">//<","o//o", "@o@", "@//@",">//>", "<//<", ">o<", "^o^",
        "<//>", "<o>"
    ];
    for(var i=0; i<emotes.length; i++){
        if(stringSimilarity.compareTwoStrings(text, emotes[i])>0.75) return true;
    }
    return false;
}

function isPunctuation(word){
    word = word.trim();
    var punctuation = [".", "?", "~", "!", "(", ",", ")", "-", ";"];
    for(var i=0; i<punctuation.length; i++){
        if(word == punctuation[i]) return true;
    }
    return false;
}

function matchCase(letter, format){
    if(format == format.toUpperCase()) return letter.toUpperCase();
    else return letter.toLowerCase();
}

function round(number, places){
    return Math.round(number*Math.pow(10, places))/Math.pow(10, places);
}

fixContractions = function(message){
    message = message.replaceAll("'", "");
    message = message.replacePhrase("wont", "will not", 0.99);
    message = message.replacePhrase("wouldnt", "would not", 0.99);
    message = message.replacePhrase("isnt", "is not", 0.99);
    message = message.replacePhrase("havent", "have not", 0.99);
    message = message.replacePhrase("hadnt", "had not", 0.99);
    message = message.replacePhrase("wont", "will not", 0.99);
    message = message.replacePhrase("wasnt", "was not", 0.99);
    message = message.replacePhrase("dont", "do not", 0.99);
    message = message.replacePhrase("didnt", "did not", 0.99);
    message = message.replacePhrase("cant", "can not", 0.99);
    message = message.replacePhrase("couldnt", "could not", 0.99);
    message = message.replacePhrase("shouldnt", "should not", 0.99);
    message = message.replacePhrase("mustnt", "must not", 0.99);
    message = message.replacePhrase("wouldve'", "would have", 0.99);
    message = message.replacePhrase("shouldve'", "should have", 0.99);
    message = message.replacePhrase("couldve'", "could have", 0.99);
    message = message.replacePhrase("mightve'", "might have", 0.99);
    message = message.replacePhrase("mustve'", "must have", 0.99);
    message = message.replacePhrase("im", "i am", 0.99);
    message = message.replacePhrase("ill", "i will", 0.99);
    message = message.replacePhrase("id", "i would", 0.99);
    return message;
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

String.prototype.replaceCase = function (bef, aft) {
    var before = bef.toLowerCase();
    var after = aft.toLowerCase();
    var str = this;

    var match=function(before,after){
    after=after.split('');
    for(var i=0;i<before.length;i++)
        {

        if(before.charAt(i)==before[i].toUpperCase())
            {
            after[i]=after[i].toUpperCase();
            }
        else  if(before.charAt(i)==before[i].toLowerCase())
            {
            after[i]=after[i].toLowerCase();
            }
        return after.join('');
        }

    };
    //console.log(before,match(before,after));
    str = str.replace(before,match(before,after)); 

    return str;
};