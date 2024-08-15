exports.install = function() {
	ROUTE('GET /', function($) {
		$.plain('Hello World');
	});

	ROUTE('POST /bundles/merge/', function($) {
		var payload = $.body;
		if (!payload.content || !payload.filename) {
			$.invalid('Missing important body parameters filename and content');
			return;
		}
	
	
		PATH.mkdir(PATH.root('public/js'));
		Total.Fs.writeFile(payload.filename, payload.content, function(err) {
			if (err)
				throw err;
			$.json({ success: true, value: payload.filename });
		});
	});
	
	ROUTE('GET /bundles/remove/', function($) {
		var query = $.query;
		if (!query.filename) {
			$.invalid('[filename] is required in query parameters');
			return;
		}
	
		PATH.unlink(query.filename, function(error) {
			if (error) {
				$.invalid(error);
				return;
			}
	
	
			$.json({ success: true, value: query.filename });
		});
	});
	
}