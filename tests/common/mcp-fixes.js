/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

// Removes a temporary folder; on Windows a file may still be open for a moment (EBUSY), so it retries and never throws
function remove(path) {
	try {
		require('fs').rmSync(path, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
	} catch (e) {}
}

const PORT = 8481;
// The MCP tools "App_*" of the remote access
require('../../remote').tools();

CONF.$imprint = false;

NEWACTION('McpFixes|crash', {
	name: 'Crash async',
	mcp: true,
	action: async function($) {
		await new Promise(resolve => setTimeout(resolve, 10));
		throw new Error('Exception inside the async action');
	}
});

ROUTE('GET /crash/ --> McpFixes|crash');

F.run({ port: PORT, release: true, watcher: false });

function mcpcall(body, callback) {
	var $ = {};
	var timer = setTimeout(() => callback(null), 3000);
	$.body = body;
	$.query = {};
	$.response = { status: 200 };
	$.json = function(response) {
		clearTimeout(timer);
		callback(response);
	};
	$.plain = () => $.json(null);
	Total.mcp.exec($);
}

function revfile(path, revision) {
	return PATH.join(PATH.root('revisions'), HASH(path, true) + '_' + revision + '.rev');
}

ON('ready', function() {

	Test.push('MCP fixes', function(next) {

		var arr = [];

		// MCP: an exception inside an async action gets an answer
		arr.push(function(resume) {
			Total.mcp.refreshforce();
			mcpcall({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'McpFixes_crash', arguments: {} } }, function(response) {
				Test.print('MCP: an exception inside an async tool gets an error answer', response && response.id === 1 && response.result && response.result.isError === true ? null : 'Expected an error answer, got ' + JSON.stringify(response));
				resume();
			});
		});

		// A route with an async action that throws answers instead of waiting for the timeout
		arr.push(function(resume) {
			var timer = setTimeout(function() {
				Test.print('Route: an exception inside an async action gets an answer', 'No answer within 3 seconds');
				resume();
			}, 3000);
			RESTBuilder.GET('http://127.0.0.1:' + PORT + '/crash/').exec(function(err, response, meta) {
				clearTimeout(timer);
				Test.print('Route: an exception inside an async action gets an answer', meta && meta.status >= 400 ? null : 'Expected an error status, got ' + (meta && meta.status));
				resume();
			});
		});

		// remote (MCP tools): paths without "/", revisions of deleted and moved files and folders, App_delete of "/"
		arr.push(function(resume) {

			var name = 'tmp-mcp-fixes-' + Date.now();
			var revisions = PATH.root('revisions');
			var hasrevisions = F.Fs.existsSync(revisions);

			var cleanup = function() {
				for (let dir of [name, name + '-moved', name + '-other'])
					remove(PATH.root(dir));
				!hasrevisions && remove(revisions);
			};

			(async function() {
				var errors = [];
				try {
					// App_info answers without the file with the stats of the app
					var info = await ACTION('App_info').promise();
					if (!info || !info.framework || info.node !== process.version)
						errors.push('App_info: ' + JSON.stringify(info));

					// A path without the leading "/"
					var write = await ACTION('App_write', { path: name + '/a.txt', content: 'a' }).promise();
					if (write.path !== '/' + name + '/a.txt' || !F.Fs.existsSync(PATH.root(name + '/a.txt')))
						errors.push('App_write without "/": ' + write.path);

					// App_delete of a file removes its revisions
					await ACTION('App_write', { path: '/' + name + '/b.txt', content: 'b' }).promise();
					var bfile = revfile('/' + name + '/b.txt', 1);
					var hadb = F.Fs.existsSync(bfile);
					await ACTION('App_delete', { path: '/' + name + '/b.txt' }).promise();
					if (!hadb || F.Fs.existsSync(bfile))
						errors.push('App_delete of a file keeps its revisions');

					// App_move of a folder moves the revisions, not those of a folder with a longer name
					await ACTION('App_write', { path: '/' + name + '-other/c.txt', content: 'c' }).promise();
					await ACTION('App_move', { from: '/' + name, to: '/' + name + '-moved' }).promise();
					var read = await ACTION('App_read', { paths: ['/' + name + '-moved/a.txt', '/' + name + '-other/c.txt'] }).promise();
					if (read.items[0].revision !== 1 || !F.Fs.existsSync(revfile('/' + name + '-moved/a.txt', 1)))
						errors.push('App_move of a folder did not move the revisions: ' + JSON.stringify(read.items[0]));
					if (read.items[1].revision !== 1 || !F.Fs.existsSync(revfile('/' + name + '-other/c.txt', 1)))
						errors.push('App_move changed the revisions of another folder: ' + JSON.stringify(read.items[1]));

					// App_delete of a folder removes the revisions of its files
					await ACTION('App_delete', { path: '/' + name + '-moved' }).promise();
					if (F.Fs.existsSync(revfile('/' + name + '-moved/a.txt', 1)))
						errors.push('App_delete of a folder keeps the revisions');

					// App_delete of "/" answers with an error
					var root = await new Promise(function(resolve) {
						var timer = setTimeout(() => resolve(null), 2000);
						ACTION('App_delete', { path: '/' }).callback(function(err, response) {
							clearTimeout(timer);
							resolve(response || err);
						});
					});
					if (!root || !root.error)
						errors.push('App_delete of "/" did not answer');

				} catch (e) {
					errors.push(e + '');
				}

				cleanup();
				Test.print('remote (MCP tools): paths, revisions of deleted and moved files, App_delete of "/"', errors.length ? errors.join('; ') : null);
				resume();
			})();
		});

		arr.async(next);
	});

	Test.run();
});
