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
// @default_maxlimit {Number} a maximum count of rows (default: 100)

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