NEWPUBLISH('users_create', 'name:String,email:Email');
NEWSUBSCRIBE('users_create', 'name:String,email:Email');

SUBSCRIBE('users_create', function(data) {
	console.log(data);
});