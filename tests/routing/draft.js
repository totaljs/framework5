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



ON('ready', function() {

	// HTTP routing
	Test.push('HTTP Routing - Basics', function(next) {
		MAIN.items && MAIN.items.wait(function(item, n) {
			RESTBuilder.GET(url + item.url).exec(function(err, res, output) {
				res = output.response;
				Test.print('Routes - Params {0}'.format(item.url),  res !== item.res ?  'TEST {0} failed'.format(item.url) : null);
				n();
			});
		}, function() {
			next();
		});
	});

	Test.push('HTTP Routing - methods', function(next) {

		MAIN.methods && MAIN.methods.wait(function(method, n) {
			RESTBuilder[method](url + '/methods').exec(function(err, response, output) {
				Test.print('Methods - {0} /methods/'.format(method),  !response.success ?  'TEST {0} /methods/ failed'.format(method) : null);
				n();
			})
		}, function() {
			next()
		});
	});

	Test.push('HTTP Routing - Case sensitive and Middleware', function(next) {

		var arr = [];

		// Sensitive case
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/uPperCase/').exec(function(err, res) {
				Test.print('Sensitive case', err === null && res && res.success === true ? null : 'Expected Success');
				next_fn();
			});
		});

		// Middleware success
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/middleware/success/').exec(function(err, res) {
				console.log(err, res);
				Test.print('Middleware - Success', err === null && res && res.success === true ? null : 'Expected success response');
				next_fn();
			});
		});

		// Middleware invalid
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/middleware/invalid/').exec(function(err, res) {
				Test.print('Middleware - Invalid', err && err.status === 400  ? null : 'Expected an error');
				next_fn();
			});
		});


		arr.async(function() {
			next();
		});
	});

	Test.push('HTTP Routing - Methods and validation', function(next) {
		var arr = [];

		var methods = [{ name: 'GET', validate: false }, { name: 'POST', validate: true }, { name: 'PUT', validate: true }, { name: 'PATCH', validate: true }, { name: 'DELETE', validate: true }];

		// Method data validation
		arr.push(function(next_fn) {
			methods.wait(function(method, next) {
				RESTBuilder[method.name](url + '/schema/methods/validation').exec(function(err, res) {
					if (method.validate) 
						Test.print('Validation ' + method.name, err !== null && !res ? null : 'Expected validation error');
					else 
						Test.print('No Validation' + method.name, err === null && res  ? null : 'Expected No validation error');

					next();
				});
			}, function() {
				next_fn();
			});
		});

		// PATCH / DELETE with validation (invalid)
		arr.push(function(next_fn) {
			var methods = ['PATCH', 'DELETE'];

			methods.wait(function(method, next) {
				RESTBuilder[method](url + '/schema/methods/validation', { email: 'not_email' }).exec(function(err, res) {
					if (method) 
						Test.print('Validation ' + method, err !== null  ? null : 'Expected  error');
					next();
				});
			}, function() {
				next_fn();
			});
		});


		arr.async(function() {
			next();
		})
	})

	Test.push('HTTP Routing - Authorization', function(next) {
		var arr = [];

		// X-token
		arr.push(function(next_fn) {
			var token = 'token123';
			RESTBuilder.GET(url + '/xtoken').header('x-token', token).exec(function(err, res) {
				Test.print('X - Token ', err === null && res && res.value === token ? null : 'Expected value to be ' + token);
				next_fn();
			});
		});

		//  Authorized user
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/auth').cookie('auth', 'correct-cookie').exec(function(err, res, output) {
				Test.print('Authorized user', output.status === 200 && err === null && res && res.value === '123' ? null : 'Expected authorized user id (123)');
				next_fn();
			});
		});

		//  Unauthorized user
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/auth').cookie('auth', 'wrong-cookie').exec(function(err, res, output) {
				Test.print('Unauthorized user', output.status === 200 && err === null && res && !res.value ? null : 'Expected no value');
				next_fn();
			});
		});

		// Authorized route - authorized user
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/auth/authorized/').cookie('auth', 'correct-cookie').exec(function(err, res, output) {
				Test.print('Authorized route - Authorized user', output.status === 200 && err === null && res && res.value === '123' ? null : 'Expected authorized user id (123)');
				next_fn();
			});
		});

		// Authorized route - unauthorized user
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/auth/authorized/').cookie('auth', 'wrong-cookie').exec(function(err, res, output) {
				Test.print('Unauthorized route - Unauthorized user', output.status === 401 && res && !res.value ? null : 'Expected no value');
				next_fn();
			});
		});

		arr.async(function() {
			next();
		})
	});


	Test.push('HTTP Routing - Internal routing And wildcard', function(next) {
		var arr  = [];

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/not/existing').exec(function(err, res) {
				Test.print('Internal Routing - 404', err === null && res && res.status === 404 && res.value === 'Not found')
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/internal/503').exec(function(err, res) {
				Test.print('Internal Routing - 503', err === null && res && res.status === 503 && res.value === 'Server Error')
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/internal/408').exec(function(err, res) {
				Test.print('Internal Routing - 408', err === null && res && res.status === 408 && res.value === 'Request Timeout')
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/wildcards/wild').exec(function(err, res) {
				Test.print('Wildcards - *', err === null && res && res.success === true && res.value === 1)
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/wildcards/wild/wild').exec(function(err, res) {
				Test.print('Wildcards 2 - *', err === null && res && res.success === true && res.value === 1)
				next_fn();
			});
		});
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/wildcards/wild/wild/wild').exec(function(err, res) {
				Test.print('Wildcards 3 - *', err === null && res && res.success === true && res.value === 1)
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/wildcards/wild/wild/wild/wild').exec(function(err, res) {
				Test.print('Wildcards 3 - *', err === null && res && res.success === true && res.value === 1)
				next_fn();
			});
		});


		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/wildcards/second/2/43/this-is-slog/wild').exec(function(err, res) {
				Test.print('Wildcards 4 - *', err === null && res && res.success === true && res.value === 1)
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/wildcards/second/2/43/this-is-slog/wild/wild/wild/').exec(function(err, res) {
				Test.print('Wildcards 5 - *', err === null && res && res.success === true && res.value === 1)
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/wildcards/second/2/43/t/wild/wild/wild/').exec(function(err, res) {
				Test.print('Wildcards 6 - *', err === null && res && res.success === true && res.value === 1)
				next_fn();
			});
		});

		
		arr.async(function() {
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
				Test.print('API Routing - Patch validation (#)', err === null && response.success && response.value.valid === data.valid ? null : 'Validation error');
				Test.print('API Routing - Patch validation (#)', response.value.invalid !== data.invalid ? null : 'Invalid data returned');
		
				next_fn();
			});
		});


		arr.push(function(next_fn) {
			var data = { valid: 'valid', invalid: 'invalid' };
		
			RESTBuilder.API(url + path, 'api_keys', data).exec(function(err, response) {
				Test.print('API Routing - Patch Keys', err === null && response.success ? null : 'Expected success response');
				Test.print('API Routing - Patch Keys', response.value.includes('valid') ? null : 'Valid key not found');
				Test.print('API Routing - Patch Keys', !response.value.includes('invalid') ? null : 'Invalid key found');
				
				next_fn();
			});
		});


		arr.push(function(next_fn) {
			var data = { valid: 'valid', invalid: 'invalid' };
		
			RESTBuilder.API(url + path, 'api_keys_multi', data).exec(function(err, response) {
				Test.print('API Routing - Patch Keys (multioperation)', !err && response && response.value && response.value.includes(data.valid) && !response.value.includes(data.invalid) ? null : 'PATCH - Multiple operation keys failed');
				
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



	});

	
	setTimeout(function() {
		Test.run(function() {
			//process.exit(0);
		});
	}, 1000);
});

