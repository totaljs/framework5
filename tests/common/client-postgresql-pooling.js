/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

const PORT = 8494;
const PGPORT = 8495;
const Net = require('net');
const PG = require('../../client-postgresql');

// A fake PostgreSQL server: it answers to the startup message with "AuthenticationOk" + "ReadyForQuery"
// and it closes the connection after the "Terminate" message
const READY = Buffer.from([82, 0, 0, 0, 8, 0, 0, 0, 0, 90, 0, 0, 0, 5, 73]);
var connections = 0;
var server = Net.createServer(function(socket) {
	var started = false;
	connections++;
	socket.on('error', NOOP);
	socket.on('data', function(chunk) {
		if (started) {
			chunk[0] === 88 && socket.end();
		} else {
			started = true;
			socket.write(READY);
		}
	});
});

CONF.$imprint = false;

F.run({ port: PORT, release: true, watcher: false });

ON('ready', function() {

	Test.push('PostgreSQL client: pooling in the connection string', function(next) {

		var errors = [];
		var check = (name, is, value) => !is && errors.push(name + (value == null ? '' : (': ' + JSON.stringify(value))));
		var url = 'postgresql://user:password@127.0.0.1:' + PGPORT + '/db';
		var connect = connstring => new Promise((resolve, reject) => PG.connect(connstring, (err, client) => err ? reject(err) : resolve(client)));

		server.listen(PGPORT, '127.0.0.1', async function() {

			try {

				// The pool takes the count of connections from the connection string
				check('pool() with "?pooling=4"', PG.pool(url + '?pooling=4').max === 4);
				check('pool() with "?pooling=true"', PG.pool(url + '?pooling=true').max === 2);
				check('pool() with the "max" argument', PG.pool(url + '?pooling=4', 2).max === 2);
				check('pool() without pooling', PG.pool(url).max === 4);
				check('pool() with "pooling" in the options', PG.pool({ host: '127.0.0.1', port: PGPORT, user: 'user', database: 'db', pooling: 3 }).max === 3);

				// Without pooling: each connect() is a new connection
				var single = await connect(url);
				check('connect() without pooling is a single connection', single instanceof PG.Client && !single.pool && connections === 1, connections);
				await new Promise(resolve => single.close(resolve));

				// With pooling: connections are shared
				connections = 0;
				var pool = PG.connect(url + '?pooling=2');
				check('connect() with pooling returns a shared pool', pool instanceof PG.Pool && pool.max === 2 && pool === PG.connect(url + '?pooling=2'));

				var a = await connect(url + '?pooling=2');
				check('A pooled connection', a.pool === pool && connections === 1, connections);
				a.close();

				var b = await connect(url + '?pooling=2');
				check('A closed connection is reused', a === b && connections === 1, connections);

				var c = await connect(url + '?pooling=2');
				check('A second connection is created', c !== b && connections === 2 && pool.clients.length === 2, connections);

				// The pool is full, the third request waits for a released connection
				var waiting = connect(url + '?pooling=2');
				await new Promise(resolve => setTimeout(resolve, 100));
				check('A full pool queues the request', pool.pending.length === 1 && connections === 2, pool.pending.length);
				b.close();
				var d = await waiting;
				check('A queued request gets a released connection', d === b && connections === 2, connections);

				c.close();
				d.close();

				await new Promise(resolve => PG.end(resolve));
				check('end() closes shared pools', pool.ended && pool.clients.length === 0, pool.clients.length);
				check('A new pool is created after end()', PG.connect(url + '?pooling=2') !== pool);
				await new Promise(resolve => PG.end(resolve));

			} catch (e) {
				errors.push(e + '');
			}

			server.close();
			Test.print('PostgreSQL client: "?pooling=N" in the connection string', errors.length ? errors.join('; ') : null);
			next();
		});
	});

	Test.run();
});
