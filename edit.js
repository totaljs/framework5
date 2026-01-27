// Total.js (Remote) Edit
// The MIT License
// Copyright 2020-2026 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const SKIP = /\/\.git\//;
const VERSION = 2;
const HEADER = '> Total.js Code Editor';
const DIVIDER = '----------------------------------------------------';

var DIRECTORY = '';

function makepath(path) {
	return path ? F.path.$join(DIRECTORY, path) : DIRECTORY;
}

exports.init = function(url, dir) {

	DIRECTORY = dir || F.directory;

	const client = F.websocketclient();
	let isopen = false;

	client.options.reconnect = 10000;
	client.options.reconnectserver = true;

	let initilaized = false;

	client.on('message', function(msg) {

		if (msg.TYPE === 'redirect') {
			if (msg.url) {
				client.close(3001);
				exports.init(msg.url);
			}
			return;
		}

		if (msg.TYPE === 'init') {
			console.log(DIVIDER);
			console.log(HEADER + ': Welcome to "' + msg.name + ' (' + msg.version + ')"');
			console.log('> Project: "' + msg.project + '"');
			console.log(DIVIDER);
			initilaized = true;
			return;
		}

		if (!initilaized)
			return;

		F.action('editor', msg).callback(function(err, response) {

			if (err) {
				msg.error = err;
			} else {
				msg.response = response;
				msg.success = true;
			}

			client.send(msg);
		});
	});

	client.on('open', function() {
		isopen = true;
		client.send({ TYPE: 'init', version: VERSION, total: F.version, node: F.version_node });
	});

	client.on('close', function(e) {

		initilaized = false;
		isopen = false;

		if (e === 4004) {
			console.log(HEADER + ': 404 project not found');
			// Tries again in 10 second interval
			// client.destroy();
			return;
		}

		if (e === 4009) {
			console.log(HEADER + ': 409 project is already open');
			// Tries again in 10 second interval
			// client.destroy();
			return;
		}

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

F.newaction('editor', {
	name: 'Code editor',
	input: '*TYPE,path,data,nocompress:Boolean',
	action: function($, model) {

		switch (model.TYPE) {

			case 'ping':
				$.success(VERSION);
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
	else
		validator = n => !SKIP.test(n) && (!skip || !skip.test(n));

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
	F.shell((model.data || '{0}').format(filename), $.callback);
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