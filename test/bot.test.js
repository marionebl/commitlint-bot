// Packages
const expect = require('expect')
const { createRobot } = require('probot')

// Ours
const app = require('../index')
const dbMock = require('./mocks/db')
const githubMock = require('./mocks/github')
const events = require('./events')

// Constants
const baseStatus = {
	sha: '123456789',
	repo: 'repo',
	owner: 'user',
	context: 'commitlint'
}

const baseTask = {
	PULL_REQUEST_SHA: '123456789',
	PULL_REQUST_NUMBER: 1,
	REPO_SLUG: 'user/repo'
};

describe('commitlint-bot', () => {
	describe('status update to pending', () => {
		let robot
		let github
		let db
	
		beforeEach(() => {
			// Here we create a robot instance
			robot = createRobot()
			// Mock database client
			db = dbMock(baseTask, {
				fetch: {
					data: {
						PULL_REQUST_NUMBER: 1,
						PULL_REQUEST_SHA: '123456789',
						REPO_SLUG: 'user/repo'
					}
				}
			})
			// Here we initialize the app on the robot instance
			app(robot, db)
			// Mock GitHub client
			github = githubMock()

			// Passes the mocked out GitHub API into out robot instance
			robot.auth = () => Promise.resolve(github)
		})

		const pending = {
			...baseStatus,
			state: 'pending',
			description: 'Waiting for commitlint config to be reported'
		}

		it('works with new PRs', async () => {
			await robot.receive(events.opened)
			expect(github.repos.createStatus).toHaveBeenCalledWith(pending)
		})

		it('works with updated PRs', async () => {
			await robot.receive(events.synchronize)
			expect(github.repos.createStatus).toHaveBeenCalledWith(pending)
		})
	})

	describe('status update to error', () => {
		let robot
		let github
		let db
	
		beforeEach(() => {
			// Here we create a robot instance
			robot = createRobot()
			// Mock database client
			db = dbMock({
				persist: {
					fail: true
				}
			})
			// Here we initialize the app on the robot instance
			app(robot, db)
			// Mock GitHub client
			github = githubMock()
			// Passes the mocked out GitHub API into out robot instance
			robot.auth = () => Promise.resolve(github)
		})
		
		it('errors with new PRs', async () => {
			await robot.receive(events.opened)
			expect(github.repos.createStatus).toHaveBeenCalledWith({
				...baseStatus,
				state: 'error',
				description: 'Could not create commitlint task: Failed persisting to database'
			})
		})

		it('errors with updated PRs', async () => {
			await robot.receive(events.synchronize)
			expect(github.repos.createStatus).toHaveBeenCalledWith({
				...baseStatus,
				state: 'error',
				description: 'Could not create commitlint task: Failed persisting to database'
			})
		})
	});
})
