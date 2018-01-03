
var fs = require('fs');
var natural = require('natural');
tokenizer = new natural.TreebankWordTokenizer();
var NGrams = natural.NGrams;
var brain = require('brain');
var net = new brain.NeuralNetwork();

var exampleList = [];
var wordList = [];

console.log("Reading data files...");
readFiles('data/', function(content){
    console.log("Data file read.");
    loadText(content);
    console.log("Data file loaded into examples.");
}, function(){
    exampleList = exampleList.slice(0, 100);
    console.log(exampleList.length+" examples loaded.");
    console.log("All files read and loaded into examples. Training net.");
    net.train(exampleList);
    console.log("Net fully trained.");
    var prompt = {"[start]": 0.25, "this": 0.5, "is":0.75, "a":1};
    var output = net.run(prompt);
    var sortableOutput = [];
    for(key in output){
        sortableOutput.push([key, output[key]]);
    }

    sortableOutput.sort(function(a, b) {
        return a[1] - b[1];
    });

    console.log(sortableOutput);

});

/*
net.train([
    {input: { r: 0.03, g: 0.7}, output: { black: 1 }},
    {input: { r: 0.16, g: 0.09, b: 0.2 }, output: { white: 1 }},
    {input: { r: 0.5, g: 0.5, b: 1.0 }, output: { white: 1 }}
]);

var output = net.run({ r: 1, g: 0.4, b: 0 });  // { white: 0.99, black: 0.002 }
console.log(output);
*/


function readFiles(dirname, onFileContent, onComplete) {
    fs.readdir(dirname, function(error, filenames) {
        if(error) console.log(error);
        var completed = 0;
        var total = filenames.length;
        filenames.forEach(function(filename) {
            fs.readFile(dirname + filename, 'utf-8', function(error, content) {
                if(error) console.log(error);        
                onFileContent(content);
                completed++;
                if(completed >= total){
                    onComplete();
                }
            });
        });
    });
}

function loadText(content){
    content = content.split('\n');
    for(key in content){
        var text = content[key].toLowerCase().trim();
        textTokens = tokenizer.tokenize(text);
        for(key in textTokens){
            //addWord(textTokens[key]);
        }
        if(textTokens.length>3){
            var grams = NGrams.ngrams(text, 4, '[start]', '[end]');
            for(key in grams){
                var gram = grams[key];
                addExample(gram);
            }
        }
    }
}

function addExample(gram){
    var example = {};
    example.input = {};
    for(var i=0; i<gram.length-1; i++){
        example.input[gram[i]] = (i+1)/(gram.length-1);
    }
    example.output = {};
    example.output[gram[gram.length-1]] = 1;
    exampleList.push(example);
}

function addWord(word){
    if(wordList.indexOf(word) == -1)
        wordList.push(word);
}