ninthlink marketing plumbing analysis tool (nlkmpat)
====================================================

Analyze the marketing plumbing of a URL using phantomjs webserver module. Originally based off of https://github.com/benfoxall/phantomjs-webserver-example

## Running

### Heroku

http://mpa-dev.ninthlink.agency/ aka http://nlkmpat-dev.herokuapp.com/

![heroku screenshot](https://raw.github.com/chousmith/nlkmpat/master/screenshot.png)

### Command line via phantomjs

```bash
phantomjs server.js
```

#### Command Line Arguments

```bash
phantomjs server.js buffer=2000 debug=true
```

Setting `buffer` = some number will change the `BUFFER_TIME` variable amount of time that the script waits after initial `page.onLoadFinished` to actually loop through and track and process all the resources logged.

Setting `debug=true` will turn `DEBUG` mode and extra robust messaging on from the cmd line

## Deploying

This can be deployed to heroku with the [phantomjs buildpack](https://github.com/stomita/heroku-buildpack-phantomjs).

```bash
# create a new heroku app
heroku create --stack cedar --buildpack http://github.com/stomita/heroku-buildpack-phantomjs.git

# deploy
git push heroku master
```

and then?
