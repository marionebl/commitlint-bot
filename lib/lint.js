const core = require('@commitlint/core');
const stripAnsi = require('strip-ansi');
const stripIndent = require('strip-indent');

module.exports = lint;

/**
 * Lint a PR according to resolved commitlint config
 */
async function lint(context, db) {
	let { github, payload, repo } = context;
	repo = repo.bind(context);

	const query = {
		PULL_REQUEST_SHA: payload.pull_request.head.sha,
		PULL_REQUST_NUMBER: payload.pull_request.number,
		REPO_SLUG: payload.pull_request.base.repo.full_name
	};

	const [, task] = await db.fetch('task', query);
	
	if (!task.config) {
		return;
	}

	const base = {
		repo: payload.repository.name,
		owner: payload.repository.owner.login
	};

	const status = {
		...base,
		sha: payload.pull_request.head.sha,
		context: 'commitlint',
	};

	// TODO: JSONSchema validation for config
	const bot = task.config.bot || {mode: 'rebase'};
	const messages = await getMessages({github, payload, repo, bot});

	const checks = await Promise.all(
		messages.map(async ([sha, message]) => {
			const report = await core.lint(message, task.config.rules, task.config.opts);
			return {report, sha, message};
		})
	);

	// Remove previous comments
	github.paginate(github.issues.getComments({
		...base,
		number: payload.pull_request.number,
	}), (res) => {
		// TODO: How to match to login user?
		res.data
			.filter(comment => comment.user.id === 34693671)
			.forEach(async comment => {
				github.issues.deleteComment({
					...base,
					id: comment.id
				});
		});
	});

	switch (bot.mode) {
		case 'rebase': {
			checks.forEach(check => {
				github.repos.createStatus({
					...status,
					sha: check.sha,
					state: check.report.valid ? 'success' : 'failure',
					description: `${check.report.errors.length} problems, ${check.report.warnings.length} warnings`
				})
			});

			const valid = !checks.some(check => !check.report.valid);

			github.repos.createStatus({
				...status,
				state: valid ? 'success' : 'failure',
				description: valid ? `All commits passed` : `Found problems in commits`
			});

			if (!valid) {

				const body = `
[commitlint](https://github.com/marionebl/commitlint/) found problems with some commit messages, please reword them.

${checks.filter(check => !check.valid).map(check => `
**${check.sha} - ${check.message}**
${core.format(check.report).map(l => stripAnsi(`- ${l}`)).join(`\n`)}
`).join('\n\n')}

<details>

\`\`\`json
${JSON.stringify(task.config, null, '  ')}
\`\`\`
</details>
				`;

				github.issues.createComment({
					...base,
					number: payload.pull_request.number,
					body: stripIndent(body)
				});
			}

			break;
		}
		case 'squash': {
			const [{report, message}] = checks;

			github.repos.createStatus({
				...status,
				state: report.valid ? 'success' : 'failure',
				description: `${report.errors.length} problems, ${report.warnings.length} warnings in PR title`
			});

			if (report.valid) {
				return;
			}

			const body = `
[commitlint](https://github.com/marionebl/commitlint/) found problems with the title of this Pull Request, please update it.

**${message}**
${core.format(report).map(l => stripAnsi(`- ${l}`)).join(`\n`)}

<details>

\`\`\`json
${JSON.stringify(task.config, null, '  ')}
\`\`\`
</details>
			`

			github.issues.createComment({
				...base,
				number: payload.pull_request.number,
				body: stripIndent(body)
			});

			break;
		}
	}

	// await db.remove('task', query)
}

async function getMessages({github, payload, repo, bot}) {
	switch (bot.mode) {
		case 'squash':
			return [[null, payload.pull_request.title]];
		case 'rebase': {
			const {data} = await github.repos.compareCommits(repo({ 
				base: payload.pull_request.base.sha,
				head: payload.pull_request.head.sha
			}));
		
			return data.commits.map(item => [item.sha, item.commit.message]);
		}
	} 
}