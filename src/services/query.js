// Parsing of list/report query parameters shared by the transaction, cost-transaction and report routes.
const { isAdmin, ownershipFilter } = require('./ownership');

class BadRequest extends Error {}

// "a,b,c" -> ["a","b","c"]; anything else (missing, empty) -> null.
// Values are coerced with String(), so `?center[$ne]=x` can't inject a query operator.
function parseIdList(value) {
    if (value === undefined || value === null || value === '') return null;
    const list = (Array.isArray(value) ? value : String(value).split(','))
        .map(item => String(item).trim())
        .filter(Boolean);
    return list.length ? list : null;
}

// "YYYY-MM-DD" -> Date at the start (or end) of that UTC day
function parseDay(value, endOfDay) {
    if (value === undefined || value === null || value === '') return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new BadRequest(`Invalid date "${value}", expected YYYY-MM-DD`);
    const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
    if (Number.isNaN(date.getTime())) throw new BadRequest(`Invalid date "${value}"`);
    return date;
}

// MongoDB filter for transactions / cost transactions from the request's query string.
// Always includes the ownership rule (regular users only see their own records).
function buildTransactionFilter(req) {
    const filter = { ...ownershipFilter(req) };

    for (const field of ['center', 'client', 'service']) {
        const ids = parseIdList(req.query[field]);
        if (ids) filter[field] = { $in: ids };
    }

    // Admins may filter by worker; for regular users the ownership rule already fixes it.
    const workers = parseIdList(req.query.worker);
    if (workers && isAdmin(req)) filter.worker = { $in: workers };

    const from = parseDay(req.query.from, false);
    const to = parseDay(req.query.to, true);
    if (from || to) {
        filter.date = {};
        if (from) filter.date.$gte = from;
        if (to) filter.date.$lte = to;
    }

    return filter;
}

function parsePaging(query) {
    const page = Math.max(0, parseInt(query.page, 10) || 0);
    const limit = Math.min(500, Math.max(1, parseInt(query.limit, 10) || 100));
    return { page, limit, skip: page * limit };
}

function isPagedRequest(query) {
    return query.page !== undefined;
}

module.exports = { BadRequest, parseIdList, parseDay, buildTransactionFilter, parsePaging, isPagedRequest };
