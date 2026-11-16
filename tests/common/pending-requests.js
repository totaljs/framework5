/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

const PORT = 8483;
const Http = require('http');

CONF.$imprint = false;

F.run({ port: PORT, release: true, watcher: false });

function get(path, agent) {
	return new Promise(function(resolve) {
		Http.get({ host: '127.0.0.1', port: PORT, path: path, agent: agent }, function(res) {
			res.resume();
			res.on('end', () => resolve(res.statusCode));
		}).on('error', err => resolve(err.message));
	});
}

ON('ready', function() {

	ROUTE('GET /fast/', $ => $.json({ hello: 'world' }));
	ROUTE('GET /plain/', $ => $.plain('hello'));
	ROUTE('GET /missing/', $ => $.invalid(404));
	ROUTE('GET /slow/ <5s', $ => {});

	Test.push('Pending requests', function(next) {

		var arr = [];

		arr.push(resume => setTimeout(resume, 300));

		// The answered requests leave the list at once (it used to keep them until the next 5-second check)
		arr.push(async function(resume) {
			var agent = new Http.Agent({ keepAlive: true, maxSockets: 20 });
			var statuses = await Promise.all(Array.from({ length: 300 }, (_, i) => get(['/fast/', '/plain/', '/missing/'][i % 3], agent)));
			agent.destroy();
			var ok = statuses.filter(status => status === 200).length === 200 && statuses.filter(status => status === 404).length === 100;
			var length = F.temporary.pending.length;
			Test.print('Answered requests leave the pending requests', ok && length === 0 ? null : 'Expected 0 pending requests, got ' + length + ' (statuses: ' + statuses.slice(0, 3).join(', ') + ')');
			resume();
		});

		// A request without an answer stays in the list and the timeout check still answers it
		arr.push(async function(resume) {
			var started = Date.now();
			var promise = get('/slow/');
			setTimeout(function() {
				var length = F.temporary.pending.length;
				promise.then(function(status) {
					var seconds = (Date.now() - started) / 1000;
					Test.print('A request without an answer stays pending and gets the timeout answer', length === 1 && (status === 408 || status === 503) && seconds < 12 ? null : 'Expected 1 pending request and a timeout answer, got ' + length + ', ' + status + ' after ' + seconds + ' s');
					resume();
				});
			}, 500);
		});

		arr.async(next);
	});

	Test.run();
});
