const url = require('url');
const util = require('util');
const {MongoClient} = require('mongodb');

module.exports = createDb;

function createDb() {
	if (!('COMMITLINT_BOT_DB' in process.env)) {
		throw new Error('Missing required env variable COMMITLINT_BOT_DB')
	}

    const pathname = url.parse(process.env.COMMITLINT_BOT_DB).pathname;

    if (typeof pathname !== 'string') {
        throw new Error('database name must be specified via pathname');
    }

    const dbName = pathname.slice(1);
    const connecting = MongoClient.connect(process.env.COMMITLINT_BOT_DB);

    return {
        async fetch(collection, query) {
            const client = await connecting;
            const db = client.db(dbName);
            const tasks = db.collection(collection);
            const [, all] = await errify(tasks.find)();
            return await errify(tasks, 'findOne')(query);
        },
        async persist(collection, payload) {
            const client = await connecting;
            const db = client.db(dbName);
            const tasks = db.collection(collection);
            return await errify(tasks, 'insert')(payload);
        }
    }
}

function errify(self, name) {
    return async (...args) => {
        try {
            return [null, await self[name].bind(self)(...args)];
        } catch (err) {
            return [err];
        }
    };
}

