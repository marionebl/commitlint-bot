module.exports = schedule;

/**
 * Create a new lint task in persistence
 */
async function schedule ({ github, payload }, db) {
	const { name, owner } = payload.repository
	const { number } = payload.pull_request

	const [, task] = await db.fetch('task', {
		PULL_REQUEST_SHA: payload.pull_request.head.sha,
		PULL_REQUST_NUMBER: payload.pull_request.number,
		REPO_SLUG: payload.pull_request.base.repo.full_name
	})

	if (task) {
		return;
	}

	await github.repos.createStatus({
		sha: payload.pull_request.head.sha,
		repo: name,
		owner: owner.login,
		context: 'commitlint',
		state: 'pending',
		description: 'Waiting for commitlint config to be reported'
	})

	const [persistErr] = await db.persist('task', {
		PULL_REQUEST_SHA: payload.pull_request.head.sha,
		PULL_REQUST_NUMBER: payload.pull_request.number,
		REPO_SLUG: payload.pull_request.base.repo.full_name,
		config: null
	})

	if (persistErr) {
		await github.repos.createStatus({
			sha: payload.pull_request.head.sha,
			repo: name,
			owner: owner.login,
			context: 'commitlint',
			state: 'error',
			description: `Could not create commitlint task: ${persistErr.message}`
		});
	}
}

