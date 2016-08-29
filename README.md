ninthlink marketing plumbing analysis tool (nlkmpat)
====================================================

Analyze the marketing plumbing of a URL using phantomjs webserver module. Originally based off of https://github.com/benfoxall/phantomjs-webserver-example

## Running

### Heroku

https://nlkmpat-dev.herokuapp.com/

![heroku screenshot](https://raw.github.com/chousmith/phantomjs-webserver-example/master/screenshot.png)

### Command line via phantomjs

```bash
phantomjs server.js
```

## Deploying

This can be deployed to heroku with the [phantomjs buildpack](https://github.com/stomita/heroku-buildpack-phantomjs).

```bash
# create a new heroku app
heroku create --stack cedar --buildpack http://github.com/stomita/heroku-buildpack-phantomjs.git

# deploy
git push heroku master
```

and then?
