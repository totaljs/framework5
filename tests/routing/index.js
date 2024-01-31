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
				Test.print('Internal Routing - 404', err === null && res && res.status === 404 && res.value === 'Not found');
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
				Test.print('Internal Routing - 408', err === null && res && res.status === 408 && res.value === 'Request Timeout');
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
			path =  '/wildcards/wild/wild';
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
			path =  '/wildcards/second/arg1/arg2/wild';
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


	setTimeout(function () {
		Test.run(function () {
			//process.exit(0);
		});
	}, 1000);
});

