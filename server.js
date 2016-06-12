var express = require('express');
var app = express();
var bodyparser = require('body-parser');
var request = require('request');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var user = process.env.USER;
var pass = process.env.PASS;

mongoose.connect('mongodb://'+user+':'+pass+'@ds013414.mlab.com:13414/barsbychickenloaft');
var db = mongoose.connection;
var nounSchema, verbSchema, adjectiveSchema;
var Nouns, Verbs, Adjectives;
var food, animal, sport;

db.once('open', function() {
  nounSchema = new Schema({
    name: String,
    type: String
  });

  verbSchema = new Schema({
    name: String,
    type: String
  });

  adjectiveSchema = new Schema({
    name: String,
    type: String
  });


  Verb = mongoose.model('verbs', verbSchema);
  Adjective = mongoose.model('adjectives', adjectiveSchema);
    // assign a function to the "methods" object of our animalSchema
  nounSchema.methods.findSimilarTypes = function (cb) {
    return this.model('nouns').find({ type: this.type }, cb);
  };
  Nouns = mongoose.model('nouns', nounSchema);
  food = new Nouns({ type: 'food' });
});

app.use(bodyparser.json());

app.get('/', function(req, res){
  res.send('hello world');
});

app.get('/webhook', function(req, res){
  if(req.query['hub.verify_token'] === process.env.VERIFY_TOKEN){
    res.send(req.query['hub.challenge']);
  }
  res.send('error');
});

app.post('/webhook', function (req, res) {
  var data = req.body;
  // Make sure this is a page subscr.iption
  if (data.object == 'page') {
    // console.log('Data Entry: '+JSON.stringify(data.entry));
    var entry = data.entry[data.entry.length-1];
    console.log('Messaging: '+JSON.stringify(entry.messaging));
    receivedMessage(entry.messaging[entry.messaging.length-1]);

    res.sendStatus(200);
  }
});

var getWordType = function(word, callback){
  // assign a function to the "methods" object of our animalSchema
  console.log('before find '+ word);
  food.findSimilarTypes(function (err, foodss) {
    console.log(foodss); // woof
  });
};

var getRhyme = function(senderID, word, callback) {
  getWordType(word, function(){


    request({
      uri: 'https://api.datamuse.com/words',
      qs:{rel_rhy: word},
      method: 'GET',
      }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          // Check to make sure there are rhymes to the last word
          if(body !== undefined && body !== null && body !== '[]'){
            var json = JSON.parse(body);
            callback(senderID, json[Math.floor(Math.random()*(json.length-1))].word);
          }
        } else {
          console.error("Unable to get rhyme.");
          console.error(response);
          console.error(error);
        }
      });


  });

}

// Callback function when rhyme has been retrieved
var sendRhymeToUser = function(senderID, rhyme) {
  console.log('rhyme: ' + rhyme);

  var json = {
    recipient: { id: senderID },
    message: { text: rhyme }
  }

  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
    method: 'POST',
    json: json
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("Successfully sent rhyme to user");
    } else {
      console.error("Unable to send message.");
    }
  });
};

function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  if (message && message.text) {
    var messageText = message.text;
    var stringArray = messageText.split(" ");
    var lastWord = stringArray[stringArray.length-1];
    var wordCount = stringArray.length-1;

    console.log("Received message for user %d and page %d at %d with message: "+messageText,
    senderID, recipientID, timeOfMessage);

    // This will get rhyme from datamuse and call callback sendRhymeToUser
    getRhyme(senderID, lastWord, sendRhymeToUser);
  } else {
    console.error('damn dawg');
  }
}

app.listen(process.env.PORT);
