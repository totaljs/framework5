exports.install = function() {

	ROUTE('POST /upload/ @upload <5MB', upload); // Max. 5 MB

};

function upload($) {

	var output = [];

	$.files.wait(function(file, next) {

		var obj = {};

		obj.id = UID();
		obj.filename = file.filename;
		obj.size = file.size;
		obj.type = file.type;
		obj.ext = file.extension;
		obj.url = '/downloads/' + obj.id + '.' + obj.ext;

		file.fs(CONF.fs, obj.id, function(err) {

			if (!err)
				output.push(obj);

			next();
		});

	}, function() {

		// Returns JSON with list of uploaded and stored files
		$.json(output.length > 1 ? output : output[0]);

	});
}