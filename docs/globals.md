# Total.js v5 Globals

- use tabs instead of spaces
- remove all unnecessary white-spaces
- always use `;` semicolon at the end of the command
- don't use const constant in the method scopes
- short strings should be always wrapped in `'` apostrophes
- use classic loops over `forEach()` where possible

We recommend using similar variable/schema names across all projects. In most cases, our projects use these variable names:

- `id`
- `name`
- `value`
- `email`
- `items` or `arr` contains an object collection/array
- `item`
- `tmp`
- `dtcreated`
- `dtupdated`

## HASH(value, type);

Creates the hash from the string. Supports: sha1, sha256, sha512, md5 or crc32.

__Syntax__:

```javascript
HASH(text, [type]);
// returns {String} hashed value

// Example:
let sha256 = HASH('my-secret-value', 'sha256');
let md5 = HASH('my-secret-value', 'md5');
let crc32 = HASH('my-secret-value', 'crc32');
```

## GUID([length]);

The UID method creates a unique identifier that is at least 12 characters long. Each UID contains a timestamp, minute counter, and hash with a simple checksum.

__Syntax__:

```javascript
GUID([length]);
// @length {Number} optional, a maximum length
// returns String;

// Example:
let guid1 = GUID(); // returns a real and valid GUID (Globally Unique Identifier, 128 bit)
let guid2 = GUID(10); // returns a random hash with 10 characters
```

## UID();

The UID method creates a unique identifier that is at least 12 characters long. Each UID contains a timestamp, minute counter, and hash with a simple checksum.

__Syntax__:

```javascript
UID();
// returns {String}
```

## NOW;

The `NOW` variable returns the current date and time and refreshes every minute. It is designed to reduce CPU consumption.

__Syntax__:

```javascript
NOW;
// returns {Date}
```

## DATA;

The global variable `DATA` contains functions for working with the PostgreSQL database. Always use the `DATA` variable in the Total.js `NEWACTION`.

__Syntax__:

```javascript
DATA;
```

__Methods__:

Each of the methods declared below returns a `QueryBuilder` instance, which allows developers to create custom filters and sorting.

```javascript
DATA.find('table_name'); // It finds rows (array of objects).
// DATA.find(table_name) returns {QueryBuilder} object

DATA.read('table_name'); // It finds a row (object).
// DATA.read(table_name) returns {QueryBuilder} object

DATA.insert('table_name', { name: 'Created', dtcreated: NOW }); // It inserts a row.
// DATA.insert(table_name, payload) returns {QueryBuilder} object

DATA.update('table_name', { name: 'Updated', dtupdated: NOW }); // It updates rows.
// DATA.update(table_name, payload) returns {QueryBuilder} object

DATA.modify('table_name', { name: 'Updated', dtupdated: NOW }); // alias for "DATA.update()".
// DATA.modify(table_name, payload) returns {QueryBuilder} object

DATA.remove('table_name'); // It removes rows.
// DATA.remove(table_name) returns {QueryBuilder} object

DATA.check('table_name'); // It checks for existence.
// DATA.check(table_name) returns {QueryBuilder} object

DATA.query('SELECT * FROM tbl_user'); // It executes a custom SQL query.
// DATA.query(sql_query) returns {QueryBuilder} object

DATA.count('table_name'); // It returns count of rows.
// DATA.count(table_name) returns {QueryBuilder} object
```

### QueryBuilder object methods

The QueryBuilder makes always `AND` statement between different filters.

__Syntax__:

```javascript
var builder = DATA.find(...);
// var builder = DATA.read(...);
// var builder = DATA.update(...);
// var builder = DATA.modify(...);
// var builder = DATA.remove(...);
// var builder = DATA.insert(...);
// var builder = DATA.count(...);
// var builder = DATA.query(...);

builder.fields(columns);
// This method filters the columns returned in the results.
// columns {String} the columns are separated by commas. For example: "id,name,dtcreated,dtupdated".
// returns {QueryBuilder} object;

builder.id(value);
// The method adds a standard SQL comparison, such as "id=VALUE". The primary key must be defined as the "id" column.
// value {String|Number|Date|Boolean} a value for comparison.
// returns {QueryBuilder} object;

builder.userid(value);
// The method adds a standard SQL comparison of the user identifier, such as "userid=VALUE". The primary key must be defined as the "userid" column.
// value {String|Number} a value for comparison.
// returns {QueryBuilder} object;

builder.where(column, type, value);
// The method adds a standard SQL comparison, such as "COLUMN=VALUE".
// column {String} a column name.
// type {String} optional, comparison type. Possible values "=" (default), ">", "<", ">=", "<=", "<>".
// value {String|Number|Date|Boolean} a value for comparison.
// returns {QueryBuilder} object;

builder.between(column, value_A, value_B);
// The method adds a standard SQL BETWEEN comparison, such as "COLUMN BETWEEN value_A AND value_B".
// column {String} a column name.
// value_A {String|Number|Date|Boolean} a value for comparison.
// value_B {String|Number|Date|Boolean} a value for comparison.
// returns {QueryBuilder} object;

buidler.in(column, value);
// The method adds SQL "IN" statement, such as "column IN (value)".
// column {String} a column name.
// value {String Array|Number Array|Date Array|Boolean Array} a value for comparison.
// returns {QueryBuilder} object;

buidler.error(error_or_http_status_code, [reverse]);
// The method returns an error in the callback or promise if the value is null, 0 (zero), or the array is empty. The reverse argument can reverse the condition.
// error_or_http_status_code {String|Number} error description (String) or HTTP status code (Number)
// reverse {Boolean}, optional default: false
// returns {QueryBuilder} object;

builder.search(column, value, [operator]);
// The method adds a standard SQL comparison, such as "COLUMN ILIKE VALUE".
// column {String} a column name.
// value {String} a value for comparison.
// operator {String} optional, possible values: "*" throughout the text, "beg" at the beginning, and "end" at the end.
// returns {QueryBuilder} object;

buidler.query(sql);
// The method injects a custom SQL query to the QueryBuilder.
// sql {String} a custom SQL query that will be appended to the WHERE condition.
// returns {QueryBuilder} object;

buidler.callback(callback);
// This is a callback for handling values from the database.
// callback {Function(err, response)} a callback function.
// returns {QueryBuilder} object;

buidler.promise($);
// It returns a promise instead of a callback.
// $ {Options} optional, it's very helpful for handling errors in "NEWACTION".
// returns {QueryBuilder} object;

builder.autoquery(query, schema, default_sort, default_maxlimit);
// It automatically creates filters from the "query" object, which must contain a key and value. All values must be a string. The method automatically converts values according to the "schema" argument which is the same type like "input", "output", "query".
// query {Object} a filter in the form: { name: "Peter", age: "30-40", dtcreated: "2025", sort: "dtcreated_desc" }.
// schema {String} a Total.js schema declaration in the form key:type, example: "name:String,age:Number,dtcreated:Date".
// @default_sort {String} a default sorting in the form "column_asc" or "column_desc".
// @default_maxlimit {Number} a maximum count of rows (default: 100).
// returns {QueryBuilder} object;

builder.or(fn);
// This method creates "OR" statement.
// fn {Function(QueryBuilder)} a function with a custom "QueryBuilder" that will be injected into the current "QueryBuilder".
// returns {QueryBuilder} object;

builder.or(function(builder) {
	builder.where('name', 'Peter');
	// or
	builder.where('name', 'Anna');
	// or
	builder.where('name', 'Jozef');
});
```

__Example__:

```javascript
// Search for users between 20 and 30 years old who have not been removed. "DATA.find()" returns always Array of objects (rows).
DATA.find('tbl_user').where('isremoved', false).between('age', 20, 30).callback(function(err, response) {
	// response {Array of objects}
	console.log(err, response);
});

// Search for a user named Peter who has not been removed. "DATA.read()" returns always single object (row).
DATA.read('tbl_user').where('isremoved', false).search('name', 'Peter').callback(function(err, response) {
	// response {Object}
	console.log(err, response);
});
```

## RESTBuilder;

It creates a request to an external endpoint.

__Syntax__:

```javascript
RESTBuilder.POST(url, [payload]);
// Creates an HTTP POST request.
// url {String} An absolute URL address is required.
// payload {Object} A payload that will be serialized according to the selected serialization mode. The default mode is JSON.
// returns {RESTBuilderInstance} object;

RESTBuilder.GET(url);
// Creates an HTTP GET request.
// url {String} An absolute URL address is required.
// returns {RESTBuilderInstance} object;

RESTBuilder.PUT(url, [payload]);
// Creates an HTTP PUT request.
// url {String} An absolute URL address is required.
// payload {Object} A payload that will be serialized according to the selected serialization mode. The default mode is JSON.
// returns {RESTBuilderInstance} object;

RESTBuilder.DELETE(url, [payload]);
// Creates an HTTP DELETE request.
// url {String} An absolute URL address is required.
// payload {Object} A payload that will be serialized according to the selected serialization mode. The default mode is JSON.
// returns {RESTBuilderInstance} object;

RESTBuilder.PATCH(url, [payload]);
// Creates an HTTP PATCH request.
// url {String} An absolute URL address is required.
// payload {Object} A payload that will be serialized according to the selected serialization mode. The default mode is JSON.
// returns {RESTBuilderInstance} object;

RESTBuilder.API(url, action, [payload]);
// Creates an HTTP POST request with the Total.js API specification in the form: { "schema": action, "data": payload }
// url {String} An absolute URL address is required.
// action {String} The action name is usually "NEWACTION()" in the targeted endpoint.
// payload {Object} A payload that will be serialized according to the selected serialization mode. The default mode is JSON.
// returns {RESTBuilderInstance} object;
```

### RESTBuilderInstance

A `RESTBuilderInstance` object is returned when any of the following methods are called: `RESTBuilder.POST()`, `RESTBuilder.GET()`, `RESTBuilder.PUT()`, `RESTBuilder.DELETE()`, `RESTBuilder.PATCH()` or `RESTBuilder.API()`.

__Syntax__:

```javascript
var builder = RESTBuilder.GET('https://www.totaljs.com');

builder.keepalive();
// This method maintains the socket connection to reuse it.
// returns {RESTBuilderInstance} object;

builder.insecure();
// It allows insecure connections for invalid SSL certificates.
// returns {RESTBuilderInstance} object;

builder.noparse();
// The method disables parsing the response according to its content type. It returns a raw string.
// returns {RESTBuilderInstance} object;

builder.xhr();
// The method appends XMLHttpRequest header.
// returns {RESTBuilderInstance} object;

builder.header(name, value);
// The method sets a custom HTTP header.
// name {String} A header name.
// value {String} A header value.
// returns {RESTBuilderInstance} object;

builder.auth(user_or_token, [password]);
// The method creates "Authorization" header.
// user_or_token {String}
// password {String} optional
// returns {RESTBuilderInstance};
// Example user + password (HTTP authentification): builder.auth('petersirka', '123456');
// Example token: builder.auth('Bearer YOUR_AUTH_TOKEN');
// returns {RESTBuilderInstance} object;

builder.urlencoded([payload]);
// This method changes the content type to "application/x-www-form-urlencoded" and modifies the payload serialization.
// payload {Object} Optional, a payload in the form key:value.
// returns {RESTBuilderInstance} object;

builder.timeout(timeout);
// This method sets timeout.
// timeout {Number} It must be defined in milliseconds (default: 5000).
// returns {RESTBuilderInstance} object;

builder.file(name, filename, [buffer]);
// This method modifies the payload serialization, changes the content type to "multipart/form-data", and adds a "file."
// name {String} A key for the file blob data.
// filename {String} It can contain either an absolute file name or a relative file name with a defined "buffer" argument.
// buffer {Buffer} It is optional and can contain a file with data loaded as the buffer.
// returns {RESTBuilderInstance} object;

builder.cookie(name, value);
// This method sets a cookie value for the request.
// name {String} A cookie name.
// value {String} A cookie value.
// returns {RESTBuilderInstance} object;

buidler.callback(callback);
// This is a callback for handling values from the database.
// callback {Function(err, response)} a callback function.
// returns {RESTBuilderInstance} object;

buidler.promise($);
// It returns a promise instead of a callback.
// $ {Options} optional, it's very helpful for handling errors in "NEWACTION".
// returns {RESTBuilderInstance} object;

builder.stream(callback);
// This method creates a request, and the wrapped response stream is returned to the callback.
// callback {Function(err, response)}
// returns {RESTBuilderInstance} object;

// Example builder.stream():
builder.stream(function(err, response) {
	// response.stream {Response stream}
	// response.host {String} Resolved host
	// response.headers {Object} Obtained headers
	// response.status {Number} HTTP status code
});
```

__Example__:

```javascript
RESTBuilder.GET('https://www.totaljs.com').xhr().callback(function(err, response) {
	console.log(err, response);
});
```

## AUTH();

The Total.js framework supports a simple authorization mechanism and it is built on one delegate function called `AUTH(function($){ ... })`. Authorization is asynchronous and executed for all requests except those for static files. If the developer calls the `$.success(user_session)` method, the request will contain the user session obtained from that method. Then, the user session object becomes easily accessible in the `NEWACTION` options object `$.user`.

```javascript
AUTH(function($) {

	// This method will be executed for every request except those for static files.

	// $ {Options} Documentation: https://docs.totaljs.com/total5/IbGpBV25x60f/
	// $.url {String} It returns the current relative endpoint.
	// $.query {Object key:value} It returns the URL query arguments of a request.
	// $.headers {Object key:value} It returns a request headers.
	// $.ip {String} It returns a request IP address.
	// $.invalid(); This is an important method for unauthorized request.
	// $.success(user_session); This is an important method for authorizing request.
	// $.cookie(name); This method returns a cookie value.

	if ($.headers['x-token'] === '123456') {
		// Here, you can load the user session from a database, for example.
		$.success({ name: 'Token', sa: true });
	} else
		$.invalid();

});
```

__Good to know:__ Total.js routes are evaluated according to the calls from this delegate:

- `$.success(user_session)` It only evaluates routes or new actions with a defined URL containing a "+". For example:`ROUTE('+HTTP_METHOD /endpoint/')`.
- `$.invalid()` It only evaluates routes or new actions with a defined URL containing a "-". For example:`ROUTE('-HTTP_METHOD /endpoint/')`.