require('../../index');
require('../../test');

F.run({ port: 8000, release: false });

var url = 'http://localhost:8000';
ON('ready', function() {

	var input,response,correct;
	Test.push('Views - Basic test', function(next) {
		var arr = [];

		arr.push(function(resume) {
			input = url + '/view/basic';
			correct = '<h1>Hello world!</h1>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Without layout', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/basic?cmd=layout';
			correct = '<h1>Hello world!</h1>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('With layout', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/basic?cmd=layout-custom';
			correct = '<h1>Hello world!</h1>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('With layout - Custom', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/basic?cmd=nested';
			correct = '<h1>Hello world!</h1>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Nested View', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/basic?cmd=repository';
			correct = '<span>Name: Peter Sirka</span>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Repository - basic', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/basic?cmd=model';
			correct = '<span>Name: Louis Bertson</span>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Model - model object', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/basic?cmd=view';
			correct = '<span>Name: Peter Sirka</span>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Model - view(name, model))', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/basic?cmd=view-multiline';
			correct = '<ul><li>A</li><li>B</li><li>C</li></ul>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Model - view(name, model)) multi-line', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});
		arr.async(next);
	});

	Test.push('Views - Common', function(next) {
		var arr = [];
		// arr.push(function(resume) {
			// input = url + '/view/common?cmd=escaping';
			// correct = '<ul><li>A</li><li>B</li><li>C</li></ul>';
			// RESTBuilder.GET(input).exec(function(err, res, output) {
				// response = output.response;
				// console.log(response);
				// Test.print('Escaping', err == null && response == correct ? null : 'Expected ' + correct);
				// resume();
			// });
		// });

		arr.push(function(resume) {
			input = url + '/view/common?cmd=conditions';
			correct = '<div>sign up</div><br /><br /><br /><br /><div>Here is </div>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Conditions', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/common?cmd=looping-array';
			correct = '<div>1, index: 0</div><div>2, index: 1</div><div>3, index: 2</div><div>4, index: 3</div><br /><br />';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Looping - array', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/common?cmd=looping-object';
			correct = '<div>property: name, value: Peter</div><div>property: age, value: 32</div><br /><br />';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Looping - Object', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.push(function(resume) {
			input = url + '/view/common?cmd=sections';
			correct = '<html><h1>Homepage</h1><br /> <div>THIS IS FOOTER FROM THE VIEW</div></html>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				Test.print('Sections', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		// arr.push(function(resume) {
			// input = url + '/view/common?cmd=assignment';
			// correct = '<html><h1>Homepage</h1><br /> <div>THIS IS FOOTER FROM THE VIEW</div></html>';
			// RESTBuilder.GET(input).exec(function(err, res, output) {
				// response = output.response;
				// Test.print('Assignment', err == null && response == correct ? null : 'Expected ' + correct);
				// resume();
			// });
		// });

		arr.push(function(resume) {
			input = url + '/view/common?cmd=helpers';
			correct = '<html><h1>Homepage</h1><br /> <div>THIS IS FOOTER FROM THE VIEW</div></html>';
			RESTBuilder.GET(input).exec(function(err, res, output) {
				response = output.response;
				console.log(response);
				Test.print('Assignment', err == null && response == correct ? null : 'Expected ' + correct);
				resume();
			});
		});

		arr.async(next);
	});

	setTimeout(function() {
		Test.run(function() {
			console.log('DONE');
		});
	}, 2000);
});