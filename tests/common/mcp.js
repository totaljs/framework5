'use strict';

const Test = require('node:test');
const Assert = require('node:assert/strict');
require('../../index');

// A minimal controller for Total.mcp.exec: it keeps the JSON answer
function call(body, user) {
	return new Promise(function(resolve) {
		var $ = {};
		$.body = body;
		$.query = {};
		$.user = user;
		$.response = { status: 200 };
		$.json = resolve;
		$.plain = function() {
			resolve(null);
		};
		Total.mcp.exec($);
	});
}

function list(user) {
	return call({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, user).then(response => response.result.tools.map(tool => tool.name));
}

function run(name, user) {
	return call({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: name, arguments: {} } }, user);
}

Test.before(function() {

	NEWACTION('McpTest|whoami', {
		name: 'Who am I',
		mcp: true,
		action: function($) {
			$.callback({ name: $.user ? $.user.name : null, sa: !!($.user && $.user.sa) });
		}
	});

	NEWACTION('McpTest|write', {
		name: 'Write something',
		mcp: true,
		action: function($) {
			$.callback({ written: true });
		}
	});

	Total.mcp.refreshforce();
});

Test.afterEach(function() {
	Total.mcp.filter = null;
});

Test.test('tools run as ADMIN when nobody identified the caller', async function() {
	var response = await run('McpTest_whoami');
	Assert.deepEqual(response.result.structuredContent, { name: 'AI', sa: true });
});

Test.test('tools run as the user identified by Total.mcp.auth', async function() {
	var response = await run('McpTest_whoami', { id: 'agent', name: 'Agent', sa: false });
	Assert.deepEqual(response.result.structuredContent, { name: 'Agent', sa: false });
});

Test.test('without a filter every tool is listed', async function() {
	var names = await list();
	Assert.ok(names.includes('McpTest_whoami'));
	Assert.ok(names.includes('McpTest_write'));
});

Test.test('Total.mcp.filter hides tools from tools/list', async function() {
	Total.mcp.filter = (tool, $) => tool.name !== 'McpTest_write' || !!($.user && $.user.sa);
	var guest = await list({ name: 'Guest' });
	var admin = await list({ name: 'Admin', sa: true });
	Assert.ok(guest.includes('McpTest_whoami'));
	Assert.ok(!guest.includes('McpTest_write'));
	Assert.ok(admin.includes('McpTest_write'));
});

Test.test('Total.mcp.filter blocks hidden tools in tools/call', async function() {
	Total.mcp.filter = (tool, $) => tool.name !== 'McpTest_write' || !!($.user && $.user.sa);
	var guest = await run('McpTest_write', { name: 'Guest' });
	Assert.equal(guest.error.code, -32602);
	var admin = await run('McpTest_write', { name: 'Admin', sa: true });
	Assert.deepEqual(admin.result.structuredContent, { written: true });
});
