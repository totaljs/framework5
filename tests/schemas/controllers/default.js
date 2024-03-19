exports.install = function() {

	// Methods
	ROUTE('GET       /schema/methods/query/      --> *Methods/query');
	ROUTE('GET       /schema/methods/read/       --> *Methods/read');
	ROUTE('GET       /schema/methods/insert/     --> *Methods/insert');
	ROUTE('GET       /schema/methods/update/     --> *Methods/update');
	ROUTE('GET       /schema/methods/patch/      --> *Methods/patch');
	ROUTE('GET       /schema/methods/remove/     --> *Methods/remove');

	// Methods (with data)
	ROUTE('POST       /schema/methods/query/     --> *Methods/query');
	ROUTE('POST       /schema/methods/read/      --> *Methods/read');
	ROUTE('POST       /schema/methods/insert/    --> *Methods/insert');
	ROUTE('POST       /schema/methods/update/    --> *Methods/update');
	ROUTE('POST       /schema/methods/patch/     --> *Methods/patch');
	ROUTE('POST       /schema/methods/remove/    --> *Methods/remove');

	// Methods data validation
	ROUTE('GET       /schema/methods/validation/ --> *Validation/exec');
	ROUTE('POST      /schema/methods/validation/ --> *Validation/exec');
	ROUTE('PUT       /schema/methods/validation/ --> *Validation/exec');
	ROUTE('PATCH     /schema/methods/validation/ --> *Validation/exec');
	ROUTE('DELETE    /schema/methods/validation/ --> *Validation/exec');

	// Validation
	ROUTE('POST      /schema/formatting/         --> *Formatting/exec');
	ROUTE('POST      /schema/required/           --> *Required/exec');
	ROUTE('POST      /schema/notrequired/        --> *Notrequired/exec');

	// Chaining
	ROUTE('POST      /schema/chaining/one/       --> *Chaining/one (response) Chaining/two');
	ROUTE('POST      /schema/chaining/two/       --> *Chaining/one Chaining/two (response)');
	// Verify
	ROUTE('POST     /schema/verify/              --> *Verify/exec');


	// Actions Methods
	ROUTE('GET       /actions/methods/query/      --> *Methods/query');
	ROUTE('GET       /actions/methods/read/       --> *Methods/read');
	ROUTE('GET       /actions/methods/insert/     --> *Methods/insert');
	ROUTE('GET       /actions/methods/update/     --> *Methods/update');
	ROUTE('GET       /actions/methods/patch/      --> *Methods/patch');
	ROUTE('GET       /actions/methods/remove/     --> *Methods/remove');

	// Methods (with data)
	ROUTE('POST       /actions/methods/query/     --> *Methods/query');
	ROUTE('POST       /actions/methods/read/      --> *Methods/read');
	ROUTE('POST       /actions/methods/insert/    --> *Methods/insert');
	ROUTE('POST       /actions/methods/update/    --> *Methods/update');
	ROUTE('POST       /actions/methods/patch/     --> *Methods/patch');
	ROUTE('POST       /actions/methods/remove/    --> *Methods/remove');

	// Methods data validation
	ROUTE('GET       /actions/methods/validation/ --> *Validation/exec');
	ROUTE('POST      /actions/methods/validation/ --> *Validation/exec');
	ROUTE('PUT       /actions/methods/validation/ --> *Validation/exec');
	ROUTE('PATCH     /actions/methods/validation/ --> *Validation/exec');
	ROUTE('DELETE    /actions/methods/validation/ --> *Validation/exec');

	// Validation
	ROUTE('POST      /actions/formatting/         --> *Formatting/exec');
	ROUTE('POST      /actions/required/           --> *Required/exec');
	ROUTE('POST      /actions/notrequired/        --> *Notrequired/exec');

	// Chaining
	ROUTE('POST      /actions/chaining/one/       --> *Chaining/one (response) Chaining/two');
	ROUTE('POST      /actions/chaining/two/       --> *Chaining/one Chaining/two (response)');
	// Verify
	ROUTE('POST     /actions/verify/              --> *Verify/exec');
}