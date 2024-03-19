/* eslint-disable */

const { RESTBuilder } = require('../../builders');

require('../../index');
require('../../test');

// merging files
// localization

// load web server and test app
F.http();
var url = 'http://localhost:8000';
ON('ready', function() {

	Test.push('Static files -  LOCALIZE', function(next) {
		var arr = [];
		var correct = '<h1>Hello world!</h1>';
		arr.push(function(next_fn) {
			
			RESTBuilder.GET(url + '/localize.html').exec(function(err, response, output) {
				Test.print('Localize - default lang', err === null && output.response ===  correct ? null : 'Expected ' + correct);
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/localize.html?lang=en').exec(function(err, response, output) {
				Test.print('Localize - en lang', err === null && output.response ===  correct ? null : 'Expected ' + correct);
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			correct = '<h1>Ahoj svet!</h1>';
			RESTBuilder.GET(url + '/localize.html?lang=sk').exec(function(err, response, output) {
				Test.print('Localize - sk lang', err === null && output.response ===  correct ? null : 'Expected ' + correct);
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/merge1.js').exec(function(err, response, output) {
				Test.print('Merge - Two files', err === null && output.response !== null ? null : 'Expected ' + correct);
				next_fn();
			});
		});

		arr.push(function(next_fn) {
			RESTBuilder.GET(url + '/merge2.js').exec(function(err, response, output) {
				Test.print('Merge - With Url', err === null && output.response !== null ? null : 'Expected ' + correct);
				next_fn();
			});
		});


		// arr.push(function(next_fn) {
		// 	RESTBuilder.GET(url + '/merge3.js').exec(function(err, response, output) {
		// 		Test.print('Merge - All', err === null && output.response !== null ? null : 'Expected ' + correct);
		// 		next_fn();
		// 	});
		// });

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