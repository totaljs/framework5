// Total.js Edit
// The MIT License
// Copyright 2020-2023 (c) Peter Širka <petersirka@gmail.com>

'use strict';

const SKIP = /\/\.git\//;
const VERSION = 1;
const HEADER = '> Total.js Code Editor';
const DIVIDER = '----------------------------------------------------';

exports.init = function(url) {

	var client = F.websocketclient();

	client.options.reconnect = 10000;
	client.options.reconnectserver = true;

	client.on('message', function(msg) {

		if (msg.TYPE === 'init') {
			console.log(DIVIDER);
			console.log(HEADER + ': Welcome to "' + msg.name + ' (' + msg.version + ')"');
			console.log('> Project: "' + msg.project + '"');
			console.log(DIVIDER);
			return;
		}

		console.log(msg);

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
		client.send({ TYPE: 'init', version: VERSION });
	});

	client.on('close', function(e) {

		if (e === 4004) {
			console.log(HEADER + ': 404 project not found');
			// Tries again in 10 second interval
			// client.destroy();
			return;
		}

		if (e === 4009) {
			console.log(HEADER + ': 409 project is already open');
			client.destroy();
			return;
		}

	});

	client.on('error', function(err) {
		console.log(HEADER + ':', err.message);
	});

	client.connect(url.replace(/^http/, 'ws'));

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
	var a = '/';
	path = path.split('/').trim();
	path.wait(function(p, next) {
		a = a + p + '/';
		F.Fs.lstat(a, function(err) {
			if (err)
				F.Fs.mkdir(a, next);
			else
				next();
		});
	}, callback);
}

function browse($, model) {
	var path = F.path.root();
	var m = (model.data || '{}').parseJSON() || EMPTYARRAY;
	var skip = m.skip ? new RegExp(m.skip) : null;
	var validator;

	if (m.type === 'localization')
		validator = ((path, dir) => dir ? (path.endsWith('/databases') || path.endsWith('/node_modules') || path.endsWith('/tmp') || path.endsWith('/.git') || path.endsWith('/.src') || path.endsWith('/logs')) ? false : true : true);
	else
		validator = n => !SKIP.test(n) && (!skip || !skip.test(n));

	F.TUtils.ls(path, function(files, directories) {

		for (var i = 0; i < files.length; i++)
			files[i] = files[i].substring(path.length);

		for (var i = 0; i < directories.length; i++)
			directories[i] = directories[i].substring(path.length);

		if (m.type === 'localization') {
			var allowed = { html: 1, js: 1 };
			files = files.remove(n => allowed[F.TUtils.getExtension(n)] != 1);
		}

		$.callback({ files: files, directories: directories });

	}, validator);
}

function log($, model) {
	var filename = F.path.root(model.path);
	F.Fs.stat(filename, function(err, stats) {
		if (stats) {
			var start = stats.size - (1024 * 4); // Max. 4 kB
			if (start < 0)
				start = 0;
			var buffer = [];
			F.Fs.createReadStream(filename, { start: start < 0 ? 0 : start }).on('data', chunk => buffer.push(chunk)).on('end', function() {
				$.callback(Buffer.concat(buffer).toString('utf8'));
			});
		} else {
			$.callback('');
		}
	});
}

function clearlog($, model) {
	var filename = F.path.root(model.path);
	F.Fs.truncate(filename, NOOP);
	$.success();
}

function load($, model) {
	var filename = F.path.root(model.path);
	F.Fs.readFile(filename, function(err, data) {

		if (err) {
			$.invalid(err);
			return;
		}

		var index = -1;

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

function save($, model) {

	// Tries to create a folder
	var filename = F.path.root(model.path);
	var name = F.TUtils.getName(model.path);
	var directory = filename.substring(0, filename.length - name.length);

	F.Fs.mkdir(directory, { recursive: true }, function() {
		decodedata(model, function(err, buffer) {
			if (err)
				$.invalid(err);
			else
				F.Fs.writeFile(filename, buffer, $.done());
		});
	});
}

function remove($, model) {
	var filename = F.path.root(model.path);
	try {
		var stats = F.Fs.lstatSync(filename);
		if (stats.isFile()) {
			F.Fs.unlink(filename, NOOP);
		} else {
			if (stats.isDirectory())
				F.path.rmdir(filename);
			else
				F.Fs.unlink(filename, NOOP);
		}
	} catch (e) {}

	$.success();
}

function info($, model) {
	var filename = F.path.root(model.path);
	F.Fs.lstat(filename, $.callback);
}

function download($, model) {
	var filename = F.path.root(model.path);
	var ext = F.TUtils.getExtension(model.path);
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
							if (err)
								$.invalid(err);
							else
								$.callback({ type: F.TUtils.contentTypes[ext], data: buffer.toString('base64') });
						});
					}
				});
			}
		}
	});
}

function send($, model) {
	var filename = F.path.root(model.path);
	F.Fs.fstat(filename, function() {
		var opt = {};
		opt.method = 'GET';
		opt.url = model.data;
		opt.files = [{ name: F.TUtils.getName(filename), filename: filename }];
		opt.callback = $.done();
		REQUEST(opt);
	});
}

function customimport($, model) {
	var filename = F.path.root(model.path);
	DOWNLOAD(model.data, filename, $.done());
}

const SchemaRename = F.TUtils.jsonschema('newpath:String,oldpath:String');

function rename($, model) {

	var data = SchemaRename.transform((model.data || '{}').parseJSON());
	if (data.error) {
		$.invalid(data.error);
		return;
	}

	data = data.response;

	data.newpath = F.path.root(data.newpath);
	data.oldpath = F.path.root(data.oldpath);

	mkdir(F.Path.dirname(data.newpath), function() {
		F.Fs.rename(data.oldpath, data.newpath, $.done());
	});
}

function create($, model) {

	var filename = F.path.root(model.path);
	var data = (model.data || '{}').parseJSON();

	F.Fs.lstat(filename, function(err) {

		if (err) {
			// file not found
			// we can continue
			if (data.folder) {
				if (model.clone)
					F.Fs.cp(F.path.root(data.clone), filename, { recursive: true, force: true }, $.done());
				else
					mkdir(filename, $.done());
			} else {
				var name = F.TUtils.getName(filename);
				mkdir(filename.substring(0, filename.length - name.length), function() {
					if (data.clone)
						F.Fs.copyFile(F.path.root(data.clone), filename, $.done());
					else
						F.Fs.writeFile(filename, '', $.done());
				});
			}
		} else
			$.invalid('path', model.path + ' already exists');
	});
}

function upload($, model) {
	var name = F.TUtils.getName(model.path);
	var filename = F.path.root(model.path);
	var directory = F.path.root(model.path.substring(0, model.length - name.length));
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
	var filename = F.path.root(model.path);
	var dt = new Date();
	F.Fs.utimes(filename, dt, dt, NOOP);
	$.success();
}

function wiki($) {

	var path = F.path.root();

	F.TUtils.ls(path, function(files) {

		var builder = [];

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
	var opt = {};
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