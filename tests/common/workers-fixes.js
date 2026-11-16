/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

const Fs = require('fs');
const Path = require('path');
const Os = require('os');
const FlowStream = require('../../flowstream');
const FlowStreamWorker = require('../../flow-flowstream');

CONF.$imprint = false;

const TMP = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'total5-workers-fixes-'));
const PROBE = Path.join(TMP, 'probe.js');

Fs.writeFileSync(PROBE, 'require(' + JSON.stringify(Path.join(__dirname, '../../index')) + ');\nvar worker = NEWTHREAD();\nworker.send({ isfork: worker.isfork, is: worker.is, data: worker.data === undefined ? \'undefined\' : worker.data });\n');

function probe(worker, callback) {
	worker.once('message', function(msg) {
		if (msg && typeof(msg) === 'object')
			callback(msg);
		else
			probe(worker, callback);
	});
}

function heaplimit(mode, callback) {
	var out = Path.join(TMP, 'heap_' + mode + '.txt');
	var body = '<script total>\nexports.install = function() { require(\'fs\').writeFileSync(' + JSON.stringify(out) + ', String(Math.round(require(\'v8\').getHeapStatistics().heap_size_limit / 1024 / 1024))); };\nexports.make = function() {};\n</script>';
	var meta = { id: 'workersfixes' + mode, name: 'workersfixes', memory: 256, components: { probe: body }, design: {}, variables: {} };
	FlowStreamWorker.init(meta, mode, function(err, instance) {
		var ts = Date.now();
		var check = function() {
			var value = Fs.existsSync(out) ? Fs.readFileSync(out, 'utf8') : '';
			if (value || Date.now() - ts > 10000) {
				instance.flow.$destroyed = true;
				if (instance.flow.terminate)
					instance.flow.terminate();
				else
					instance.flow.kill('SIGKILL');
				callback(value ? +value : null);
			} else
				setTimeout(check, 100);
		};
		check();
	});
}

Test.push('Workers fixes', function(next) {

	var arr = [];

	// NEWTHREAD(): "isfork" is false and the data come from the parent
	arr.push(function(resume) {
		var worker = NEWTHREAD('~' + PROBE, { user: 'x' });
		probe(worker, function(msg) {
			worker.terminate();
			Test.print('NEWTHREAD() reports isfork false', msg.isfork === false ? null : 'isfork is ' + msg.isfork);
			Test.print('NEWTHREAD() passes the data', msg.data && msg.data.user === 'x' ? null : 'Unexpected data: ' + JSON.stringify(msg.data));
			resume();
		});
	});

	// NEWFORK(): "isfork" is true and "--worker" reaches the child
	arr.push(function(resume) {
		var worker = NEWFORK('~' + PROBE);
		probe(worker, function(msg) {
			worker.terminate();
			Test.print('NEWFORK() reports isfork true', msg.isfork === true ? null : 'isfork is ' + msg.isfork);
			Test.print('NEWFORK() reports worker.is true', msg.is === true ? null : 'worker.is is ' + msg.is);
			resume();
		});
	});

	// NEWTHREADPOOL(): "count", "worker.data" and the replacement of a worker that exits
	arr.push(function(resume) {
		var pool = NEWTHREADPOOL('~' + PROBE, 2);
		Test.print('NEWTHREADPOOL() count is the number of workers', pool.count === 2 ? null : 'count is ' + typeof(pool.count));
		pool.exec(function(worker) {
			probe(worker, function(msg) {
				Test.print('NEWTHREADPOOL() worker.data is an object', msg.data && typeof(msg.data) === 'object' ? null : 'worker.data is ' + JSON.stringify(msg.data));
				worker.terminate();
				setTimeout(function() {
					Test.print('NEWTHREADPOOL() replaces a worker that exits', pool.workers.length === 2 && pool.workers.indexOf(worker) === -1 ? null : 'The worker was not replaced');
					for (var w of pool.workers) {
						w.removeAllListeners('exit');
						w.terminate();
					}
					resume();
				}, 500);
			});
		});
	});

	// TRANSFORM() without a callback: $.invalid() rejects the Promise
	arr.push(function(resume) {
		NEWTRANSFORM('workersfixes', $ => $.invalid('nope'));
		var timeout = setTimeout(function() {
			Test.print('TRANSFORM() rejects on $.invalid()', 'The Promise never settled');
			resume();
		}, 2000);
		TRANSFORM('workersfixes', {}).then(function() {
			clearTimeout(timeout);
			Test.print('TRANSFORM() rejects on $.invalid()', 'The Promise was resolved');
			resume();
		}, function(err) {
			clearTimeout(timeout);
			Test.print('TRANSFORM() rejects on $.invalid()', err && (err + '').indexOf('nope') !== -1 ? null : 'Unexpected error: ' + err);
			resume();
		});
	});

	// FlowStream: $.send(null) to more outputs
	arr.push(function(resume) {

		var flow = FlowStream.create('workersfixes');
		var got = [];
		var ends = 0;

		flow.strict = false;
		flow.register('src', function(instance) {
			instance.message = $ => $.send(null);
		});
		flow.register('dst', function(instance) {
			instance.message = function($) {
				got.push(instance.id);
				$.end();
			};
		});

		var schema = { s: { component: 'src', connections: { '0': [{ id: 'a', index: '0' }], '1': [{ id: 'b', index: '0' }] } }, a: { component: 'dst' }, b: { component: 'dst' } };

		setTimeout(function() {
			flow.use(schema, function() {

				var msg = flow.meta.flow.s.newmessage({});
				msg.on('end', () => ends++);
				msg.to.message(msg);

				setTimeout(function() {
					Test.print('$.send(null) fires "end" once', ends === 1 && got.length === 2 ? null : '"end" fired ' + ends + ' times');

					got = [];
					flow.meta.flow.s.connections['0'][0].paused = true;
					msg = flow.meta.flow.s.newmessage({});
					msg.to.message(msg);

					setTimeout(function() {
						Test.print('$.send(null) reaches the next outputs when one is paused', got.join(',') === 'b' ? null : 'Received: ' + got.join(','));
						flow.destroy();
						resume();
					}, 300);
				}, 300);
			});
		}, 300);
	});

	// FlowStream: the "memory" key limits the heap
	arr.push(function(resume) {
		heaplimit('worker', function(value) {
			Test.print('FlowStream worker thread: memory limits the heap', value && value < 1024 ? null : 'heap_size_limit is ' + value + ' MB');
			heaplimit('fork', function(value) {
				Test.print('FlowStream fork: memory limits the heap', value && value < 1024 ? null : 'heap_size_limit is ' + value + ' MB');
				resume();
			});
		});
	});

	// Loading total5 from "node -e"
	arr.push(function(resume) {
		var index = JSON.stringify(Path.join(__dirname, '../../index'));
		F.Child.execFile(process.execPath, ['-e', 'require(' + index + '); process.exit(0);'], { cwd: TMP, timeout: 20000 }, function(err, stdout, stderr) {
			var output = stdout + stderr;
			Test.print('node -e loads the FlowStream module', output.indexOf('reading \'endsWith\'') === -1 ? null : output);
			resume();
		});
	});

	arr.async(function() {
		Fs.rmSync(TMP, { recursive: true, force: true });
		next();
	});
});

Test.run();
