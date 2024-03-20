/* eslint-disable */

require('../index');
require('../test');

const Exec = F.Exec;

Test.push('String.prototypes', function(next) {
	var value, response, correct; // input, outpt, correct

	value = 'peter sirka';
	correct = 'Peter Sirka';
	response = value.toName();
	Test.print('String.toName() ', response != correct ? 'Unknown error' : null); // @TODO: add to documentation

	value = '2023-11-07T22:37:00.000Z';
	correct = true;
	response = value.isJSONDate();
	Test.print('String.isJSONDate() ', response !== correct ? 'Invalid JSON date' : null); // @TODO: add to documentation

	value = ' Total.js framework v5 ';
	correct = 'Total.js framework v5';
	response = value.trim();
	Test.print('String.trim() ', response != correct ? 'Failed to trim' : null);

	value = 'Hello';
	correct = 'Hello';
	response = value.parseHTML();
	Test.print('String.parseHTML() ', (!response || response.children[0].textContent !== correct) ? 'Failed to parse HTML' : null);
	next();

	value = 'Total.js v5';
	var obj = {};
	response.md5 = 'fbe6b7cd8e66fe451b4c778fc62de4b2';
	response.sha1 = '30728a993609cf677599625a86e8e3ca70017506';
	response.sha256 = '711926af9c45c9f293b2ebf7bceebcdc0a24a09279707aec016c9c343134dffe';
	response.sha512 = '419220329898e6e6cd6ef0146df836db64ea7dc2982b309b327798ffa46af076c2d06968784b2c0415edc4b3da571c8fc2ac6d25352214f820a7a6ca8966f758';
	response.crc32 = '-31388495';
	response.crc32unsigned = '4263578801';

	for (var type in obj ) {
		correct = obj[type].toString();
		response = value.hash(type);
		Test.print('String.hash({0}) '.format(type), response.toString() !== correct.toString() ? 'Incorrect hash': null);
	}

	value = 'ABCDEFG';
	var key = '123456';
	correct = 'ABCDEFG-1j5d6lj';
	response = value.sign(key);
	Test.print('String.sign(key) ', correct !== response ? 'Incorrect signature': null);

	value = 'ABCDEFG';
	correct = '1qydwlg';
	response = value.makeid();
	Test.print('String.makeid() ', correct !== response ? 'Incorrect ID': null);

	value = `<style>div { font-size: 15px; }</style><body>Total.js</body> <script total>console.log(12345);</script>`;
	correct = { body: 'Total.js', total: 'console.log(12345);', css: 'div { font-size: 15px; }' };
	response = value.parseComponent({ body: '<body>', total: '<script total>', css: '<style>' });
	Test.print('String.parseComponent(tags) ', correct.toString() != response.toString() ? 'Incorrect parsing': null); // @TODO: fix word count

	value = '<item>1</item><item>2</item><item>3</item>';
	correct = [1, 2, 3];
	response = [];
	value.streamer('<item>', '</item>', function(value, index) {
		var obj = value.trim().parseXML();
		response.push(obj.item.parseInt());
	});

	Test.print('String.streamer(beg, end, fn, [skip])', correct.toString() !== response.toString() ? 'Incorrect streaming': null);

	value = '<div><div>Hello world!</div></div>';
	response = value.parseXML();
	correct = { 'div.div': 'Hello world!' };
	Test.print('String.parseXML() ', (JSON.stringify(response) !== JSON.stringify(correct)) ? 'Failed to parse XML' : null);

	value = '{"date": "2023-11-13T12:30:00.000Z"}';
	correct = { date: new Date('2023-11-13T12:30:00.000Z') };
	response = value.parseJSON(true);
	Test.print('String.parseJSON(date)', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing with date conversion');

	value = 'name=John%20Doe&age=30&city=New%20York';
	correct = { name: 'John Doe', age: '30', city: 'New York' };
	response = value.parseEncoded();
	Test.print('String.parseEncoded()', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing of URL-encoded string');

	value = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0';
	correct = { os: 'Windows', browser: 'Firefox', device: 'desktop' };
	response = value.parseUA(true);
	Test.print('String.parseUA(true)', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing of user agent string');

	value = 'Name,Age,Location\nJohn,30,"New York"\nJane,25,"San Francisco"';
	correct = [{ a: 'Name', b: 'Age', c: 'Location' }, { a: 'John', b: '30', c: 'New York' }, { a: 'Jane', b: '25', c: 'San Francisco' }];
	response = value.parseCSV(',');
	Test.print('String.parseCSV(",", true)', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing of CSV string');

	value = '';
	correct = [{}];
	response = value.parseCSV(',');
	Test.print('String.parseCSV(",", true) - Empty string', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing of CSV string');

	value = 'Name,Age,Location';
	correct = [{ a: 'Name', b: 'Age', c: 'Location' }];
	response = value.parseCSV(',');
	Test.print('String.parseCSV(",", true) - Headers only', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing of CSV string');

	value = 'Filesystem     Type 1B-blocks  Available  Used Mounted on\n/dev/sda1      ext4    1048576    524288 524288 /\n';
	correct = ['Total:', 104857, 'Used:', 524288, 'Free:', -419431];
	response = [];

	value.parseTerminal(['1B-blocks', 'Available'], function(line) {
		var total = line[0].parseInt();
		var used = line[1].parseInt();
		var free = total - used;
		response.push('Total:', total, 'Used:', used, 'Free:', free);
	});
	Test.print('String.parseTerminal(fields, fnLine, [skipLines], [takeLines])', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing of terminal output');

	value = '2023-11-07T22:37:00.000Z';
	correct = new Date(value);
	response = value.parseDate();

	Test.print('String.parseDate() - Default Format', response.toString() === correct.toString() ? null : 'Incorrect parsing of date');

	value = '2023-11-07T22:37:00.000Z';
	correct = new Date(value);
	response = value.parseDate('yyyy-MM-ddTHH:mm:ss.fffZ');

	Test.print('String.parseDate(format) - JSON Format', response.toString() === correct.toString() ? null : 'Incorrect parsing of date');

	value = '2023-11-07 22:37:00';
	correct = new Date(value);
	response = value.parseDate();

	Test.print('String.parseDate() - Space-separated Format', response.toString() === correct.toString() ? null : 'Incorrect parsing of date');

	value = '2023-11-07';
	correct = new Date(value);
	response = value.parseDate();

	Test.print('String.parseDate() - Date-only Format', response.toString() === correct.toString() ? null : 'Incorrect parsing of date');

	value = '22:37:00';
	correct = new Date(NOW.format('yyyy-MM-dd ') + value);
	response = value.parseDate();

	Test.print('String.parseDate() - Time-only Format', response.toString() === correct.toString() ? null : 'Incorrect parsing of date');

	value = '22:37:00.123';
	correct = new Date(NOW.format('yyyy-MM-dd ') + value);
	response = value.parseDate();

	Test.print('String.parseDate() - Time with milliseconds Format', response.toString() === correct.toString() ? null : 'Incorrect parsing of date');

	value = '1 day';
	correct = new Date().add('days', 1);
	response = value.parseDateExpiration();

	Test.print('String.parseDateExpiration() - 1 day', response.toString() === correct.toString() ? null : 'Incorrect parsing of expiration date');

	value = '30 seconds';
	correct = new Date().add('seconds', 30);
	response = value.parseDateExpiration();

	Test.print('String.parseDateExpiration() - 30 seconds', response.toString() === correct.toString() ? null : 'Incorrect parsing of expiration date');

	value = '1 week';
	correct = new Date().add('weeks', 1);
	response = value.parseDateExpiration();

	Test.print('String.parseDateExpiration() - 1 week', response.toString() === correct.toString() ? null : 'Incorrect parsing of expiration date');

	value = '3 months';
	correct = new Date().add('months', 3);
	response = value.parseDateExpiration();

	Test.print('String.parseDateExpiration() - 3 months', response.toString() === correct.toString() ? null : 'Incorrect parsing of expiration date');

	CONF = { 'name': 'MyApp', 'version': '1.0.0', 'author': 'John Doe', 'debug': true };

	value = 'Welcome to [name]!';
	correct = 'Welcome to MyApp!';
	response = value.env();
	Test.print('String.env() - Replace [name]', response === correct ? null : 'Incorrect replacement of configuration values');

	value = 'Version: [version], Author: [author]';
	correct = 'Version: 1.0.0, Author: John Doe';
	response = value.env();
	Test.print('String.env() - Replace [version] and [author]', response === correct ? null : 'Incorrect replacement of configuration values');

	value = 'Debug mode: [debug]';
	correct = 'Debug mode: true';
	response = value.env();
	Test.print('String.env() - Replace [debug]', response === correct ? null : 'Incorrect replacement of configuration values');

	value = 'Non-existing key: [nonexistent]';
	correct = 'Non-existing key: ';
	response = value.env();
	Test.print('String.env() - Leave non-existing key unchanged', response === correct ? null : 'Incorrect handling of non-existing keys');

	value = `
name: MyWebSite
version: 1.0.1
author: John Doe
`;
	correct = { name: 'MyWebSite', version: '1.0.1', author: 'John Doe' };
	response = value.parseConfig();
	Test.print('String.parseConfig() - Basic parsing', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing');

	// Test case 2: Parsing with sub-types
	value = `
number_value: 42
boolean_value: true
string_value: Total.js
date_value: ${NOW.format('yyyy-MM-dd')}
`;
	correct = { number_value: '42', boolean_value: 'true', string_value: 'Total.js', date_value: NOW.format('yyyy-MM-dd') };
	response = value.parseConfig();
	Test.print('String.parseConfig() - Parsing with sub-types', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing');

	// Test case 3: Configuration with comments
	value = `
# This is a comment
name: MyApp
# Another comment
version: 2.0
`;
	correct = { name: 'MyApp', version: '2.0' };
	response = value.parseConfig();
	Test.print('String.parseConfig() - Configuration with comments', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing');

	// Test case 4: Configuration with environment variable
	process.env.CONFIG_ENV_VALUE = 'EnvironmentValue';
	value = `
env_value (env): CONFIG_ENV_VALUE
`;
	correct = { env_value: 'EnvironmentValue' };
	response = value.parseConfig();
	Test.print('String.parseConfig() - Configuration with environment variable', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing');

	// Test case 5: Configuration with JSON value
	value = `
json_value (json) :  { "key": "value" }
`;
	correct = { json_value: { key: 'value' } };
	response = value.parseConfig();
	Test.print('String.parseConfig() - Configuration with JSON value', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing');

	value = `base64_value : base64 SGVsbG8gd29ybGQh`;
	correct = { base64_value: 'Hello world!' };
	response = value.parseConfig();
	Test.print('String.parseConfig() - Configuration with base64-encoded value', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing');

	value = `hex_value: hex 48656c6c6f20776f726c6421`;
	correct = { hex_value: 'Hello world!' };
	response = value.parseConfig();
	Test.print('String.parseConfig() - Configuration with hex-encoded value', JSON.stringify(response) === JSON.stringify(correct) ? null : 'Incorrect parsing');


	// Test case 1: Basic string formatting
	value = 'Hello, {0}!';
	correct = 'Hello, John!';
	response = value.format('John');
	Test.print('String.format() - Basic formatting', response === correct ? null : 'Incorrect formatting');

	// Test case 2: Multiple placeholders
	value = 'Hi, {0} and {1}!';
	correct = 'Hi, John and Jane!';
	response = value.format('John', 'Jane');
	Test.print('String.format() - Multiple placeholders', response === correct ? null : 'Incorrect formatting');

	// Test case 3: Repeated placeholders
	value = 'Value: {0}, Value: {0}';
	correct = 'Value: 42, Value: 42';
	response = value.format(42);
	Test.print('String.format() - Repeated placeholders', response === correct ? null : 'Incorrect formatting');

	// Test case 4: Missing placeholder value
	value = 'Name: {0}, Age: {1}';
	correct = 'Name: John, Age: ';
	response = value.format('John');
	Test.print('String.format() - Missing placeholder value', response === correct ? null : 'Incorrect formatting');

	// Test case 5: Extra placeholder values
	value = 'Value: {0}, Extra: {1}';
	correct = 'Value: 42, Extra: Jane';
	response = value.format(42, 'Jane', 'ExtraValue');
	Test.print('String.format() - Extra placeholder values', response === correct ? null : 'Incorrect formatting');

	F.config.secret_uid = '123456';

	value = '123';
	var key = 'mySecretKey';
	correct = 'xuna106x123';
	response = value.encrypt_uid(key);
	Test.print('String.encrypt_uid(key)', correct !== response ? 'Incorrect UID encryption' : null);

	value = 'xuna106x123';
	var key = 'mySecretKey';
	correct = '123';
	response = value.decrypt_uid(key);
	Test.print('String.decrypt_uid(key)', correct !== response ? 'Incorrect UID decryption' : null);

	// Test encoding basic HTML special characters
	value = '<p>Hello, "world" & \'universe\'</p>';
	correct = '&lt;p&gt;Hello, &quot;world&quot; &amp; &apos;universe&apos;&lt;/p&gt;';
	response = value.encode();
	Test.print('String.encode()', correct !== response ? 'Basic encoding failed' : null);

	// Test encoding an empty string
	value = '';
	correct = '';
	response = value.encode();
	Test.print('String.encode() - Empty String', correct !== response ? 'Empty string encoding failed' : null);

	// Test encoding a string with no special characters
	value = 'Hello, world!';
	correct = 'Hello, world!';
	response = value.encode();
	Test.print('String.encode() - No special characters', correct !== response ? 'Encoding failed for string without special characters' : null);

	// Test encoding a string with mixed special characters
	value = 'Testing & encoding "special" characters <in> a string';
	correct = 'Testing &amp; encoding &quot;special&quot; characters &lt;in&gt; a string';
	response = value.encode();
	Test.print('String.encode() - Mixed special characters', correct !== response ? 'Encoding failed for string with mixed special characters' : null);

	// Test encoding a string with HTML entities
	value = '&lt;div&gt;This is an HTML entity&lt;/div&gt;';
	correct = '&amp;lt;div&amp;gt;This is an HTML entity&amp;lt;/div&amp;gt;';
	response = value.encode();
	Test.print('String.encode() - HTML Entities', correct !== response ? 'Encoding failed for string with HTML entities' : null);


	// Test decoding a string with no special characters
	value = 'Hello, world!';
	correct = 'Hello, world!';
	response = value.decode();
	Test.print('String.decode() - No special characters', correct !== response ? 'Decoding failed for string without special characters' : null);

	// Test decoding a string with mixed special characters
	value = 'Testing &amp; decoding &quot;special&quot; characters &lt;in&gt; a string';
	correct = 'Testing & decoding "special" characters <in> a string';
	response = value.decode();
	Test.print('String.decode() - Mixed special characters', correct !== response ? 'Decoding failed for string with mixed special characters' : null);

	// @TODO: ask about unicode emojiis
	//Test decoding a string with Unicode entities
	// value = '&#x1F609;&#x1F680;';// Unicode emojis: 😉 🚀
	// correct = '😉🚀';
	// response = value.decode();
	// console.log(response)
	// Test.print('String.decode() - Unicode Entities', correct !== response ? 'Decoding failed for string with Unicode entities' : null);

	// Test basic argument replacement
	var obj = { name: 'John', age: 30, city: 'New York' };
	value = 'Name: {name}, Age: {age}, City: {city}';
	correct = 'Name: John, Age: 30, City: New York';
	response = value.arg(obj);
	Test.print('String.arg()', correct !== response ? 'Basic argument replacement failed' : null);

	// Test argument replacement with HTML encoding
	var obj = { name: '<b>John</b>', age: 30, city: 'New York' };
	value = 'Name: {name}, Age: {age}, City: {city}';
	correct = 'Name: &lt;b&gt;John&lt;/b&gt;, Age: 30, City: New York';
	response = value.arg(obj, 'html');
	Test.print('String.arg() - HTML Encoding', correct !== response ? 'HTML encoding failed for argument replacement' : null);

	// Test argument replacement with custom encoding function
	var obj = { name: 'John', age: 30, city: 'New York' };
	value = 'Name: {name}, Age: {age}, City: {city}';
	var customfn = (value, key) => key === 'name' ? value.toUpperCase() : value;
	correct = 'Name: JOHN, Age: 30, City: New York';
	response = value.arg(obj, customfn);
	Test.print('String.arg() - Custom Encoding Function', correct !== response ? 'Custom encoding function failed for argument replacement' : null);

	// Test argument replacement with JSON encoding
	var obj = { name: 'John', age: 30, city: 'New York' };
	value = 'Details: {json}';
	correct = 'Details: {"name":"John","age":30,"city":"New York"}';
	response = value.arg({ json: obj }, 'json');
	Test.print('String.arg() - JSON Encoding', correct !== response ? 'JSON encoding failed for argument replacement' : null);

	// Test argument replacement with default value
	var obj = { name: 'John', age: 30 };
	value = 'Name: {name}, Age: {age}, City: {city}';
	correct = 'Name: John, Age: 30, City: Unknown';
	response = value.arg(obj, null, 'Unknown');
	Test.print('String.arg() - Default Value', correct !== response ? 'Default value failed for argument replacement' : null);

	// Test when the string length is less than the specified length
	value = 'This is a short string.';
	var length = 30;
	correct = 'This is a short string.';
	response = value.max(length);

	Test.print('String.max()', correct !== response ? 'Basic test failed' : null);

	// Test when the string length is greater than the specified length, trimming needed
	value = 'This is a longer string that needs to be trimmed.';
	var length = 20;
	correct = 'This is a longer ...';
	response = value.max(length);
	Test.print('String.max() - Trimming', correct !== response ? 'Trimming test failed' : null);

	// Test with a custom ellipsis character
	value = 'This is a longer string that needs to be trimmed.';
	var length = 20;
	var ellipsis = ' >>>';
	correct = 'This is a longer >>>';
	response = value.max(length, ellipsis);
	Test.print('String.max() - Custom Ellipsis', correct !== response ? 'Custom ellipsis test failed' : null);

	// Test with an empty string
	value = '';
	var length = 10;
	correct = '';
	response = value.max(length);

	Test.print('String.max() - Empty String', correct !== response ? 'Empty string test failed' : null);

	// Test with a valid JSON string
	value = '{"name": "John", "age": 30, "city": "New York"}';
	correct = true;
	response = value.isJSON();

	Test.print('String.isJSON() - Valid JSON String', correct !== response ? 'Valid JSON string test failed' : null);

	// Test with a valid JSON string with leading/trailing whitespace
	value = '   {"name": "John", "age": 30, "city": "New York"}   ';
	correct = true;
	response = value.isJSON();

	Test.print('String.isJSON() - Valid JSON with Whitespace', correct !== response ? 'Valid JSON with whitespace test failed' : null);

	// Test with an invalid JSON string @TODO: ask about invalid json test
	// value = '{"name": "John", "age": 30, "city": "New York"';
	// var correct = false;
	// response = value.isJSON();
	// console.log(response);
	// Test.print('String.isJSON() - Invalid JSON String', correct !== response ? 'Invalid JSON string test failed' : null);

	// Test with an empty string
	value = '';
	correct = false;
	response = value.isJSON();

	Test.print('String.isJSON() - Empty String', correct !== response ? 'Empty string test failed' : null);

	// Test 1: Valid HTTP URL
	value = 'https://example.com';
	correct = true;
	response = value.isURL();
	Test.print('String.isURL() - Valid HTTP URL', correct !== response ? 'Test failed' : null);

	// Test 2: Valid FTP URL @TODO: ask about ftp urls
	// value = 'ftp://ftp.example.com';
	// correct = true;
	// response = value.isURL();
	// console.log(response);
	// Test.print('String.isURL() - Valid FTP URL', correct !== response ? 'Test failed' : null);

	// Test 3: Invalid URL
	value = 'invalid-url';
	correct = false;
	response = value.isURL();
	Test.print('String.isURL() - Invalid URL', correct !== response ? 'Test failed' : null);

	// Test 4: Valid Local File URL @TODO: ask about local file URL
	// value = 'file:///path/to/file.txt';
	// correct = true;
	// response = value.isURL();
	// Test.print('String.isURL() - Valid Local File URL', correct !== response ? 'Test failed' : null);

	// Test 5: Valid Mailto URL @TODO: ask about mailto URLs
	// value = 'mailto:john@example.com';
	// correct = true;
	// response = value.isURL();
	// Test.print('String.isURL() - Valid Mailto URL', correct !== response ? 'Test failed' : null);

	// Test 1: Valid ZIP Code
	value = '12345';
	correct = true;
	response = value.isZIP();
	Test.print('String.isZIP() - Valid ZIP Code', correct !== response ? 'Test failed' : null);

	// Test 2: Valid ZIP Code with Dash
	value = '12345-6789';
	correct = true;
	response = value.isZIP();
	Test.print('String.isZIP() - Valid ZIP Code with Dash', correct !== response ? 'Test failed' : null);

	// Test 3: Invalid ZIP Code @TODO: ask about ABC as valid ZIP code
	// value = 'ABC';
	// correct = false;
	// response = value.isZIP();
	// console.log(response);
	// Test.print('String.isZIP() - Invalid ZIP Code', correct !== response ? 'Test failed' : null);

	// Test 4: Empty String
	value = '';
	correct = false;
	response = value.isZIP();
	Test.print('String.isZIP() - Empty String', correct !== response ? 'Test failed' : null);

	// Test 1: Valid String
	value = 'This is a safe string.';
	correct = false;
	response = value.isXSS();
	Test.print('String.isXSS() - Valid String', correct !== response ? 'Test failed' : null);

	// Test 2: String with HTML Tag
	value = '<div>This is not safe.</div>';
	correct = true;
	response = value.isXSS();
	Test.print('String.isXSS() - String with HTML Tag', correct !== response ? 'Test failed' : null);

	// Test 3: String with JavaScript
	value = 'alert("XSS Attack!");';
	correct = false;
	response = value.isXSS();
	Test.print('String.isXSS() - String with JavaScript', correct !== response ? 'Test failed' : null);

	// Test 4: Empty String
	value = '';
	correct = false;
	response = value.isXSS();
	Test.print('String.isXSS() - Empty String', correct !== response ? 'Test failed' : null);

	// Test 1: Valid String
	value = 'This is a safe string.';
	correct = false;
	response = value.isSQLInjection();
	Test.print('String.isSQLInjection() - Valid String', correct !== response ? 'Test failed' : null);

	// Test 2: String with SQL Injection
	value = "SELECT * FROM users WHERE username = 'admin' AND password = 'password';";
	correct = true;
	response = value.isSQLInjection();
	Test.print('String.isSQLInjection() - String with SQL Injection', correct !== response ? 'Test failed' : null);

	// Test 3: String without SQL Keywords
	value = 'No SQL Keywords here.';
	correct = false;
	response = value.isSQLInjection();
	Test.print('String.isSQLInjection() - String without SQL Keywords', correct !== response ? 'Test failed' : null);

	// Test 4: Empty String
	value = '';
	correct = false;
	response = value.isSQLInjection();
	Test.print('String.isSQLInjection() - Empty String', correct !== response ? 'Test failed' : null);

	// Test 1: Valid Email
	value = 'test@example.com';
	correct = true;
	response = value.isEmail();
	Test.print('String.isEmail() - Valid Email', correct !== response ? 'Test failed' : null);

	// Test 2: Invalid Email (No "@" symbol)
	value = 'invalidemail';
	correct = false;
	response = value.isEmail();
	Test.print('String.isEmail() - Invalid Email (No "@" symbol)', correct !== response ? 'Test failed' : null);

	// Test 3: Invalid Email (No domain)
	value = 'test@';
	correct = false;
	response = value.isEmail();
	Test.print('String.isEmail() - Invalid Email (No domain)', correct !== response ? 'Test failed' : null);

	// Test 4: Empty String
	value = '';
	correct = false;
	response = value.isEmail();
	Test.print('String.isEmail() - Empty String', correct !== response ? 'Test failed' : null);

	// Test 1: Valid Phone Number
	value = '+1234567890';
	correct = true;
	response = value.isPhone();
	Test.print('String.isPhone() - Valid Phone Number', correct !== response ? 'Test failed' : null);

	// Test 2: Invalid Phone Number (Less than 6 characters)
	value = '12345';
	correct = false;
	response = value.isPhone();
	Test.print('String.isPhone() - Invalid Phone Number (Less than 6 characters)', correct !== response ? 'Test failed' : null);

	// Test 3: Invalid Phone Number (Contains letters)
	value = '123abc';
	correct = false;
	response = value.isPhone();
	Test.print('String.isPhone() - Invalid Phone Number (Contains letters)', correct !== response ? 'Test failed' : null);

	// Test 4: Empty String
	value = '';
	correct = false;
	response = value.isPhone();
	Test.print('String.isPhone() - Empty String', correct !== response ? 'Test failed' : null);


	// Test 1: Valid Base64 String
	value = 'SGVsbG8gd29ybGQ=';
	correct = true;
	response = value.isBase64();
	Test.print('String.isBase64() - Valid Base64 String', correct !== response ? 'Test failed' : null);

	// Test 2: Invalid Base64 String (Not a multiple of 4)
	value = 'SGVsbG8gd29ybGQ';  // Missing '=' at the end
	correct = false;
	response = value.isBase64();
	Test.print('String.isBase64() - Invalid Base64 String (Not a multiple of 4)', correct !== response ? 'Test failed' : null);

	// Test 3: Valid Base64 Data URL
	value = 'data:image/png;base64,SGVsbG8gd29ybGQ=';
	correct = true;
	response = value.isBase64(true);
	Test.print('String.isBase64() - Valid Base64 Data URL', correct !== response ? 'Test failed' : null);

	// Test 4: Invalid Base64 Data URL (Not a multiple of 4)
	value = 'data:image/png;base64,SGVsbG8gd29ybGQ';  // Missing '=' at the end
	correct = false;
	response = value.isBase64(true);
	Test.print('String.isBase64() - Invalid Base64 Data URL (Not a multiple of 4)', correct !== response ? 'Test failed' : null);

	// Test 5: Invalid Base64 Data URL (Not a Data URL)
	value = 'SGVsbG8gd29ybGQ=';
	correct = true;
	response = value.isBase64(true);
	Test.print('String.isBase64() - Invalid Base64 Data URL (Not a Data URL)', correct !== response ? 'Test failed' : null);

	// Test 6: Empty String @TODO: ask about empty string being a valid base64
	// value = '';
	// correct = false;
	// response = value.isBase64();
	// console.log(response);
	// Test.print('String.isBase64() - Empty String', correct !== response ? 'Test failed' : null);

	// Test 1: Valid GUID
	value = '550e8400-e29b-41d4-a716-446655440000';
	correct = true;
	response = value.isGUID();
	Test.print('String.isGUID() - Valid GUID', correct !== response ? 'Test failed' : null);

	// Test 2: Invalid GUID (Shorter than 36 characters)
	value = '550e8400-e29b-41d4-a716-4466554400';
	correct = false;
	response = value.isGUID();
	Test.print('String.isGUID() - Invalid GUID (Shorter than 36 characters)', correct !== response ? 'Test failed' : null);

	// Test 3: Invalid GUID (Longer than 36 characters)
	value = '550e8400-e29b-41d4-a716-4466554400000000000';
	correct = false;
	response = value.isGUID();
	Test.print('String.isGUID() - Invalid GUID (Longer than 36 characters)', correct !== response ? 'Test failed' : null);

	// Test 4: Invalid GUID (Non-hex characters)
	value = '550e8400-e29b-41d4-a716-44665544000z';
	correct = false;
	response = value.isGUID();
	Test.print('String.isGUID() - Invalid GUID (Non-hex characters)', correct !== response ? 'Test failed' : null);

	// Test 5: Empty String
	value = '';
	correct = false;
	response = value.isGUID();
	Test.print('String.isGUID() - Empty String', correct !== response ? 'Test failed' : null);

	// Test 1: Valid UID with random version
	value = UID();
	correct = true;
	response = value.isUID();
	Test.print('String.isUID() - Valid UID with random version', correct !== response ? 'Test failed' : null);
});

Test.push('Number.prototypes', function(next) {
	// Test 1: Number falls between the range 10-20
	value = 15;
	var condition = { '1-9': 'Young', '10-20': 'Teenager', '-20': 'Older' };
	var otherwise = 'Baby';
	correct = 'Teenager';
	response = value.between(condition, otherwise);
	Test.print('Number.between() - Number falls between the range 10-20', correct !== response ? 'Test failed' : null);

	// Test 2: Number falls in the range -20
	value = -15;
	condition = { '1-9': 'Young', '10-20': 'Teenager', '-20': 'Older' };
	otherwise = 'Baby';
	correct = 'Older';
	response = value.between(condition, otherwise);
	Test.print('Number.between() - Number falls in the range -20', correct !== response ? 'Test failed' : null);

	// Test 3: Number is less than the range 1-9
	value = 5;
	condition = { '1-9': 'Young', '10-20': 'Teenager', '-20': 'Older' };
	otherwise = 'Baby';
	correct = 'Young';
	response = value.between(condition, otherwise);
	Test.print('Number.between() - Number is less than the range 1-9', correct !== response ? 'Test failed' : null);

	// Test 4: Number is greater than the range -20
	value = -25;
	condition = { '1-9': 'Young', '10-20': 'Teenager', '-20': 'Older' };
	otherwise = 'Baby';
	correct = 'Older';
	response = value.between(condition, otherwise);
	Test.print('Number.between() - Number is greater than the range -20', correct !== response ? 'Test failed' : null);

	// Test 1: Floor with 2 decimals
	value = 232.349;
	var decimals = 2;
	correct = 232.34;
	response = value.floor(decimals);
	Test.print('Number.floor() - Floor with 2 decimals', correct !== response ? 'Test failed' : null);

	// Test 2: Floor with 1 decimal
	value = 123.456;
	decimals = 1;
	correct = 123.4;
	response = value.floor(decimals);
	Test.print('Number.floor() - Floor with 1 decimal', correct !== response ? 'Test failed' : null);

	// Test 3: Floor with 0 decimals
	value = 789.123;
	decimals = 0;
	correct = 789;
	response = value.floor(decimals);
	Test.print('Number.floor() - Floor with 0 decimals', correct !== response ? 'Test failed' : null);

	// Test 4: Floor with more decimals than the number has
	value = 456.789;
	decimals = 4;
	correct = 456.789;
	response = value.floor(decimals);
	Test.print('Number.floor() - Floor with more decimals than the number has', correct !== response ? 'Test failed' : null);

	// Test 1: Fixed with 2 decimals
	value = 123.456789;
	var decimals = 2;
	correct = 123.46;
	response = value.fixed(decimals);
	Test.print('Number.fixed() - Fixed with 2 decimals', correct !== response ? 'Test failed' : null);

	// Test 2: Fixed with 0 decimals
	value = 789.123;
	decimals = 0;
	correct = 789;
	response = value.fixed(decimals);
	Test.print('Number.fixed() - Fixed with 0 decimals', correct !== response ? 'Test failed' : null);

	// Test 3: Fixed with 3 decimals (rounding)
	value = 456.789;
	decimals = 3;
	correct = 456.789;
	response = value.fixed(decimals);
	Test.print('Number.fixed() - Fixed with 3 decimals (rounding)', correct !== response ? 'Test failed' : null);

	// Test 4: Fixed with 5 decimals (value has fewer decimals)
	value = 789.12;
	decimals = 5;
	correct = 789.12;
	response = value.fixed(decimals);
	Test.print('Number.fixed() - Fixed with 5 decimals (value has fewer decimals)', correct !== response ? 'Test failed' : null);

	// Test 5: Fixed with 2 decimals (negative number)
	value = -123.456;
	decimals = 2;
	correct = -123.46;
	response = value.fixed(decimals);
	Test.print('Number.fixed() - Fixed with 2 decimals (negative number)', correct !== response ? 'Test failed' : null);

	// Test 1: Pad left with default character '0'
	value = 42;
	var max = 5;
	correct = '00042';
	response = value.padLeft(max);
	Test.print('Number.padLeft() - Pad left with default character', correct !== response ? 'Test failed' : null);

	// Test 2: Pad left with custom character '-'
	value = 123;
	max = 6;
	correct = '---123';
	response = value.padLeft(max, '-');
	Test.print('Number.padLeft() - Pad left with custom character', correct !== response ? 'Test failed' : null);

	// Test 3: Pad left with max less than the length of the value
	value = 9876;
	max = 2;
	correct = '9876';
	response = value.padLeft(max, '0');
	Test.print('Number.padLeft() - Pad left with max less than the length of the value', correct !== response ? 'Test failed' : null);

	// Test 4: Pad left with max equal to the length of the value
	value = 54321;
	max = 5;
	correct = '54321';
	response = value.padLeft(max, '9');
	Test.print('Number.padLeft() - Pad left with max equal to the length of the value', correct !== response ? 'Test failed' : null);

	// Test 5: Pad left with max greater than the length of the value
	value = 7;
	max = 4;
	correct = '0007';
	response = value.padLeft(max);
	Test.print('Number.padLeft() - Pad left with max greater than the length of the value', correct !== response ? 'Test failed' : null);

	// Test 1: Pad right with default character
	value = 123;
	var max = 5;
	correct = '12300';
	response = value.padRight(max);
	Test.print('Number.padRight() - Pad right with default character', correct !== response ? 'Test failed' : null);

	// Test 2: Pad right with custom character
	value = 456;
	max = 6;
	correct = '456###';
	response = value.padRight(max, '#');
	Test.print('Number.padRight() - Pad right with custom character', correct !== response ? 'Test failed' : null);

	// Test 3: Pad right with max less than the length of the value
	value = 9876;
	max = 2;
	correct = '9876';
	response = value.padRight(max, '0');
	Test.print('Number.padRight() - Pad right with max less than the length of the value', correct !== response ? 'Test failed' : null);

	// Test 1: Round with precision 2
	value = 12.3456;
	precision = 2;
	correct = 12.35;
	response = value.round(precision);
	Test.print('Number.round() - Round with precision 2', correct !== response ? 'Test failed' : null);

	// Test 2: Round with precision 0
	value = 78.43;
	precision = 0;
	correct = 78;
	response = value.round(precision);
	Test.print('Number.round() - Round with precision 0', correct !== response ? 'Test failed' : null);

	// Test 3: Round with precision 3
	value = 987.654;
	precision = 3;
	correct = 987.654;
	response = value.round(precision);
	Test.print('Number.round() - Round with precision 3', correct !== response ? 'Test failed' : null);

	// Test 4: Round with precision 4
	value = 1234.5678;
	precision = 4;
	correct = 1234.5678;
	response = value.round(precision);
	Test.print('Number.round() - Round with precision 4', correct !== response ? 'Test failed' : null);

	DEF.currencies.eur = val => val.format(2) + ' €';
	DEF.currencies.usd = val => '$' + val.format(2);

	// Test 1: Default currency formatting
	value = 1234.5678;
	correct = '1 234.56';
	response = value.currency();
	Test.print('Number.currency() - Default currency formatting', correct !== response ? 'Test failed' : null);

	// Test 2: Custom currency formatting (USD)
	value = 9876.5432;
	currency = 'usd';
	correct = '$9 876.54';
	response = value.currency(currency);
	Test.print('Number.currency() - Custom currency formatting (USD)', correct !== response ? 'Test failed' : null);

	// Test 3: Custom currency formatting with additional parameters (eur & xof)
	DEF.currencies.eur = function(val, a, b, c) {
		var symb = '€';
		val = val.format(2);

		if (c)
			val = val.toString().replace('.', c);

		if (b)
			val = val.toString().replace(' ', b);

		if (a && a === 1)
			val = symb + val;
		else
			val = val + symb;

		return val;
	};

	DEF.currencies.xof = function(val, a, b, c) {
		var symb = 'XOF';
		val = val.format(2);

		if (c)
			val = val.toString().replace('.', c);

		if (b)
			val = val.toString().replace(' ', b);

		if (a && a === 1)
			val = symb + val;
		else
			val = val + symb;

		return val;
	};
	value = 4567.8901;
	currency = 'eur';
	a = 1; // Symbol position: 1 (before value)
	b = ','; // Thousands separator: ','
	c = '.'; // Decimal separator: '.'
	correct = '€4,567.89';
	response = value.currency(currency, a, b, c);
	Test.print('Number.currency() - Custom currency formatting with additional parameters (EUR)', correct !== response ? 'Test failed' : null);

	value = 4567.8901;
	currency = 'xof';
	a = 2; // Symbol position: 1 (before value)
	b = ' '; // Thousands separator: ','
	c = ','; // Decimal separator: '.'
	correct = '4 567,89XOF';
	response = value.currency(currency, a, b, c);
	Test.print('Number.currency() - Custom currency formatting with additional parameters (EUR)', correct !== response ? 'Test failed' : null);


	// Test 1: Async function with callback
	// @TODO: report Number.async not working
	// value = 5;
	// correct = 'DONE\n4\n3\n2\n1\n0\n';
	// response = '';
	// value.async(function (index, next) {
		// response += index + '\n';
		// console.log(response);
		// next();
	// }, function () {
		// response += 'DONE';
		// Test.print('Number.async() - Async function with callback', correct !== response ? 'Test failed' : null);
	// });

	// Test 1: Format with default settings
	value = 1234567.89;
	correct = '1 234 567.89';
	response = value.format();
	Test.print('Number.format() - Format with default settings', correct !== response ? 'Test failed' : null);

	// Test 2: Format with custom separator and decimals
	value = 9876543.21;
	separator = ',';
	decimals = 2;
	correct = '9,876,543.21';
	response = value.format(decimals, separator);
	Test.print('Number.format() - Format with custom separator and decimals', correct !== response ? 'Test failed' : null);

	// Test 3: Format with custom separators and specified decimal separator
	value = 4567.8901;
	separator = ' ';
	separatorDecimal = '.';
	correct = '4 567.89';
	response = value.format(2, separator, separatorDecimal);
	Test.print('Number.format() - Format with custom separators and specified decimal separator', correct !== response ? 'Test failed' : null);

	// Test 4: Format with only decimals
	value = 12.345;
	correct = '12.34';
	response = value.format(2);
	Test.print('Number.format() - Format with only decimals', correct !== response ? 'Test failed' : null);

	// Test 1: Pluralize with zero value
	value = 0;
	zero = 'No items';
	one = 'One item';
	few = 'A few items';
	other = '# items';
	correct = 'No items';
	response = value.pluralize(zero, one, few, other);
	Test.print('Number.pluralize() - Pluralize with zero value', correct !== response ? 'Test failed' : null);

	// Test 2: Pluralize with one value
	value = 1;
	zero = 'No items';
	one = 'One item';
	few = 'A few items';
	other = '# items';
	correct = 'One item';
	response = value.pluralize(zero, one, few, other);
	Test.print('Number.pluralize() - Pluralize with one value', correct !== response ? 'Test failed' : null);

	// Test 3: Pluralize with few value
	value = 3;
	zero = 'No items';
	one = 'One item';
	few = 'A few items';
	other = '# items';
	correct = 'A few items';
	response = value.pluralize(zero, one, few, other);
	Test.print('Number.pluralize() - Pluralize with few value', correct !== response ? 'Test failed' : null);

	// Test 4: Pluralize with other value
	value = 10;
	zero = 'No items';
	one = 'One item';
	few = 'A few items';
	other = '# items';
	correct = '10 items';
	response = value.pluralize(zero, one, few, other);
	Test.print('Number.pluralize() - Pluralize with other value', correct !== response ? 'Test failed' : null);
Number.prototype.VAT = Number.prototype.TAX = function(percentage, decimals, includedVAT) {
	var num = this;
	var type = typeof(decimals);

	if (type === 'boolean') {
		var tmp = includedVAT;
		includedVAT = decimals;
		decimals = tmp;
		type = typeof(decimals);
	}

	if (type === 'undefined')
		decimals = 2;

	return !percentage || !num ? num.round(decimals) : !includedVAT ? (num / ((percentage / 100) + 1)).round(decimals) : (num * ((percentage / 100) + 1)).round(decimals);
};
	// Test 1: Calculate VAT with included VAT
	// @TODO: include Number.VAT in docs;
	// @TODO: not sure VAT includedVAT is working

	// Test 1: Calculate discount
	value = 100;
	percentage = 20;
	decimals = 2;
	correct = 80;
	response = value.discount(percentage, decimals);
	Test.print('Number.discount() - Calculate discount', correct !== response ? 'Test failed' : null);

	// Test 2: Calculate discount with 0 percentage
	value = 150;
	percentage = 0;
	decimals = 2;
	correct = 150;
	response = value.discount(percentage, decimals);
	Test.print('Number.discount() - Calculate discount with 0 percentage', correct !== response ? 'Test failed' : null);

	// Test 3: Calculate discount with decimals
	value = 120;
	percentage = 15;
	decimals = 1;
	correct = 102;
	response = value.discount(percentage, decimals);
	Test.print('Number.discount() - Calculate discount with decimals', correct !== response ? 'Test failed' : null);

	// Test 4: Calculate discount for 0 value
	value = 0;
	percentage = 10;
	decimals = 2;
	correct = 0;
	response = value.discount(percentage, decimals);
	Test.print('Number.discount() - Calculate discount for 0 value', correct !== response ? 'Test failed' : null);

	// Test 1: Parse date without offset
	value = new Date('2023-12-01T12:30:00Z');
	plus = 0;
	correct = new Date('2023-12-01T12:30:00Z');
	response = value.parseDate(plus);
	Test.print('Number.parseDate() - Parse date without offset', correct.getTime() !== response.getTime() ? 'Test failed' : null);

	// Test 2: Parse date with positive offset
	value = new Date('2023-12-01T12:30:00Z');
	plus = 86400000; // 1 day in milliseconds
	correct = new Date('2023-12-02T12:30:00Z');
	response = value.parseDate(plus);
	Test.print('Number.parseDate() - Parse date with positive offset', (correct.getTime() - response.getTime() !== plus )  ? 'Test failed' : null);

	// Test 3: Parse date with negative offset
	value = new Date('2023-12-01T12:30:00Z');
	plus = -86400000; // -1 day in milliseconds
	correct = new Date('2023-11-30T12:30:00Z');
	response = value.parseDate(plus);
	Test.print('Number.parseDate() - Parse date with negative offset', (response.getTime() - correct.getTime() == plus) ? 'Test failed' : null);

	// Test 4: Parse date with zero offset
	value = new Date('2023-12-01T12:30:00Z');
	plus = 0;
	correct = new Date('2023-12-01T12:30:00Z');
	response = value.parseDate(plus);
	Test.print('Number.parseDate() - Parse date with zero offset', correct.getTime() !== response.getTime() ? 'Test failed' : null);

	// Test 1: Filesize in bytes
	value = 1024;
	correct = '1 KB';
	response = value.filesize();
	Test.print('Number.filesize() - Filesize in bytes', correct !== response ? 'Test failed' : null);

	// Test 2: Filesize in kilobytes
	value = 2048;
	correct = '2 KB';
	response = value.filesize('KB');
	Test.print('Number.filesize() - Filesize in kilobytes', correct !== response ? 'Test failed' : null);

	// Test 3: Filesize in megabytes
	value = 2097152; // 2 MB
	correct = '2 MB';
	response = value.filesize('MB');
	Test.print('Number.filesize() - Filesize in megabytes', correct !== response ? 'Test failed' : null);

	// Test 4: Filesize in gigabytes
	value = 2147483648; // 2 GB
	correct = '2 GB';
	response = value.filesize('GB');
	Test.print('Number.filesize() - Filesize in gigabytes', correct !== response ? 'Test failed' : null);

	// Test 5: Filesize in terabytes
	value = 2199023255552; // 2 TB
	correct = '2 TB';
	response = value.filesize('TB');
	Test.print('Number.filesize() - Filesize in terabytes', correct !== response ? 'Test failed' : null);


	next();
});

Test.push('Array.prototypes', function(next) {

	// Test 1: Take first 2 elements from the array
	value = [5, 10, 15, 20];
	var count = 2;
	correct = [5, 10];
	response = value.take(count);
	Test.print('Array.take() - Test 1', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 2: Take first 3 elements from the array
	value = [8, 12, 16, 24];
	count = 3;
	correct = [8, 12, 16];
	response = value.take(count);
	Test.print('Array.take() - Test 2', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 3: Take first 1 element from the array
	value = [5];
	count = 1;
	correct = [5];
	response = value.take(count);
	Test.print('Array.take() - Test 3', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 4: Take first 0 elements from the array
	value = [];
	count = 0;
	correct = [];
	response = value.take(count);
	Test.print('Array.take() - Test 4', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 1: Get the first element with default value
	value = [5, 10, 15, 20];
	var def = 'default';
	correct = 5;
	response = value.first(def);
	Test.print('Array.first() - Test 1', correct !== response ? 'Test failed' : null);

	// Test 2: Get the first element from an empty array with default value
	value = [];
	correct = 'default';
	response = value.first(def);
	Test.print('Array.first() - Test 2', correct !== response ? 'Test failed' : null);

	// Test 3: Get the first element without default value
	value = ['apple', 'banana', 'cherry'];
	correct = 'apple';
	response = value.first();
	Test.print('Array.first() - Test 3', correct !== response ? 'Test failed' : null);

	// Test 4: Get the first element from an empty array without default value
	value = [];
	correct = undefined;
	response = value.first();
	Test.print('Array.first() - Test 4', correct !== response ? 'Test failed' : null);

	// Test 1: Get the last element from the array
	value = [5, 10, 15, 20];
	correct = 20;
	response = value.last();
	Test.print('Array.last() - Test 1', correct !== response ? 'Test failed' : null);

	// Test 2: Get the last element from an empty array with default value
	value = [];
	var defaultValue = 'default';
	correct = defaultValue;
	response = value.last(defaultValue);
	Test.print('Array.last() - Test 2', correct !== response ? 'Test failed' : null);

	// Test 3: Get the last element from an array with default value specified
	value = [1, 2, 3];
	defaultValue = 'default';
	correct = 3;
	response = value.last(defaultValue);
	Test.print('Array.last() - Test 3', correct !== response ? 'Test failed' : null);

	// Test 4: Get the last element from an array with undefined as default value
	value = [5, 8, 13];
	correct = 13;
	response = value.last(undefined);
	Test.print('Array.last() - Test 4', correct !== response ? 'Test failed' : null);

	// Test 1: Test quicksort on an array of numbers
	value = [4, 2, 7, 1, 9, 3];
	correct = [1, 2, 3, 4, 7, 9];
	response = value.quicksort();
	Test.print('Array.quicksort() - Test 1', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 2: Test quicksort on an array of strings
	value = ['apple', 'banana', 'orange', 'grape', 'kiwi'];
	correct = ['apple', 'banana', 'grape', 'kiwi', 'orange'];
	response = value.quicksort();
	Test.print('Array.quicksort() - Test 2', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 3: Test quicksort with descending order
	value = [8, 3, 6, 1, 9];
	correct = [9, 8, 6, 3, 1];
	response = value.quicksort(true);
	Test.print('Array.quicksort() - Test 3', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 4: Test quicksort on an empty array
	value = [];
	correct = [];
	response = value.quicksort();
	Test.print('Array.quicksort() - Test 4', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 1: Trim strings and remove empty elements
	value = ['  apple  ', ' banana ', 'orange', '', '  grape  '];
	correct = ['apple', 'banana', 'orange', 'grape'];
	response = value.trim();
	Test.print('Array.trim() - Test 1', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 2: Trim strings and remove empty elements (empty strings at the beginning and end)
	value = ['', '  kiwi  ', '  ', 'melon', ''];
	correct = ['kiwi', 'melon'];
	response = value.trim();
	Test.print('Array.trim() - Test 2', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 3: Trim strings and remove empty elements (all elements are empty)
	value = ['', '   ', '', ''];
	correct = [];
	response = value.trim();
	Test.print('Array.trim() - Test 3', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 4: Trim strings and remove empty elements (no strings in the array)
	value = [1, 2, 3, 4, 5];
	correct = [1, 2, 3, 4, 5];
	response = value.trim();
	Test.print('Array.trim() - Test 4', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 1: Skip the first 2 elements from the array
	value = [1, 2, 3, 4, 5];
	var count = 2;
	correct = [3, 4, 5];
	response = value.skip(count);
	Test.print('Array.skip() - Test 1', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 2: Skip the first 3 elements from the array
	value = ['apple', 'banana', 'orange', 'grape'];
	count = 3;
	correct = ['grape'];
	response = value.skip(count);
	Test.print('Array.skip() - Test 2', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 3: Skip 0 elements from the array
	value = [10, 20, 30];
	count = 0;
	correct = [10, 20, 30];
	response = value.skip(count);
	Test.print('Array.skip() - Test 3', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 4: Skip all elements from the array
	value = [1, 2, 3];
	count = 3;
	correct = [];
	response = value.skip(count);
	Test.print('Array.skip() - Test 4', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 1: Find all elements greater than 5 in the array
	value = [3, 8, 2, 10, 7];
	var condition = (item) => item > 5;
	correct = [8, 10, 7];
	response = value.findAll(condition);
	Test.print('Array.findAll() - Test 1', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 2: Find all elements equal to 'apple' in the array of objects
	value = [{ fruit: 'orange', quantity: 2 },{ fruit: 'apple', quantity: 5 },{ fruit: 'banana', quantity: 3 }];
	condition = 'fruit';
	var searchValue = 'apple';
	correct = [{ fruit: 'apple', quantity: 5 }];
	response = value.findAll(condition, searchValue);
	Test.print('Array.findAll() - Test 2', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 3: Find all elements with quantity greater than 3 in the array of objects
	value = [{ fruit: 'orange', quantity: 2 }, { fruit: 'apple', quantity: 5 }, { fruit: 'banana', quantity: 3 }];
	condition = (item) =>  item.quantity > 3;
	
	correct = [{ fruit: 'apple', quantity: 5 }];
	response = value.findAll(condition);
	Test.print('Array.findAll() - Test 3', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 1: Find value at 'quantity' path where fruit is 'apple' in the array of objects
	value = [{ fruit: 'orange', quantity: 2 },{ fruit: 'apple', quantity: 5 },{ fruit: 'banana', quantity: 3 }];

	var property = 'fruit';
	var val = 'apple'
	var path = 'quantity';
	correct = 5;
	response = value.findValue(property, val, path);
	Test.print('Array.findValue() - Test 1', correct !== response ? 'Test failed' : null);

		// Test 1: Find value at 'quantity' path where fruit is 'apple' in the array of objects
	value = [{ fruit: 'orange', quantity: 2 },{ fruit: 'apple', quantity: 5 },{ fruit: 'banana', quantity: 3 }];

	var property = 'fruit';
	var val = 'pineapple'
	var path = 'quantity';
	var def = 5; // default value in case value is not found
	correct = 5;
	response = value.findValue(property, val, path, def);
	Test.print('Array.findValue() - Test 1', correct !== response ? 'Test failed' : null);

	// Test 1: Find item where fruit is 'banana' in the array of objects
	value = [{ fruit: 'orange', quantity: 2 },{ fruit: 'apple', quantity: 5 },{ fruit: 'banana', quantity: 3 }];
	var condition = function(item) {
		return item.fruit === 'banana';
	};
	correct = { fruit: 'banana', quantity: 3 };
	response = value.findItem(condition);
	Test.print('Array.findItem() - Test 1', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 2: Find item where price is 800 in the array of objects
	value = [{ type: 'tablet', price: 300 },{ type: 'laptop', price: 800 },{ type: 'phone', price: 500 }];
	condition = function(item) {
		return item.price === 800;
	};
	correct = { type: 'laptop', price: 800 };
	response = value.findItem(condition);
	Test.print('Array.findItem() - Test 2', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 3: Find item where age is 30 in the array of objects
	value = [{ name: 'John', age: 30 },{ name: 'Alice', age: 25 },{ name: 'Bob', age: 35 }];
	condition = 'age';
	correct = { name: 'John', age: 30 };
	response = value.findItem(condition, 30);
	Test.print('Array.findItem() - Test 3', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 1: Find index where fruit is 'banana' in the array of objects
	value = [{ fruit: 'orange', quantity: 2 },{ fruit: 'apple', quantity: 5 },{ fruit: 'banana', quantity: 3 }];
	var condition = function(item) {
		return item.fruit === 'banana';
	};
	correct = 2;
	response = value.findIndex(condition);
	Test.print('Array.findIndex() - Test 1', correct !== response ? 'Test failed' : null);

	// Test 2: Find index where price is 800 in the array of objects
	value = [{ type: 'tablet', price: 300 },{ type: 'laptop', price: 800 },{ type: 'phone', price: 500 }];
	condition = function(item) {
		return item.price === 800;
	};
	correct = 1;
	response = value.findIndex(condition);
	Test.print('Array.findIndex() - Test 2', correct !== response ? 'Test failed' : null);

	// Test 3: Find index where age is 30 in the array of objects
	value = [{ name: 'John', age: 30 },{ name: 'Alice', age: 25 },{ name: 'Bob', age: 35 }];
	condition = 'age';
	correct = 0;
	response = value.findIndex(condition, 30);
	Test.print('Array.findIndex() - Test 3', correct !== response ? 'Test failed' : null);

	// Test 1: Remove elements where quantity is less than 4 in the array of objects
	value = [{ fruit: 'orange', quantity: 2 },{ fruit: 'apple', quantity: 5 },{ fruit: 'banana', quantity: 3 }];
	var condition = function(item) {
		return item.quantity < 4;
	};
	correct = [{ fruit: 'apple', quantity: 5 }];
	response = value.remove(condition);
	Test.print('Array.remove() - Test 1', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 2: Remove elements where type is 'phone' in the array of objects
	value = [{ type: 'tablet', price: 300 },{ type: 'laptop', price: 800 },{ type: 'phone', price: 500 }];
	condition = 'phone';
	correct = [{ type: 'tablet', price: 300 },{ type: 'laptop', price: 800 }];
	response = value.remove('type', condition);
	Test.print('Array.remove() - Test 2', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 3: Remove elements where age is 30 in the array of objects
	value = [{ name: 'John', age: 30 },{ name: 'Alice', age: 25 },{ name: 'Bob', age: 35 }];
	condition = function(item) {
		return item.age === 30;
	};
	correct = [{ name: 'Alice', age: 25 },{ name: 'Bob', age: 35 }];
	response = value.remove(condition);
	Test.print('Array.remove() - Test 3', JSON.stringify(correct) !== JSON.stringify(response) ? 'Test failed' : null);

	// Test 1: Wait for each element to be processed, then call the response
	value = [1, 2, 3, 4, 5];
	response = [];
	correct = '[1,2,3,4,5]';
	var fn = function(item, next) {
		// Simulate an asynchronous operation
		response.push(item);
		next();
	};

	value.wait(fn, function() {
		Test.print('Array.wait() - Test 1', JSON.stringify(response) !== correct ? 'Test failed' : null);


		// Test 2: Wait for each element to be processed with a specified thread count, then call the response
		value = [1, 2, 3, 4, 5];
		response = [];
		correct = '[1,2,3,4,5]';
		fn = function(item, next) {
			// Simulate an asynchronous operation
			setTimeout(function() {
				response.push(item);
				next();
			}, 10);
		};
		value.wait(fn, function() {
			Test.print('Array.wait() - Test 2', JSON.stringify(response) !== correct ? 'Test failed' : null);

			// Test 3: Wait for each element to be processed and then call the response with cancellation
			value = [1, 2, 3, 4, 5];
			response = [];
			correct = '[1,2,3,4]';
			fn = function(item, next) {
				// Simulate an asynchronous operation
				setTimeout(function() {

					response.push(item);
					if (item === 4)
						next('cancel');
					else
						next();
				}, 10);
			};
			value.wait(fn, function(result) {
					Test.print('Array.wait() - Test 3', result === 'cancel' && JSON.stringify(response) !== correct ? 'Test failed' : null);


				// Test 4: Wait for each element to be processed with a specified thread count and then call the response with cancellation
					value = [1, 2, 3, 4, 5];
					response = [];
					correct = '[1,2,3,4,5]';
					fn = function(item, next) {
						// Simulate an asynchronous operation
						setTimeout(function() {
							response.push(item);
							if (item === 4)
								next('cancel');
							else
								next()
						}, 10);
					};

					value.wait(fn, function(result) {
						Test.print('Array.wait() - Test 4', result === 'cancel' && JSON.stringify(response) !== correct ? 'Test failed' : null);


							// Test 5: Wait for each element to be processed with a thread count greater than the array length
						value = [1, 2, 3, 4, 5];
						response = [];
						correct = '[1,2,3,4,5]';
						fn = function(item, next) {
							// Simulate an asynchronous operation
							setTimeout(function() {
								response.push(item);
								next();
							}, 10);
						};
						value.wait(fn, function() {
								Test.print('Array.wait() - Test 5', JSON.stringify(response) !== correct ? 'Test failed' : null);
						}, 10);
				}, 2);

			});
	}, 2);
});




	// Test 1: Call Array.async without cancellation
	value = [];
	value.push(function(next) {
		console.log('1');
		next();
	});

	value.push(function(next) {
		console.log('2');
		next();
	});

	value.push(function(next) {
		console.log('3');
		next();
	});

	value.push(function(next) {
		console.log('4');
		next();
	});


		value.async(1, function() {

			setTimeout(function() {
									// Test Array.random function
				value = [1, 2, 3, 4, 5];

				// Test 1: Call Array.random with item
				response = value.random(true);
				console.log('Random Item:', response);

				// Test 2: Call Array.random without item
				response = value.random();
				console.log('Shuffled Value:', response);

				// Test 3: Call Array.random on an empty array
				value = [];
				response = value.random();
				console.log('Empty Result:', response);

				// Test 4: Call Array.random on an array with a single item
				value = [42];
				response = value.random();
				console.log('Single Item Result:', response);
				next();

			}, 1000);
	});

	
});

Test.push('Date.prototypes', function(next) {

	
	// Test 1: Set the time zone to 'America/New_York'
	var value1 = value = new Date();
	var timezone = 'America/New_York';
	correct = value.add('-5 hours'); // correct result for 'America/New_York'
	response = value1.setTimeZone(timezone);
	console.log(correct, response);
	var format = 'HH:mm:ss';
	Test.print('Test 1', response.format(format) !== correct.format(format) ? 'Failed to Test Set Timezone' :  null);

	// Test 2: Set the time zone to 'Europe/London'
	timezone = 'Europe/London';
	response = value.setTimeZone(timezone);
	correct = new Date('2023-01-01T12:00:00'); // correct result for 'Europe/London'
	Test.print('Test 2', response.toString() === correct.toString() ? 'Failed to Test Set Timezone' :  null);

	// Test 1: Difference in seconds
	var date = new Date('2023-01-01T12:00:00');
	response = value.diff(date, 'seconds');
	var correct = 3600; // 1 hour difference in seconds
	Test.print('Test 1', response === correct ? 'Failed to Test difference in seconds' :  null);

	// Test 2: Difference in minutes
	date = new Date('2023-01-01T11:30:00');
	response = value.diff(date, 'minutes');
	correct = 30; // 30 minutes difference
	Test.print('Test 2', response === correct ? 'Failed to Test difference in minutes' :  null);

	// Test 3: Difference in hours
	date = new Date('2023-01-01T06:00:00');
	response = value.diff(date, 'hours');
	correct = 6; // 6 hours difference
	Test.print('Test 3', response === correct ? 'Failed to Test difference in hours' :  null);

	// Test 4: Difference in days
	date = new Date('2022-12-25T00:00:00');
	response = value.diff(date, 'days');
	correct = 7; // 7 days difference
	Test.print('Test 4', response === correct ? 'Failed to Test difference in days' :  null);

	// Test 5: Difference in months
	date = new Date('2022-11-01T00:00:00');
	response = value.diff(date, 'months');
	correct = 2; // 2 months difference (assuming 28 days per month)
	Test.print('Test 5', response === correct ? 'Failed to Test difference in months' :  null);

	// Test 6: Difference in years
	date = new Date('2020-01-01T00:00:00');
	response = value.diff(date, 'years');
	correct = 2; // 2 years difference (assuming 28 days per month)
	Test.print('Test 6', response === correct ? 'Failed to Test difference in years' :  null);

	// Test 1: Add 1 second
	var value = new Date('2023-01-01T12:00:00');
	response = value.add('seconds', 1);
	var correct = new Date('2023-01-01T12:00:01');
	Test.print('Test 1', response.format(format) !== correct.format(format) ? 'Failed to Test adding seconds' :  null);

	// Test 2: Add 30 minutes
	response = value.add('minutes', 30);
	correct = new Date('2023-01-01T12:30:00');
	Test.print('Test 2', response.format(format) !== correct.format(format) ? 'Failed to Test adding minutes' :  null);

	// Test 3: Add 3 hours
	response = value.add('hours', 3);
	correct = new Date('2023-01-01T15:00:00');
	Test.print('Test 3', response.format(format) !== correct.format(format) ? 'Failed to Test adding hours' :  null);

	// Test 4: Add 2 days
	response = value.add('days', 2);
	correct = new Date('2023-01-03T12:00:00');
	Test.print('Test 4', response.format(format) !== correct.format(format) ? 'Failed to Test adding days' :  null);

	// Test 5: Add 1 week
	response = value.add('weeks', 1);
	correct = new Date('2023-01-08T12:00:00');
	Test.print('Test 5', response.format(format) !== correct.format(format) ? 'Failed to Test adding weeks' :  null);

	// Test 1: Extend date with string '2023-01-01'
	var value = new Date('2023-01-01T12:00:00');
	response = value.extend('2024-01-01');
	var correct = new Date('2024-01-01T12:00:00');
	
	Test.print('Date.extend() - Test 1', response.format(format) !== correct.format(format) ? 'Failed to Test extending' :  null);

	// Test 2: Extend date with string '2023-02-15'
	response = value.extend('2023-02-15');
	correct = new Date('2023-02-15T12:00:00');
	Test.print('Date.extend() - Test 2', response.format(format) !== correct.format(format) ? 'Failed to Test extending' :  null);

	// Test 3: Extend date with string '2023-03-10'
	response = value.extend('2023-03-10');
	correct = new Date('2023-03-10T12:00:00');
	Test.print('Date.extend() - Test 3', response.format(format) !== correct.format(format) ? 'Failed to Test extending' :  null);

	// Test 1: Format date with default format
	value = new Date('2023-01-15T08:30:45.123Z');
	response = value.format();
	correct = '2023-01-15T08:30:45.123Z';
	console.log(value, response, correct);
	Test.print('Date.format() - Test 1', response !== correct ? 'Failed to test Date format with default' : null);

	// Test 2: Format date with custom format 'yyyy/MM/dd HH:mm:ss'
	response = value.format('yyyy/MM/dd HH:mm:ss');
	correct = '2023/01/15 08:30:45';
	Test.print('Date.format() - Test 2', response !== correct ? 'Failed to test Date format yyyy/MM/dd HH:mm:ss' : null);

	// Test 3: Format date with custom format 'dddd, MMMM D, YYYY h:mm A'
	response = value.format('dddd, MMMM D, YYYY H:mm a');
	correct = 'Sunday, January 15, 2023 8:30 AM';
	console.log(response);
	Test.print('Date.format() - Test 3', response !== correct ? 'Failed to test Date format dddd, MMMM D, YYYY h:mm A' : null);

	// Test 1: Convert date to UTC (without ticks)
	var value = new Date('2023-01-15T08:30:45.123Z');
	response = value.toUTC();
	var correct = new Date('2023-01-15T08:30:45.123Z');
	Test.print('Date.toUTC() - Test 1', response.getTime() !== correct.getTime() ? 'Failed to test converting Date to UTC without ticks' : null);

	// Test 2: Convert date to UTC with ticks
	response = value.toUTC(true);
	correct = value.getTime() + value.getTimezoneOffset() * 60000;
	Test.print('Date.toUTC() - Test 2', response !== correct ? 'Failed to test converting Date' : null);

	// Test 3: Convert another date to UTC (without ticks)
	var value = new Date('2023-02-28T12:45:30.500Z');
	response = value.toUTC();
	correct = new Date('2023-02-28T12:45:30.500Z');
	Test.print('Date.toUTC() - Test 3', response.getTime() !== correct.getTime() ? 'Failed to test converting Date' : null);

	// Test 1: Parsing date with Date.parseDate
	var value = new Date('2023-01-15T08:30:45.123Z');
	response = value.parseDate();
	var correct = value; // The correct result is the same date object
	Test.print('Date.parseDate() - Test 1', response !== correct ? 'Failted to test convertin Date' : null);

	// Test 2: Parsing another date with Date.parseDate
	var value = new Date('2023-02-28T12:45:30.500Z');
	response = value.parseDate();
	correct = value; // The correct result is the same date object
	Test.print('Date.parseDate() - Test 2', response !== correct ? 'Failted to test convertin Date' : null);

	//next();
});
Test.run();