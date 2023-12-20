/* eslint-disable */
require('../../index');
require('../../test');
// HTTP routing
// API routing
// WebSocket routing + WebSocketClient (text, json and binary communication)
// File routing
// Removing routess

F.console = NOOP;

// load web server and test app
F.http();

var url = 'http://0.0.0.0:8000';
var item = 'HELLO';
var item2 = 'hello2';
var item3 = 'hello3';
var items = [
	{ url: `/${item}/`, res: item },
	{ url: `/params/${item}/`, res: item },
	{ url: `/params/alias/${item}/`, res: item },
	{ url: `/params/is/inside/${item}/long/route/`, res: item },
	{ url: `/params/is/inside/${item}/long/route/alias/`, res: item },
	{ url: `/params/${item}/${item2}/${item3}/alias/`, res: item },
	{ url: `/params/${item}/${item2}/${item3}/first`, res: item },
	{ url: `/params/${item}/${item2}/${item3}/second/`, res: item2 },
	{ url: `/params/${item}/${item2}/${item3}/third/`, res: item3 }
];

var methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
var USER = { id: '123', name: 'Peter Sirka', email: 'petersirka@gmail.com', sa: true };


// Auth delegate
AUTH(function($) {
	var cookie = $.cookie('auth');

	if (!cookie || cookie !== 'correct-cookie') {
		$.invalid();
		return;
	}

	$.success(USER);

})
// Schemas
NEWSCHEMA('@Users', function(schema) {
	schema.action('list', {
		name: 'Listing action',
		action: $ => $.success(true)
	});
	
	schema.action('read', {
		name: 'Read specific user',
		params: '*id:Number',
		action: $ => $.success(true)
	});


	schema.action('insert', {
		name: 'Insert new lement',
		input: '*name:Name,*email:Email,phone:Phone',
		action: ($, model) => $.success(model)
	});

	schema.action('update', {
		name: 'Insert new lement',
		params: '*id:Number',
		input: '*name:Name,*email:Email,phone:Phone',
		action: ($, model) => $.success(true)
	});

	schema.action('delete', {
		name: 'Delete specific user',
		params: '*id:Number',
		action: $ => $.success(true)
	});



});


// Testing ENDPOINTS
ROUTE('GET /not/existing/path', ($) => $.plain('ok'));
ROUTE('GET /uPperCase/', ($) => $.success(true));
ROUTE('GET /middleware/success/ #testmiddleware', ($) => $.success(true));
ROUTE('GET /middleware/invalid/ #testmiddleware2', ($) => $.success(true));
ROUTE('GET /schema/methods/validation/  --> Users/list')
ROUTE('POST /schema/methods/validation/ -->  Users/insert')
ROUTE('PATCH /schema/methods/validation/  --> Users/update')
ROUTE('PUT /schema/methods/validation/ -->  Users/update')
ROUTE('DELETE /schema/methods/validation/ -->  Users/delete')
ROUTE('GET /xtoken/', $ => $.success($.headers['x-token']));
ROUTE('+GET /auth/', $ => $.success($.user && $.user.id ));

MIDDLEWARE('testmiddleware', ($, next) => next());
MIDDLEWARE('testmiddleware2', ($, next) => $.invalid(400));

items.forEach(function(item	) {
	ROUTE('GET ' + item.url, function($) {
		$.plain(item.res);
	});
});

// Register methods
methods.forEach(function(method, next) {
	ROUTE(method + ' /methods/', function($) {
		$.success(true);
	});
});

ON('ready', function() {

	Test.push('HTTP Routes', function(next) {
		items.wait(function(item, n) {
			RESTBuilder.GET(url + item.url).exec(function(err, res, output) {
				res = output.response;
				Test.print('Routes - Params {0}'.format(item.url),  res !== item.res ?  'TEST {0} failed'.format(item.url) : null);
				n();
			});
		}, function() {
			next();
		});
	});

	Test.push('HTTP Methods', function(next) {

		methods.wait(function(method, n) {
			RESTBuilder[method](url + '/methods').exec(function(err, response, output) {
				Test.print('Methods - {0} /methods/'.format(method),  !response.success ?  'TEST {0} /methods/ failed'.format(method) : null);
				n();
			})
		}, function() {
			next()
		});
	});

	Test.push('RESTBuilder', function(next) {

		var arr = [];

		// HTML Page
		arr.push(function(next_fn) {
			RESTBuilder.GET('https://www.totaljs.com').exec(function(err, response) {
				Test.print('HTML Page', (err !== null) && (response !== EMPTYOBJECT) ? 'HTML Page loading failed' : null);
				next_fn();
			});
		});

		// Invalid path
		arr.push(function(next_fn) {
			RESTBuilder.GET('https://www.totaljs.com/helfo').exec(function(err) {
				Test.print('Invalid path - Test 1', err instanceof ErrorBuilder ? null : 'Expected Error Builder instance');
				next_fn();
			});
		});

		// Invalid path 2
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/not/existing/path').exec(function(err, res) {
				Test.print('Invalid path - Test 2', err === null && res === EMPTYOBJECT ? null : 'Expected empty Object')
				next_fn();
			});
		});

		// JSON
		arr.push(function(next_fn) {
			RESTBuilder.GET('https://www.totaljs.com/api/json/').exec(function(err, res) {
				Test.print('JSON', err === null && res !== EMPTYOBJECT ? null : 'Expected JSON')
				next_fn();
			});
		});

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

	Test.push('Routes', function(next) {
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
			})
		});


		arr.async(function() {
			next();
		})
	})

	Test.push('Auth', function(next) {
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
			RESTBuilder.GET(url + '/auth').cookie('auth', 'correct-cookie').exec(function(err, res) {
				Test.print('Authorized user', err === null && res && res.value === '123' ? null : 'Expected authorized user id (123)');
				next_fn();
			});
		});

		arr.async(function() {
			next();
		})
	})
	setTimeout(function() {
		Test.run(function() {
			process.exit(0);
		});
	}, 500);
});