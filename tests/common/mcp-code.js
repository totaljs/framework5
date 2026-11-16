/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

// Removes a temporary folder; on Windows a file may still be open for a moment (EBUSY), so it retries and never throws
function remove(path) {
	try {
		require('fs').rmSync(path, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
	} catch (e) {}
}

const PORT = 8482;
const TMP = PATH.join(require('os').tmpdir(), 'total5-mcp-code-' + Date.now());

CONF.$imprint = false;
CONF.$mcp = true;
CONF.name = 'Code mode test';

Total.mcp.auth = function($) {
	if ($.token === 'admin')
		$.success({ id: 'admin', name: 'Admin', sa: true });
	else if ($.token === 'user')
		$.success({ id: 'user', name: 'User', sa: false });
	else
		$.invalid(401);
};

Total.mcp.filter = function(tool, $) {
	return !tool.name.startsWith('CodeAdmin_') || $.user.sa;
};

NEWACTION('CodeNotes|create', {
	name: 'Creates a note',
	mcp: true,
	input: '*name:String // Name of the note, price:Number, tags:[String], kind:{private|public}, date:Date, email:Email',
	output: 'id:String, name:String',
	action: function($, model) {
		$.callback({ id: 'n1', name: model.name + ' (' + $.user.name + ')' });
	}
});

NEWACTION('CodeNotes|list', {
	name: 'Lists the notes',
	mcp: true,
	query: 'q:String // Text to search',
	action: function($) {
		$.callback([{ id: 'n1', q: $.query.q || '' }]);
	}
});

NEWACTION('CodeNotes|fail', {
	name: 'Always fails',
	mcp: true,
	action: function($) {
		$.invalid('Nothing to do');
	}
});

NEWACTION('CodeAdmin|reset', {
	name: 'Resets everything',
	mcp: true,
	action: function($) {
		$.success();
	}
});

F.run({ port: PORT, release: true, watcher: false });

function download(query, token) {
	return fetch('http://127.0.0.1:' + PORT + '/$mcp/client.js' + (query || ''), { headers: token ? { authorization: 'Bearer ' + token } : {} }).then(async function(response) {
		return { status: response.status, type: response.headers.get('content-type'), body: await response.text() };
	});
}

// Saves the downloaded client and loads it as an agent would do
function load(body, name) {
	F.Fs.mkdirSync(TMP, { recursive: true });
	var filename = PATH.join(TMP, name + '.js');
	F.Fs.writeFileSync(filename, body);
	return require(filename);
}

ON('ready', function() {

	Test.push('MCP code mode', function(next) {

		var arr = [];

		arr.push(resume => setTimeout(resume, 500));

		arr.push(async function(resume) {
			var response = await download('', '');
			Test.print('Without a token: 401', response.status === 401 ? null : 'Expected 401, got ' + response.status);
			resume();
		});

		arr.push(async function(resume) {
			var response = await download('', 'admin');
			var body = response.body;
			var errors = [];
			if (response.status !== 200 || !(response.type || '').includes('javascript'))
				errors.push('status ' + response.status + ' ' + response.type);
			for (let text of ['Creates a note', '@param {Object} args.input', '@param {String} args.input.name Name of the note', '@param {Number} [args.input.price]', '@param {Array<String>} [args.input.tags]', '@param {("private"|"public")} [args.input.kind]', '(ISO date)', '@param {String} [args.query.q] Text to search', '@returns {Promise<{ id: String, name: String }>}', 'api.CodeNotes_create = args => call("CodeNotes_create", args);', 'api.CodeAdmin_reset', 'Tools: 4'])
				!body.includes(text) && errors.push('missing: ' + text);
			Test.print('The client describes every tool with JSDoc', errors.length ? errors.join('; ') : null);
			resume();
		});

		arr.push(async function(resume) {
			var response = await download('', 'user');
			Test.print('Total.mcp.filter hides tools from the client', response.body.includes('CodeAdmin_reset') || !response.body.includes('Tools: 3') ? 'The filtered tool is in the client' : null);
			resume();
		});

		arr.push(async function(resume) {
			var response = await download('?q=' + encodeURIComponent('list notes'), 'admin');
			Test.print('?q= returns only the tools that match all the words', response.body.includes('CodeNotes_list') && !response.body.includes('CodeNotes_create') && response.body.includes('Tools: 1') ? null : 'Unexpected tools: ' + (response.body.match(/^api[^\n]+/gm) || []).join(', '));
			resume();
		});

		arr.push(async function(resume) {
			var response = await download('', 'user');
			var errors = [];
			try {
				var api = load(response.body, 'client')('user');
				var created = await api.CodeNotes_create({ input: { name: 'A' } });
				if (created.id !== 'n1' || created.name !== 'A (User)')
					errors.push('create: ' + JSON.stringify(created));
				var listed = await api.CodeNotes_list({ query: { q: 'x' } });
				if (!(listed instanceof Array) || listed[0].q !== 'x')
					errors.push('list: ' + JSON.stringify(listed));
				try {
					await api.CodeNotes_fail();
					errors.push('fail: no error');
				} catch (e) {
					!e.message.includes('Nothing to do') && errors.push('fail: ' + e.message);
				}
				try {
					await load(response.body, 'client2')('wrong').CodeNotes_list();
					errors.push('wrong token: no error');
				} catch (e) {
					!e.message.includes('Unauthorized') && errors.push('wrong token: ' + e.message);
				}
			} catch (e) {
				errors.push(e + '');
			}
			remove(TMP);
			Test.print('The downloaded client calls the tools, returns the output and throws the errors', errors.length ? errors.join('; ') : null);
			resume();
		});

		arr.async(next);
	});

	Test.run();
});
