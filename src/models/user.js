const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Define available roles
const AVAILABLE_ROLES = ['super_admin', 'admin', 'manager', 'worker', 'viewer'];

// Define permission structure
const PERMISSION_STRUCTURE = {
    dashboard: { view: false, edit: false },
    transactions: { view: false, create: false, edit: false, delete: false },
    clients: { view: false, create: false, edit: false, delete: false },
    centers: { view: false, create: false, edit: false, delete: false },
    services: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, export: false },
    settings: { view: false, edit: false }
};

// Define role-based permission presets
const ROLE_PERMISSIONS = {
    super_admin: {
        dashboard: { view: true, edit: true },
        transactions: { view: true, create: true, edit: true, delete: true },
        clients: { view: true, create: true, edit: true, delete: true },
        centers: { view: true, create: true, edit: true, delete: true },
        services: { view: true, create: true, edit: true, delete: true },
        users: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, export: true },
        settings: { view: true, edit: true }
    },
    admin: {
        dashboard: { view: true, edit: false },
        transactions: { view: true, create: true, edit: true, delete: true },
        clients: { view: true, create: true, edit: true, delete: true },
        centers: { view: true, create: true, edit: true, delete: false },
        services: { view: true, create: true, edit: true, delete: false },
        users: { view: true, create: true, edit: true, delete: false },
        reports: { view: true, export: true },
        settings: { view: true, edit: false }
    },
    manager: {
        dashboard: { view: true, edit: false },
        transactions: { view: true, create: true, edit: true, delete: false },
        clients: { view: true, create: true, edit: true, delete: false },
        centers: { view: true, create: false, edit: false, delete: false },
        services: { view: true, create: true, edit: true, delete: false },
        users: { view: false, create: false, edit: false, delete: false },
        reports: { view: true, export: false },
        settings: { view: false, edit: false }
    },
    worker: {
        dashboard: { view: true, edit: false },
        transactions: { view: true, create: true, edit: false, delete: false },
        clients: { view: true, create: true, edit: false, delete: false },
        centers: { view: true, create: false, edit: false, delete: false },
        services: { view: true, create: false, edit: false, delete: false },
        users: { view: false, create: false, edit: false, delete: false },
        reports: { view: false, export: false },
        settings: { view: false, edit: false }
    },
    viewer: {
        dashboard: { view: true, edit: false },
        transactions: { view: true, create: false, edit: false, delete: false },
        clients: { view: true, create: false, edit: false, delete: false },
        centers: { view: true, create: false, edit: false, delete: false },
        services: { view: true, create: false, edit: false, delete: false },
        users: { view: false, create: false, edit: false, delete: false },
        reports: { view: false, export: false },
        settings: { view: false, edit: false }
    }
};

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        validate(value) {
            if (!validator.isEmail(value)) throw new Error('E-mail non valide');
        }
    },
    password: {
        type: String,
        validate(value) {
            if (!validator.isLength(value, { min: 4, max: 80 } )) throw new Error('Le mot de passe doit etre entre 4 et 20 chars');
        }
    },
    authTokens: [{
        authToken: {
            type: String,
            required: true
        }
    }],
    // New permission system fields
    role: {
        type: String,
        enum: AVAILABLE_ROLES,
        default: 'viewer',
        required: true
    },
    permissions: {
        type: Object,
        default: function() {
            // Return default permissions based on role
            return ROLE_PERMISSIONS[this.role] || ROLE_PERMISSIONS.viewer;
        }
    },
    assignedCenters: {
        type: [String],
        required: true,
        default: []
    },
    assignedServices: {
        type: [String],
        required: true,
        default: []
    },
    // Legacy fields (kept for backward compatibility)
    isAdmin: {
        type: Boolean,
        default: false
    },
    centers: {
        type: [String],
        required: false // Made optional since we now use assignedCenters
    },
    services: {
        type: [String],
        required: false // Made optional since we now use assignedServices
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    percentage: {
        type: Number,
        required: true
    }
});

// Permission checking methods
userSchema.methods.hasPermission = function(module, action) {
    return this.permissions[module] && this.permissions[module][action] === true;
};

userSchema.methods.canAccessCenter = function(centerId) {
    // Super admins can access all centers
    if (this.role === 'super_admin') return true;
    // Check if user is assigned to this center
    return this.assignedCenters.includes(centerId);
};

userSchema.methods.canAccessService = function(serviceId) {
    // Super admins can access all services
    if (this.role === 'super_admin') return true;
    // Check if user is assigned to this service
    return this.assignedServices.includes(serviceId);
};

// Method to get effective permissions (role + custom overrides)
userSchema.methods.getEffectivePermissions = function() {
    const basePermissions = ROLE_PERMISSIONS[this.role] || ROLE_PERMISSIONS.viewer;
    const customPermissions = this.permissions || {};
    
    // Merge base permissions with custom overrides
    const effectivePermissions = {};
    Object.keys(basePermissions).forEach(module => {
        effectivePermissions[module] = { ...basePermissions[module] };
        if (customPermissions[module]) {
            Object.keys(customPermissions[module]).forEach(action => {
                if (customPermissions[module][action] !== undefined) {
                    effectivePermissions[module][action] = customPermissions[module][action];
                }
            });
        }
    });
    
    return effectivePermissions;
};

// Pre-save middleware to set default permissions based on role
userSchema.pre('save', async function(next) {
    // Hash password if modified
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 8);
    }
    
    // Set default permissions based on role if not already set
    if (!this.permissions || Object.keys(this.permissions).length === 0) {
        this.permissions = ROLE_PERMISSIONS[this.role] || ROLE_PERMISSIONS.viewer;
    }
    
    // Set isAdmin for backward compatibility
    this.isAdmin = ['super_admin', 'admin'].includes(this.role);
    
    // Ensure assignedCenters and assignedServices are arrays
    if (!Array.isArray(this.assignedCenters)) {
        this.assignedCenters = [];
    }
    if (!Array.isArray(this.assignedServices)) {
        this.assignedServices = [];
    }
    
    next();
});

userSchema.methods.toJSON = function() {
    const user = this.toObject();

    delete user.password;
    delete user.authTokens;

    return user;
}

userSchema.methods.generateAuthTokenAndSaveUser = async function() {
    const token = jwt.sign({ _id: this._id.toString() }, process.env.JWT_SECRET, { expiresIn: '24h' });
    this.authTokens.push({ authToken: token });
    await this.save();
    return token;
}

userSchema.statics.findUser = async(email, password) => {
    console.log(`Looking for user with email: ${email}`);
    
    const user = await User.findOne({ email });
    if (!user) {
        console.log(`No user found with email: ${email}`);
        throw new Error('Invalid email or password');
    }

    console.log(`User found, checking password for: ${email}`);
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        console.log(`Invalid password for: ${email}`);
        throw new Error('Invalid email or password');
    }

    console.log(`Password validated for: ${email}`);
    return user;
}

const User = mongoose.model('User', userSchema);

module.exports = User;