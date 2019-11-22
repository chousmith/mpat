Plumming : marketing plumbing analysis tool
====================================================

Quick tool to analyze the "marketing plumbing" of a URL, based off the [phantomjs webserver module example](https://github.com/benfoxall/phantomjs-webserver-example).

## Running via Heroku free

Go to https://plumming.herokuapp.com/ to get started.

![heroku screenshot](https://raw.github.com/chousmith/plumming/master/screenshot.png)

## Marketing Plumbing Analysis

The tool uses [PhantomJS](https://github.com/ariya/phantomjs) to spin up a headless web browser instance. Then when you provide a URL for analysis, the headless browser loads that web page and looks at all of the requests that stem from it:

1. The tool through PhantomJS generates a screenshot of the URL.
1. Page Title via ``<title>...</title>`` tag is listed
1. A Timer starts, and Page Load Time is calculated, tracking Time to document.ready, but maybe it is time to first paint?
1. By looking at all subsequent requests the page generates, the tool looks for loading of a few specific pieces:
    1. If [Google Tag Manager](https://tagmanager.google.com/) is found, the page outputs the GTM container ID as well.
    1. If [Google Analytics](https://marketingplatform.google.com/about/analytics/) is found, the page outputs the first UA code found as well.
    1. If [Hotjar](https://www.hotjar.com/) script is found, the page outputs the Hotjar tracking ID as well.
    1. If a [Facebook Pixel](https://business.facebook.com/) is found, the page outputs the Facebook Pixel ID as well.
    1. If [Visual Website Optimizer (VWO)](https://vwo.com/) code is found, the page outputs that ID as well.
1. During page load, the tool looks at the HTML for the page and tracks all of the Links found on the page.
1. At the end, provides additional links to review the provided URL in other systems:
    1. [GTmetrix](https://gtmetrix.com/)
    1. [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/sharing/)
    1. [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
    1. [Google Structured Data Testing Tool](https://search.google.com/structured-data/testing-tool/)

Results are loaded on the page, and subsequent tests load above previous results for easy comparison.

## Running via Command Line with PhantomJS

[Download PhantomJS](https://github.com/ariya/phantomjs#features), git clone this code repo, and then run the [plumming/server.js](https://github.com/chousmith/plumming/blob/master/server.js)

```bash
phantomjs server.js
```

#### Command Line Arguments

```bash
phantomjs server.js buffer=2000 debug=true
```

Setting `buffer` = some number will change the `BUFFER_TIME` variable amount of time that the script waits after initial `page.onLoadFinished` to actually loop through and track and process all the resources logged.

Setting `debug=true` will turn `DEBUG` mode and extra robust messaging on from the cmd line

## Deploying to Heroku

This repo can be deployed to Heroku with the [PhantomJS buildpack by stomita](https://github.com/stomita/heroku-buildpack-phantomjs).

```bash
# create a new heroku app
heroku create --stack cedar --buildpack http://github.com/stomita/heroku-buildpack-phantomjs.git

# deploy
git push heroku master
```
