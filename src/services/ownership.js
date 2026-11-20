// Row-level access rules for transactions and cost transactions.
// Admins see and modify everything; regular users only the records where they are the worker.

function isAdmin(req) {
    return req.user && req.user.isAdmin === true;
}

// Extra query conditions to apply to every read/update/delete.
function ownershipFilter(req) {
    return isAdmin(req) ? {} : { worker: req.user._id.toString() };
}

// Clean a request body before creating/updating a transaction.
// - never let the client write _id/__v
// - regular users can't create or move records for someone else
function sanitizeTransactionBody(req, body, { isCreate }) {
    const clean = { ...body };
    delete clean._id;
    delete clean.__v;

    if (!isAdmin(req)) {
        if (isCreate) {
            clean.worker = req.user._id.toString();
        } else {
            delete clean.worker;
        }
    }

    return clean;
}

module.exports = { isAdmin, ownershipFilter, sanitizeTransactionBody };
