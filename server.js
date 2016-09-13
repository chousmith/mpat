
var server = require('webserver').create(),
	system = require('system'),
	args = system.args,
	fs     = require('fs'),
	port   = system.env.PORT || 8080,
	firedonce = false,
	// not used right now : how long to wait for page before exit (in ms)
	//WAIT_TIME = 5000,
	// how long after page "load" to output our summary?
	BUFFER_TIME = 3000,
	// not used right now : if page hasn't loaded yet, something's wrong?
	//MAX_EXECUTION_TIME = 15000,
	// whether to output extra robust logging or not, really
	DEBUG = false;

// look for args in case we are running this in the cmd line
var argl = args.length;
if ( argl > 1 ) {

	// console.log('hello! heres some args');
	// console.log(args);

	var argex = '';
	while ( argl-- ) {
		if ( argl >= 0 ) {
			argex = args[ argl ].split('=');
			// console.log('' + argl +' : ');
			// console.log( argex );
			if ( argex.length > 1 ) {
				// then the arg was something=something, so look it up
				switch( argex[0] ) {
					case 'buffer':
						BUFFER_TIME = parseInt( argex[1], 10 );
						console.log( 'BUFFER_TIME set to buffer='+ BUFFER_TIME );
						break;
					case 'debug':
						DEBUG = ( argex[1] == 'true' );
						console.log( 'DEBUG set to debug='+ ( DEBUG ? 'true' : 'false' ) );
						break;
					default:
						console.log( 'oops! you tried to pass an arg that i didnt quite understand. try debug=true or buffer=2000' );
						console.log( 'in the meantime, starting anyways. to cancel, press Ctrl+C or ^C or whatever at any time' );
						break;
				}
			}
		}
	}
}


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
		//console.log('this is a GET or at least not a POST');
		console.log( JSON.stringify( request.url ) );

		if ( request.method == 'GET' ) {
			if ( request.url == '/' ) {
				response.statusCode = 200;
				response.setHeader('Content-Type', 'text/html; charset=utf-8');
				response.write(fs.read('index.html'));
			} else if ( request.url == '/favicon.ico' ) {
				response.statusCode = 200;
				response.setHeader('Content-Type', 'image/x-icon');
			  response.setEncoding("binary");
				var image = fs.open("favicon.ico", "rb");
  			var data = image.read();
			  response.write(data);
			} else {
				// return an error
				response.statusCode = 404;
				response.setHeader('Content-Type', 'text/html; charset=utf-8');
				response.write(fs.read('oops.html'));
			}
		} else {
			// return an error
			response.statusCode = 404;
			response.setHeader('Content-Type', 'text/html; charset=utf-8');
			response.write(fs.read('oops.html'));
		}

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
		console.log('--------------------------------------------------');
		console.log('loading: ' + url);
	};

	page.onLoadFinished = function (status) {
		console.log('loaded: ' + url);
		console.log('--------------------------------------------------');

		  if ( !firedonce ) {
		    var properties = {};

				// set our original time we started at
				properties.timestamp = t;
				// change t to be the diff time it took
				t = Date.now() - t;

				// grab the page title
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
					var dt = new Date( properties.timestamp );
					console.log( 'Report generated: '+ dt.toLocaleString() );
		      console.log( 'Page loaded in '+ ( t/1000 ) +' seconds with Status = '+ status );
		      console.log( '--------------------------------------------------' );
		      if ( DEBUG ) {
		        console.log('Then we waited '+ (BUFFER_TIME/1000) +' seconds to output this summary..');
		        //console.log('resources_summary_key ::' + JSON.stringify(resources_summary_key));
		      }

					var emsg = '';
		      for( var i in resources_summary ) {
		        if ( DEBUG ) {
		          console.log('* '+ resources_summary[i][0] + ' : '+ resources_summary[i][1].length );

							// in the case of debug, output it all?
							// if ( resources_summary[i][1].length > 0 ) {
							// 	for ( var s in resources_summary[i][1] ) {
							// 		console.log( resources_summary[i][1][s] )
							// 	}
							// }
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
										if ( resources_summary[i][1][s] == 'https://www.google-analytics.com/analytics.js' ) {
											resource_checks[1]['value'] = 'Loaded, but maybe missing a UA code?';
										} else {
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
								if ( resources_summary[i][1].length == 0 ) {
									emsg = 'No Facebook found?';
									console.log( emsg );
									resource_errors.unshift( emsg );
								} else {
									// try to extract fb id from 1 pixel?
									var fbat = resources_summary[i][1][0];
									fbat = fbat.indexOf('?id=');
									if ( fbat > 0 ) {
										fbat = resources_summary[i][1][0].substr( fbat + 4 );
										// and trim off the rest
										fbat = fbat.substr( 0, fbat.indexOf('&') );
									} else {
										fbat = '... something ...'; //resources_summary[i][1].length;
									}
									console.log('Facebook Pixel found, with ID = '+ fbat );
									resource_checks[3]['value'] = fbat;
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

					page.close();

					callback(properties,imageuri);
		    }, BUFFER_TIME );
		  }
		  firedonce = true;
		  // and then?
	};
	// manually clear cache just in case
	page.clearMemoryCache();
	// wrap page.open in setTimeout to try and fix a crash bug?!
	setTimeout( function() {
		// reset our t counter
		t = Date.now();
		// and now that alllll that is set up, actually load the url
		page.open(url);
	}, 200 );
}
