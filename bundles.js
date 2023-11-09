// Total.js Bundles
// The MIT License
// Copyright 2018-2023 (c) Peter Širka <petersirka@gmail.com>

require('./index');

'use strict';

const CONSOLE = process.argv.indexOf('--restart') === -1;
const INTERNAL = { '/sitemap': 1, '/versions': 1, '/workflows': 1, '/dependencies': 1, '/config': 1, '/config-release': 1, '/config-debug': 1 };
const REG_APPEND = /\/--[a-z0-9]+/i;
const REG_APPENDREPLACE = /\/--/g;
const REG_BK = /(-|_)bk\.bundle$/i;

var META = {};

META.version = 1;
META.created = new Date();
META.total = 'v' + F.version_header;
META.node = F.version_node;
META.files = [];
META.skip = false;
META.directories = [];
META.ignore = () => true;

function extract(callback) {

	if (!callback)
		return new Promise(resolve => extract(resolve));

	var path = F.path.root();
	var ignore = {};

	if (CONSOLE) {
		console.log('--------------------- BUNDLING ---------------------');
		console.time('Done');
	}

	var isignore = false;

	try {
		META.ignore = makeignore(F.Fs.readFileSync(F.Path.join(path, '.bundleignore')).toString('utf8').split('\n'));
		isignore = true;
	} catch (e) {}

	if (!isignore) {
		try {
			META.ignore = makeignore(F.Fs.readFileSync(F.Path.join(path, '.bundlesignore')).toString('utf8').split('\n'));
		} catch (e) {}
	}

	ignore['/tmp/'] = 1;
	ignore['/bundles/'] = 1;
	ignore['/.src'] = 1;
	ignore['/logs/'] = 1;
	ignore['/node_modules/'] = 1;
	ignore['/bundles.debug'] = 1;
	ignore['/debug.pid'] = 1;
	ignore['/debug.js.json'] = 1;
	ignore['/release.js.json'] = 1;
	ignore['/release.pid'] = 1;
	ignore['/index.pid'] = 1;
	ignore['/index.js.json'] = 1;
	ignore['/package-lock.json'] = 1;
	ignore['/superadmin.pid'] = 1;
	ignore['/superadmin.socket'] = 1;

	var Files = [];
	var Dirs = [];
	var Merge = [];
	var Length = path.length;
	var async = [];

	async.push(cleanFiles);

	async.push(function(next) {
		META.skip && (async.length = 0);
		next();
	});

	async.push(function(next) {
		var target = F.path.root('/.src/');
		F.TUtils.ls(F.path.root('/bundles/'), function(files) {
			var dirs = {};
			files.wait(function(filename, resume) {

				if (!filename.endsWith('.bundle') || REG_BK.test(filename))
					return resume();

				if (CONSOLE)
					console.log('-----', F.TUtils.getName(filename));

				var dbpath = '/databases';
				var pathupdate = '/updates/';
				var pathstartup = '/startup';

				F.restore(filename, target, resume, function(p, dir) {

					if (dir) {
						if (!p.startsWith(dbpath) && META.directories.indexOf(p) === -1)
							META.directories.push(p);
					} else {

						var dirname = p.substring(0, p.length - F.TUtils.getName(p).length);
						if (dirname && dirname !== '/')
							dirs[dirname] = true;

						// handle files in bundle to merge
						var mergeme = 0;

						if (REG_APPEND.test(p)) {
							mergeme = 3;
							p = p.replace(REG_APPENDREPLACE, '/');
						}

						var exists = null;
						try {
							exists = F.Fs.statSync(F.Path.join(target, p));
						} catch (e) {}

						if ((dirname === pathupdate || dirname === pathstartup) && !exists) {
							try {
								exists = F.Fs.statSync(F.Path.join(target, p + '_bk')) != null;
							} catch (e) {}
						}

						// A specific file like DB file or startup file or update script
						if (exists && (p.startsWith(dbpath) || p.startsWith(pathupdate) || p.startsWith(pathstartup)))
							return false;

						if (INTERNAL[p] || F.TUtils.getExtension(p) === 'resource' || mergeme) {
							var hash = p.hash(true).toString(36);
							Merge.push({ name: p, filename: F.Path.join(target, p + hash), type: mergeme });
							META.files.push(p + hash);
							return p + hash;
						}

						if (META.files.indexOf(p) === -1)
							META.files.push(p);
					}

					return true;
				});
			}, function() {
				dirs = Object.keys(dirs);
				dirs.length && Dirs.push.apply(Dirs, dirs);
				next();
			});
		});
	});

	async.push(function(next) {
		if (Merge.length) {
			copyFiles(Merge, function() {
				for (var i = 0; i < Merge.length; i++) {
					try {
						F.Fs.unlinkSync(Merge[i].filename);
					} catch(e) {}
				}
				next();
			});
		} else
			next();
	});

	async.push(function(next) {
		F.TUtils.ls(path, function(files, dirs) {

			for (var i = 0, length = dirs.length; i < length; i++)
				Dirs.push(normalize(dirs[i].substring(Length)));

			for (var i = 0, length = files.length; i < length; i++) {
				var file = files[i].substring(Length);
				var type = 0;

				if (file.startsWith(F.config.directory_databases) || file.startsWith('/flow/') || file.startsWith('/dashboard/'))
					type = 1;
				else if (REG_APPEND.test(file)) {
					file = file.replace(REG_APPENDREPLACE, '/');
					type = 3;
				} else if (file.startsWith(F.config.directory_public))
					type = 2;

				Files.push({ name: file, filename: files[i], type: type });
			}

			next();
		}, function(p) {
			p = normalize(p.substring(Length));
			return ignore[p] == null && p.substring(0, 2) !== '/.';
		});
	});

	async.push(function(next) {
		createDirectories(Dirs, () => copyFiles(Files, next));
	});

	async.push(function(next) {
		F.Fs.writeFileSync(F.Path.join(F.path.root('/.src/'), 'bundle.json'), JSON.stringify(META, null, '\t'));
		next();
	});

	async.async(function() {
		CONSOLE && console.timeEnd('Done');
		callback();
	});

}

function makeignore(arr) {

	var ext;
	var code = ['var path=P.substring(0,P.lastIndexOf(\'/\')+1);', 'var ext=F.TUtils.getExtension(P);', 'var name=F.TUtils.getName(P).replace(\'.\'+ ext,\'\');'];

	for (var i = 0; i < arr.length; i++) {
		var item = arr[i];
		var index = item.lastIndexOf('*.');

		if (index !== -1) {
			// only extensions on this path
			ext = item.substring(index + 2);
			item = item.substring(0, index);
			code.push('tmp=\'{0}\';'.format(item));
			code.push('if((!tmp||path===tmp)&&ext===\'{0}\')return;'.format(ext));
			continue;
		}

		ext = F.TUtils.getExtension(item);
		if (ext) {
			// only filename
			index = item.lastIndexOf('/');
			code.push('tmp=\'{0}\';'.format(item.substring(0, index + 1)));
			code.push('if(path===tmp&&F.TUtils.getName(\'{0}\').replace(\'.{1}\', \'\')===name&&ext===\'{1}\')return;'.format(item.substring(index + 1), ext));
			continue;
		}

		// all nested path
		code.push('if(path.startsWith(\'{0}\'))return;'.format(item.replace('*', '')));
	}

	code.push('return true');
	return new Function('P', code.join(''));
}

function normalize(path) {
	return F.isWindows ? path.replace(/\\/g, '/') : path;
}

function cleanFiles(callback) {

	var path = F.path.root('/.src/');
	var ignore = {};

	ignore[F.config.directory_public] = 1;
	ignore[F.config.directory_private] = 1;
	ignore[F.config.directory_databases] = 1;

	var meta;

	try {

		meta = F.Fs.readFileSync(F.Path.join(path, 'bundle.json')).toString('utf8').parseJSON(true) || {};

		if (F.config.bundling === 'shallow') {
			META.skip = true;
			callback();
			return;
		}

	} catch (e) {
		meta = {};
	}

	if (meta.files && meta.files.length) {
		for (var i = 0; i < meta.files.length; i++) {
			var filename = meta.files[i];
			var dir = filename.substring(0, filename.indexOf('/', 1) + 1);
			if (!ignore[dir]) {
				try {
					F.Fs.unlinkSync(F.Path.join(path, filename));
				} catch (e) {}
			}
		}
	}

	if (meta.directories && meta.directories.length) {
		meta.directories.quicksort('length_desc');
		for (var i = 0; i < meta.directories.length; i++) {
			try {

				var p = F.Path.join(path, meta.directories[i]);

				if (ignore[meta.directories[i]])
					continue;

				while (true) {

					var files = F.Fs.readdirSync(p);
					if (files.length)
						break;

					try {
						F.Fs.rmdirSync(p);
					} catch (e) {
						break;
					}

					p = F.Path.join(path, '..');

					if (p.length < path || p === path)
						break;
				}

			} catch (e) {}
		}
	}

	callback();
}

function createDirectories(dirs, callback) {

	var path = F.path.root('/.src/');

	try {
		F.Fs.mkdirSync(path);
	} catch(e) {}

	for (var i = 0, length = dirs.length; i < length; i++) {
		var p = normalize(dirs[i]);
		if (META.directories.indexOf(p) === -1)
			META.directories.push(p);
		try {
			F.Fs.mkdirSync(F.Path.join(path, dirs[i]));
		} catch (e) {}
	}

	callback();
}

function copyFiles(files, callback) {
	var path = F.path.root('/.src/');
	files.wait(function(file, next) {

		if (!META.ignore(file.name) || (/\.(socket|pid)$/).test(file.name))
			return next();

		var filename = F.Path.join(path, file.name);
		var ext = F.TUtils.getExtension(file.name);
		var append = file.type === 3;
		var exists = null;

		try {
			exists = F.Fs.statSync(filename);
		} catch (e) {}

		if (exists && (!exists.isFile() | exists.isSocket())) {
			next();
			return;
		}

		// DB file
		if (file.type === 1 && exists) {
			next();
			return;
		}

		var p = normalize(file.name);

		if (file.type !== 1 && META.files.indexOf(p) === -1)
			META.files.push(p);

		if (exists && (ext === 'resource' || (!ext && file.name.substring(1, 7) === 'config') || INTERNAL[file.name]))
			append = true;

		if (append) {
			F.Fs.appendFile(filename, '\n' + F.Fs.readFileSync(file.filename).toString('utf8'), next);
		} else
			copyFile(file.filename, filename, next);

	}, callback);
}

function copyFile(oldname, newname, callback) {
	var writer = F.Fs.createWriteStream(newname);
	writer.on('finish', callback);
	F.Fs.createReadStream(oldname).pipe(writer);
}

exports.extract = function(callback, skip) {

	if (!callback)
		return new Promise(resolve => exports.extract(resolve, skip));

	if (skip) {
		callback();
		return;
	}

	try {

		if (F.Fs.readFileSync('bundles.debug')) {
			F.isBundle = true;
			F.dir(F.path.root('/.src/'));
			callback();
			return;
		}

	} catch (e) {}

	var bundles = F.path.root('/bundles/');
	var extractbundles = function() {

		var arr = F.Fs.readdirSync(bundles);
		var url = [];

		for (var i = 0; i < arr.length; i++) {
			if (arr[i].endsWith('.url'))
				url.push(arr[i]);
		}

		url.wait(function(item, next) {
			var filename = F.path.root('/bundles/') + item.replace('.url', '.bundle');
			var url = F.Fs.readFileSync(F.path.root('/bundles/') + item).toString('utf8').trim();
			F.download(url, filename, function(err) {
				err && F.error(err, 'Bundle: ' + url);
				next();
			});
		}, function() {
			extract(function() {
				F.isBundle = true;
				F.dir(F.path.root('/.src/'));
				callback();
			});
		});
	};

	try {
		var files = F.Fs.readdirSync(bundles);
		if (files.length)
			extractbundles();
		else
			callback();
	} catch(e) {
		callback();
	}
};