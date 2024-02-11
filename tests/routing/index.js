/* eslint-disable */
require('../../index');
require('../../test');
// API routing
// WebSocket routing + WebSocketClient (text, json and binary communication)
// File routing
// Removing routess

F.console = NOOP;

// load web server and test app
F.http();



var url = 'http://0.0.0.0:8000';


ON('error', function(e) {
	console.log(e);
	process.exit(1);
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
		var check = function(type, route) {
			console.log(F.routes);
			return typeof F.routes.all[route] === 'undefined' && typeof F.routes[type][route] === 'undefined';
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
			//ROUTE(route, null);
			Test.print('Removing routes - Regular route: set to null', check('all', route) ? null : 'Regular route was not removed with "null"');
			next_fn();
		});

		arr.push(function(next_fn) {
			ROUTE(route).remove();
			Test.print('Removing routes - Regular route: .remove()', check('all', route) ? null : 'Regular route was not removed with "remove()"');
			next_fn();
		});

		arr.push(function(next_fn) {
			route = 'GET /dynamicremove/{userid}/q/{123}';

			ROUTE(route);
			ROUTE(route, null);
			Test.print('Removing routes - Dynamic route. net null', check('all', route) ? null : 'Dynamic route was not removed with "null"');
			next_fn();
		});

		arr.push(function(next_fn) {
			ROUTE(route).remove();
			Test.print('Removing routes - Dynamic route: .remove()', check('all', route) ? null : 'Dynamic route was not removed with "remove()"');
			next_fn();
		});


		arr.push(function(next_fn) {
			route = 'FILE /fileremove/';
			ROUTE(route, NOOP);
			ROUTE(route, null);
			Test.print('Removing routes - File route', check('api', route) ? null : 'File route was not removed with "null"');
			next_fn();
		});



		arr.push(function(next_fn) {
			route = 'FILE /actionremove/';
			ROUTE(route, NOOP);
			ROUTE(route, null);
			Test.print('Removing routes - Action route', check('all', route) ? null : 'Action route was not removed with "null"');
			next_fn();
		});


		arr.push(function(next_fn) {
			// API route
			route = 'API /apiremove/ -api_remove *Remove --> exec';

			ROUTE(route);
			ROUTE(route, null);
			Test.print('Removing routes - API route', check('api', route) ? null : 'API route was not removed with "null"');
			next_fn();
		});

		arr.push(function(next_fn) {
			ROUTE(route).remove();
			Test.print('Removing routes - API route', check('api', route) ? null : 'API route was not removed with "remove()"');
			next_fn();
		});

		arr.push(function(next_fn) {
			// Websocket
			route = 'SOCKET /socketremove/';

			ROUTE(route, NOOP);
			ROUTE(route, null);
			Test.print('Removing routes - Websocket route', check('websockets', route) ? null : 'Websocket route was not removed with "null"');
		
			next_fn();
		});

		arr.push(function(next_fn) {
			var socket = 'SOCKET /wapiremove/ @wapi';
			route = 'API @api -wapi_remove *Remove --> exec';
		
			ROUTE(socket, NOOP);
			ROUTE(route);
			ROUTE(route, null);
			Test.print('Removing routes - WAPI route', check('all', route) ? null : 'WAPI route was not removed with "null"');
		
			ROUTE(socket, null);
			next_fn();
		});

		arr.push(function(next_fn) {
			
			next_fn();
		});

		arr.push(function(next_fn) {
			
			next_fn();
		});

		arr.push(function(next_fn) {
			
			next_fn();
		});

		arr.push(function(next_fn) {
			
			next_fn();
		});

		arr.push(function(next_fn) {
			
			next_fn();
		});

		arr.async(function () {
			next();
		})
	});

	setTimeout(function () {
		Test.run(function () {
			process.exit(0);
		});
	}, 1000);
});