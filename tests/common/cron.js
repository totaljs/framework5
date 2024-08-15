/* eslint-disable */
require('../../index');
require('../../test');

F.http();

ON('ready', function () {
	Test.push('CRON', function (next) {

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

		CRON('*/1 * * * *', function () {
			Test.print('Every 1 minute - success');
		});

		CRON('*/2 * * * *', function () {
			Test.print('Every 2 minutes - success');
		});

		CRON('0 12 * * *', function () {
			Test.print('At 12:00 PM daily - success');
		});

		CRON('0 12 * * 1-5', function () {
			Test.print('At 12:00 PM Monday to Friday - success');
		});

		CRON('0 0 * * 1', function () {
			Test.print('At 12:00 AM every Monday - success');
		});

		CRON('0 */2 * * *', function () {
			Test.print('Every 2 hours - success');
		});

		CRON('0 0 */3 * *', function () {
			Test.print('At midnight every 3 days - success');
		});

		CRON('0 0 1 */2 *', function () {
			Test.print('At midnight on the 1st day of every other month - success');
		});

		CRON('0 0 1 1 *', function () {
			Test.print('At midnight on January 1st - success');
		});

		CRON('0 0 1 1,4,7,10 *', function () {
			Test.print('At midnight on January, April, July, and October 1st - success');
		});

		CRON('0 0 1 1-5 *', function () {
			Test.print('At midnight on the 1st to 5th day of every month - success');
		});

		CRON('0 0 1 * *', function () {
			Test.print('At midnight on the 1st day of every month - success');
		});

		CRON('0 0 1 * *', function () {
			Test.print('At midnight on the 1st day of every month - success');
		});

		CRON('0 0 * * *', function () {
			Test.print('At the start of every hour - success');
		});

		CRON('0 8-17 * * *', function () {
			Test.print('Every hour from 8 AM to 5 PM - success');
		});

		CRON('0 12 * * 1-5', function () {
			Test.print('At 12:00 PM from Monday to Friday - success');
		});

		CRON('0 0 1 */3 *', function () {
			Test.print('At midnight on the 1st of every third month - success');
		});

		CRON('0 0 * * *', function () {
			Test.print('At midnight every day - success');
		});

		CRON('0 0 1 1 *', function () {
			Test.print('At midnight on January 1st - success');
		});

		CRON('0 0 1 * *', function () {
			Test.print('At midnight on the 1st day of every month - success');
		});

		CRON('0 0 * * *', function () {
			Test.print('At the start of every hour - success');
		});

		CRON('0 8-17 * * *', function () {
			Test.print('Every hour from 8 AM to 5 PM - success');
		});

	});

	setTimeout(function () {
		Test.run();
	}, 600);
});