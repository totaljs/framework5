/* eslint-disable */
require('../../index'); // Total.js framework v5
require('../../test'); // Unit test module

F.http(); // Starts the framework

ON('ready', function () {
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

	setTimeout(function () {
		Test.run();
	}, 600);
});
