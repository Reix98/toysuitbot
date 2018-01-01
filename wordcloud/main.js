
var fs = require('fs');
var natural = require('natural');
tokenizer = new natural.TreebankWordTokenizer();
var brain = require('brain');
var net = new brain.NeuralNetwork();

var exampleList = [];
var wordList = [];

readFiles('data/', function(content){
    loadText(content);
})

net.train([
    {input: { r: 0.03, g: 0.7}, output: { black: 1 }},
    {input: { r: 0.16, g: 0.09, b: 0.2 }, output: { white: 1 }},
    {input: { r: 0.5, g: 0.5, b: 1.0 }, output: { white: 1 }}
]);

var output = net.run({ r: 1, g: 0.4, b: 0 });  // { white: 0.99, black: 0.002 }

console.log(output);

function readFiles(dirname, onFileContent) {
    fs.readdir(dirname, function(error, filenames) {
        if(error) console.log(error);
        filenames.forEach(function(filename) {
            fs.readFile(dirname + filename, 'utf-8', function(error, content) {
                if(error) console.log(error);        
                onFileContent(content);
            });
        });
    });
}

function loadText(content){
    content = content.split('\n');
    for(key in content){
        var text = content[key].toLowerCase().trim();
        text = tokenizer.tokenize(text);
        for(key in text){
            addWord(text[key]);
        }
    }
}

function addWord(word){
    if(wordList.indexOf(word) == -1)
        wordList.push(word);
}