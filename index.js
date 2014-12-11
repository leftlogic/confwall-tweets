#!/usr/bin/env node
var MongoClient = require('mongodb').MongoClient;
var JSONStream = require('JSONStream');
var fs = require('fs');
var colors = require('colors');

var expandLinks = function (tweet) {
  if (tweet === undefined) return '';

  var text = tweet.text,
      i = 0;
  if (tweet.entities) {
    // replace urls with expanded urls and let the ify shorten the link
    if (tweet.entities.urls && tweet.entities.urls.length) {
      for (i = 0; i < tweet.entities.urls.length; i++) {
        if (tweet.entities.urls[i].expanded_url) text = text.replace(tweet.entities.urls[i].url, tweet.entities.urls[i].expanded_url); // /g ?
      }
    }

    // replace media with url to actual image (or thing?)
    if (tweet.entities.media && tweet.entities.media.length) {
      for (i = 0; i < tweet.entities.media.length; i++) {
        var media = tweet.entities.media[i];
        var key = '';
        if (media.display_url) {
          key = 'display_url';
          media.display_url = 'http://' + media.display_url;
        } else if (media.media_url) {
          key = 'media_url';
        } else {
          key = 'media.expanded_url';
        }
        text = text.replace(media.url, media[key]);
      }
    }

  }

  return text;
};


var tweet = function (data) {
  if (!data.retweeted_status) {
    console.log((data.user.name + ' (@' + data.user.screen_name + ')').bold + ' ' + expandLinks(data) + '\n' + ('https://twitter.com/' + data.user.screen_name + '/status/' + data.id_str + ' @ ' + data.created_at).grey + '\n');
  }
};

var target = process.argv[2] || '';

if (target.indexOf('mongodb://') === 0 && process.argv[3]) {
  // read from mongo
  MongoClient.connect(target, function(error, db) {
    if (error) {
      throw error;
    }

    var collection = db.collection(process.argv[3]);
    // Find some documents
    var stream = collection.find().stream();

    // Execute find on all the documents
    stream.on('end', function() {
      db.close();
    });

    stream.on('data', tweet);
  });
} else if (fs.existsSync(target)) {
  fs.createReadStream(process.argv[2]).pipe(JSONStream.parse('*', tweet));
}

if (!target) {
  console.log('Usage: confwall-tweets [filename.json | mongodb://<host> <collection>]')
  process.exit(1);
}

