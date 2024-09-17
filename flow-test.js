exports.load = function(name, source, config, init) {

	if (typeof(config) === 'function') {
		init = config;
		config = {};
	}

	let schema = {};

	schema.id = 'test';
	schema.name = 'Test';
	schema.paused = false;
	schema.cloning = true;
	schema.design = {};
	schema.components = {};
	schema.components.dummy = `<script total>
	exports.id = 'dummy';
	exports.name = 'Dummy';
	exports.inputs = [{ id: 'input', name: 'Input' }];
	exports.make = function(instance) {

		instance.refresh = function() {
			// somethings happens e.g. reconfiguration
			instance.main.refresh2 && instance.main.refresh2();
		};

		instance.message = function($) {
			instance.main.test.message && instance.main.test.message($, $.data);
			instance.main.test.output && instance.main.test.output($, $.data);
		};
	};
</script>`;

	schema.components[name] = source;
	schema.variables = {};

	schema.design.dummy = {
		id: 'dummy',
		component: 'dummy',
		connections: {}
	};

	schema.design.component = {
		id: 'component',
		component: name,
		config: config || {},
		connections: {}
	};

	var Test = {};

	Test.variables = function(variables) {
		Test.flow.variables(variables);
	};

	Test.input = Test.send = function(name, data) {
		let msg = Test.dummy.newmessage(data);
		setImmediate(() => msg.send(name));
		return msg;
	};

	Test.assert = function(ok, message) {
		if (ok)
			Test.ok(message);
		else
			Test.fail(message);
	};

	Test.ok = function(message = name) {
		console.log(new Date().format('yyyy-MM-dd HH:mm:ss:ms') + ' [OK]: ' + message);
	};

	Test.fail = function(message = 'Unexpected problem') {
		console.warn(new Date().format('yyyy-MM-dd HH:mm:ss:ms') + ' [NO]: ' + message);
		throw new Error(message);
	};

	Test.trigger = function(data) {
		Flow.test.component.trigger && Flow.test.component.trigger(data);
	};

	Test.reconfigure = function(value) {
		Test.flow.reconfigure('component', value);
	};

	Flow.load(schema, function(err, instance) {

		var skip = false;

		instance.flow.refresh2 = function() {

			if (skip)
				return;

			let component = instance.flow.meta.flow.component;
			let outputs = component.outputs || instance.flow.meta.components[name].outputs || [];
			let inputs = component.inputs || instance.flow.meta.components[name].inputs || [];

			instance.flow.meta.flow.component.connections = {};
			instance.flow.meta.flow.dummy.connections = {};

			for (let m of outputs)
				instance.flow.meta.flow.component.connections[m.id] = [{ id: 'dummy', index: 'input' }];

			for (let m of inputs)
				instance.flow.meta.flow.dummy.connections[m.id] = [{ id: 'component', index: m.id }];
		};

		Test.flow = instance;
		Test.component = instance.flow.meta.flow.component;
		Test.dummy = instance.flow.meta.flow.dummy;

		instance.flow.onreconfigure = function(component) {
			Test.configure && setImmediate(() => Test.configure(component.config));
		};

		instance.flow.test = Test;
		instance.flow.refresh2();

		instance.flow.on('debug', function(a, b, c, d) {
			Test.debug && Test.debug(a, b, c, d);
		});

		instance.flow.on('status', function(instance, status) {
			Test.status && Test.status(status);
		});

		instance.flow.on('error', function(a, b, c, d) {
			Test.error && Test.error(a, b, c, d);
		});

		instance.flow.on('dashboard', function(instance, data) {
			Test.dashboard && Test.dashboard(data);
		});

		instance.onerror = () => process.exit(1);
		init && init(Test);

	});

};