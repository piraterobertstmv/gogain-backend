// Finds users whose password is still the literal "password" (left behind by the old
// Setup bug that reset passwords on every user edit) and gives them a random temporary one.
//
//   node scripts/reset-default-passwords.js                    # dry run: only lists affected users
//   node scripts/reset-default-passwords.js --apply            # resets them and prints the new passwords
//   node scripts/reset-default-passwords.js --apply --out ~/Desktop/temp-passwords.csv
//   node scripts/reset-default-passwords.js --apply --except me@example.com,other@example.com
//
// With --apply, each affected user also gets logged out everywhere (their tokens are cleared).
// Temporary passwords are shown once; hand them out privately and ask people to change them in Settings.

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user');

const WEAK_PASSWORDS = ['password'];

function parseArgs(argv) {
    const args = { apply: false, out: null, except: [] };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--apply') args.apply = true;
        else if (argv[i] === '--out') args.out = argv[++i];
        else if (argv[i] === '--except') args.except = (argv[++i] || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    }
    return args;
}

// 12 characters from an alphabet without look-alikes (no 0/O, 1/l/I), shown as xxxx-xxxx-xxxx
function generateTemporaryPassword() {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 12; i++) {
        out += alphabet[crypto.randomInt(alphabet.length)];
        if (i === 3 || i === 7) out += '-';
    }
    return out;
}

async function usesWeakPassword(user) {
    if (!user.password) return true; // no password at all: can't log in, give them one
    for (const weak of WEAK_PASSWORDS) {
        if (await bcrypt.compare(weak, user.password)) return true;
    }
    return false;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!process.env.MONGO_URL) {
        console.error('MONGO_URL is not set (expected in gogain-backend-main/.env).');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL);
    const users = await User.find({});

    const affected = [];
    for (const user of users) {
        if (args.except.includes(user.email.toLowerCase())) continue;
        if (await usesWeakPassword(user)) affected.push(user);
    }

    console.log(`${users.length} users checked, ${affected.length} still using a default password${args.except.length ? ` (skipping: ${args.except.join(', ')})` : ''}.`);

    if (!args.apply) {
        affected.forEach(u => console.log(`  - ${u.email}${u.isAdmin ? ' (admin)' : ''}`));
        console.log('\nDry run: nothing was changed. Re-run with --apply to reset these passwords.');
        await mongoose.disconnect();
        return;
    }

    const results = [];
    for (const user of affected) {
        const temporaryPassword = generateTemporaryPassword();
        try {
            user.password = temporaryPassword; // hashed by the model's pre-save hook
            user.authTokens = [];               // log them out of every session
            await user.save();
            results.push({ email: user.email, name: `${user.firstName} ${user.lastName}`, temporaryPassword, ok: true });
        } catch (e) {
            results.push({ email: user.email, name: `${user.firstName} ${user.lastName}`, temporaryPassword: '', ok: false, error: e.message });
        }
    }

    console.log('');
    results.forEach(r => console.log(r.ok
        ? `  ${r.email.padEnd(36)} ${r.temporaryPassword}`
        : `  ${r.email.padEnd(36)} FAILED: ${r.error}`));

    if (args.out) {
        const csv = ['email,name,temporary_password', ...results.filter(r => r.ok).map(r => `${r.email},"${r.name}",${r.temporaryPassword}`)].join('\n');
        fs.writeFileSync(args.out, csv + '\n', { mode: 0o600 });
        console.log(`\nSaved to ${args.out} (readable only by you). Delete it once the passwords are handed out.`);
    }

    const failed = results.filter(r => !r.ok).length;
    console.log(`\n${results.length - failed} passwords reset${failed ? `, ${failed} failed` : ''}. Each user was logged out everywhere.`);
    await mongoose.disconnect();
    if (failed) process.exit(1);
}

main().catch(async (e) => {
    console.error(e);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
