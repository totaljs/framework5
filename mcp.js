require('./index');

const ADMIN = { id: 'ai', name: 'AI', sa: true };

// MCP router
// The MIT License
// Copyright 2026 (c) Peter Širka <petersirka@gmail.com> | Total.js
// Version: 2

/*
	// Supports: input, query, params, output
	// Field comments (// ...) are used as tool argument descriptions and as validation messages
	NEWACTION('Name', {
		mcp: true,
		input: '*name:String // User name',
		action: function($, model) {

		}
	});

	// tools/call arguments: { input: {}, query: {}, params: {} }

	// The tools run as the user returned by Total.mcp.auth (default: ADMIN).
	// Total.mcp.filter decides which tools a caller sees and may call (default: all):
	Total.mcp.filter = function(tool, $) {
		// tool {Object} the tool from Total.mcp.tools, $.user the caller
		return !tool.name.startsWith('Admin_') || $.user.sa;
	};
*/

Total.mcp = {};
Total.mcp.tools = [];
Total.mcp.map = {};
Total.mcp.versions = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26'];

Total.mcp.auth = function($) {
	$.success(ADMIN);
};

// Optional "function(tool, $)" returning a boolean: which tools the caller sees in tools/list and may run in tools/call
Total.mcp.filter = null;

function allowed(tool, $) {
	return !Total.mcp.filter || !!Total.mcp.filter(tool, $);
}

// Total.js schema types that are not valid JSON Schema types
function jstype(type) {
	return type === 'date' ? 'string' : (type || 'string');
}

// MCP tool names are limited to [A-Za-z0-9_.-] (clients such as Claude accept up to 64 chars: [A-Za-z0-9_-]),
// so "Notes|create" is exposed as "Notes_create"
function toolname(key) {
	return key.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64);
}

// Converts a parsed Total.js schema (jsinput, jsquery, jsparams, jsoutput) into JSON Schema
function convert(schema, forceString) {

	let properties = {};

	for (let key in schema.properties || {}) {

		let prop = schema.properties[key];
		let tmp = {};

		tmp.type = forceString ? 'string' : jstype(prop.type);

		if (!forceString) {
			if (prop.type === 'date')
				tmp.format = 'date-time';
			else if (prop.subtype === 'email')
				tmp.format = 'email';
		}

		if (prop.type === 'array' && prop.items && !forceString)
			tmp.items = { type: jstype(prop.items.type) };

		if (prop.enum)
			tmp.enum = prop.enum;

		if (prop.nullable && !forceString)
			tmp.type = [tmp.type, 'null'];

		let description = (schema.errors && schema.errors[key]) || prop.summary || prop.description;
		if (description)
			tmp.description = description;

		properties[key] = tmp;
	}

	return properties;
}

function section(properties, required, name, schema, description, forceString) {
	properties[name] = {
		type: 'object',
		description: description,
		properties: convert(schema, forceString),
		additionalProperties: false
	};
	if (schema.required && schema.required.length) {
		properties[name].required = schema.required;
		required.push(name);
	}
}

exports.convert = convert;

function rpcerror($, response, code, message) {
	response.error = { code: code, message: message };
	$.json(response);
}

function toolerror(response, message) {

	if (typeof(message) !== 'string')
		message = message == null ? 'Tool execution failed' : String(message);

	response.result = {
		resultType: 'complete',
		content: [{ type: 'text', text: message }],
		isError: true
	};
}

// Identifies the caller with Total.mcp.auth (the token of "Authorization: Bearer"), then "next(true)" with $.user set
function authorize($, next) {

	if (!Total.mcp.auth) {
		next(true);
		return;
	}

	let auth = ($.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
	let opt = new F.TBuilders.Options($);
	opt.TYPE = 'auth';
	opt.query = $.query;
	opt.next = opt.callback;
	opt.token = opt.auth = auth;
	opt.$callback = function(err, response) {
		if (err) {
			next(false);
		} else {
			$.user = response;
			next(true);
		}
	};
	Total.mcp.auth(opt);
}

function initroute() {

	if (Total.mcp.route) {
		Total.mcp.route.remove();
		Total.mcp.route = null;
	}

	if (Total.mcp.routeclient) {
		Total.mcp.routeclient.remove();
		Total.mcp.routeclient = null;
	}

	if (!CONF.$mcp)
		return;

	Total.mcp.route = ROUTE('POST /$mcp/ <10MB <300s', function($) {
		authorize($, function(is) {
			if (is) {
				Total.mcp.exec($);
			} else {
				let data = $.body;
				$.response.status = 401;
				$.json({
					jsonrpc: '2.0',
					id: data && data.id !== undefined ? data.id : null,
					error: { code: -32001, message: 'Unauthorized' }
				});
			}
		});
	});

	// Code mode: the tools of the caller as a JavaScript client ("?q=words" returns only the tools that match)
	Total.mcp.routeclient = ROUTE('FILE /$mcp/client.js', function($) {
		authorize($, function(is) {
			if (is) {
				let tools = Total.mcp.filter ? Total.mcp.tools.filter(tool => allowed(tool, $)) : Total.mcp.tools;
				$.content(Total.mcp.client(Total.mcp.search(tools, $.query.q), $.hostname()), 'text/javascript');
			} else {
				$.response.status = 401;
				$.plain('Unauthorized');
			}
		});
	});
};

// The tools whose name or description contain all the words of "q"
Total.mcp.search = function(tools, q) {

	let words = (q || '').toLowerCase().split(/\s+/).filter(Boolean);
	if (!words.length)
		return tools;

	return tools.filter(function(tool) {
		let text = (tool.name + ' ' + (tool.description || '')).toLowerCase();
		return words.every(word => text.includes(word));
	});
};

function jsdoctext(value) {
	return (value || '').replace(/\*\//g, '* /').replace(/\s*\n\s*/g, ' ').trim();
}

// JSON Schema to a JSDoc type
function jsdoctype(schema) {

	if (!schema)
		return '*';

	let type = schema.type;
	let nullable = false;

	if (type instanceof Array) {
		nullable = type.includes('null');
		type = type.find(t => t !== 'null');
	}

	let output;

	if (schema.enum) {
		output = '(' + schema.enum.map(value => JSON.stringify(value)).join('|') + ')';
	} else {
		switch (type) {
			case 'number':
			case 'integer':
				output = 'Number';
				break;
			case 'boolean':
				output = 'Boolean';
				break;
			case 'array':
				output = 'Array<' + jsdoctype(schema.items) + '>';
				break;
			case 'object':
				output = schema.properties ? ('{ ' + Object.keys(schema.properties).map(key => key + ': ' + jsdoctype(schema.properties[key])).join(', ') + ' }') : 'Object';
				break;
			default:
				output = 'String';
				break;
		}
	}

	return nullable ? ('?' + output) : output;
}

function jsdocparam(type, name, optional, description) {
	return ' * @param {' + type + '} ' + (optional ? ('[' + name + ']') : name) + (description ? (' ' + jsdoctext(description)) : '');
}

// One function of the client with its JSDoc
function jsdoctool(tool) {

	let lines = ['/**'];
	let schema = tool.inputSchema || {};
	let sections = schema.properties || {};
	let required = schema.required || [];
	let keys = Object.keys(sections);

	lines.push(' * ' + jsdoctext(tool.description || tool.name));

	if (keys.length) {
		lines.push(jsdocparam('Object', 'args', !required.length, ''));
		for (let key of keys) {
			let section = sections[key];
			let props = section.properties || {};
			let sectionrequired = section.required || [];
			lines.push(jsdocparam('Object', 'args.' + key, !required.includes(key), section.description));
			for (let name in props) {
				let prop = props[name];
				let description = prop.description || '';
				if (prop.format === 'date-time')
					description = (description ? (description + ' ') : '') + '(ISO date)';
				else if (prop.format === 'email')
					description = (description ? (description + ' ') : '') + '(email)';
				lines.push(jsdocparam(jsdoctype(prop), 'args.' + key + '.' + name, !sectionrequired.includes(name), description));
			}
		}
	}

	lines.push(' * @returns {Promise<' + (tool.outputSchema ? jsdoctype(tool.outputSchema) : '*') + '>}');
	lines.push(' */');

	let name = /^[A-Za-z_$][\w$]*$/.test(tool.name) ? ('.' + tool.name) : ('[' + JSON.stringify(tool.name) + ']');
	lines.push('api' + name + ' = args => call(' + JSON.stringify(tool.name) + ', args);');

	return lines.join('\n');
}

// The JavaScript client of the tools (code mode): an agent reads the functions, writes a script that calls them
// and only the output of its script goes back to the model
Total.mcp.client = function(tools, url) {

	let builder = [];

	builder.push('// MCP tools of "' + jsdoctext(CONF.name) + '" for scripts (Node.js 18+), generated by Total.js');
	builder.push('//');
	builder.push('// const api = require(\'./client.js\')(\'TOKEN\');');
	builder.push('// const output = await api.Name_action({ input: {}, query: {}, params: {} });');
	builder.push('//');
	builder.push('// Each function calls the MCP tool of the same name ("tools/call" on POST /$mcp/) with the permissions of the token.');
	builder.push('// It resolves with the output of the tool and throws an Error with the message of a tool error.');
	builder.push('// GET /$mcp/client.js?q=words returns only the tools whose name or description contain all the words.');
	builder.push('// Tools: ' + tools.length);
	builder.push('');
	builder.push('module.exports = function(token, url) {');

	let header = builder.length;

	builder.push('');
	builder.push('const endpoint = (url || ' + JSON.stringify(url || '') + ').replace(/\\/+$/, \'\') + \'/$mcp/\';');
	builder.push('const api = {};');
	builder.push('let id = 0;');
	builder.push('');
	builder.push('const call = async function(name, args) {');
	builder.push('\tconst response = await fetch(endpoint, { method: \'POST\', headers: { \'content-type\': \'application/json\', authorization: \'Bearer \' + (token || \'\') }, body: JSON.stringify({ jsonrpc: \'2.0\', id: ++id, method: \'tools/call\', params: { name: name, arguments: args || {} } }) });');
	builder.push('\tconst body = await response.text();');
	builder.push('\tlet data;');
	builder.push('\ttry {');
	builder.push('\t\tdata = JSON.parse(body);');
	builder.push('\t} catch (e) {');
	builder.push('\t\tthrow new Error(\'HTTP \' + response.status + \': \' + body.substring(0, 200));');
	builder.push('\t}');
	builder.push('\tif (data.error)');
	builder.push('\t\tthrow new Error(data.error.message);');
	builder.push('\tconst result = data.result || {};');
	builder.push('\tconst text = result.content && result.content[0] ? result.content[0].text : \'\';');
	builder.push('\tif (result.isError)');
	builder.push('\t\tthrow new Error(text);');
	builder.push('\tif (result.structuredContent !== undefined)');
	builder.push('\t\treturn result.structuredContent;');
	builder.push('\ttry {');
	builder.push('\t\treturn JSON.parse(text);');
	builder.push('\t} catch (e) {');
	builder.push('\t\treturn text;');
	builder.push('\t}');
	builder.push('};');

	for (let tool of tools) {
		builder.push('');
		builder.push(jsdoctool(tool));
	}

	builder.push('');
	builder.push('return api;');

	// The body of the function is indented
	for (let i = header; i < builder.length; i++)
		builder[i] = builder[i].split('\n').map(line => line ? ('\t' + line) : line).join('\n');

	builder.push('};');
	builder.push('');

	return builder.join('\n');
};

Total.mcp.exec = async function($) {

	let data = $.body;

	if (!data || data instanceof Array || typeof(data) !== 'object') {
		$.json({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid Request' }});
		return;
	}

	// Notifications do not have an id and MUST NOT receive a response.
	if (data.id === undefined) {
		$.response.status = 202;
		$.plain('');
		return;
	}

	const response = {};
	response.jsonrpc = '2.0';
	response.id = data.id;

	if (data.jsonrpc !== '2.0' || typeof(data.method) !== 'string') {
		rpcerror($, response, -32600, 'Invalid Request');
		return;
	}

	if (data.method === 'initialize') {
		let requested = data.params && data.params.protocolVersion;
		response.result = {
			protocolVersion: Total.mcp.versions.includes(requested) ? requested : Total.mcp.versions[0],
			capabilities: {
				tools: {}
			},
			serverInfo: {
				name: CONF.name,
				version: (CONF.version) + ''
			}
		};
		$.json(response);
		return;
	}

	if (data.method === 'server/discover') {
		response.result = {
			resultType: 'complete',
			supportedVersions: ['2026-07-28'],
			capabilities: {
				tools: {}
			},
			_meta: {
				"io.modelcontextprotocol/serverInfo": {
					name: CONF.name,
					version: (CONF.version) + ''
				}
			}
		};
		$.json(response);
		return;
	}

	if (data.method === 'ping') {
		response.result = {};
		$.json(response);
		return;
	}

	if (data.method === 'tools/list') {
		response.result = {
			resultType: 'complete',
			tools: Total.mcp.filter ? Total.mcp.tools.filter(tool => allowed(tool, $)) : Total.mcp.tools
		};
		// ttlMs: 0,
		// cacheScope: 'private'
		$.json(response);
		return;
	}

	if (data.method === 'tools/call') {

		let params = data.params || {};

		if (!params || typeof(params) !== 'object' || typeof(params.name) !== 'string') {
			rpcerror($, response, -32602, 'Invalid tools/call parameters');
			return;
		}

		let args = params.arguments || {};
		let key = Total.mcp.map[params.name];
		let action = key && Total.actions[key];

		// A tool that the filter hides is answered as unknown
		if (!action || !action.mcp || (Total.mcp.filter && !allowed(Total.mcp.tools.find(tool => tool.name === params.name) || { name: params.name }, $))) {
			rpcerror($, response, -32602, 'Unknown tool: ' + params.name);
			return;
		}

		if (args == null || typeof(args) !== 'object' || Array.isArray(args)) {
			rpcerror($, response, -32602, 'Tool arguments must be an object');
			return;
		}

		let input = Object.prototype.hasOwnProperty.call(args, 'input') ? args.input : args.data;
		let builder = ACTION(key, input);

		builder.config({ id: $.query.id });

		if (args.query)
			builder.query(args.query);

		if (args.params)
			builder.params(args.params);

		// The user identified by Total.mcp.auth (or by the route that calls Total.mcp.exec), ADMIN otherwise
		builder.user($.user || ADMIN);

		let exec = builder.exec;

		// An exception thrown inside the action is answered as a tool error
		builder.exec = function() {
			try {
				exec.call(builder);
			} catch (e) {
				builder.$ && builder.$.invalidsafe('Tool execution failed', e);
			}
		};

		let errors = null;

		try {
			builder.options.error = err => errors = err.output();
			let output = await builder.promise();

			let text = typeof(output) === 'string' ? output : JSON.stringify(output);
			if (text == null)
				text = String(output);

			response.result = {
				resultType: 'complete',
				content: [{ type: 'text', text: text }]
			};

			// In protocol version 2025-11-25 structuredContent must be a JSON object.
			// Keep the text representation for scalars, arrays and null values.
			if (output && typeof(output) === 'object' && !Array.isArray(output))
				response.result.structuredContent = output;

		} catch (e) {
			// Tool errors (validation, $.invalid) are reported inside the result so the model can react to them
			toolerror(response, errors ? JSON.stringify(errors) : e.toString());
		}

		$.json(response);
		return;
	}

	rpcerror($, response, -32601, 'Method not found: ' + data.method);
};

Total.mcp.refreshforce = function() {

	Total.mcp.timeout = null;
	Total.mcp.tools.length = 0;
	Total.mcp.map = {};

	for (let key in Total.actions) {
		let action = Total.actions[key];
		if (action.mcp) {
			let obj = Total.mcp.convert(action);
			Total.mcp.map[obj.name] = key;
			Total.mcp.tools.push(obj);
		}
	}

};

Total.mcp.convert = function(action) {

	let obj = {};
	obj.name = toolname(action.id);
	obj.description = action.summary || action.name;

	let properties = {};
	let required = [];

	if (action.jsinput)
		section(properties, required, 'input', action.jsinput, 'Payload (request body) passed to this action.');

	if (action.jsquery)
		section(properties, required, 'query', action.jsquery, 'URL query parameters passed to this action.');

	if (action.jsparams)
		section(properties, required, 'params', action.jsparams, 'URL params passed to this action.', true);

	obj.inputSchema = {
		type: 'object',
		properties: properties,
		required: required
	};

	if (action.jsoutput) {
		obj.outputSchema = {
			type: 'object',
			properties: convert(action.jsoutput),
			required: action.jsoutput.required || EMPTYARRAY
		};
	}

	return obj;
};

Total.mcp.refresh = function() {
	Total.mcp.timeout && clearTimeout(Total.mcp.timeout);
	Total.mcp.timeout = setTimeout(Total.mcp.refreshforce, 200);
};

setImmediate(function() {
	Total.on('ready', initroute);
	Total.on('configure', initroute);
});
