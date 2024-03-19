/* eslint-disable */
require('../../index');
require('../../test');
// API routing
// WebSocket routing + WebSocketClient (text, json and binary communication)
// File routing
// Removing routess

F.console = NOOP;

// load web server and test app
F.run({ release: false });

var url = 'http://0.0.0.0:8000';


ON('error', function(e) {
	console.log(e);
	//process.exit(1);
});

ON('ready', function () {

	Test.push('HTTP Routing - Basics', function (next) {
		MAIN.items && MAIN.items.wait(function (item, n) {
			RESTBuilder.GET(url + item.url).exec(function (err, res, output) {
				res = output.response;
				Test.print('Routes - Params {0}'.format(item.url), res !== item.res ? 'TEST {0} failed'.format(item.url) : null);
				n();
			});
		}, function () {
			next();
		});
	});


	Test.push('HTTP METHODS', function (next) {
		var methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
		methods.wait(function (method, next_fn) {
			RESTBuilder[method](url + '/methods/').exec(function (err, response) {
				Test.print('HTTP Routing -  methods ({0})'.format(method), err === null && response.success ? null : method + ' method failed');
				next_fn();
			});
		}, function () {
			next();
		});
	});

	Test.push('Middleware', function (next) {
		var arr = [];
		arr.push(function (next) {
			RESTBuilder.GET(url + '/middleware/success/').exec(function (err, res) {
				Test.print('Route Middleware - success', err === null && res && res.success === true ? null : 'Expecting success');
				next();
			});
		});

		arr.push(function (next) {
			RESTBuilder.GET(url + '/middleware/invalid/').exec(function (err, res) {
				Test.print('Route Middleware - invalid', err &&  err.status === 400 ? null : 'Expecting error');
				next();
			});
		});

	
		// arr.push(function (next) {
		// 	RESTBuilder.GET(url + '/middleware/fuse/').exec(function (err, res) {
		// 		Test.print('Route Middleware - F.use', err === null && res && res.success ? null : 'Expecting success');
		// 		console.timeEnd(subtest_log);
		// 		next();
		// 	});
		// });

		arr.async(function () {
			next();
		})
	});

	Test.push('HTTP Routing - Authorization', function (next) {
		var arr = [];

		arr.push(function (next_fn) {
			var token = 'token123';
			RESTBuilder.GET(url + '/xtoken').header('x-token', token).exec(function (err, res) {
				Test.print('X - Token ', err === null && res && res.value === token ? null : 'Expected value to be ' + token);
				next_fn();
			});
		});

		arr.push(function (next_fn) {
			RESTBuilder.GET(url + '/auth').cookie('auth', 'correct-cookie').exec(function (err, res, output) {
				Test.print('Authorized user', output.status === 200 && err === null && res && res.value === '123' ? null : 'Expected authorized user id (123)');
				next_fn();
			});
		});

		arr.push(function (next_fn) {
			RESTBuilder.GET(url + '/auth').cookie('auth', 'wrong-cookie').exec(function (err, res, output) {
				Test.print('Unauthorized user', output.status === 200 && err === null && res && !res.value ? null : 'Expected no value');
				next_fn();
			});
		});

		arr.push(function (next_fn) {
			RESTBuilder.GET(url + '/auth/authorized/').cookie('auth', 'correct-cookie').exec(function (err, res, output) {
				Test.print('Authorized route - Authorized user', output.status === 200 && err === null && res && res.value === '123' ? null : 'Expected authorized user id (123)');
				next_fn();
			});
		});

		arr.push(function (next_fn) {
			RESTBuilder.GET(url + '/auth/authorized/').cookie('auth', 'wrong-cookie').exec(function (err, res, output) {
				Test.print('Unauthorized route - Unauthorized user', output.status === 401 && res && !res.value ? null : 'Expected no value');
				next_fn();
			});
		});

		arr.async(function () {
			next();
		})
	});

	Test.push('HTTP Routing - Internal routing', function (next) {
		var arr = [];

		arr.push(function (next_fn) {
			RESTBuilder.GET(url + '/not/existing').exec(function (err, res) {
				Test.print('Internal Routing - 404', err === null  && res.status === 404 && res.value === 'Not found' ? null : 'Expected 404 error code');
				next_fn();
			});
		});

		arr.push(function (next_fn) {
			RESTBuilder.GET(url + '/internal/503').exec(function (err, res) {
				Test.print('Internal Routing - 503', err === null && res && res.status === 503 && res.value === 'Server Error');
				next_fn();
			});
		});

		arr.push(function (next_fn) {
			RESTBuilder.GET(url + '/internal/408').exec(function (err, res) {
				Test.print('Internal Routing - 408', err === null  && res.status === 408 && res.value === 'Request Timeout' ? null : 'Expected 408 error code');
				next_fn();
			});
		});
	
		arr.async(function () {
			next();
		})
	});

	Test.push('HTTP Routing - wildcard', function (next) {
		var arr = [];
		var path;
		arr.push(function (next) {
			path = '/wildcards';
			RESTBuilder.POST(url + path).exec(function (err, res) {
				Test.print('HTTP Routing - Wildcards ' + path, err === null && res.success && res.value === 1 ? null : 'Assertion failed');
				next();
			});
		});

		arr.push(function (next) {
			path = '/wildcards/wild';
			RESTBuilder.POST(url + path).exec(function (err, res) {
				Test.print('HTTP Routing - Wildcards ' + path, err === null && res.success && res.value === 1 ? null : 'Assertion failed');
				next();
			});
		});

		arr.push(function (next) {
			path = '/wildcards/wild/wild/wild';
			RESTBuilder.POST(url + path).exec(function (err, res) {
				Test.print('HTTP Routing - Wildcards ' + path, err === null && res.success && res.value === 1 ? null : 'Assertion failed');
				next();
			});
		});

		arr.push(function (next) {
			path = '/wildcards/wild/wild';
			RESTBuilder.POST(url + path).exec(function (err, res) {
				Test.print('HTTP Routing - Wildcards ' + path, err === null && res.success && res.value === 1 ? null : 'Assertion failed');
				next();
			});
		});

		arr.push(function (next) {
			path = '/wildcards/wild/wild/wild';
			RESTBuilder.POST(url + path).exec(function (err, res) {
				Test.print('HTTP Routing - Wildcards ' + path, err === null && res.success && res.value === 1 ? null : 'Assertion failed');
				next();
			});
		});

		arr.push(function (next) {
			path = '/wildcards/second/arg1/arg2/wild';
			RESTBuilder.POST(url + path).exec(function (err, res) {
				Test.print('HTTP Routing - Wildcards ' + path, err === null && res.success && res.value === 5 ? null : 'Assertion failed');
				next();
			});
		});

		arr.push(function (next) {
			path = '/wildcards/overwrite';
			RESTBuilder.POST(url + path).exec(function (err, res) {
				Test.print('HTTP Routing - Wildcards Overwrite ' + path, err === null && res.success && res.value === 2 ? null : 'Assertion failed');
				next();
			});
		});

		arr.push(function (next) {
			path = '/wildcards/overwrite/overwrite';
			RESTBuilder.POST(url + path).exec(function (err, res) {
				Test.print('HTTP Routing - Wildcards Overwrite ' + path, err === null && res.success && res.value === 3 ? null : 'Assertion failed');
				next();
			});
		});

		arr.push(function (next) {
			path = '/params/1/2/3/third/wild/';
			RESTBuilder.GET(url + path).exec(function (err, res) {
				Test.print('HTTP Routing - Wildcards ' + path, err === null && res.success && res.value === 4 ? null : 'Assertion failed');
				next();
			});
		});

		arr.async(function () {
			next();
		})

	});


	Test.push('WEBSOCKET Routing', function(next) {
		var wsclient;
		var test_msg = 'message123';
		var arr = [];
		var create_client = function(next_fn) {
			WEBSOCKETCLIENT(function(client) {
				client.connect(url.replace('http', 'ws') + '?query=' + test_msg);
				wsclient = client;
				next_fn();
			});
		};
		arr.push(create_client);

		arr.push(function(next_fn) {
			wsclient && wsclient.on('open', function() {
				wsclient.send({ command: 'start' });
			});

			wsclient && wsclient.on('close', function() {
				Test.print('Websocket - Close', null);
				next_fn();
			});


			wsclient && wsclient.on('error', function(err) {
				Test.print('Websocket - ', 'Error ' + err);
				next_fn();
			});

			wsclient && wsclient.on('message', function(message) {
				switch(message.command) {
					case 'query':
						Test.print('Websocket - Query ', message.data = test_msg ? null : 'Returned query is not the one expected');
						wsclient.headers['x-token'] = 'token-123';
						wsclient.send({ command: 'headers' });
						break;
					case 'headers':
						Test.print('Websocket - Headers ', wsclient.headers['x-token'] === 'token-123' ? null : 'Returned X-TOKEN is not the one expected');
						wsclient.cookies['cookie'] = 'cookie-123';
						wsclient.send({ command: 'cookies' });
						break;
					case 'cookies':
						Test.print('Websocket - Cookies ', wsclient.cookies['cookie'] === 'cookie-123' ? null : 'Returned cookie is not the one expected');
						wsclient.options.compress = false;
						wsclient.send({ command: 'options_uncompressed', data: test_msg });
						break;
					case 'options_uncompressed':
						Test.print('Websocket - Uncompressed', message.data === test_msg ? null : 'Uncompressed message is not the one expected');
						wsclient.send({ command: 'options_compressed', data: test_msg });
						break;
					case 'options_compressed':
						Test.print('Websocket - Compressed', message.data === test_msg ? null : 'Compressed message is not the one expected');
						wsclient.options.command = 'binary';
						wsclient.send(Buffer.from(JSON.stringify({ command: 'options_type_binary', data: test_msg, data: test_msg })));
						break;
					case 'options_type_binary':
						Test.print('Websocket - Binary ', message.data === test_msg ? null : 'Binary message is not the one expected');
						wsclient.options.type = 'json';
						wsclient.send({ command: 'close' });
						break;
					case 'close':
						Test.print('Websocket - Json ');
						wsclient.close();
						break;
					case 'error':
						Test.print('Websocket - Error ', message.data);
						break;
				}
			});
		});

		arr.push(function(next_fn) {

			WEBSOCKETCLIENT(function(client) {

				client.cookies['auth'] = 'correct-cookie';
				client.connect(url.replace('http', 'ws') + '/authorized/');
	
				client.on('open', function() {
					client.send({ command: 'start' });
				});
	
				client.on('close', function() {
					Test.print('Websocket - Authorized ', null);
					next_fn();
				});
	
				client.on('error', function(e) {
					Test.print('Websocket - Authorized ', 'Error --> ' + e);
				});
	
				client.on('message', function(message) {
					switch (message.command) {
						case 'close':
							client.close();
							break;
					}
				});
			});
		});

		arr.push(function(next_fn) {
			WEBSOCKETCLIENT(function(client) {
				client.connect(url.replace('http', 'ws') + '/unauthorized/');
				client.options.reconnect = 0;
				client.cookies['auth'] = 'correct-cookie';
					client.on('open', function() {
						client.send({ command: 'start' });
						Test.print('Websocket - Unauthorized - Started');

					});
					client.on('error', function(e) {
						Test.print('Websocket - Unauthorized ');
						next_fn();
					});
					client.on('close', function(e) {
						Test.print('Websocket - Unauthorized - Closed');
						next_fn();
					});
				});
			});

		arr.push(function(next_fn) {
			var count = 0;

			WEBSOCKETCLIENT(function(client) {
				var timeout, msgtimeout;

				var reconnect_fail = function() {
					Test.print('Websocket - Reconnect ', 'Failed');
				};

				client.options.reconnect = 1000;
				client.connect(url.replace('http', 'ws') + '/reconnect/');
	
				client.on('open', function() {
					clearTimeout(timeout);
					msgtimeout = setTimeout(reconnect_fail, 2000);
					client.send({ type: 'ping' });
					count++;
				});
	
				client.on('message', function(message) {
					if (message.type === 'ping')
						clearTimeout(msgtimeout);
				});
	
				client.on('close', function() {
					timeout = setTimeout(reconnect_fail, 5000);
	
					if (count > 1) {
						clearTimeout(timeout);
						client.close();
						Test.print('Websocket - Reconnect - OK');
						next_fn();
					}
				});
			});
		});

		arr.push(function(next_fn) {


			function middleware_fail() {
				Test.print('Websocket - Middleware', ' - failed to emit');
			}
	
			WEBSOCKETCLIENT(function(client) {
	
				client.connect(url.replace('http', 'ws') + '/middleware/');
	
				var middleware_timeout;
	
				client.on('open', function() {
					middleware_timeout = setTimeout(middleware_fail, 1000);
					client.send({ type: 'ping' });
				});
	
				ON('middlewaresocket_close', function() {
					setTimeout(() => client.close(), 500);
				});
	
				client.on('close', function() {
					OFF('middlewaresocket_close');
					clearTimeout(middleware_timeout);
					Test.print('Websocket - Middleware');
					next_fn();
				});
			});
		});
		arr.async(function() {
			next();
		});
	});

	Test.push('Localization', function(next) {
		var arr = [];
		var regex = /<h1>(.*?)<\/h1>/;

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/localization/en/').exec(function(err, res, output) {
				Test.print('English - ', output.response.match(regex)[1] === 'Hello world!' ? null : 'Expecting \'Hello world!\'');
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/localization/sk/').exec(function(err, res, output) {
				Test.print('Slovak - ', output.response.match(regex)[1] === 'Ahoj svet!' ? null : 'Expecting \'Ahoj svet!\'');
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/localization/?lang=sk').exec(function(err, res, output) {
				Test.print('Query string lang - ', output.response.match(regex)[1] === 'Ahoj svet!' ? null : 'Expecting \'Ahoj svet!\'');
				next_fn();
			});
		});


		arr.async(function() {
			next();
		});
	});

	Test.push('Upload', function(next) {
		var arr = [];
		var filename = 'symbols.txt';
		arr.push(function(next_fn) {
			Total.Fs.readFile(filename, function(err, buffer) {
				if (err) throw err
				RESTBuilder.POST(url + '/upload/', { value: 'value' }).file(filename.split('.')[0], PATH.root(filename)).exec(function(err, res) {
					Test.print('UPload single file', err === null && res.success && res.value.files[0] === buffer.toString() && res.value.value === 'value' ? null : 'Recieved file content is not the same');
					next_fn();
				});
			});
		});


		arr.push(function(next_fn) {
			var filenames = ['symbols.txt', 'important.txt'];
			var buffers = [];

			filenames.wait(function(file, next_func) {
				// Get buffers from files
				Total.Fs.readFile(file, function(err, data) {
					if (err) throw err;

					buffers.push(data);
					next_func();
				});
			}, function() {
				var builder = RESTBuilder.POST(url + '/upload/', { value: 'value' });

				// Append files to builder
				for (var i = 0; i < buffers.length; i++)
					builder = builder.file(filenames[i].split('.')[0], PATH.root(filenames[i]));

				builder.exec(function(err, res) {
					for (var i = 0; i < buffers.length; i++)
						Test.print('Multiple files: ' + filenames[i], err === null && res.success && res.value.files[i] === buffers[i].toString() ? null : ' - Recieved content of files are not the same');
					next();
				});
			});
		});

		arr.async(function() {
			next();
		});
	});

	Test.push('API Routing', function(next) {
		var arr = [];
		var path = '/v1/';

		arr.push(function(next_fn) {
			RESTBuilder.API(url + path, 'api_basic').exec(function(err, response) {
				Test.print('API Routing - Basic ', err === null && response.success  === true ? null: 'Expected success response');
				next_fn();
			});
		});


		arr.push(function(next_fn) {
			var data = { valid: 'valid', invalid: 'invalid' };

			RESTBuilder.API(url + path, 'api_validation', data).exec(function(err, response) {
				Test.print('API Routing - Validation (+) ', err === null && response.success  === true ? null: '');
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			var data = { valid: 'valid', invalid: 'invalid' };
			RESTBuilder.API(url + path, 'api_novalidation', data).exec(function(err, response) {
				Test.print('API Routing - Validation (-) ', err === null && response.success  === true ? null: '');
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			var data = { valid: 'valid', invalid: 'invalid' };
			RESTBuilder.API(url + path, 'api_patch', data).exec(function(err, response) {
				Test.print('API Routing - Patch validation (%)', err === null && response.success && response.value.valid === data.valid ? null : 'Validation error');
				Test.print('API Routing - Patch validation (%)', response.value.invalid !== data.invalid ? null : 'Invalid data returned');
				next_fn();
			});
		});


		arr.push(function(next_fn) {
			var data = { valid: 'valid', invalid: 'invalid' };
		
			RESTBuilder.API(url + path, 'api_keys', data).exec(function(err, response) {
				Test.print('API Routing - Patch Keys', err === null && response.success ? null : 'Expected success response');
				Test.print('API Routing - Patch Keys', response.value.includes('valid') ? null : 'Valid key not found');
				Test.print('API Routing - Patch Keys', response.value.includes('invalid') ? null : 'Invalid key found');
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			var data = { valid: 'valid', invalid: 'invalid' };
		
			RESTBuilder.API(url + path, 'api_keys_multi', data).exec(function(err, response) {
				Test.print('API Routing - Patch Keys (multioperation)', !err && response && response.value && response.value.includes(data.valid) && response.value.includes(data.invalid) ? null : 'PATCH - Multiple operation keys failed');
				next_fn();
			});
		});

		arr.async(function() {
			next();
		});
	});


	Test.push('API Routing: Actions', function(next) {
		var arr = [];
		var path = '/v1/';

		arr.push(function(next_fn) {
			RESTBuilder.API(url + path, 'api_action_basic').exec(function(err, response) {
				Test.print('API Routing - Basic', err === null && response.success ? null : 'Expected success response');
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			var data = { valid: 'valid', invalid: 'invalid' };
			RESTBuilder.API(url + path, 'api_action_validation', data).exec(function(err, response) {
				Test.print('API Routing - Validation (+)', err === null && response.success && response.value && response.value.valid === data.valid ? null : 'Validation error');
				Test.print('API Routing - Validation (+)', response.value.invalid !== data.invalid ? null : 'Invalid data returned');
				next_fn();
			});
		});

		arr.async(function() {
			next();
		});
	});

	Test.push('Others ', function (next) {
		var arr = [];
		var route;
		//console.log(F.routes);
		var check = function(route, type) {
			if (!type)
				type = 'all'
			var split = route.split(' ');
			var method = split[0].trim();
			var url2 = split[1];
			var routes = [];

			if (method == 'API')
				method = 'POST';

			switch(type) {
				case 'all':
					routes = F.routes.routes.findAll('method', method);
					break;
				case 'file':
					routes = F.routes.files.findAll('method', method);
					break;
				case 'websockets':
					routes = F.routes.websockets.findAll('method', method);
					break;
				
			}

			var item = routes.findItem('url2', url2);

			if (item)
				return true;
			else 
				return false
		};

		arr.push(function (next_fn) {
			RESTBuilder.GET(url + '/uPperCase/').exec(function (err, res) {
				Test.print('Sensitive case', err === null && res && res.success === true ? null : 'Uppercase - expecting success');
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			var route;
		
			// Regular route
			route = 'GET /normalremove/     *Remove --> exec';
		
			ROUTE(route);

			ROUTE(route, null);
			setTimeout(function() {
				Test.print('Removing routes - Regular route: set to null', check(route) ? null : 'Regular route was not removed with "null"');
				next_fn();
			}, 100);
		});

		arr.push(function(next_fn) {
			// Regular route
			route = 'GET /normalremove/     *Remove --> exec';
			ROUTE(route);
			ROUTE(route).remove();
			Test.print('Removing routes - Regular route: .remove()', check(route) ? null : 'Regular route was not removed with "remove()"');
			next_fn();
		});

		arr.push(function(next_fn) {
			route = 'GET /dynamicremove/{userid}/q/{123}';
			ROUTE(route);
			ROUTE(route, null);
			Test.print('Removing routes - Dynamic route. net null', check(route) ? null : 'Dynamic route was not removed with "null"');
			next_fn();
		});

		arr.push(function(next_fn) {
			route = 'GET /dynamicremove/{userid}/q/{123}';
			ROUTE(route);
			ROUTE(route).remove();
			Test.print('Removing routes - Dynamic route: .remove()', check(route) ? null : 'Dynamic route was not removed with "remove()"');
			next_fn();
		});


		arr.push(function(next_fn) {
			route = 'FILE /fileremove/';
			ROUTE(route, NOOP);
			ROUTE(route, null);
			Test.print('Removing routes - File route', check(route, 'file') ? null : 'File route was not removed with "null"');
			next_fn();
		});



		arr.push(function(next_fn) {
			route = 'FILE /actionremove/';
			ROUTE(route, NOOP);
			ROUTE(route, null);
			Test.print('Removing routes - Action route', check(route, 'file') ? null : 'Action route was not removed with "null"');
			next_fn();
		});


		arr.push(function(next_fn) {
			// API route
			route = 'API /apiremove/ -api_remove *Remove --> exec';

			ROUTE(route);
			ROUTE(route, null);
			Test.print('Removing routes - API route', check(route) ? null : 'API route was not removed with "null"');
			next_fn();
		});

		arr.push(function(next_fn) {
			route = 'API /apiremove/ -api_remove *Remove --> exec';
			var instance = ROUTE(route);
			instance.remove();
			Test.print('Removing routes - API route', !check(route) ? null : 'API route was not removed with "remove()"');
			next_fn();
		});

		arr.push(function(next_fn) {
			// Websocket
			route = 'SOCKET /socketremove/';

			ROUTE(route, NOOP);
			ROUTE(route, null);

			Test.print('Removing routes - Websocket route', !check(route) ? null : 'Websocket route was not removed with "null"');
		
			next_fn();
		});

		arr.async(function() {
			next();
		});
		
	});

	setTimeout(function () {
		Test.run(function () {
			process.exit(0);
		});
	}, 1000);
});