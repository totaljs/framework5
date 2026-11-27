/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

const PORT = 8496;
const Fs = require('fs');
const Path = require('path');
const Os = require('os');
const Child = require('child_process');

const INDEX = Path.join(__dirname, '../../index');
const DIR = Path.join(Os.tmpdir(), 'total5-memorize-exit-' + process.pid);

// The app changes (or not) the MEMORIZE() with a long delay and then it ends
const SCRIPT = `
require(${JSON.stringify(INDEX)});
var mem = MEMORIZE('exit', 60000);
process.argv[2] === 'change' && mem.set('value', 123);
if (process.argv[3] === 'signal') {
	setInterval(() => {}, 1000);
	process.send('ready');
} else
	process.exit(0);
`;

function run(name, change, signal, callback) {

	var cwd = Path.join(DIR, name);
	var filename = Path.join(cwd, 'databases', 'memorize_exit.json');

	Fs.mkdirSync(Path.join(cwd, 'databases'), { recursive: true });
	Fs.writeFileSync(Path.join(cwd, 'app.js'), SCRIPT);

	var child = Child.fork(Path.join(cwd, 'app.js'), [change ? 'change' : 'nochange', signal ? 'signal' : 'exit'], { cwd: cwd, silent: true });
	var timer = setTimeout(() => child.kill('SIGKILL'), 5000);

	child.on('message', msg => msg === 'ready' && child.kill('SIGTERM'));
	child.on('exit', function() {
		clearTimeout(timer);
		var data = null;
		try {
			data = JSON.parse(Fs.readFileSync(filename, 'utf8'));
		} catch (e) {}
		callback(data);
	});
}

CONF.$imprint = false;

F.run({ port: PORT, release: true, watcher: false });

ON('ready', function() {

	Test.push('MEMORIZE() and the end of the app', function(next) {

		var arr = [];

		arr.push(function(resume) {
			run('exit', true, false, function(data) {
				Test.print('Pending changes are written on process.exit()', data && data.value === 123 ? null : 'Stored: ' + JSON.stringify(data));
				resume();
			});
		});

		// Signals can't be sent to a child process on Windows
		process.platform !== 'win32' && arr.push(function(resume) {
			run('signal', true, true, function(data) {
				Test.print('Pending changes are written on SIGTERM', data && data.value === 123 ? null : 'Stored: ' + JSON.stringify(data));
				resume();
			});
		});

		arr.push(function(resume) {
			run('nochange', false, false, function(data) {
				Test.print('Nothing is written without pending changes', data == null ? null : 'Stored: ' + JSON.stringify(data));
				resume();
			});
		});

		arr.async(function() {
			try {
				Fs.rmSync(DIR, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
			} catch (e) {}
			next();
		});
	});

	Test.run();
});
