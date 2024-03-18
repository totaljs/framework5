/* eslint-disable */
require('../../index');
require('../../test');

// load web server and test app
F.run({ release: false, port: 8000 });

var url = 'http://localhost:8000';
var token_before= GUID(35);
var token_after = GUID(35);
ROUTE('GET /', ($) => $.success());
PROXY('/cl/before/', 'https://flowstream.totalavengers.com/cl').before(function(uri, $) {
	$.headers['x-token'] = token_before;
});


PROXY('/cl/after/', 'https://flowstream.totalavengers.com/cl').after(function(response) {
	Test.print('After - Response code : ' + ( response ? response.statusCode : 'Null '), response ? null : 'Expected appended token in response');
});


PROXY('/cl/check/for_app/', 'https://flowstream.totalavengers.com/cl').check(function($) {
	return true;
});


PROXY('/cl/check/for_proxy/', 'https://flowstream.totalavengers.com/cl').check(function($) {
	return false;
});


ON('ready', function() {
	Test.push('Test Web Proxy', function(next) {
		// Test.print('String.slug()', [error]);

		var arr = [];
		

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/cl/before').exec(function(err, res, output) {
				Test.print('Before - Added `x-token` header', err === null && res && res.token && res.token === token_before ? null : 'Expected appended token in response');
				next_fn();
			});
		});


		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/cl/after').exec(function(err) {
				Test.print('After - Error: ' + err, err !== null ? null : 'Expected 401 error code');
				next_fn();
			});
		});
		
		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/cl/check/for_app?status=valid').exec(function(err, response) {
				Test.print('Check - Handle with app ', err && err === 404 ? null : 'Handle by ')
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/cl/check/for_proxy?status=invalid').exec(function(err, response) {
				Test.print('Check - Handle with Proxy', err && err === 404 ? null : 'Handle by ')
				next_fn();
			});
		});
		arr.async(function() {
			next();
		});
 	});

	setTimeout(function() {
		Test.run(function() {
			process.exit(0);
		});
	}, 500);
});