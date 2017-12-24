const bodyParser = require('body-parser');

const createDatabase = require('./lib/db');
const schedule = require('./lib/schedule');
const config = require('./lib/config');
const lint = require('./lib/lint');

module.exports = (robot, createDb = createDatabase) => {
	const db = createDb()

	// Schedule new lint tasks awaiting config
	robot.on('pull_request.opened', bot => schedule(bot, db))
	robot.on('pull_request.reopened', bot => schedule(bot, db))
	robot.on('pull_request.synchronize', bot => schedule(bot, db))

	// Provide endpoint to receive commitlint config
	const app = robot.route('/commitlint-bot');
	app.use(bodyParser.json());
	app.post('/config', config(robot, db));

	// Lint according to commitlint config
	robot.on('pull_request.edited', bot => lint(bot, db))
	robot.on('commitlint_bot.configured', bot => lint(bot, db))
}
