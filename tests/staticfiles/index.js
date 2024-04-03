/* eslint-disable */

const { RESTBuilder } = require('../../builders');

require('../../index');
require('../../test');

// merging files
// localization

// load web server and test app
CONF.$imprint = false;
F.http();

var url = 'http://localhost:8000';
ON('ready', function() {

	Test.push('Static files -  LOCALIZE', function(next) {
		var arr = [];
		var correct = '<h1>Hello world!</h1>';
		arr.push(function(resume) {
			RESTBuilder.GET(url + '/localize.html').exec(function(err, response, output) {
				Test.print('Localize - default lang', err === null && output.response ===  correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/localize.html?lang=en').exec(function(err, response, output) {
				Test.print('Localize - en lang', err === null && output.response ===  correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			correct = '<h1>Ahoj svet!</h1>';
			RESTBuilder.GET(url + '/localize.html?lang=sk').exec(function(err, response, output) {
				Test.print('Localize - sk lang', err === null && output.response ===  correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/merge1.js').exec(function(err, response, output) {
				Test.print('Merge JS - Two files', err === null && output.response !== null ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/merge2.js').exec(function(err, response, output) {
				Test.print('Merge JS - With Url', err === null && output.response !== null ? null : 'Expected ' + correct);
				resume();
			});
		});


		// arr.push(function(next_fn) {
		// 	RESTBuilder.GET(url + '/merge3.js').exec(function(err, response, output) {
		// 		Test.print('Merge JS - All', err === null && output.response !== null ? null : 'Expected ' + correct);
		// 		next_fn();
		// 	});
		// });

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/merge1.css').exec(function(err, response, output) {
				Test.print('Merge CSS- Two files', err === null && output.response !== null ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			RESTBuilder.GET(url + '/merge2.css').exec(function(err, response, output) {
				Test.print('Merge CSS - With Url', err === null && output.response !== null ? null : 'Expected ' + correct);
				resume();
			});
		});

		// arr.push(function(next_fn) {
		// 	RESTBuilder.GET(url + '/merge3.css').exec(function(err, response, output) {
		// 		Test.print('Merge CSS - All', err === null && output.response !== null ? null : 'Expected ' + correct);
		// 		next_fn();
		// 	});
		// });

		arr.async(next);
	});

	setTimeout(Test.run, 500);
});