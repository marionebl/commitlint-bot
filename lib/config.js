module.exports = config;

function config(robot, db) {
    return async (req, res) => {
        const {PULL_REQUEST_SHA, PULL_REQUST_NUMBER, REPO_SLUG} = req.body;
        const query = {PULL_REQUEST_SHA, PULL_REQUST_NUMBER, REPO_SLUG};

        // TODO: JSONScheme validation for req.body.config
        const update = {$set: {config: req.body.config}};

        const [err] = await db.update('task', query, update);

        if (err) {
            return res.status(500).send({
                message: err.message,
                code: 500
            });
        }

        const [fetchErr, {payload}] = await db.fetch('task', query);

        if (fetchErr) {
            return res.status(500).send({
                message: fetchErr.message,
                code: 500
            });
        }

        robot.receive({
            event: 'commitlint_bot',
            payload: Object.assign(payload, {action: 'configured'})
        });

        res.status(200).send({
            message: 'OK',
            code: 200
        });
    };
}