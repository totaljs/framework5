'use strict';

const assert = require('assert');
const AI = require('../aimodel');

// Chat Completions sends the tool id/name only in the first delta. Every
// following delta is associated with the call by its stable index.
const chat = AI.parser('openai_chat');

chat.write({
	choices: [{
		delta: {
			tool_calls: [{
				index: 0,
				id: 'call_1',
				function: { name: 'lookup', arguments: '{"query":"to' }
			}]
		}
	}]
});

chat.write({
	choices: [{
		delta: {
			tool_calls: [{
				index: 0,
				function: { arguments: 'tal.js"}' }
			}]
		}
	}]
});

assert.deepStrictEqual(chat.end().tools, [{
	id: 'call_1',
	name: 'lookup',
	arguments: { query: 'total.js' }
}]);

// Responses API emits argument deltas and then a complete `done` value.
const responses = AI.parser('openai_responses');

responses.write({
	type: 'response.function_call_arguments.delta',
	item_id: 'fc_1',
	call_id: 'call_1',
	delta: '{"query":"total.js"}'
});

responses.write({
	type: 'response.function_call_arguments.done',
	item_id: 'fc_1',
	call_id: 'call_1',
	arguments: '{"query":"total.js"}'
});

assert.deepStrictEqual(responses.end().tools, [{
	id: 'call_1',
	name: null,
	arguments: { query: 'total.js' }
}]);

// Claude identifies the tool by id at block start, but argument deltas use
// the content block index.
const claude = AI.parser('claude');

claude.write({
	type: 'content_block_start',
	index: 1,
	content_block: { type: 'tool_use', id: 'toolu_1', name: 'lookup', input: {} }
});
claude.write({
	type: 'content_block_delta',
	index: 1,
	delta: { type: 'input_json_delta', partial_json: '{"query":"total.js"}' }
});

assert.deepStrictEqual(claude.end().tools, [{
	id: 'toolu_1',
	name: 'lookup',
	arguments: { query: 'total.js' }
}]);

// Ollama must keep separate calls even when their function names match.
const ollama = AI.parser('ollama');
ollama.write({
	message: {
		tool_calls: [
			{ function: { name: 'lookup', arguments: { query: 'one' } } },
			{ function: { name: 'lookup', arguments: { query: 'two' } } }
		]
	}
});

assert.deepStrictEqual(ollama.end().tools, [
	{ id: null, name: 'lookup', arguments: { query: 'one' } },
	{ id: null, name: 'lookup', arguments: { query: 'two' } }
]);

console.log('aimodel parser tests passed');
