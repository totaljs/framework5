/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

F.http(); // Starts the framework

ON('ready', function () {
	const Parser = require('../../htmlparser');
	Test.push('HTML Parser', function (next) {
		var value, correct, response, parsed, div, p, span, str;
		var arr = [];

		// Test for innerHTML
		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			response = parsed.innerHTML;
			Test.print('Basic HTML Element with innerHTML', (!response || response !== correct) ? 'Failed to retrieve innerHTML correctly' : null);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = 'Hello World';
			parsed = value.parseHTML();  // Assuming this returns an parsed simulating an HTMLElement
			response = parsed.innerText;  // Access as a property, not a method
			Test.print('Basic HTML Element with innerText', (!response || response !== correct) ? 'Failed to parse basic HTML element with innerText' : null);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><p>Hello World</p></div>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			response = parsed.find('p')[0];
			Test.print('Basic Usage: Find p element', response.innerHTML == correct ? null : 'Expected ' + correct);
			resume();
		});
		arr.push(function(resume) {
			value = '<div><div><p>Hello World</p></div></div>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			response = parsed.find('div p')[0];
			Test.print('Nested Elements: Find p elements within div', response.innerHTML === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="classname">Hello World</p>';
			correct = '<p class="classname">Hello World</p>';
			parsed = value.parseHTML();
			response = parsed.find('p.classname')[0];
			Test.print('Element Attributes: Find p elements with classname', response.innerHTML === correct ? null : 'Expected ' + correct);
			resume();
		});

		// arr.push(function(resume) {
		// value = '<div><p>Hello World</p></div>';
		// correct = '<p>Hello World</p>';
		// parsed = value.parseHTML();
		// response = parsed.find('p', true);
		// console.log(parsed);
		// Test.print('Reverse Searching: Found p elements from parent to children', response.innerHTML === correct ? null : 'Expected ' + correct);
		// resume();
		// });

		arr.push(function(resume) {
			value = '<div></div>';
			correct = undefined;
			parsed = value.parseHTML();
			response = parsed.find('p');
			Test.print('Edge Cases: Handling empty selector', response.innerHTML === correct ? null : 'Expected ' + correct);
			resume();
		});

		// Test cases for HTMLElement.prototype.parent()
		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = undefined;
			parsed = value.parseHTML();
			response = parsed.parent();
			Test.print('parent: Get parent node of an element (undefined if no parent)', response === correct ? null : 'Expected null');
			resume();
		});

		arr.push(function(resume) {
			value = '<div><p>Hello World</p></div>';
			correct = '<div><p>Hello World</p></div>';
			parsed = value.parseHTML();
			var p = parsed.find('p')[0];
			response = p.parent();
			Test.print('parent: Get parent node of an element (parent is div)', response !== null && response.tagName === 'DIV' ? null : 'Expected div');
			resume();
		});

		arr.push(function(resume) {
			value = '<body><div><p>Hello World</p></div></body>';
			correct = '<body><div><p>Hello World</p></div></body>';
			parsed = value.parseHTML();
			var div = parsed.find('div')[0];
			response = div.parent();
			Test.print('parent: Get parent node of an element (parent is body)', response !== null && response.tagName === 'BODY' ? null : 'Expected body');
			resume();
		});

		// Test cases for HTMLElement.prototype.closest()
		arr.push(function(resume) {
			value = '<body><div><p>Hello World</p></div></body>';
			correct = 'DIV';
			parsed = value.parseHTML();
			var p = parsed.find('p')[0];
			response = p.closest('div')[0];
			Test.print('closest: Find closest ancestor of an element (div is the closest)', response.tagName === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<body><p>Hello World</p></body>';
			correct = 'BODY';
			parsed = value.parseHTML();
			var p = parsed.find('p')[0];
			response = p.closest('body')[0];
			Test.print('closest: Find closest ancestor of an element (body is the closest)', response.tagName === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><p><span>Hello World</span></p></div>';
			correct = '<div><p><span>Hello World</span></p></div>';
			parsed = value.parseHTML();
			var p = parsed.find('p')[0];
			response = p.closest('div')[0];
			Test.print('closest: Find closest ancestor of an element (grandparent is the closest)', response.innerHTML === correct ? null : 'Expected ' + correct);
			resume();
		});

		// Test cases for HTMLElement.prototype.attrd()
		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p data-test="value">Hello World</p>';
			parsed = value.parseHTML();
			var p = parsed.find('p')[0];
			response = p.attrd('test', 'value');
			Test.print('attrd: Add data attribute to an element', response.innerHTML === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><p>Hello World</p></div>';
			correct = '<div data-test="value"><p>Hello World</p></div>';
			parsed = value.parseHTML();
			var div = parsed.find('div')[0];
			response = div.attrd('test', 'value');
			Test.print('attrd: Add data attribute to an element (nested)', response.innerHTML === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			var p = parsed.find('p')[0];
			response = p.attrd('test', '');
			Test.print('attrd: Add empty data attribute to an element', response.innerHTML === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = undefined;
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.attr('class');
			Test.print('attr: Get attribute value (undefined if attribute does not exist)', response === correct ? null : 'Expected null');
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="paragraph">Hello World</p>';
			correct = 'paragraph';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.attr('class');
			Test.print('attr: Get attribute value', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p id="unique">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.attr('id', 'unique');
			Test.print('attr: Set attribute value', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p id="unique">Hello World</p>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.attr('id', null);
			Test.print('attr: Remove attribute', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p data-test="value">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.attr('data-test', 'value');
			Test.print('attr: Set data attribute value', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p data-test="value">Hello World</p>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.attr('data-test', '');
			Test.print('attr: Remove data attribute value', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p class="test">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.aclass('test');
			Test.print('aclass: Add single class to element', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="paragraph">Hello World</p>';
			correct = '<p class="paragraph test">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.aclass('test');
			Test.print('aclass: Add multiple classes to element', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="paragraph">Hello World</p>';
			correct = '<p class="paragraph ">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.aclass('');
			Test.print('aclass: Add empty class to element', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="test">Hello World</p>';
			correct = true;
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.hclass('test');
			Test.print('hclass: Check if element has single class (true)', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="paragraph test">Hello World</p>';
			correct = true;
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.hclass('paragraph');
			Test.print('hclass: Check if element has multiple classes (true)', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="paragraph">Hello World</p>';
			correct = false;
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.hclass('test');
			Test.print('hclass: Check if element has non-existing class (false)', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = false;
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.hclass('test');
			Test.print('hclass: Check if element has no class (false)', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="test">Hello World</p>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.tclass('test', false);
			Test.print('tclass: Toggle single class off', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="test">Hello World</p>';
			correct = '<p class="test">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.tclass('test', true);
			Test.print('tclass: Toggle single class on (already present)', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p class="test">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.tclass('test', true);
			Test.print('tclass: Toggle single class on (not present)', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="test">Hello World</p>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.tclass('test', false);
			Test.print('tclass: Toggle single class off (with no value provided)', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="paragraph test">Hello World</p>';
			correct = '<p class="paragraph">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.tclass('test', false);
			Test.print('tclass: Toggle multiple classes off', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="paragraph">Hello World</p>';
			correct = '<p class="paragraph test">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.tclass('test', true);
			Test.print('tclass: Toggle multiple classes on', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="test">Hello World</p>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.rclass('test');
			Test.print('rclass: Remove single class', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="test paragraph">Hello World</p>';
			correct = '<p class="paragraph">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.rclass('test');
			Test.print('rclass: Remove single class (multiple classes present)', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="test">Hello World</p>';
			correct = '<p class="test">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.rclass('paragraph');
			Test.print('rclass: Remove non-existing class', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p class="test paragraph">Hello World</p>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.rclass('test paragraph');
			Test.print('rclass: Remove multiple classes', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p>Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.rclass('');
			Test.print('rclass: Remove empty class (no effect)', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p style="color:red">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.css('color', 'red');
			Test.print('css: Set single CSS property', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '<p style="color:red;font-size:16px">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.css({'color': 'red', 'font-size': '16px'});
			Test.print('css: Set multiple CSS properties', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p style="color:red;font-size:16px;">Hello World</p>';
			correct = '<p style="font-size:16px">Hello World</p>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.css({'color': ''});
			Test.print('css: Remove multiple CSS properties', response.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><p>Hello World</p></div>';
			correct = '';
			parsed = value.parseHTML();
			div = parsed.find('div')[0];
			response = div.remove();
			Test.print('remove: Remove element with parent', response && parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = '';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.remove();
			Test.print('remove: Remove element without parent', response && parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><p>Hello World</p><span>Goodbye</span></div>';
			correct = '<div><span>Goodbye</span></div>';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.remove();
			Test.print('remove: Remove element with siblings', response && parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><p>Hello World</p><span>Goodbye</span></div>';
			correct = '<div><p>Hello World</p></div>';
			parsed = value.parseHTML();
			span = parsed.find('span')[0];
			response = span.remove();
			Test.print('remove: Remove sibling element', response && parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div></div>';
			str = '<p>Hello World</p>';
			correct = '<div><p>Hello World</p></div>';
			parsed = value.parseHTML();
			div = parsed.find('div')[0];
			div.append(str);
			Test.print('append: Append single element to empty parent', parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><p>Existing</p></div>';
			str = '<span>New</span>';
			correct = '<div><p>Existing</p><span>New</span></div>';
			parsed = value.parseHTML();
			div = parsed.find('div')[0];
			div.append(str);
			Test.print('append: Append single element to non-empty parent', parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div></div>';
			str = '<p>One</p><p>Two</p>';
			correct = '<div><p>One</p><p>Two</p></div>';
			parsed = value.parseHTML();
			div = parsed.find('div')[0];
			div.append(str);
			Test.print('append: Append multiple elements to empty parent', parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><p>Existing</p></div>';
			str = '<span>New1</span><span>New2</span>';
			correct = '<div><p>Existing</p><span>New1</span><span>New2</span></div>';
			parsed = value.parseHTML();
			div = parsed.find('div')[0];
			div.append(str);
			Test.print('append: Append multiple elements to non-empty parent', parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div></div>';
			str = '<p>Hello World</p>';
			correct = '<div><p>Hello World</p></div>';
			parsed = value.parseHTML();
			div = parsed.find('div')[0];
			div.prepend(str);
			Test.print('prepend: Prepend single element to empty parent', parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><span>Existing</span></div>';
			str = '<p>New</p>';
			correct = '<div><p>New</p><span>Existing</span></div>';
			parsed = value.parseHTML();
			div = parsed.find('div')[0];
			div.prepend(str);
			Test.print('prepend: Prepend single element to non-empty parent', parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div></div>';
			str = '<p>Two</p><p>One</p>';
			correct = '<div><p>One</p><p>Two</p></div>';
			parsed = value.parseHTML();
			div = parsed.find('div')[0];
			div.prepend(str);
			Test.print('prepend: Prepend multiple elements to empty parent', parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<div><span>Existing</span></div>';
			str = '<p>New1</p><p>New2</p>';
			correct = '<div><p>New2</p><p>New1</p><span>Existing</span></div>';
			parsed = value.parseHTML();
			div = parsed.find('div')[0];
			div.prepend(str);
			Test.print('prepend: Prepend multiple elements to non-empty parent', parsed.toString() === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello <span>World</span></p>';
			correct = 'Hello World';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.text();
			Test.print('text: Get text content of element with nested tags', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello World</p>';
			correct = 'Hello World';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.text();
			Test.print('text: Get text content of element without nested tags', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p><span></span></p>';
			correct = '';
			parsed = value.parseHTML();
			p = parsed.find('p')[0];
			response = p.text();
			Test.print('text: Get text content of empty element', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello <span>World</span></p>';
			correct = 'World';
			parsed = value.parseHTML();
			span = parsed.find('span')[0];
			response = span.text();
			Test.print('text: Get text content of nested element', response === correct ? null : 'Expected ' + correct);
			resume();
		});
		arr.push(function(resume) {
			value = '<p>Hello <span>World</span></p>';
			correct = '<p>Hello <span>World</span></p>';
			parsed = value.parseHTML();
			response = parsed.toString();
			Test.print('toString: Convert HTML elements to string (unformatted)', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello <span>World</span></p>';
			correct = '<p>Hello <span>World</span></p>';
			parsed = value.parseHTML();
			response = parsed.html();
			Test.print('html: Convert HTML elements to string (unformatted)', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello <span>World</span></p>';
			correct = '<p>\n\tHello \n\t<span>\n\t\tWorld\n\t</span>\n</p>';
			parsed = value.parseHTML();
			response = parsed.toString(true);
			Test.print('toString: Convert HTML elements to string (formatted)', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.push(function(resume) {
			value = '<p>Hello <span>World</span></p>';
			correct = '<p>\n\tHello \n\t<span>\n\t\tWorld\n\t</span>\n</p>';
			parsed = value.parseHTML();
			response = parsed.html(true);
			Test.print('html: Convert HTML elements to string (formatted)', response === correct ? null : 'Expected ' + correct);
			resume();
		});

		arr.async(next); // Trigger the tests execution
	});
	Test.push('Parsing XML', function (next) {
		var value, correct, response, parsed;
	
		var arr = [];
		var wsdl, xml;
	  
		arr.push(function(resume) {
			var filename = PATH.root('wsdl-1.xml');
			Total.Fs.readFile(filename, 'utf8', function(err, response) {
				wsdl = response;
				xml = Parser.parseHTML(wsdl, true);
				Test.print('Parse to Object: ', xml ? null : 'Failed to parse xml');
				resume();
			});
		});
	
		arr.push(function(resume) {
			value = xml.find('wsdl:types > xsd:schema');
			correct = 2;
			response = value.length;
			Test.print('Count elements', response == correct ? null : 'Expected: ' + correct + ' elements; Found: ' + response + ' Elements');
			resume();
		});
	
		 arr.push(function (resume) {
			value = xml.find('wsdl:message');
			correct = 28; 
			response = value.length;
			Test.print('Count WSDL Message elements', response === correct ? null : 'Expected: ' + correct + ' messages; Found: ' + response);
			resume();
		});
	
		arr.push(function (resume) {
			value = xml.find('wsdl:operation[name="submitMessage"]');
			correct = true; 
			response = !!value.length;
			Test.print('Check existence of submitMessage operation', response === correct ? null : 'Operation not found');
			resume();
		});
	
		arr.push(function (resume) {
			value = xml.find('wsdl:operation[name="retrieveMessage"] > soap12:operation')[0].attr('soapAction');
			correct = '';
			Test.print('Validate soapAction for retrieveMessage', value === correct ? null : 'Expected: "' + correct + '"; Found: "' + value + '"');
			resume();
		});
	
		arr.push(function (resume) {
			value = xml.find('wsdl:types > xsd:schema > xsd:complexType[name="PayloadType"]');
			correct = ''; 
			response = value.toString();
			Test.print('Check existence of complexType PayloadType', response === correct ? null : 'ComplexType not found');
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:attribute name="payloadId" type="xs:token" use="required">';
			correct = 'required';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('use');
			Test.print('XML Attribute: Required use', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:element name="baseType" abstract="true">';
			correct = 'true';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('abstract');
			Test.print('XML Element: Abstract attribute', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:complexType name="sealed" block="extension">';
			correct = 'extension';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('block');
			Test.print('XML Complex Type: Block attribute', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
	
		arr.push(function(resume) {
			value = '<xs:element ref="xmime:contentType" />';
			correct = 'xmime:contentType';
			parsed = value.parseHTML().children[0];
			response = parsed.attr('ref');
			Test.print('XML Element: Reference attribute', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:complexType name="hexBinary"><xs:simpleContent><xs:extension base="xs:hexBinary"><xs:attribute ref="xmime:contentType" /></xs:extension></xs:simpleContent></xs:complexType>';
			correct = 'hexBinary';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Complex Type: Binary content handling', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:schema version="1.0" xmlns:xs="http://www.w3.org/2001/XMLSchema">';
			correct = '1.0';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('version');
			Test.print('XML Schema: Version attribute', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:element name="errorDetail" type="xsd:string" />';
			correct = 'xsd:string';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('type');
			Test.print('XML Element: Type reference', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:complexType mixed="true" name="mixedContent">';
			correct = 'true';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('mixed');
			Test.print('XML Complex Type: Mixed content', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:schema targetNamespace="http://example.org/ns">';
			correct = 'http://example.org/ns';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('targetNamespace');
			Test.print('XML Schema: Target namespace', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:element substitutionGroup="base:element" name="derived">';
			correct = 'base:element';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('substitutionGroup');
			Test.print('XML Element: Substitution group', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:attribute name="format" type="xs:string" default="text/plain">';
			correct = 'text/plain';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('default');
			Test.print('XML Attribute: Default value', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:element name="version" type="xs:string" fixed="1.0">';
			correct = '1.0';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('fixed');
			Test.print('XML Element: Fixed value', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		  arr.push(function(resume) {
			value = '<xs:simpleType name="messageStatus"><xs:restriction base="xsd:string"><xs:enumeration value="READY_TO_SEND" /></xs:restriction></xs:simpleType>';
			correct = 'messageStatus';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Simple Type: Enumeration values', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:extension base="tns:max1024-non-empty-string"><xs:attribute name="name" type="tns:max255-non-empty-string" use="required" /></xs:extension>';
			correct = 'tns:max1024-non-empty-string';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('base');
			Test.print('XML Extension: Base type with attributes', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:complexType name="PayloadInfo"><xs:sequence><xs:element maxOccurs="unbounded" name="PartInfo" type="tns:PartInfo" /></xs:sequence></xs:complexType>';
			correct = 'PayloadInfo';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Complex Type: Complex content structure', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:schema attributeFormDefault="unqualified" elementFormDefault="unqualified">';
			correct = 'unqualified';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('attributeFormDefault');
			Test.print('XML Schema: Form default attributes', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:union memberTypes="xs:language"><xs:simpleType><xs:restriction base="xs:string"><xs:enumeration value="" /></xs:restriction></xs:simpleType></xs:union>';
			correct = 'xs:language';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('memberTypes');
			Test.print('XML Union: Member types handling', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:annotation><xs:documentation>See http://www.w3.org/XML/1998/namespace.html</xs:documentation></xs:annotation>';
			correct = 'See http://www.w3.org/XML/1998/namespace.html';
			parsed = value.parseHTML(true).children[0];
			response = parsed.innerText;
			Test.print('XML Documentation: Content retrieval', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:restriction base="xs:NCName"><xs:enumeration value="default" /><xs:enumeration value="preserve" /></xs:restriction>';
			correct = 'xs:NCName';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('base');
			Test.print('XML Restriction: Base type handling', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:complexType name="Property"><xs:simpleContent><xs:extension base="tns:max1024-non-empty-string"><xs:attribute name="type" type="tns:max255-non-empty-string" use="optional" /></xs:extension></xs:simpleContent></xs:complexType>';
			correct = 'Property';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Complex Type: Attributes in extension', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:simpleType name="max255-non-empty-string"><xs:restriction base="xs:string"><xs:minLength value="1" /><xs:maxLength value="255" /></xs:restriction></xs:simpleType>';
			correct = 'max255-non-empty-string';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Simple Type: String length restrictions', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:element name="message" nillable="true" type="xs:string" />';
			correct = 'true';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('nillable');
			Test.print('XML Element: Nillable attribute handling', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:complexType name="errorResultImpl"><xs:sequence><xs:element minOccurs="0" name="domibusErrorCode" type="tns:domibusErrorCode" /></xs:sequence></xs:complexType>';
			correct = 'errorResultImpl';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Complex Type: Sequence element', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:attribute name="payloadId" type="xsd:token" use="required" />';
			correct = 'required';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('use');
			Test.print('XML Attribute: Use requirement', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:element maxOccurs="unbounded" minOccurs="0" name="Property" type="tns:Property" />';
			correct = 'unbounded';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('maxOccurs');
			Test.print('XML Element: Occurrence constraints', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:attributeGroup ref="xml:specialAttrs" />';
			correct = 'xml:specialAttrs';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('ref');
			Test.print('XML AttributeGroup: Reference handling', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test XML complex type with all compositor
		arr.push(function(resume) {
			value = '<xs:complexType name="PartInfo"><xs:all><xs:element minOccurs="0" name="PartProperties" type="tns:PartProperties" /></xs:all></xs:complexType>';
			correct = 'PartInfo';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Complex Type: All compositor', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test XML schema import
		arr.push(function(resume) {
			value = '<xs:import namespace="http://www.w3.org/2005/05/xmlmime" />';
			correct = 'http://www.w3.org/2005/05/xmlmime';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('namespace');
			Test.print('XML Schema: Import namespace', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xmime="http://www.w3.org/2005/05/xmlmime">';
			correct = 'http://www.w3.org/2001/XMLSchema';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('xmlns:xs');
			Test.print('XML Namespace: Basic namespace attribute retrieval', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:attribute name="contentType"><xs:simpleType><xs:restriction base="xs:string"><xs:minLength value="3"/></xs:restriction></xs:simpleType></xs:attribute>';
			correct = 'contentType';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Attributes: Complex attribute structure parsing', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:complexType name="base64Binary"><xs:simpleContent><xs:extension base="xs:base64Binary"><xs:attribute ref="xmime:contentType"/></xs:extension></xs:simpleContent></xs:complexType>';
			correct = 'base64Binary';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Schema: Complex type definition parsing', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<element xml:lang="en" xml:space="preserve">';
			correct = 'en';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('xml:lang');
			Test.print('XML Special Attributes: xml:lang attribute handling', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:attributeGroup name="specialAttrs"><xs:attribute ref="xml:base"/><xs:attribute ref="xml:lang"/><xs:attribute ref="xml:space"/></xs:attributeGroup>';
			correct = 'specialAttrs';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML AttributeGroup: Attribute group definition parsing', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:sequence><xs:element maxOccurs="unbounded" name="Property" type="Property" /></xs:sequence>';
			correct = 'Property';
			parsed = value.parseHTML(true).children[0];
			response = parsed.children[0].attr('name');
			Test.print('XML Sequence: Element sequence validation', response === correct ? null : 'Expected ' + correct);
			resume();
		});
		 
		arr.push(function(resume) {
			value = '<xs:complexType name="PayloadType"><xs:simpleContent><xs:extension base="ns1:base64Binary"><xs:attribute name="payloadId" type="xsd:token" use="required" /></xs:extension></xs:simpleContent></xs:complexType>';
			correct = 'PayloadType';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Complex Type: Simple content extension', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:appinfo source="http://www.example.com/appinfo">Custom information</xs:appinfo>';
			correct = 'http://www.example.com/appinfo';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('source');
			Test.print('XML Schema: Appinfo', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:all minOccurs="0"><xs:element name="optional" type="xs:string"/></xs:all>';
			correct = '0';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('minOccurs');
			Test.print('XML Schema: All group', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// arr.push(function(resume) {
		// 	value = '<xs:alternative test="@type=\'special\'"/>';
		// 	correct = '@type=\'special\'';
		// 	parsed = value.parseHTML(true).children[0];
		// 	response = parsed.attr('test');
		// 	console.log(parsed, response);
		// 	Test.print('XML Schema: Alternative', response === correct ? null : 'Expected ' + correct);
		// 	resume();
		// });
	
		arr.push(function(resume) {
			value = '<xs:notation name="gif" public="image/gif" system="viewer.exe"/>';
			correct = 'gif';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Schema: Notation declaration', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test any element
		arr.push(function(resume) {
			value = '<xs:any namespace="##any" processContents="lax"/>';
			correct = '##any';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('namespace');
			Test.print('XML Schema: Any element', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test anyAttribute
		arr.push(function(resume) {
			value = '<xs:anyAttribute namespace="##other" processContents="strict"/>';
			correct = '##other';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('namespace');
			Test.print('XML Schema: Any attribute', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test group definition
		arr.push(function(resume) {
			value = '<xs:group name="personGroup"><xs:sequence><xs:element name="firstName" type="xs:string"/></xs:sequence></xs:group>';
			correct = 'personGroup';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Schema: Group definition', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test group reference
		arr.push(function(resume) {
			value = '<xs:group ref="personGroup" minOccurs="0"/>';
			correct = 'personGroup';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('ref');
			Test.print('XML Schema: Group reference', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test redefine
		arr.push(function(resume) {
			value = '<xs:redefine schemaLocation="original.xsd"><xs:simpleType name="stringType"/></xs:redefine>';
			correct = 'original.xsd';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('schemaLocation');
			Test.print('XML Schema: Redefine', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test include
		arr.push(function(resume) {
			value = '<xs:include schemaLocation="common.xsd"/>';
			correct = 'common.xsd';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('schemaLocation');
			Test.print('XML Schema: Include', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test override
		arr.push(function(resume) {
			value = '<xs:override schemaLocation="base.xsd"><xs:element name="modified" type="xs:string"/></xs:override>';
			correct = 'base.xsd';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('schemaLocation');
			Test.print('XML Schema: Override', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test final attribute
		arr.push(function(resume) {
			value = '<xs:simpleType name="finalType" final="restriction">';
			correct = 'restriction';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('final');
			Test.print('XML Schema: Final attribute', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:keyref name="foreignKey" refer="primaryKey"><xs:selector xpath=".//reference"/><xs:field xpath="@refId"/></xs:keyref>';
			correct = 'primaryKey';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('refer');
			Test.print('XML Schema: Keyref constraint', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test pattern facet
		arr.push(function(resume) {
			value = '<xs:pattern value="[A-Z][0-9]{3}"/>';
			correct = '[A-Z][0-9]{3}';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('value');
			Test.print('XML Schema: Pattern facet', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test whitespace facet
		arr.push(function(resume) {
			value = '<xs:whiteSpace value="preserve"/>';
			correct = 'preserve';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('value');
			Test.print('XML Schema: Whitespace facet', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test totalDigits facet
		arr.push(function(resume) {
			value = '<xs:totalDigits value="5"/>';
			correct = '5';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('value');
			Test.print('XML Schema: Total digits facet', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test fractionDigits facet
		arr.push(function(resume) {
			value = '<xs:fractionDigits value="2"/>';
			correct = '2';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('value');
			Test.print('XML Schema: Fraction digits facet', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test length facet
		arr.push(function(resume) {
			value = '<xs:length value="8"/>';
			correct = '8';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('value');
			Test.print('XML Schema: Length facet', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test maxInclusive facet
		arr.push(function(resume) {
			value = '<xs:maxInclusive value="100"/>';
			correct = '100';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('value');
			Test.print('XML Schema: Max inclusive facet', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test minInclusive facet
		arr.push(function(resume) {
			value = '<xs:minInclusive value="0"/>';
			correct = '0';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('value');
			Test.print('XML Schema: Min inclusive facet', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// Test maxExclusive facet
		arr.push(function(resume) {
			value = '<xs:maxExclusive value="1000"/>';
			correct = '1000';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('value');
			Test.print('XML Schema: Max exclusive facet', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:minExclusive value="-1"/>';
			correct = '-1';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('value');
			Test.print('XML Schema: Min exclusive facet', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<![CDATA[<message>Special & characters</message>]]>';
			correct = 'Special & characters';
			parsed = value.parseHTML(true).children[0];
			response = parsed.text();
			Test.print('XML CDATA: Content preservation', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		// arr.push(function(resume) {
		// 	value = '<?xml-stylesheet type="text/xsl" href="style.xsl"?>';
		// 	correct = 'text/xsl';
		// 	parsed = value.parseHTML(true);
		// 	console.log(parsed);
		// 	response = parsed.attr('type');
		// 	Test.print('XML Processing Instruction: Attribute parsing', response === correct ? null : 'Expected ' + correct);
		// 	resume();
		// });
	
		// arr.push(function(resume) {
		// 	value = '<element>&lt;escaped&gt;</element>';
		// 	correct = '<escaped>';
		// 	parsed = value.parseHTML(true).children[0];
		// 	response = parsed.text();
		// 	console.log(response);
		// 	Test.print('XML Entity: Reference resolution', response === correct ? null : 'Expected ' + correct);
		// 	resume();
		// });
	
		arr.push(function(resume) {
			value = '<description>This is <b>bold</b> and <i>italic</i> text</description>';
			correct = 'bold';
			parsed = value.parseHTML(true).children[0];
			response = parsed.find('b')[0].text();
			Test.print('XML Mixed Content: Inline element parsing', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<root xmlns="http://default.namespace.com"><child>content</child></root>';
			correct = 'http://default.namespace.com';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('xmlns');
			Test.print('XML Namespace: Default namespace handling', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:choice><xs:element name="option1" type="xs:string"/><xs:element name="option2" type="xs:integer"/></xs:choice>';
			correct = 'option1';
			parsed = value.parseHTML(true).children[0];
			response = parsed.find('xs:element')[0].attr('name');
			Test.print('XML Schema: Choice group element', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:simpleType name="listOfIntegers"><xs:list itemType="xs:integer"/></xs:simpleType>';
			correct = 'xs:integer';
			parsed = value.parseHTML(true).children[0];
			response = parsed.find('xs:list')[0].attr('itemType');
			Test.print('XML Schema: List type definition', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:unique name="uniqueId"><xs:selector xpath=".//item"/><xs:field xpath="@id"/></xs:unique>';
			correct = 'uniqueId';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Schema: Unique constraint', response === correct ? null : 'Expected ' + correct);
			resume();
		});
	
		arr.push(function(resume) {
			value = '<xs:key name="primaryKey"><xs:selector xpath=".//record"/><xs:field xpath="@id"/></xs:key>';
			correct = 'primaryKey';
			parsed = value.parseHTML(true).children[0];
			response = parsed.attr('name');
			Test.print('XML Schema: Key constraint', response === correct ? null : 'Expected ' + correct);
			resume();
		});
		arr.async(next);
	});

	setTimeout(function () {
		Test.run(function() {
			process.exit(0);
		});
	}, 600);
});
