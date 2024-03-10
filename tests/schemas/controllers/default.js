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
	ROUTE('POST      /schema/chaining/one/       --> *Chaining/one (response) two');
	ROUTE('POST      /schema/chaining/two/       --> *Chaining/one two (response)');

	// Extension
	ROUTE('GET      /schema/extensions/query/    --> *Extensions/query');
	ROUTE('GET      /schema/extensions/read/     --> *Extensions/read');
	ROUTE('GET      /schema/extensions/insert/   --> *Extensions/insert');
	ROUTE('GET      /schema/extensions/patch/    --> *Extensions/patch');
	ROUTE('GET      /schema/extensions/update/   --> *Extensions/update');
	ROUTE('GET      /schema/extensions/remove/   --> *Extensions/remove');
	// Filters
	ROUTE('POST     /schema/filters/             --> *Filters/exec');
	// Verify
	ROUTE('POST     /schema/verify/              --> *Verify/exec');
	// PATCH $.keys

    ROUTE('PATCH      /schema/patchkeys/         --> *PatchKeys/exec');
}