// Remote edit actions for AI LLM (BETA)
// The MIT License
// Copyright 2026 (c) Peter Širka <petersirka@gmail.com> | Total.js

const REVISIONS = MEMORIZE('revisions');
const CONCAT = [];

// Communication
const HEADER = '> Total.js MCP proxy';
const DIVIDER = '----------------------------------------------------';
const VERSION = 1;
const ADMIN = { id: 'ai', name: 'AI', sa: true };
const WSCLIENTS = [];
const ERR_OFFLINE = 'App is offline.';

if (!REVISIONS.paths)
	REVISIONS.paths = {};

let isPROXY = false;

function findclient($) {
	// MCP REST endpoint and ?id=APPID
	// All MCP websocket clients contains ?id=APPID
	let id = $.config.id;
	for (let client of WSCLIENTS) {
		if (client.query.id === id) {
			if (!client.callbacks)
				client.callbacks = {};
			return client;
		}
	}
}

NEWACTION('App_info', {
	summary: `Returns general information about the current project, including its name, framework, version, runtime, and other relevant project metadata. Use it to understand the project environment before inspecting or modifying the project.

IMPORTANT: When documentation is provided, consult the documentation
before implementing or modifying framework-specific code. Follow links
from the documentation as needed and prefer it over assumptions or
general framework knowledge.`,
	output: 'name,version,hostname,framework,node,platform,documentation',
	internal: 'mcp',
	action: async function($) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		let stats = EMPTYOBJECT;
		try {
			stats = (await Total.readfile(process.mainModule.filename + '.json', 'utf8')).parseJSON(true);
		} catch {}

		let app = stats?.stats[0]?.app;

		let response = {};
		response.documentation = 'https://github.com/totaljs/aicontext/blob/main/readme.md';
		response.name = app?.name;
		response.version = stats?.stats[0]?.version?.app;
		response.hostname = app?.url;
		response.framework = 'Total.js v' + Total.version_header + ' (build ' + Total.version + ')';
		response.node = process.version;
		response.platform = Total.Os.platform();
		$.callback(response);
	}
});

NEWACTION('App_tree', {
	summary: 'Returns the project directory structure as a flat list of files and directories. Use this tool to inspect the project structure and locate files before reading or modifying them. File contents are not included.',
	output: 'items:[path,type,size:Number,modified:Date]',
	internal: 'mcp',
	action: function($) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		let root = PATH.root();

		Utils.ls2(root, function(files, dirs) {

			let builder = [];

			for (let m of dirs)
				builder.push({ path: m.substring(root.length), type: 'directory' });

			for (let m of files) {
				if (m.stats.isFile())
					builder.push({ path: m.filename.substring(root.length), type: 'file', size: m.stats.size, modified: m.stats.mtime });
			}

			$.callback({ items: builder });

		}, function(path) {

			path = path.substring(root.length);

			if (path.startsWith('/.git/'))
				return false;

			if (path.startsWith('/index.js'))
				return false;

			if (path.startsWith('/tmp/'))
				return false;

			if (path.startsWith('/databases/fs-'))
				return false;

			return true;
		});

	}
});

NEWACTION('App_read', {
	summary: 'Reads the contents of one or more project files. Use it to inspect existing code and configuration before making changes.',
	input: '*paths:[String]',
	output: 'items:[path,error:String2,content,revision:Number]',
	internal: 'mcp',
	action: async function($, model) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id, input: model });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		let builder = [];
		model.paths.wait(async function(filename, next) {

			Total.Fs.readFile(PATH.root(filename), 'utf8', function(err, response) {
				let obj = {};

				obj.path = filename;

				if (err) {
					obj.error = 'FILE_NOT_FOUND';
				} else {
					obj.content = response;
					obj.revision = REVISIONS.paths[filename]?.revision || 0;
				}

				builder.push(obj);
				next();
			});
		}, () => $.callback({ items: builder }));
	}
});

NEWACTION('App_write', {
	summary: 'Creates or replaces a file in the application. Missing parent directories are created automatically. Use it to create new files or modify existing files. The file path must not end with a trailing slash "/".',
	input: '*path // Path to the file relative to the application root, content',
	output: 'path,revision:Number,created:Boolean',
	internal: 'mcp',
	action: async function($, model) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id, input: model });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		model.path = normalize(model.path);

		const filename = PATH.root(model.path);
		const backup = PATH.root('revisions');

		try {
			await Total.FsPromises.mkdir(Total.Path.dirname(filename), { recursive: true });
		} catch {}

		let stat = null;

		try {
			stat = await Total.FsPromises.lstat(filename);
		} catch {}

		let created = stat == null;

		try {
			await Total.FsPromises.writeFile(filename, model.content || '', 'utf8');
		} catch (e) {
			delete model.content;
			model.error = e.code;
			$.callback(model);
			return;
		}

		let rev = REVISIONS.paths[model.path] || 0;

		rev++;

		REVISIONS.paths[model.path] = rev;
		REVISIONS.save();

		let target = PATH.join(backup, HASH(model.path, true) + '_' + rev + '.rev');

		try {
			await Total.FsPromises.cp(filename, target);
		} catch (e) {
			delete model.content;
			model.error = e.code;
			$.callback(model);
			return;
		}

		let response = {};
		response.path = model.path;
		response.revision = rev;
		response.created = created;

		$.callback(response);
	}

});

NEWACTION('App_delete', {
	summary: 'Deletes a file or directory from the project. Use it only when the requested project change requires removing existing content.',
	input: '*path',
	output: 'path,error:String2,deleted:Boolean',
	internal: 'mcp',
	action: async function($, model) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id, input: model });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		model.path = normalize(model.path);

		if (model.path === '/') {
			model.error = 'You can\'t delete all files.';
			return;
		}

		let stat = null;

		const rem = [];
		const path = PATH.root(model.path);
		const backup = PATH.root('revisions');

		try {
			stat = await Total.FsPromises.stat(path);
		} catch (e) {
			model.error = e.code;
			$.callback(model);
			return;
		}

		if (stat.isDirectory()) {
			await Total.FsPromises.rm(path, { recursive: true });
			model.deleted = true;
			$.callback(model);
			return;
		}

		let rev = REVISIONS.paths[model.path];
		let bkfilename = PATH.join(backup, HASH(model.path) + '_{0}.rev');

		for (let i = 1; i <= rev; i++) {
			let target = bkfilename.format(i);
			rem.push(target);
		}

		delete REVISIONS.paths[model.path];
		REVISIONS.save();

		// Remove all revisions
		rem.wait(function(filename, next) {
			Total.Fs.unlink(filename, next);
		}, function() {
			Total.Fs.unlink(PATH.root(model.path), function(err) {
				if (err)
					model.error = 'FILE_NOT_FOUND';
				else
					model.deleted = true;
				$.callback(model);
			});
		});
	}
});

NEWACTION('App_restore', {
	summary: 'Restores a file from a historical revision. Use it to recover a previous version of a modified or deleted file.',
	input: '*path,*revision:Number',
	output: 'content,error:String2',
	internal: 'mcp',
	action: async function($, model) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id, input: model });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		model.path = normalize(model.path);

		const backup = PATH.root('revisions');

		try {
			model.content = await Total.FsPromises.readFile(PATH.join(backup, HASH(model.path, true) + '_{0}.rev'.format(model.revision)), 'utf8');
		} catch (e) {
			model.error = 'REVISION_NOT_FOUND';
		}

		$.callback(model);
	}
});

NEWACTION('App_move', {
	summary: 'Moves or renames a file or directory within the project. Use it to change the location or name of existing project files and directories.',
	input: '*from,*to',
	output: 'from,to,error:String2,moved:Boolean',
	internal: 'mcp',
	action: async function($, model) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id, input: model });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		model.from = normalize(model.from);
		model.to = normalize(model.to);

		const frompath = PATH.root(model.from);
		const topath = PATH.root(model.to);
		const backup = PATH.root('revisions');

		let stat;

		try {
			stat = await Total.FsPromises.stat(frompath);
		} catch (e) {
			model.error = e.code;
			$.callback(model);
			return;
		}

		if (stat.isDirectory()) {

			let is = false;

			for (const key in REVISIONS.paths) {
				if (key.startsWith(model.from)) {

					const target = PATH.join(model.to, key.substring(model.from.length));
					const filename1 = PATH.join(backup, HASH(key, true) + '_{0}.rev');
					const filename2 = PATH.join(backup, HASH(target, true) + '_{0}.rev');

					REVISIONS.paths[target] = REVISIONS.paths[key];
					delete REVISIONS.paths[key];
					is = true;

					for (let i = 1; i <= REVISIONS.paths[key]; i++) {
						try {
							await Total.FsPromises.rename(filename1.format(i), filename2.format(i));
						} catch {}
					}
				}
			}

			is && REVISIONS.save();
			await Total.FsPromises.rename(frompath, topath);
			model.moved = true;
			$.callback(model);
			return;
		}

		let rev = REVISIONS.paths[model.from];
		let move = [];
		let path = PATH.root(model.to);

		let revfrom = PATH.join(backup, HASH(model.from, true) + '_{0}.rev');
		let revto = PATH.join(backup, HASH(model.to, true) + '_{0}.rev');

		for (let i = 1; i <= rev; i++)
			move.push({ from: revfrom.format(i), to: revto.format(i) });

		delete REVISIONS.paths[model.from];
		REVISIONS.paths[model.to] = rev;
		REVISIONS.save();

		// Remove all revisions
		move.wait(function(item, next) {
			Total.Fs.rename(item.from, item.to, next);
		}, function() {
			Total.Fs.mkdir(Total.Path.dirname(path), { recursive: true }, function(err) {

				if (err) {
					model.error = err.code;
					$.callback(model);
					return;
				}

				Total.Fs.rename(PATH.root(model.from), path, function(err) {
					if (err)
						model.error = err.code;
					else
						model.moved = true;
					$.callback(model);
				});
			});
		});
	}
});

NEWACTION('App_restart', {
	summary: 'Forces a restart of the running project application. Use it only when an explicit restart is needed, as file changes are normally detected and restarted automatically by the project watcher.',
	output: 'success:Boolean',
	internal: 'mcp',
	action: function($) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		Total.restart && Total.restart();
		$.success();
	}
});

NEWACTION('App_mkdir', {
	summary: 'Creates a directory at the specified project-relative path, including any missing parent directories.',
	input: '*path',
	output: 'path,error:String2,created:Boolean',
	internal: 'mcp',
	action: function($, model) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id, input: model });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		model.path = normalize(model.path);
		Total.Fs.mkdir(model.path, { recursive: true }, function(err) {
			if (err)
				model.error = err.code;
			else
				model.created = true;
			$.callback(model);
		});
	}
});

NEWACTION('App_logs', {
	summary: 'Returns the latest 4 KB of the project\'s console output and runtime logs. Use this action to inspect recent errors, warnings, application output, and runtime behavior after making changes.',
	output: 'output,truncated:Boolean',
	internal: 'mcp',
	action: function($) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		let filename = PATH.root('logs/debug.log');
		Total.Fs.stat(filename, function(err, stats) {

			const response = {};

			response.truncated = true;
			response.output = '';

			if (stats) {

				let start = stats.size - (1024 * 4); // Max. 4 kB
				if (start < 0)
					start = 0;

				const buffer = [];

				Total.Fs.createReadStream(filename, { start: start < 0 ? 0 : start }).on('data', chunk => buffer.push(chunk)).on('end', function() {
					response.output = Buffer.concat(buffer).toString('utf8');
					$.callback(response);
				});

			} else
				$.callback(response);

		});
	}
});

NEWACTION('App_search', {
	summary: 'Searches for text across project files and returns matching file paths, line numbers, character indexes and matching lines. Use it to locate code, references, routes, functions, variables, or configuration before reading or modifying files.',
	input: '*search',
	output: 'items:[path,line:Number,ch:Number,text],truncated:Boolean',
	internal: 'mcp',
	action: function($, model) {

		// WS Client
		if (isPROXY) {
			const client = findclient($);
			if (client) {
				let id = GUID(10);
				client.callbacks[id] = $;
				client.send({ id: id, name: $.id, input: model });
			} else
				$.invalid(ERR_OFFLINE);
			return;
		}

		const root = PATH.root();
		const ext = { txt: 1, md: 1, js: 1, css: 1, htm: 1, html: 1 };
		const response = {};
		const limit = 100;

		response.items = [];
		response.truncated = false;

		Utils.ls(root, function(files) {

			files.wait(function(filename, next) {

				if (response.items.length >= limit) {
					response.truncated = true;
					next();
					return;
				}

				const stream = Total.Fs.createReadStream(filename);
				const name = filename.substring(root.length);
				let count = 0;

				stream.on('end', next);
				stream.on('error', next);

				stream.on('data', customstreamer(function(line, lineindex) {

					if (count > 20)
						return;

					const index = line.indexOf(model.search);

					if (index !== -1) {
						let beg = index - 20;
						if (beg < 0)
							beg = 0;
						response.items.push({ path: name, line: lineindex + 1, ch: index, text: line.substring(beg).max(50, '...').trim() });
						count++;
					}

				}, stream));

			}, function() {
				$.callback(response);
			}, 3);

		}, function(path, isdir) {

			path = path.substring(root.length);

			if (path.startsWith('/index.js'))
				return false;

			if (path.startsWith('/tmp/'))
				return false;

			if (path.startsWith('/databases/'))
				return false;

			if (!isdir)
				return ext[Utils.getExtension(path)] === 1;

			return true;
		});
	}
});

function customstreamer(callback, stream, done) {

	var indexer = 0;
	var buffer = Buffer.alloc(0);
	var canceled = false;
	var fn;
	var beg = Buffer.from('\n', 'utf8');

	var length = beg.length;
	fn = function(chunk) {

		if (!chunk || canceled)
			return;

		CONCAT[0] = buffer;
		CONCAT[1] = chunk;

		var f = 0;

		if (buffer.length) {
			f = buffer.length - beg.length;
			if (f < 0)
				f = 0;
		}

		buffer = Buffer.concat(CONCAT);

		var index = buffer.indexOf(beg, f);
		if (index === -1)
			return;

		while (index !== -1) {

			if (callback(buffer.toString('utf8', 0, index + length), indexer++) === false)
				canceled = true;

			if (canceled)
				return;

			buffer = buffer.slice(index + length);
			index = buffer.indexOf(beg);
			if (index === -1)
				return;
		}
	};

	stream && stream.on('end', function() {
		callback(buffer.toString('utf8'), indexer);
		done && done();
	});

	return fn;
}

function normalize(path) {
	return (path[0] !== '/' ? (path + '/') : path).replace(/\/{2,}/g, '/').replace(/\.{2,}/, 'ERROR');
}

exports.init = function(url) {

	isPROXY = false;

	const client = Total.websocketclient();
	let isopen = false;

	client.options.reconnect = 10000;
	client.options.reconnectserver = true;

	let initialized = false;

	client.on('message', async function(msg) {

		if (msg.TYPE === 'redirect') {
			if (msg.url) {
				client.close(3001);
				exports.init(msg.url);
			}
			return;
		}

		if (msg.TYPE === 'init') {
			console.log(DIVIDER);
			console.log(HEADER + ': ' + msg.name + ' (' + msg.version + ')');
			console.log(DIVIDER);
			initialized = true;
			return;
		}

		if (!initialized)
			return;

		// INPUT:
		// msg.id {String}
		// msg.name {String}
		// msg.input {Object}

		// OUTPUT:
		// res.id {String}
		// res.error {String}
		// res.output {Object}

		// call actions
		let action = Total.actions[msg.name || msg.action];
		let res = {};

		res.id = msg.id;

		if (!action || action.internal !== 'mcp') {
			res.error = 'Unknown tool: ' + msg.name;
			client.send(res);
			return;
		}

		try {
			res.output = await ACTION(msg.name, msg.input).user(ADMIN).promise();
		} catch (e) {
			res.error = e.toString();
		}

		client.send(res);
	});

	client.on('open', function() {
		isopen = true;
		client.send({ TYPE: 'init', version: VERSION, total: Total.version, node: Total.version_node });
	});

	client.on('close', function(e) {
		initialized = false;
		isopen = false;
		e && console.log(HEADER + ': ' + e.toString().replace('00', '0'));
	});

	client.on('error', function(err) {
		console.log(HEADER + ':', err.message);
	});

	client.connect(url.replace(/^http/, 'ws'));

	setInterval(function() {
		if (client && isopen)
			client.ping();
	}, 30000);

};

exports.proxy = function(socket) {

	isPROXY = true;

	socket.on('close', function(client) {
		console.log('MCP edit --> disconnected:', client.ip, client.query.id);
		if (client.callbacks) {
			for (let key in client.callbacks)
				client.callbacks[key].invalid('Timeout');
			delete client.callbacks;
		}
		const index = WSCLIENTS.indexOf(client);
		if (index !== -1)
			WSCLIENTS.splice(index, 1);
	});

	socket.on('message', function(client, msg) {

		if (msg.TYPE === 'init') {
			// client.query.id --> APPID
			console.log('MCP edit --> connected:', client.ip, client.query.id);
			WSCLIENTS.push(client);
			client.send({ TYPE: 'init', name: CONF.name, version: CONF.version });
			return;
		}

		if (msg.id) {

			let $ = null;

			if (client.callbacks)
				$ = client.callbacks[msg.id];

			if ($) {
				if (msg.error)
					$.invalid(msg.error);
				else
					$.callback(msg.output);
				delete client.callbacks[msg.id];
			}

		}
	});

};

/*
?id=APPID for WebSocket clients
?id=APPID for MCP REST endpoints
ROUTE('SOCKET /$mcp/', function($) {
	exports.proxy($);
});*/