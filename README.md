# How to imports Tweets into Mastodon (e.g. https://framapiaf.org )

#### Ask twitter for a data export

Go [here](https://twitter.com/settings/your_twitter_data).

#### Extract archive and look for `tweet.js`

#### Clone this repo and run

```
git clone git@github.com:FGRibreau/import-tweets-to-mastodon.git
cd import-tweets-to-mastodon
npm install
MASTODON_API_BASEPATH=https://mastodon-instance.com MASTODON_API_KEY=YOUR_TOKEN TWITTER_TWEETJS_FILEPATH=/path/to/tweet.js node import.js
```

Tips: add the `DEBUG=*` environment variable for verbose output.

:tada:

#### Need help?

- This project is open-sourced as is. 
- I won't do support for free.
- If you really want support please consider [sponsoring me](https://github.com/sponsors/FGRibreau) :+1:
