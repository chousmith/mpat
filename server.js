var server = require('webserver').create(),
	system = require('system'),
	fs     = require('fs'),
	port   = system.env.PORT || 8080,
	firedonce = false,
	// how long should we wait for the page to load before we exit (in ms)
	WAIT_TIME = 5000,
	// how long after page "load" to output our summary?
	BUFFER_TIME = 1000,
	// if the page hasn't loaded yet, something is probably wrong
	MAX_EXECUTION_TIME = 15000,
	// whether to output extra robust logging or not, really
	DEBUG = false;

// a list of regular expressions of resources (urls) to log when we load them
var resources_to_log = [
  [ new RegExp('.ttf'), 'font' ],
  [ new RegExp('.otf'), 'font' ],
  [ new RegExp('.png'), 'img' ],
  [ new RegExp('.jpg'), 'img' ],
  [ new RegExp('.jpeg'), 'img' ],
  [ new RegExp('.gif'), 'img' ],
  [ new RegExp('.js'), 'js' ],
  [ new RegExp('.css'), 'css' ],
  [ new RegExp('^https://www.facebook.com/tr/*'), 'fb' ],
  [ new RegExp('^http://dev.visualwebsiteoptimizer.com*'), 'vwo' ],
  [ new RegExp('^https://dev.visualwebsiteoptimizer.com*'), 'vwo' ],
  [ new RegExp('^http://static.hotjar.com/c/hotjar*'), 'hotjar' ],
  [ new RegExp('^https://static.hotjar.com/c/hotjar*'), 'hotjar' ],
  [ new RegExp('^http(s)?://(www|ssl)\.google-analytics\.com.*'), 'ga' ],
  [ new RegExp('^http(s)?://stats\.g\.doubleclick\.net.*'), 'ga' ],
  [ new RegExp('^http://www.googletagmanager.com*'), 'gtm' ],
  [ new RegExp('^https://www.googletagmanager.com*'), 'gtm' ]
];

var service = server.listen(port, function(request, response) {

	if(request.method == 'POST' && request.post.url){
		var url = request.post.url;

		request_page(url, function(properties, imageuri){
			response.statusCode = 200;
			response.write(JSON.stringify(properties));
			response.write("\n");
			response.write(imageuri);
			response.close();
		})

	} else {
		response.statusCode = 200;
		response.setHeader('Content-Type', 'text/html; charset=utf-8');
		response.write(fs.read('index.html'));
		response.close();
	}

});

if(service) console.log("server started - http://localhost:" + server.port);

function request_page(url, callback){

	var page = new WebPage();
	page.clipRect = { top: 0, left: 0, width: 1015, height: 580 };
	page.viewportSize = { width: 1015, height: 580 };

	// cache the current timestamp for time tracking fun
	var t = Date.now();

	// reset our firedonce catch
	firedonce = false;

	// reset our resources?
	var resources_summary = [
	  ['gtm', []],
	  ['ga', []],
	  ['hotjar', []],
	  ['vwo', []],
	  ['fb', []],
	  ['css', []],
	  ['js', []],
	  ['img', []],
	  ['font', []]
	];
	var resources_summary_key = {};
	var resource_checks = [{ name: 'Google Tag Manager (GTM)' }, { name: 'Google Analytics (GA)' }, { name: 'Hotjar' }, { name: 'Facebook Pixel' }, { name: 'Visual Website Optimizer (VWO)' }];
	var resource_errors = [];
	// dynamically generate our quick key store hash something
	var l = resources_summary.length;
	while(l--) {
	  resources_summary_key[resources_summary[l][0]] = l;
	}

	// create a function that is called every time a resource is requested
	// http://phantomjs.org/api/webpage/handler/on-resource-requested.html
	page.onResourceRequested = function(requestData, networkRequest) {
	  //console.log('Request (#' + requestData.id + '): ' + JSON.stringify(requestData));
	  if (DEBUG) {
	    console.log('Request (#' + requestData.id + '): ' + requestData.url);
	  }

	  // loop round all our regexs to see if this url matches any of them
	  var length = resources_to_log.length;
	  while(length--) {
	    if (resources_to_log[length][0].test(requestData.url)){
	      // we have a match, log it
	      var matchtype = resources_to_log[length][1];

	      if (DEBUG) {
	        console.log('###');
	        console.log('Found a '+ matchtype +' resources_to_log match');
	        console.log(requestData.url);
	        console.log('###');
	      }

	      resources_summary[ resources_summary_key[ matchtype ] ][1].push(requestData.url);
	    }
	  }
	};

	page.onLoadStarted = function () {
		console.log('loading:' + url);
	};

	page.onLoadFinished = function (status) {
		console.log('loaded:' + url);

		  if ( !firedonce ) {
		    t = Date.now() - t;

				var properties = {};

				properties.title = page.evaluate(function () {
				return document.title
				});

				// populate links array
				properties.links = page.evaluate(function () {
				return Object.keys(
						[].reduce.call(
							document.querySelectorAll('a'),
							function(memo, a){
								if ( ( a.protocol.indexOf('http') === 0 ) || ( a.protocol.indexOf('tel') === 0) ) {
									memo[a.href] = true;
								}
								return memo;
							}
						,{})
					)
				});

				// calculate link areas
				properties.link_areas = page.evaluate(function () {
				var sizes = [].reduce.call(document.querySelectorAll('a'), function(memo, a){
					var bb = a.getBoundingClientRect(),
						area = bb.width * bb.height,
						href = a.getAttribute('href');

					// update the map
					if(area){
						memo[href] = (memo[href] || 0) + area;
					}

					return memo;
				},{});

				return Object.keys(sizes).map(function(url){
					return [url, sizes[url]];
				});
				});

		    setTimeout( function() {
		      console.log('Page loaded in '+ ( t/1000 ) +' seconds with Status = '+ status );
		      console.log('--------------------------------------------------');
		      if ( DEBUG ) {
		        console.log('Then we waited '+ (BUFFER_TIME/1000) +' seconds to output this summary..');
		        console.log('resources_summary_key ::' + JSON.stringify(resources_summary_key));
		      }

					var emsg = '';
		      for( var i in resources_summary ) {
		        if ( DEBUG ) {
		          console.log('* '+ resources_summary[i][0] + ' : '+ resources_summary[i][1].length );
		        }
		        switch ( resources_summary[i][0] ) {
		          case 'gtm':
		            if ( resources_summary[i][1].length == 0 ) {
		              emsg = 'No Google Tag Manager found?';
									console.log( emsg );
									resource_errors.unshift( emsg );
		            } else {
		              for ( var s in resources_summary[i][1] ) {
		                if ( DEBUG ) {
		                  console.log( resources_summary[i][1][s] );
		                }
		                // search each for an id
		                var gtmd = resources_summary[i][1][s];
										gtmd = gtmd.substr( gtmd.lastIndexOf('-') + 1 );
		                // do we care about extra args there?
		                console.log('Google Tag Manager found, with '+ gtmd );
										resource_checks[0]['value'] = gtmd;
		              }
		            }
		            //https://www.googletagmanager.com/gtm.js?id=GTM-PGQC7X
		            break;
		          case 'ga':
		            if ( resources_summary[i][1].length == 0 ) {
		              emsg = 'No Google Analytics found?';
									console.log( emsg );
									resource_errors.unshift( emsg );
		            } else {
		              for ( var s in resources_summary[i][1] ) {
		                if ( DEBUG ) {
		                  console.log( resources_summary[i][1][s] );
		                }
		                // search each for a tid
		                var tidat = resources_summary[i][1][s].indexOf('&tid=');
		                if ( tidat > 0 ) {
		                  var nextt = resources_summary[i][1][s].indexOf('&', tidat + 1);
		                  nextt = resources_summary[i][1][s].substr( tidat, nextt - tidat );
											nextt = nextt.substr(5);
		                  console.log('Google Analytics found, with '+ nextt );
											resource_checks[1]['value'] = nextt;
		                }
		              }
		            }
		            break;
		          case 'hotjar':
		            if ( resources_summary[i][1].length == 0 ) {
		              emsg = 'No Hotjar found?';
									console.log( emsg );
									resource_errors.unshift( emsg );
		            } else {
		              for ( var s in resources_summary[i][1] ) {
		                if ( DEBUG ) {
		                  console.log( resources_summary[i][1][s] );
		                }
		                if ( resources_summary[i][1][s].substr(0, 35) == 'https://static.hotjar.com/c/hotjar-' ) {
		                  var jsat = resources_summary[i][1][s].indexOf('.js');
											jsat = resources_summary[i][1][s].substr( 35, jsat - 35 );
		                  console.log('Hotjar found, with ID = '+ jsat );
											resource_checks[2]['value'] = jsat;
		                } else if ( resources_summary[i][1][s].substr(0, 34) == 'http://static.hotjar.com/c/hotjar-' ) {
		                  var jsat = resources_summary[i][1][s].indexOf('.js');
											jsat = resources_summary[i][1][s].substr( 34, jsat - 34 );
		                  console.log('Hotjar found, with ID = '+ jsat );
											resource_checks[2]['value'] = jsat;
		                }
		              }
		            }
		            break;
		          case 'vwo':
		            if ( resources_summary[i][1].length == 0 ) {
		              emsg = 'No Visual Website Optimizer found?';
									console.log( emsg );
									resource_errors.unshift( emsg );
		            } else {
		              for ( var s in resources_summary[i][1] ) {
		                if ( DEBUG ) {
		                  console.log( resources_summary[i][1][s] );
		                }
		                var jpat = resources_summary[i][1][s].indexOf('j.php');
		                if ( jpat > 0 ) {
		                  var aat = resources_summary[i][1][s].indexOf('?a=', jpat);
		                  if ( aat < 0 ) {
		                    aat = resources_summary[i][1][s].indexOf('&a=', jpat);
		                  }
		                  // then try again
		                  if ( aat > 0 ) {
		                    aat = resources_summary[i][1][s].substr( aat + 3 );
		                    jpat = aat.indexOf('&');
		                    if ( jpat > 0 ) {
		                      aat = aat.substr(0, jpat);
		                    }
		                    console.log('Visual Website Optimizer found, with ID = '+ aat );
												resource_checks[4]['value'] = aat;
		                  }
		                }
		              }
		            }
		            break;
							case 'fb':
		            console.log( resources_summary[i][1].length +' '+ resources_summary[i][0] +' file'+ ( resources_summary[i][1].length > 1 ? 's' : '' ) );
		            if ( DEBUG ) {
		              if ( resources_summary[i][1].length > 0 ) {
		                for ( var s in resources_summary[i][1] ) {
		                  console.log( resources_summary[i][1][s] )
		                }
		              }
		            }
								if ( resources_summary[i][1].length == 0 ) {
									emsg = 'No Facebook found?';
									console.log( emsg );
									resource_errors.unshift( emsg );
								} else {
									resource_checks[3]['value'] = '... something ...'; //resources_summary[i][1].length;
								}
							  break;
		          case 'font':
		            console.log( resources_summary[i][1].length +' '+ resources_summary[i][0] +' file'+ ( resources_summary[i][1].length > 1 ? 's' : '' ) );
		            if ( DEBUG ) {
		              if ( resources_summary[i][1].length > 0 ) {
		                for ( var s in resources_summary[i][1] ) {
		                  console.log( resources_summary[i][1][s] )
		                }
		              }
		            }
								// resource_checks[ resources_summary[i][0] ] = resources_summary[i][1].length;
		            break;
		          default:
		            //if ( ! DEBUG ) {
		            console.log( resources_summary[i][1].length +' '+ resources_summary[i][0] +' file'+ ( resources_summary[i][1].length > 1 ? 's' : '' ) );
								// resource_checks[ resources_summary[i][0] ] = resources_summary[i][1].length;
		            //}
		            break;
		        }
		      }
					properties.pageloadtime = ( t / 1000 );
					
					properties.resources = { checks: resource_checks, errors: resource_errors };
					//properties.resources_summary = resources_summary;

					var imageuri = 'data:image/png;base64,' + page.renderBase64('png');

					callback(properties,imageuri);

					page.close();
		    }, BUFFER_TIME );
		  }
		  firedonce = true;
		  // and then?
	};

	page.open(url);
}
