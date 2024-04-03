/* eslint-disable */
require('../../index');
require('../../test');

// load web server and test app
CONF.$imprint = false;
F.run({ release: false, port: 8000 });

var url = 'http://localhost:8000';
var token_before = GUID(35);
var token_after = GUID(35);

ROUTE('GET /', $ => $.success());

PROXY('/cl/none/', 'https://flowstream.totalavengers.com/cl/none').copy('none');
PROXY('/cl/replace/', 'https://flowstream.totalavengers.com/cl/replace').copy('replace');
PROXY('/cl/extend/', 'https://flowstream.totalavengers.com/cl/extend').copy('extend');

PROXY('/cl/before/', 'https://flowstream.totalavengers.com/cl').before(function(uri, $) {
	$.headers['x-token'] = token_before;
});

PROXY('/cl/remove/', 'https://flowstream.totalavengers.com/cl').after(function(response) {
	var t = this;
	setTimeout(function() {
		t.remove();
	}, 3000);
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
		var correct;
		var correct2;
		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/none').exec(function(err, res) {
				console.log(err, res);
				correct = {};
				Test.print('Copy - None mode ', err === null && res.toString() == correct.toString() ? null : 'Expected empty object in response');
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/none/something').exec(function(err, res) {
				correct = {};
				Test.print('Copy - None mode 2', err === null && res.toString() == correct.toString() ? null : 'Expected empty object');
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/replace?q=search').exec(function(err, res) {
				Test.print('Copy - Replace mode ', err === null && res && res.q && res.q === 'search' ? null : 'Expected appended token in response');
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/replace/something?q=search').exec(function(err, res) {
				Test.print('Copy - Replace mode 2', err === null && res && res.q && res.q === 'search' ? null : 'Expected appended token in response');
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/extend?q=search').exec(function(err, res) {
				Test.print('Copy - Extend mode ', err === null && res && res.q && res.q === 'search' ? null : 'Expected appended token in response');
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/extend/something?q=search').exec(function(err, res) {
				Test.print('Copy - Extend mode 2', err === null && res && res.q && res.q === 'search' ? null : 'Expected appended token in response');
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/before').exec(function(err, res) {
				Test.print('Before - Added `x-token` header', err === null && res && res.token && res.token === token_before ? null : 'Expected appended token in response');
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/after').exec(function(err) {
				Test.print('After - Error: ' + err, err !== null ? null : 'Expected 401 error code');
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/remove').exec(function(err) {
				Test.print('Remove proxy - test: ' + err, err !== null ? null : 'Expected 404 error code');
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/check/for_app?status=valid').exec(function(err, response) {
				Test.print('Check - Handle with app ', err && err === 404 ? null : 'Handle by ')
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/cl/check/for_proxy?status=invalid').exec(function(err, response) {
				Test.print('Check - Handle with Proxy', err && err === 404 ? null : 'Handle by ')
				resume();
			});
		});

		arr.async(next);
	});

	setTimeout(Test.run, 2000);
});