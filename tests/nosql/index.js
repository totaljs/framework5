/* eslint-disable */

require('../../index');
require('../../test');

// .insert()
// .find() + .autoquery()
// .read()
// .update()
// .remove()
// .autoquery()
// .clean()
// .drop()

Test.push('NOSQL', function(next) {
	// Test.print('String.slug()', [error]);


	var arr = [];
	var builder;
	arr.push(function(resume) {
		NOSQL('users').insert({ id: UID(), name: 'Peter Sirka', email: 'petersirka@gmail.com', country: 'Slovakia', dtcreated: NOW }).callback(function(err, response) {
			Test.print('NOSQL - insert()', err === null && response === 1 ? null: 'Expected 1');
			resume()
		});
	});


	arr.push(function(resume) {
		var builder = NOSQL('users').find();
		var name = 'Peter Sirka';
		builder.where('name', name).callback(function(err, response) {
			Test.print('NOSQL - find()', err === null && response.length > 0 ? null : 'Expected at least one document');
			resume();
		});
	});

	arr.push(function(resume) {
		var builder = NOSQL('users').find();
		var query = { email: 'petersirka@gmail.com' };
		builder.autoquery(query, 'name:String,email:Email', 'dtcreated_desc', 100);
		builder.callback(function(err, response) {
			Test.print('NOSQL - autoquery()', err === null && response.length > 0 && response[0].email == query.email ? null : 'Expected at least one document');
			resume();
		});
	});

	arr.push(function(resume) {
		var builder = NOSQL('users').read();
		var name = 'Peter Sirka';
		builder.where('name', name).callback(function(err, response) {
			Test.print('NOSQL - read()', err === null && response.name === name ? null : 'Expected a document witn name = ' +  name);
			resume();
		});
	});

	arr.push(function(resume) {
		var email = 'petersirka@gmail.com';
		var name = 'Peter Širka';
		NOSQL('users').update({ name }).where('email', email).callback(function(err, response) {
			Test.print('NOSQL - update()', err === null && response > 0 ? null : 'Expected a document with at least 1 success');
			resume();
		});
	});

	arr.push(function(resume) {
		var email = 'petersirka@gmail.com';
		NOSQL('users').remove().where('email', email).callback(function(err, response) {
			Test.print('NOSQL - remove()', err === null && response > 0 ? null : 'Expected a document with at least 1 success');
			resume();
		});
	});

	arr.push(function(resume) {
		NOSQL('users').clean().callback(function(err) {
			Test.print('NOSQL - Clean()', err == undefined ? null : 'Failled to clean table');
			resume();
		});
	});

	arr.push(function(resume) {
		NOSQL('users').drop().callback(function(response) {
			Test.print('NOSQL - Drop()', response && response.success ? null : 'Failed to drop table');
			resume();
		});
	});

	arr.push(function(resume) {
		DATA.insert('nosql/users', { id: UID(), name: 'Peter Sirka', email: 'petersirka@gmail.com' }).callback(function(err, response) {
			Test.print('DATA/nosql - insert()', err === null && response === 1 ? null: 'Expected 1');
			resume()
		});
	});

	arr.push(function(resume) {
		DATA.insert('nosql/users', { id: UID(), name: 'Peter Sirka', email: 'petersirka@gmail.com' }).callback(function(err, response) {
			Test.print('DATA/nosql - insert()', err === null && response === 1 ? null: 'Expected 1');
			resume()
		});
	});

	arr.push(function(resume) {
		var builder = DATA.find('nosql/users');
		var name = 'Peter Sirka';
		builder.where('name', name).callback(function(err, response) {
			Test.print('DATA/nosql - find()', err === null && response.length > 0 ? null : 'Expected at least one document');
			resume();
		});
	});

	arr.push(function(resume) {
		var builder = DATA.find('nosql/users');
		var query = { email: 'petersirka@gmail.com' };
		builder.autoquery(query, 'name:String,email:Email', 'dtcreated_desc', 100);
		builder.callback(function(err, response) {
			Test.print('DATA/nosql - autoquery()', err === null && response.length > 0 ? null : 'Expected at least one document');
			resume();
		});
	});


	arr.push(function(resume) {
		var builder = DATA.read('nosql/users');
		var name = 'Peter Sirka';
		builder.where('name', name).callback(function(err, response) {
			Test.print('DATA/nosql - read()', err === null && response.name === name ? null : 'Expected a document witn name = ' +  name);
			resume();
		});
	});

	arr.push(function(resume) {
		var email = 'petersirka@gmail.com';
		var name = 'Peter Širka';
		DATA.update('nosql/users', { name }).where('email', email).callback(function(err, response) {
			Test.print('DATA/nosql - update()', err === null && response > 0 ? null : 'Expected a document with at least 1 success');
			resume();
		});
	});

	arr.push(function(resume) {
		var email = 'petersirka@gmail.com';
		DATA.remove('nosql/users').where('email', email).callback(function(err, response) {
			Test.print('DATA/nosql - remove()', err === null && response > 0 ? null : 'Expected a document with at least 1 success');
			resume();
		});
	});

	arr.async(next);
});

Test.run();