const expect = require('expect')

const DEFAULTS = {
    fail: false,
    data: null
};

module.exports = (opts = {}) => {
    const fc = Object.assign({}, DEFAULTS, opts.fetch);
    const pc = Object.assign({}, DEFAULTS, opts.persist);
    
    const fetch = expect.createSpy().andReturn(
        Promise.resolve(fc.fail
            ? [new Error('Failed fetching from database')]
            : [null, fc.data]
        )
    )

    const persist = expect.createSpy().andReturn(
        Promise.resolve(pc.fail 
            ? [new Error('Failed persisting to database')]
            : [null, pc.data]
        )
    )

    return () => ({fetch, persist})
}