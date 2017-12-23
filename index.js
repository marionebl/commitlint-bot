const createDatabase = require('./lib/db');
const schedule = require('./lib/schedule')

module.exports = (robot, createDb = createDatabase) => {
	const db = createDb()

	robot.on('pull_request.opened', bot => schedule(bot, db))
	robot.on('pull_request.synchronize', bot => schedule(bot, db))
	robot.on('pull_request.edited', bot => schedule(bot, db))
}
