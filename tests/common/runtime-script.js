/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

const PORT = 8487;
const Fs = require('fs');

CONF.$imprint = false;

// The default filename
var filename = PATH.root('runtime.js');
var filename2 = PATH.root('runtime2.js');

// The script is evaluated by the 5-second service of the framework
Fs.writeFileSync(filename, 'global.RUNTIMESCRIPT = (global.RUNTIMESCRIPT || 0) + 1;\nglobal.RUNTIMESCRIPTOS = typeof(require(\'node:os\').platform);');

F.run({ port: PORT, release: true, watcher: false });

ON('ready', function() {

	Test.push('Runtime script', function(next) {

		var arr = [];
		var errors = [];
		var onerror = DEF.onError;

		// The first check of the service
		arr.push(resume => setTimeout(resume, 5600));

		arr.push(function(resume) {
			Test.print('The default filename is runtime.js', CONF.$script === 'runtime.js' ? null : 'Unexpected value: ' + CONF.$script);
			Test.print('The script is evaluated once', global.RUNTIMESCRIPT === 1 && global.RUNTIMESCRIPTOS === 'function' ? null : 'Unexpected value: ' + global.RUNTIMESCRIPT + ', ' + global.RUNTIMESCRIPTOS);
			Test.print('The file of the script is removed', Fs.existsSync(filename) ? 'The file exists' : null);

			// A script with an error: the app must survive, the file is removed
			DEF.onError = err => errors.push(err);
			Fs.writeFileSync(filename, 'global.RUNTIMESCRIPT = 100;\nthrow new Error(\'Runtime script\');');

			// Another file is not evaluated
			Fs.writeFileSync(filename2, 'global.RUNTIMESCRIPT2 = 1;');
			setTimeout(resume, 5000);
		});

		arr.push(function(resume) {
			DEF.onError = onerror;
			Test.print('An error of the script is handled', global.RUNTIMESCRIPT === 100 && errors.length === 1 && !Fs.existsSync(filename) ? null : 'Unexpected state: ' + global.RUNTIMESCRIPT + ', errors: ' + errors.length);
			Test.print('Another file is not evaluated', global.RUNTIMESCRIPT2 === undefined && Fs.existsSync(filename2) ? null : 'Unexpected state');
			resume();
		});

		arr.async(function() {
			Fs.rmSync(filename, { force: true });
			Fs.rmSync(filename2, { force: true });
			next();
		});
	});

	Test.run();
});
