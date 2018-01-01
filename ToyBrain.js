var fs = require('fs');

var logger;
var sw = require('stopword');
var hash = require("string-hash")
var speakeasy = require('speakeasy-nlp');
var nlp = require('compromise');
var conjugate = require('conjugate');

var hashSize = 100;
var maps = {};
var mapFileWriting = false;

init = function(log){
    logger = log;
	if(!fs.existsSync('toybrain data')) {
		console.log('No toybrain data folder exists. Creating one now...');
		fs.mkdirSync('toybrain data');
    }

    clearMap("alpha");
    clearMap("beta");
    clearMap("omega");

    try{ readMapFile("alpha"); }catch(e){ console.log("Failed to read toybrain alpha map file.");  }
    try{ readMapFile("beta");  }catch(e){ console.log("Failed to read toybrain beta map file.");   }
    try{ readMapFile("omega"); }catch(e){ console.log("Failed to read toybrain omega map file.");  }
}

clearMap = function(type){
    maps[type] = {};
    for(var i=0; i<hashSize+2; i++){
        maps[type][i] = {};
        for(var j=0; j<hashSize+2; j++){
            maps[type][i][j] = {};
            maps[type][i][j].value = 0;
            maps[type][i][j].examples = 0;
        }
    }
}

simpleFix = function(text){
    var nlpText = nlp(text);

    if(nlpText.sentences().length>1){
        var sentences = nlpText.sentences().out('array');
        var output = "";
        for(key in sentences){
            output += simpleFix(sentences[key]) + " ";
        }
        return output.trim();
    }

    var iCount = nlpText.match('i').out('array').length + nlpText.match('toy').out('array').length;
    if(iCount>0){
        nlpText = nlpText.replace('i', 'this toy');
        var verbs = nlpText.verbs().out('array');
        for(key in verbs){
            //console.log(verbs[key]);
            nlpText.replace(verbs[key], conjugate('it', verbs[key]));
        }
        nlpText = nlpText.replace('this toy', 'toy');
        nlpText = nlpText.replace('me', 'toy');
    }
    return nlpText.normalize().out('text');;
}

hashText = function(text){
    text = text.toLowerCase().trim();
    //console.log(nlp(text).out('root'));
    //console.log(speakeasy.classify(text));
    text = text.split(' ');
    //text = sw.removeStopwords(text);
    var output = 0;
    for(var i=0; i<text.length; i++){
        text[i] = hash(text[i]) % hashSize;
    }
    text.push(hashSize);
    text.unshift(hashSize+1);
    return text;
}

learn = function(text, value, type){
    console.log("ToyBrain.learn("+text+", "+value+")");
    text = hashText(text);
    var map = maps[type];
    for(var i=0; i<text.length; i++){
        for(var j=0; j<text.length; j++){
            //console.log(text[i]+", "+text[j]);
            if(i!=j){
                var correlation = 1/(j-i);
                maps[type][text[i]][text[j]].value = (map[text[i]][text[j]].value*map[text[i]][text[j]].examples + value*correlation) / (map[text[i]][text[j]].examples + correlation);
                maps[type][text[i]][text[j]].examples += correlation;
            }
        }
    }
    writeMapFile(type);
}

writeMapFile = function(type){
    try{
        var filename = 'toybrain data/map_'+type+'.json';
        var data = JSON.stringify(maps[type]);
        fs.writeFile(filename, data, function(){
            //File done writing.
        }); 
    }catch(e){
        console.log(e);
    }
}

readMapFile = function(type){
    try{
        var filename = 'toybrain data/map_'+type+'.json';
        rawMap = fs.readFileSync(filename);  
        maps[type] = JSON.parse(rawMap);
    }catch(e){
        console.log(e);
    }
}

evaluate = function(text, type){
    text = hashText(text);
    var value = 0;
    var total = 0;
    var map = maps[type];
    for(var i=0; i<text.length; i++){
        for(var j=0; j<text.length; j++){
            if(i!=j){
                var correlation = 1/(j-i);
                value += correlation * map[text[i]][text[j]].examples * map[text[i]][text[j]].value
                total += correlation * map[text[i]][text[j]].examples;
            }
        }
    }
    return value / total;
}

Number.prototype.clamp = function(min, max) {
    return Math.min(Math.max(this, min), max);
};

module.exports = {
    init: init,
    learn: learn,
    evaluate: evaluate,
    simpleFix: simpleFix
}