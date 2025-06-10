# NEWACTION

```javascript
NEWACTION(id, opt);
```

As opposed to schema, the method offers a much simpler declaration. The action can be used directly in the routes or you can register a route directly in the action.

We recommend to store all actions in the `/actions/` folder.

## Syntax

```javascript
NEWACTION(id, options)
```

- **id** `{String}` action name without spaces, the best practice name should look `Namespace|action`
- **options** `{Object}` additional options

## Options Fields

- **name** `{String}` optional, a human-readable action name that can be used for documentation
- **params** `{String}` optional, params schema (they can be part of the name) in the form `property_name:data_type, property_name:data_type, ...`
- **query** `{String}` optional, query arguments schema in the form `property_name:data_type, property_name:data_type, ...`
- **input** `{String}` optional, input data schema in the form `property_name:data_type, property_name:data_type, ...`
- **output** `{String}` optional, output data schema in the form `property_name:data_type, property_name:data_type, ...`
- **route** `{String}` optional, a relative URL address and it will evalute `ROUTE(route + action_id)` in the background, example: `API /api/` or `POST /users/` or `GET /users/`
- **extend** `{String}` optional, it must contain a relative path (property name) and it extends the current payload by the response from the action
- **action** `{Function($, model)}` required and very imporant function that will be executed
- **publish** `{String/Boolean}` optional, performs `NEWPUBLISH()` with declared data
  - if `true` then it will copy data from the input or output argument
  - string must contain data schema
  - `+string` will extend input or output data argument
- **user** `{Boolean}` optional, the `$.user` instance (user session) must exist if `true`
- **partial** `{Boolean}` optional, If `true`, the data will be processed partially, meaning the framework will only validate the processed fields only (not all).
- **permissions** `{String}` optional, the framework will call the `UNAUTHORIZED($, permissions)` method in the form `permission1, permissions2, permissionsN`
- **sa** `{Boolean}` optional, the `$.user.sa` or `$.user.su` must be `true` (user must be super admin or super user)

## Good to know

- `options.output` data schema is used for the output data, so output data will be transformed automatically according to the schema defined in the `options.output`.
- Data types don't depend on the case sensitivity.
- You can call action from everywhere via the `ACTION(id, data)` method, example: `await ACTION('Users|insert', {}).promise($)`.
- Fields in `options.params`, `options.query`, `options.input`, `options.output` may start with `*` (star) example `*name:String` and it means that the field is required.

## Data Schema

Data schema supports all basic types + arrays:

- `number`
- `tinyint`
- `smallint`
- `number`
- `boolean`
- `string`
- `guid`
- `uid`
- `date`
- `name` the data type prepares a person's name by normalizing the characters and capitalizing the first letter
- `email`
- `zip`
- `phone`
- `url`
- `json`
- `base64`
- `datauri` parsers DataURI type to object `{ type: String, buffer: Buffer }`, example: `{ type: 'image/jpeg;, buffer: <00 00 00 ... > }`
- `lowercase`
- `uppercase`
- `capitalize`
- `capitalize2`
- `icon` supports only Total.js Icons or Font-Awesome in the form `ti ti-home`
- `color` must be defined in HEX in the form `#F0F0F0`
- supports enums in the form `{enumA|enumB|enumC}`
- supports nested objects in the form `{ name:String, age:Number }`
- supports nested object arrays in the form `[name:String, age:Number]`
- supports linkers to other Total.js Schemas `name:@Profile`, `address:@Address`, example: `NEWSCHEMA('@Profile', '*name:String,age:Number')`

The schema must be defined in the form: `name:String, age:Number` separated by the comma. If you want to have something required e.g. name field, then use: `*name:String`. Array must be defined like `[String]`. The schema is designed for one-level defined properties/fields.

## Examples

### Basic Query and Params Example

```javascript
NEWACTION('Find', {
	query: 'page:Number, sort:String',
	params: 'projectid:String',
	route: '+API ?',
	action: function($) {

		// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
		// $.query {Object key:value}
		// $.user {Object key:value}
		// $.params {Object key:value}
		// $.model {Object key:value} or model "is prepared according to the input data schema"
		// $.headers {Object key:value}
		// $.ip {String}
		// $.files {Array}
		// $.invalid(error_or_http_status)
		// $.callback({ success: true });
		// $.success(data);
		// $.redirect(url);

		$.success();
	}
});
```

### Input/Output Schema Example

```javascript
NEWACTION('Save', {
	input: '*name:String, age:Number',
	output: 'success:Boolean',
	params: 'projectid:String, id:String',
	route: '+API ?',
	action: function($, model) {

		// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
		// $.query {Object key:value}
		// $.user {Object key:value}
		// $.params {Object key:value}
		// $.model {Object key:value} or model "is prepared according to the input data schema"
		// $.headers {Object key:value}
		// $.ip {String}
		// $.files {Array}
		// $.invalid(error_or_http_status)
		// $.callback({ success: true });
		// $.success(data);
		// $.redirect(url);

		model.id = UID();
		$.success(model.id);
	}
});
```

## Routing

```javascript
ROUTE('+API   /api/                --> action1');
ROUTE('+GET   /api/products/       --> action1 action2 action3');
ROUTE('+POST  /api/products/add/   --> action1 action2 (response) action3');
```

We recommend using the `NEWACTION` with the `options.route` option, which can contain a route declaration. What is the `API` HTTP method? It's similar to the `POST` HTTP method, but it has an exact JSON structure, for example: `{ "schema": "action_name", "data": Object }`.

## Examples

```
// This file contains the actions that Todo performs when listing, creating, updating, or removing tasks.
// Run the /test.js file for API requests to the following actions.

NEWACTION('Todo|create', {
	name: 'Create task',
	input: '*name:String, *body:String',
	route: '+API ?',

	// route: '+API ?', // "+" means that user must be authorized (recommended)
	// route: '-API ?', // "-" means that user must be unauthorized
	// route: 'API ?',  // it doesn't matter if the user is authorized or unauthorized

	// Would you rather not use the Total.js API endpoints? It's easy to change the routes list this:
	// route: '+POST ?/tasks/create/',

	action: async function($, model) {

		// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
		// $.query {Object key:value}
		// $.user {Object key:value}
		// $.params {Object key:value}
		// $.model {Object key:value} or model "is prepared according to the input data schema"
		// $.headers {Object key:value}
		// $.ip {String}
		// $.files {Array}
		// $.invalid(error_or_http_status)
		// $.callback({ success: true });
		// $.success(data);
		// $.redirect(url);


		// It creates a unique identifier.
		model.id = UID();
		model.dtcreated = new Date();
		model.createdby = $.user ? $.user.name : null;

		// Insert the data into the database.
		await DATA.insert('tbl_todo', model).promise($);

		// Return the task ID.
		$.success(model.id);
	}
});

NEWACTION('Todo|list', {
	name: 'List of tasks',
	route: '+API ?',
	action: async function($, model) {

		// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
		// $.query {Object key:value}
		// $.user {Object key:value}
		// $.params {Object key:value}
		// $.model {Object key:value} or model "is prepared according to the input data schema"
		// $.headers {Object key:value}
		// $.ip {String}
		// $.files {Array}
		// $.invalid(error_or_http_status)
		// $.callback({ success: true });
		// $.success(data);
		// $.redirect(url);

		// It creates a list with pagination and filtering and sorting of the fields defined in the .autoquery() method.
		let response = await DATA.list('tbl_todo').autoquery($.query, 'id:String, name:String, body:String, iscompleted:Boolean, createdby:String, updatedby:String, completedby:String, dtcompleted:Date, dtcreated:Date, dtupdated:Date', 'dtcreated_desc', 100).promise($);
		$.callback(response);

	}
});

NEWACTION('Todo|read', {
	name: 'Read a specific task',
	input: '*id:UID',
	route: '+API ?',
	action: async function($, model) {

		// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
		// $.query {Object key:value}
		// $.user {Object key:value}
		// $.params {Object key:value}
		// $.model {Object key:value} or model "is prepared according to the input data schema"
		// $.headers {Object key:value}
		// $.ip {String}
		// $.files {Array}
		// $.invalid(error_or_http_status)
		// $.callback({ success: true });
		// $.success(data);
		// $.redirect(url);

		// It reads the data from the database. If the row doesn't exist, a 404 error is automatically returned.
		let response = await DATA.read('tbl_todo').id(model.id).error(404).promise($);
		$.callback(response);

	}
});

NEWACTION('Todo|update', {
	name: 'Update task',
	input: '*id:UID, *name:String, *body:String, iscompleted:Boolean',
	route: '+API ?',
	action: async function($, model) {

		// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
		// $.query {Object key:value}
		// $.user {Object key:value}
		// $.params {Object key:value}
		// $.model {Object key:value} or model "is prepared according to the input data schema"
		// $.headers {Object key:value}
		// $.ip {String}
		// $.files {Array}
		// $.invalid(error_or_http_status)
		// $.callback({ success: true });
		// $.success(data);
		// $.redirect(url);

		if (model.iscompleted)
			model.completedby = $.user ? $.user.name : null;

		model.dtupdated = new Date();
		model.updatedby = $.user ? $.user.name : null;

		// It updates the data in the database. If the row doesn't exist, a 404 error is automatically returned.
		await DATA.modify('tbl_todo', model).id(model.id).error(404).promise($);

		// Return the task ID.
		$.success(model.id);
	}
});

NEWACTION('Todo|remove', {
	name: 'Remove task',
	input: '*id:UID',
	route: '+API ?',
	permissions: 'admin', // only "admin" or "super user" can perform this action.
	action: async function($, model) {

		// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
		// $.query {Object key:value}
		// $.user {Object key:value}
		// $.params {Object key:value}
		// $.model {Object key:value} or model "is prepared according to the input data schema"
		// $.headers {Object key:value}
		// $.ip {String}
		// $.files {Array}
		// $.invalid(error_or_http_status)
		// $.callback({ success: true });
		// $.success(data);
		// $.redirect(url);

		// It deletes data from the database. If the row doesn't exist, a 404 error is automatically returned.
		await DATA.remove('tbl_todo').id(model.id).error(404).promise($);

		// Return the task ID.
		$.success(model.id);
	}
});

NEWACTION('Todo|clear', {
	name: 'Remove all tasks',
	route: '+API ?',
	permissions: 'admin', // only "admin" or "super user" can perform this action.
	action: async function($, model) {

		// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
		// $.query {Object key:value}
		// $.user {Object key:value}
		// $.params {Object key:value}
		// $.model {Object key:value} or model "is prepared according to the input data schema"
		// $.headers {Object key:value}
		// $.ip {String}
		// $.files {Array}
		// $.invalid(error_or_http_status)
		// $.callback({ success: true });
		// $.success(data);
		// $.redirect(url);

		// It deletes all data from the database.
		await DATA.remove('tbl_todo').promise($);

		$.success();
	}
});
```