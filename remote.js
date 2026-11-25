// Total.js Remote
// A remote access to the project: the Total.js Code Editor and the MCP tools for AI LLM (BETA)
// The MIT License
// Copyright 2020-2026 (c) Peter Širka <petersirka@gmail.com>

'use strict';

// Usage:
// require('total5/remote').edit(url, [dir]);   connects the project to the Total.js Code Editor
// require('total5/remote').mcp(url);           connects the project to the Total.js MCP proxy
// require('total5/remote').proxy(socket);      the MCP proxy: it forwards the MCP tools to the connected projects
// require('total5/remote').tools();            registers the MCP tools "App_*" only
//
// The file has three parts:
// 1. Connection      the WebSocket client that both the Code Editor and the MCP proxy use
// 2. Code Editor     the action "editor" and its commands
// 3. MCP             the tools "App_*", the client of the MCP proxy and the MCP proxy

const DIVIDER = '----------------------------------------------------';

// Code Editor
const EDITOR_HEADER = '> Total.js Code Editor';
const EDITOR_VERSION = 2;
const SKIP = /\/\.git\//;

var DIRECTORY = '';

// MCP
const MCP_HEADER = '> Total.js MCP proxy';
const MCP_VERSION = 1;
const RULE = 'mcp';
const ERR_OFFLINE = 'App is offline.';
const WSCLIENTS = [];
const CONCAT = [];

let REVISIONS = null;
let ADMIN = null;
let isPROXY = false;

// ====================================================
// 1. Connection
// ====================================================

// Connects the project to a remote server and keeps the connection alive
// opt.header {String} a prefix of the messages in the console
// opt.version {Number} a version of the protocol
// opt.welcome {Function(msg)} prints the welcome message
// opt.message {Function(client, msg)} processes a message from the server
// opt.close {Function(code)} optional
function connect(url, opt) {

	const client = F.websocketclient();
	let isopen = false;
	let initialized = false;
	let interval = null;

	client.options.reconnect = 10000;
	client.options.reconnectserver = true;

	client.on('message', function(msg) {

		if (msg.TYPE === 'redirect') {
			if (msg.url) {
				clearInterval(interval);
				client.close(3001);
				connect(msg.url, opt);
			}
			return;
		}

		if (msg.TYPE === 'init') {
			console.log(DIVIDER);
			opt.welcome(msg);
			console.log(DIVIDER);
			initialized = true;
			return;
		}

		initialized && opt.message(client, msg);
	});

	client.on('open', function() {
		isopen = true;
		client.send({ TYPE: 'init', version: opt.version, total: F.version, node: F.version_node });
	});

	client.on('close', function(code) {
		initialized = false;
		isopen = false;
		opt.close && opt.close(code);
	});

	client.on('error', function(err) {
		console.log(opt.header + ':', err.message);
	});

	client.connect(url.replace(/^http/, 'ws'));

	interval = setInterval(function() {
		isopen && client.ping();
	}, 30000);
}

// ====================================================
// 2. Code Editor
// ====================================================

// Connects the project to the Total.js Code Editor
// url {String} e.g. "wss://www.yourcodeinstance.com/?id=projectname"
// dir {String} optional, a directory of the project (default: F.directory)
exports.edit = function(url, dir) {

	DIRECTORY = dir || F.directory;
	editor();

	connect(url, {
		header: EDITOR_HEADER,
		version: EDITOR_VERSION,
		welcome: function(msg) {
			console.log(EDITOR_HEADER + ': Welcome to "' + msg.name + ' (' + msg.version + ')"');
			console.log('> Project: "' + msg.project + '"');
		},
		message: function(client, msg) {
			F.action('editor', msg).callback(function(err, response) {

				if (err) {
					msg.error = err;
				} else {
					msg.response = response;
					msg.success = true;
				}

				client.send(msg);
			});
		},
		close: function(code) {
			// The client tries again in 10 second interval
			if (code === 4004)
				console.log(EDITOR_HEADER + ': 404 project not found');
			else if (code === 4009)
				console.log(EDITOR_HEADER + ': 409 project is already open');
		}
	});
};

function makepath(path) {
	return path ? F.path.$join(DIRECTORY, path) : DIRECTORY;
}

// Registers the action "editor" (once)
function editor() {

	if (editor.registered)
		return;

	editor.registered = true;

	F.newaction('editor', {
		name: 'Code editor',
		input: '*TYPE,path,data,nocompress:Boolean',
		action: function($, model) {

			switch (model.TYPE) {

				case 'ping':
					$.success(EDITOR_VERSION);
					break;

				// Browse files
				case 'browse':
					browse($, model);
					break;

				// Restart
				case 'restart':
					restart($);
					break;

				// Download
				case 'download':
					download($, model);
					break;

				// import
				case 'import':
					customimport($, model);
					break;

				// upload
				case 'send':
					send($, model);
					break;

				// exec
				case 'exec':
					// model.data = command, e.g. "sh {0}" (default: empty = auto handling)
					// model.path = file to execute
					exec($, model);
					break;

				// Creates file/directory
				case 'create':
					create($, model);
					break;

				// Loads file
				case 'load':
					load($, model);
					break;

				// Saves file
				case 'save':
					save($, model);
					break;

				// Removes file
				case 'remove':
					remove($, model);
					break;

				// Modifies file
				case 'modify':
					modify($, model);
					break;

				// Reads info about the file
				case 'info':
					info($, model);
					break;

				// Reads log file
				case 'log':
					log($, model);
					break;

				case 'rename':
					rename($, model);
					break;

				case 'upload':
					upload($, model);
					break;

				// Clears log
				case 'logclear':
					clearlog($, model);
					break;

				case 'wiki':
					wiki($, model);
					break;

				case 'ip':
					ipaddress($, model);
					break;

				default:
					$.invalid(400);
					break;
			}
		}
	});
}

function mkdir(path, callback) {
	F.Fs.mkdir(path, { recursive: true }, callback);
}

function browse($, model) {
	const path = makepath();
	const m = (model.data || '{}').parseJSON() || EMPTYARRAY;
	const skip = m.skip ? new RegExp(m.skip) : null;
	let validator;

	if (m.type === 'localization')
		validator = ((path, dir) => dir ? (path.endsWith('/databases') || path.endsWith('/node_modules') || path.endsWith('/tmp') || path.endsWith('/.git') || path.endsWith('/.src') || path.endsWith('/logs')) ? false : true : true);
	else {
		// The rules are tested on the path inside the app: on the absolute one, an app inside a folder called tmp, logs
		// or databases (/tmp/shop/, /home/user/logs/app/) skipped all of its files
		validator = function(n) {
			n = n.substring(path.length);
			return !SKIP.test(n) && (!skip || !skip.test(n));
		};
	}

	F.TUtils.ls(path, function(files, directories) {

		for (let i = 0; i < files.length; i++)
			files[i] = files[i].substring(path.length);

		for (let i = 0; i < directories.length; i++)
			directories[i] = directories[i].substring(path.length);

		if (m.type === 'localization') {
			const allowed = { html: 1, js: 1 };
			files = files.remove(n => allowed[F.TUtils.getExtension(n)] != 1);
		}

		$.callback({ files: files, directories: directories });

	}, validator, true);
}

function log($, model) {
	const filename = F.Path.normalize(makepath(model.path));
	F.Fs.stat(filename, function(err, stats) {
		if (stats) {
			let start = stats.size - (1024 * 4); // Max. 4 kB
			if (start < 0)
				start = 0;
			const buffer = [];
			F.Fs.createReadStream(filename, { start: start < 0 ? 0 : start }).on('data', chunk => buffer.push(chunk)).on('end', function() {
				$.callback(Buffer.concat(buffer).toString('utf8'));
			});
		} else {
			$.callback('');
		}
	});
}

function clearlog($, model) {
	const filename = makepath(model.path);
	F.Fs.truncate(filename, NOOP);
	$.success();
}

function load($, model) {
	const filename = F.Path.normalize(makepath(model.path));
	F.Fs.readFile(filename, function(err, data) {

		if (err) {
			$.invalid(err);
			return;
		}

		let index = -1;

		while (true) {
			index += 1;
			if (data.length <= index || data[index] !== 0)
				break;
		}

		if (index !== -1)
			data = data.slice(index);

		encodedata(model, data, function(err, buffer) {
			if (err)
				$.invalid(err);
			else
				$.callback({ type: F.TUtils.contentTypes[F.TUtils.getExtension(model.path)], data: buffer.toString('base64') });
		});
	});
}

function restart($) {
	F.restart();
	$.success();
}

function save($, model) {

	// Tries to create a folder
	const filename = makepath(model.path);
	const name = F.TUtils.getName(model.path);
	const directory = F.Path.normalize(filename.substring(0, filename.length - name.length));

	mkdir(directory, function() {
		decodedata(model, function(err, buffer) {
			if (err)
				$.invalid(err);
			else
				F.Fs.writeFile(F.Path.normalize(filename), buffer, $.done());
		});
	});
}

function remove($, model) {
	const filename = F.Path.normalize(makepath(model.path));
	try {
		const stats = F.Fs.lstatSync(filename);
		if (stats.isFile()) {
			F.Fs.unlink(filename, NOOP);
		} else {
			if (stats.isDirectory())
				F.path.rmdir(filename);
			else
				F.Fs.unlink(filename, NOOP);
		}
	} catch {}

	$.success();
}

function info($, model) {
	const filename = F.Path.normalize(makepath(model.path));
	F.Fs.lstat(filename, $.callback);
}

function download($, model) {
	const filename = F.Path.normalize(makepath(model.path));
	F.Fs.lstat(filename, function(err, stats) {
		if (err || stats.isDirectory() || stats.isSocket()) {
			$.status = 400;
			$.invalid('400', 'error-file');
		} else {
			// Max. 5 MB
			if (stats.size > (1024 * 1024 * 5)) {
				$.invalid('Too large');
			} else {
				F.Fs.readFile(filename, function(err, data) {
					if (err) {
						$.invalid(err);
					} else {
						encodedata(model, data, function(err, buffer) {
							if (err) {
								$.invalid(err);
							} else {
								const ext = F.TUtils.getExtension(model.path);
								$.callback({ type: F.TUtils.contentTypes[ext], data: buffer.toString('base64') });
							}
						});
					}
				});
			}
		}
	});
}

function send($, model) {
	const filename = F.Path.normalize(makepath(model.path));
	F.Fs.fstat(filename, function() {
		const opt = {};
		opt.method = 'GET';
		opt.url = model.data;
		opt.files = [{ name: F.TUtils.getName(filename), filename: filename }];
		opt.callback = $.done();
		REQUEST(opt);
	});
}

function exec($, model) {

	const ext = U.getExtension(model.path);

	if (!model.data) {
		switch (ext) {
			case 'js':
				model.data = process.argv[0] + ' {0}';
				break;
			case 'sh':
				model.data = 'sh {0}';
				break;
		}
	}

	const filename = F.Path.normalize(makepath(model.path));

	F.shell((model.data || '{0}').format(filename), function(err, a, b) {
		if (err) {
			$.invalid(err);
		} else {
			let builder = [];
			if (b)
				builder.push(b);
			if (a)
				builder.push(a);
			$.callback(builder.join('\n'));
		}
	});
}

function customimport($, model) {
	const filename = F.Path.normalize(makepath(model.path));
	DOWNLOAD(model.data, filename, $.done());
}

const SchemaRename = F.TUtils.jsonschema('newpath:String,oldpath:String');

function rename($, model) {

	let data = SchemaRename.transform((model.data || '{}').parseJSON());
	if (data.error) {
		$.invalid(data.error);
		return;
	}

	data = data.response;

	data.newpath = F.Path.normalize(makepath(data.newpath));
	data.oldpath = F.Path.normalize(makepath(data.oldpath));

	mkdir(F.Path.dirname(data.newpath), function() {
		F.Fs.rename(data.oldpath, data.newpath, $.done());
	});
}

function create($, model) {

	// model.path {String}
	// model.data {Object}
	// model.data.clone {String}
	// model.data.folder {Boolean}

	const filename = F.Path.normalize(makepath(model.path));
	const data = (model.data || '{}').parseJSON();

	F.Fs.lstat(filename, function(err) {

		if (err) {
			// file not found
			// we can continue
			if (data.folder) {
				if (model.clone)
					F.Fs.cp(F.Path.normalize(makepath(data.clone)), filename, { recursive: true, force: true }, $.done());
				else
					mkdir(filename, $.done());
			} else {
				const name = F.TUtils.getName(filename);
				mkdir(filename.substring(0, filename.length - name.length), function() {
					if (data.clone)
						F.Fs.copyFile(F.Path.normalize(makepath(data.clone)), filename, $.done());
					else
						F.Fs.writeFile(filename, '', $.done());
				});
			}
		} else
			$.invalid('path', model.path + ' already exists');
	});
}

function upload($, model) {
	const name = F.TUtils.getName(model.path);
	const filename = F.Path.normalize(makepath(model.path));
	const directory = F.Path.normalize(makepath(model.path.substring(0, model.length - name.length)));
	mkdir(directory, function() {
		decodedata(model, function(err, buffer) {
			if (err)
				$.invalid(err);
			else
				F.Fs.writeFile(filename, buffer, $.done());
		});
	});
}

function modify($, model) {
	const filename = makepath(model.path);
	const dt = new Date();
	F.Fs.utimes(filename, dt, dt, NOOP);
	$.success();
}

function wiki($) {

	const path = F.Path.normalize(PATH.root());

	F.TUtils.ls(path, function(files) {

		const builder = [];

		files.wait(function(item, next) {

			if (item.substring(item.length - 3) === '.js') {
				F.Fs.readFile(item, function(err, buffer) {
					if (buffer) {
						builder.push(buffer.toString('utf8'));
						builder.push('');
					}
					next();
				});
			} else
				next();

		}, function() {
			$.callback(builder.join('\n'));
			$.cancel();
		});

	}, path => (/schemas|controllers/).test(path));

}

function ipaddress($) {
	const opt = {};
	opt.url = 'https://ipecho.net/plain';
	opt.callback = function(err, response) {
		$.callback(response.body || 'undefined');
		$.cancel();
	};
	REQUEST(opt);
}

function decodedata(model, callback) {
	if (model.nocompress)
		callback(null, Buffer.from(model.data, 'base64'));
	else
		F.Zlib.inflate(Buffer.from(model.data, 'base64'), callback);
}

function encodedata(model, buffer, callback) {
	if (model.nocompress)
		callback(null, buffer);
	else
		F.Zlib.deflate(buffer, callback);
}

// ====================================================
// 3. MCP
// ====================================================

// Connects the project to the Total.js MCP proxy
// url {String} e.g. "https://yourtotalmcpserverinstance.com/?id=admin"
exports.mcp = function(url) {

	isPROXY = false;
	tools();

	connect(url, {
		header: MCP_HEADER,
		version: MCP_VERSION,
		welcome: function(msg) {
			console.log(MCP_HEADER + ': ' + msg.name + ' (' + msg.version + ')');
		},
		message: async function(client, msg) {

			// INPUT:
			// msg.id {String}
			// msg.name {String}
			// msg.input {Object}

			// OUTPUT:
			// res.id {String}
			// res.error {String}
			// res.output {Object}

			let action = Total.actions[msg.name || msg.action];
			let res = {};

			res.id = msg.id;

			if (!action || action.internal !== RULE) {
				res.error = 'Unknown tool: ' + msg.name;
				client.send(res);
				return;
			}

			try {
				res.output = await ACTION(msg.name, msg.input).env('mcp').user(ADMIN).promise();
			} catch (e) {
				res.error = e.toString();
			}

			client.send(res);
		},
		close: function(code) {
			code && console.log(MCP_HEADER + ': ' + code.toString().replace('00', '0'));
		}
	});
};

// The MCP proxy: the MCP tools are forwarded to the connected projects
// "?id=APPID" identifies the project (for the WebSocket clients and for the MCP endpoint)
//
// ROUTE('SOCKET /$mcp/', function($) {
// 	require('total5/remote').proxy($);
// });
exports.proxy = function(socket) {

	isPROXY = true;
	tools();

	for (let key in Total.actions) {
		let action = Total.actions[key];
		if (action.internal === RULE)
			action.mcp = true;
	}

	Total.mcp.refresh();

	socket.on('close', function(client) {
		Total.syslog('MCP edit --> disconnected: ' + client.ip + ' --> ' + client.query.id);
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
			Total.syslog('MCP edit --> connected: ' + client.ip + ' --> ' + client.query.id);
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

// Finds the connected project according to "?id=APPID" of the MCP endpoint
function findclient($) {
	let id = $.config.id;
	for (let client of WSCLIENTS) {
		if (client.query.id === id) {
			if (!client.callbacks)
				client.callbacks = {};
			return client;
		}
	}
}

// The MCP proxy forwards the tool to the connected project, it returns "true" when the tool is forwarded
function forward($, model) {

	if (!isPROXY)
		return false;

	const client = findclient($);

	if (client) {
		let id = GUID(10);
		client.callbacks[id] = $;
		client.send({ id: id, name: $.id, input: model });
	} else
		$.invalid(ERR_OFFLINE);

	return true;
}

// Registers the MCP tools "App_*" (once)
function tools() {

	if (tools.registered)
		return;

	tools.registered = true;

	REVISIONS = MEMORIZE('revisions');
	ADMIN = new User({ id: 'ai', name: 'AI', sa: true });

	if (!REVISIONS.paths)
		REVISIONS.paths = {};

	NEWACTION('App_info', {
		summary: `Returns general information about the current project, including its name, framework, version, runtime, and other relevant project metadata. Use it to understand the project environment before inspecting or modifying the project.

IMPORTANT: When documentation is provided, consult the documentation
before implementing or modifying framework-specific code. Follow links
from the documentation as needed and prefer it over assumptions or
general framework knowledge.`,
		output: 'name,version,hostname,framework,node,platform,documentation',
		internal: RULE,
		action: async function($) {

			if (forward($))
				return;

			let stats = EMPTYOBJECT;
			try {
				stats = (await Total.readfile(process.mainModule.filename + '.json', 'utf8')).parseJSON(true);
			} catch {}

			// The file with the stats doesn't exist when the tools run without the app (e.g. "total5 mcp")
			let app = stats?.stats?.[0]?.app;

			let response = {};
			response.documentation = 'https://github.com/totaljs/aicontext/blob/main/readme.md';
			response.name = app?.name;
			response.version = stats?.stats?.[0]?.version?.app;
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
		internal: RULE,
		action: function($) {

			if (forward($))
				return;

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
		internal: RULE,
		action: async function($, model) {

			if (forward($, model))
				return;

			let builder = [];
			model.paths.wait(async function(filename, next) {

				Total.Fs.readFile(PATH.root(filename), 'utf8', function(err, response) {
					let obj = {};

					obj.path = filename;

					if (err) {
						obj.error = 'FILE_NOT_FOUND';
					} else {
						obj.content = response;
						obj.revision = REVISIONS.paths[normalize(filename)] || 0;
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
		internal: RULE,
		action: async function($, model) {

			if (forward($, model))
				return;

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

	NEWACTION('App_shell', {
		summary: 'Executes a shell command on the remote computer in the remote project root and returns its output or error. Use it to inspect the environment, run project commands, build, test, or manage the remote project.',
		input: '*cmd',
		output: 'response,error:String2',
		internal: RULE,
		action: async function($, model) {

			if (forward($, model))
				return;

			try {
				const response = await SHELL(model.cmd, PATH.root());
				$.callback({ response: response });
			} catch (e) {
				$.callback({
					response: e.stdout || '',
					error: e.stderr || e.message || String(e)
				});
			}
		}
	});

	NEWACTION('App_delete', {
		summary: 'Deletes a file or directory from the project. Use it only when the requested project change requires removing existing content.',
		input: '*path',
		output: 'path,error:String2,deleted:Boolean',
		internal: RULE,
		action: async function($, model) {

			if (forward($, model))
				return;

			model.path = normalize(model.path);

			if (model.path === '/') {
				model.error = 'You can\'t delete all files.';
				$.callback(model);
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
				const prefix = model.path.endsWith('/') ? model.path : (model.path + '/');
				let is = false;
				for (const key in REVISIONS.paths) {
					if (key.startsWith(prefix)) {
						for (let i = 1; i <= REVISIONS.paths[key]; i++) {
							try {
								await Total.FsPromises.unlink(PATH.join(backup, HASH(key, true) + '_' + i + '.rev'));
							} catch {}
						}
						delete REVISIONS.paths[key];
						is = true;
					}
				}
				is && REVISIONS.save();
				await Total.FsPromises.rm(path, { recursive: true });
				model.deleted = true;
				$.callback(model);
				return;
			}

			let rev = REVISIONS.paths[model.path];
			let bkfilename = PATH.join(backup, HASH(model.path, true) + '_{0}.rev');

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
		internal: RULE,
		action: async function($, model) {

			if (forward($, model))
				return;

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
		internal: RULE,
		action: async function($, model) {

			if (forward($, model))
				return;

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
				const prefix = model.from.endsWith('/') ? model.from : (model.from + '/');

				for (const key in REVISIONS.paths) {
					if (key.startsWith(prefix)) {

						// The key is a project path with "/" (PATH.join() uses a backslash on Windows, so the moved revisions were not found)
						const target = normalize(model.to + key.substring(model.from.length));
						const filename1 = PATH.join(backup, HASH(key, true) + '_{0}.rev');
						const filename2 = PATH.join(backup, HASH(target, true) + '_{0}.rev');

						const count = REVISIONS.paths[key];
						REVISIONS.paths[target] = count;
						delete REVISIONS.paths[key];
						is = true;

						for (let i = 1; i <= count; i++) {
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
		internal: RULE,
		action: function($) {

			if (forward($))
				return;

			Total.restart && Total.restart();
			$.success();
		}
	});

	NEWACTION('App_mkdir', {
		summary: 'Creates a directory at the specified project-relative path, including any missing parent directories.',
		input: '*path',
		output: 'path,error:String2,created:Boolean',
		internal: RULE,
		action: function($, model) {

			if (forward($, model))
				return;

			model.path = normalize(model.path);
			Total.Fs.mkdir(PATH.root(model.path), { recursive: true }, function(err) {
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
		internal: RULE,
		action: function($) {

			if (forward($))
				return;

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
		internal: RULE,
		action: function($, model) {

			if (forward($, model))
				return;

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
}

exports.tools = tools;

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
	return (path[0] !== '/' ? ('/' + path) : path).replace(/\/{2,}/g, '/').replace(/\.{2,}/, 'ERROR');
}
