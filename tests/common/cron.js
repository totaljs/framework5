/* eslint-disable */
require('../../index');
require('../../test');

// @TODO: incomplete test

F.http();

ON('ready', function () {
	Test.push('CRON', function (next) {
		// 08:10 ---> 27 8 * * *

		CRON('{0} * * *'.format(NOW.add('1 minute').format('mm HH')), function () {
			Test.print('In 1 minute - success');
		});

		CRON('{0} *'.format(NOW.add('1 minute').format('mm HH dd MM')), function () {
			Test.print('In 1 minute - Full date - success');
		});

		CRON('{0} 2'.format(NOW.add('1 minute').format('mm HH dd MM')), function () {
			Test.print('In 1 minute - Full date 2 - success');
		});

		CRON('{0} 2'.format(NOW.add('1 minute').format('mm HH dd MM')), function () {
			Test.print('In 1 minute - Full date 2 - success');
		});


		CRON('*/1 * * * *'.format(NOW.add('1 minute').format('mm HH dd MM')), function () {
			Test.print('Every 1 minute - success');
		});

		CRON('*/2 * * * *'.format(NOW.add('1 minute').format('mm HH dd MM')), function () {
			Test.print('Every 2 minutes - success');
		});

	});

	setTimeout(function () {
		Test.run();
	}, 600);
});