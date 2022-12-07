const debug = require('debug')('import');
const axios = require('axios');
const env = require('common-env/withLogger')(console);
const config = env.getOrElseAll({
  mastodon: {
    api: {
      key: {
        $type: env.types.String,
      },
      basePath: {
        $type: env.types.String,
      }
    }
  },
  twitter: {
    excludeReplies: true,
    year: new Date().getFullYear(),
    tweetjs: {
      filepath: {
        $type: env.types.String
      },
    }
  }
});
function getTweets() {
  const vm = require('vm');
  const fs = require('fs');
  const _global = {
    window: {
      YTD: {
        tweets: {
          part0: {}
        }
      }
    }
  };
  debug('Loading tweets...')
  const script = new vm.Script(fs.readFileSync(config.twitter.tweetjs.filepath, 'utf-8'));
  const context = vm.createContext(_global);
  script.runInContext(context);

  const tweets = Object.keys(_global.window.YTD.tweets.part0).reduce((m, key, i, obj) => {
    return m.concat(_global.window.YTD.tweets.part0[key].tweet);
  }, []).filter(_keepTweet)

  debug('Loading %s tweets...', tweets.length);

  function _keepTweet(tweet) {
    if (!tweet.created_at.endsWith(config.twitter.year)) {
      return false;
    }

    if (!config.twitter.excludeReplies) {
      return true;
    }

    return !tweet.full_text.startsWith('@');
  }

  return tweets;
}
function importTweets(tweets) {
  const progress = require('progressbar').create().step('Importing tweets');
  const max = tweets.length;

  progress.setTotal(max);

  function next() {
    const tweet = tweets.pop();
    let current = 0;
    if (!tweet) {
      debug('Tweets import completed');
      return;
    }
    createMastodonPost({
      apiToken: config.mastodon.api.key,
      baseURL: config.mastodon.api.basePath
    },{
      status: replaceTwitterUrls(tweet.full_text,tweet.entities.urls),
      language: tweet.lang
    }).then((mastodonPost) => {
      debug('%s/%i Created post %s', current, max, mastodonPost.url);
      progress.addTick();
      next();
    }).catch(err => {
      console.log(err);
    });
  }
}
function replaceTwitterUrls(full_text, urls) {
  urls.forEach(url => {
    full_text=full_text.replace(url.url,url.expanded_url);
  });
  return full_text;
}

async function createMastodonPost({
  apiToken,
  baseURL
}, {
  status,
  language
}) {
  return await axios({
    url: '/api/v1/statuses',
    baseURL: baseURL,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiToken
    },
    data: {
      status,
      language,
      visibility: "public"
    }
  }).then(function(response) {
    return response.data
  });
}
importTweets(getTweets());
