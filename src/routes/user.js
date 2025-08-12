const express = require('express');
const User = require('../models/user');
const authentification = require('../middlewares/authentification');
const { 
    requirePermission, 
    requireAdmin, 
    requireSuperAdmin,
    filterDataByUserAccess 
} = require('../middlewares/permissions');
const router = new express.Router();
const bcrypt = require('bcryptjs');

// Create new user - Only admins can create users
router.post('/users', authentification, requireAdmin(), async (req, res, next) => {
    // Check if user has permission to create users
    if (!req.user.hasPermission('users', 'create')) {
        return res.status(403).json({
            message: 'Access denied. You don\'t have permission to create users.',
            requiredPermission: 'users:create',
            userRole: req.user.role
        });
    }

    const user = new User(req.body);

    try {
        const authToken = await user.generateAuthTokenAndSaveUser();
        res.status(201).send({ user, authToken });
    } catch(e) {
        console.error('Error creating user:', e);
        
        // Handle validation errors with more detailed messages
        if (e.name === 'ValidationError') {
            const errors = {};
            // Extract validation error messages
            for (const field in e.errors) {
                errors[field] = e.errors[field].message;
            }
            return res.status(400).send({ 
                message: 'Validation failed',
                errors 
            });
        }
        
        // Handle duplicate key (email) error
        if (e.code === 11000) {
            return res.status(400).send({ 
                message: 'Email is already in use' 
            });
        }
        
        // Generic error handling
        res.status(400).send({ 
            message: e.message || 'Error creating user'
        });
    }
});

// Get all users - Only users with 'users:view' permission
router.get('/users', authentification, requirePermission('users', 'view'), async (req, res, next) => {
    try {
        // Store original data for filtering
        req.originalData = { users: await User.find({}) };
        
        // Filter data based on user access
        filterDataByUserAccess('users')(req, res, () => {
            res.status(200).send({ users: req.filteredData.users || [] });
        });
    } catch(e) {
        console.error('Error fetching users:', e);
        res.status(500).send({ message: 'Error fetching users' });
    }
});

// Update user - Only admins can update users, with restrictions
router.patch('/users/:id', authentification, requireAdmin(), async (req, res, next) => {
    const userId = req.params.id;
    const userModified = req.body;

    // Check if user has permission to edit users
    if (!req.user.hasPermission('users', 'edit')) {
        return res.status(403).json({
            message: 'Access denied. You don\'t have permission to edit users.',
            requiredPermission: 'users:edit',
            userRole: req.user.role
        });
    }

    // Security: Prevent users from changing their own role to super_admin
    if (req.user._id.toString() === userId && userModified.role === 'super_admin') {
        return res.status(403).json({
            message: 'You cannot promote yourself to super admin.'
        });
    }

    // Security: Only super admins can promote users to super admin
    if (userModified.role === 'super_admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({
            message: 'Only super admins can promote users to super admin role.'
        });
    }

    // Security: Prevent users from demoting super admins unless they are super admin
    if (req.user.role !== 'super_admin') {
        const targetUser = await User.findById(userId);
        if (targetUser && targetUser.role === 'super_admin') {
            return res.status(403).json({
                message: 'Only super admins can modify super admin users.'
            });
        }
    }

    // Validate assigned centers and services if being modified
    if (userModified.assignedCenters && Array.isArray(userModified.assignedCenters)) {
        // Ensure all assigned centers are valid
        const validCenters = userModified.assignedCenters.filter(center => 
            typeof center === 'string' && center.trim().length > 0
        );
        userModified.assignedCenters = validCenters;
    }

    if (userModified.assignedServices && Array.isArray(userModified.assignedServices)) {
        // Ensure all assigned services are valid
        const validServices = userModified.assignedServices.filter(service => 
            typeof service === 'string' && service.trim().length > 0
        );
        userModified.assignedServices = validServices;
    }

    // Validate custom permissions if being modified
    if (userModified.permissions && typeof userModified.permissions === 'object') {
        const validPermissions = {};
        const validModules = ['users', 'clients', 'centers', 'services', 'costs', 'transactions'];
        const validActions = ['create', 'view', 'edit', 'delete'];

        for (const [module, modulePerms] of Object.entries(userModified.permissions)) {
            if (validModules.includes(module) && typeof modulePerms === 'object') {
                validPermissions[module] = {};
                for (const [action, value] of Object.entries(modulePerms)) {
                    if (validActions.includes(action) && typeof value === 'boolean') {
                        validPermissions[module][action] = value;
                    }
                }
            }
        }
        userModified.permissions = validPermissions;
    }

    if (userModified.password) {
        userModified.password = await bcrypt.hash(userModified.password, 8);
    }

    try {
        // Update the user
        const updateResult = await User.updateOne({ _id: userId }, { $set: userModified });
        
        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch the updated user with fresh data
        const updatedUser = await User.findById(userId);
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found after update' });
        }

        // Return the updated user with effective permissions
        const userWithPermissions = {
            ...updatedUser.toJSON(),
            effectivePermissions: updatedUser.getEffectivePermissions()
        };

        res.status(200).send({ 
            message: 'User updated successfully',
            userId, 
            updatedUser: userWithPermissions 
        });
    } catch(e) {
        console.error('Error updating user:', e);
        
        // Handle validation errors
        if (e.name === 'ValidationError') {
            const errors = {};
            for (const field in e.errors) {
                errors[field] = e.errors[field].message;
            }
            return res.status(400).json({ 
                message: 'Validation failed',
                errors 
            });
        }
        
        res.status(500).json({ message: 'Error updating user', error: e.message });
    }
});

// Dedicated endpoint for updating user permissions - Only admins can update permissions
router.patch('/users/:id/permissions', authentification, requireAdmin(), async (req, res, next) => {
    const userId = req.params.id;
    const { role, assignedCenters, assignedServices, permissions } = req.body;

    // Check if user has permission to edit user permissions
    if (!req.user.hasPermission('users', 'edit')) {
        return res.status(403).json({
            message: 'Access denied. You don\'t have permission to edit user permissions.',
            requiredPermission: 'users:edit',
            userRole: req.user.role
        });
    }

    try {
        // Find the target user
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Security: Prevent users from modifying super admin permissions unless they are super admin
        if (targetUser.role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                message: 'Only super admins can modify super admin permissions.'
            });
        }

        // Security: Prevent users from promoting others to super admin unless they are super admin
        if (role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({
                message: 'Only super admins can promote users to super admin role.'
            });
        }

        // Security: Prevent users from modifying their own role to super admin
        if (req.user._id.toString() === userId && role === 'super_admin') {
            return res.status(403).json({
                message: 'You cannot promote yourself to super admin.'
            });
        }

        // Prepare update object
        const updateData = {};

        // Update role if provided
        if (role && typeof role === 'string') {
            updateData.role = role;
        }

        // Update assigned centers if provided
        if (assignedCenters && Array.isArray(assignedCenters)) {
            const validCenters = assignedCenters.filter(center => 
                typeof center === 'string' && center.trim().length > 0
            );
            updateData.assignedCenters = validCenters;
        }

        // Update assigned services if provided
        if (assignedServices && Array.isArray(assignedServices)) {
            const validServices = assignedServices.filter(service => 
                typeof service === 'string' && service.trim().length > 0
            );
            updateData.assignedServices = validServices;
        }

        // Update custom permissions if provided
        if (permissions && typeof permissions === 'object') {
            const validPermissions = {};
            const validModules = ['users', 'clients', 'centers', 'services', 'costs', 'transactions'];
            const validActions = ['create', 'view', 'edit', 'delete'];

            for (const [module, modulePerms] of Object.entries(permissions)) {
                if (validModules.includes(module) && typeof modulePerms === 'object') {
                    validPermissions[module] = {};
                    for (const [action, value] of Object.entries(modulePerms)) {
                        if (validActions.includes(action) && typeof value === 'boolean') {
                            validPermissions[module][action] = value;
                        }
                    }
                }
            }
            updateData.permissions = validPermissions;
        }

        // If no valid data to update, return error
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ 
                message: 'No valid permission data provided for update' 
            });
        }

        // Update the user permissions
        const updateResult = await User.updateOne({ _id: userId }, { $set: updateData });
        
        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch the updated user
        const updatedUser = await User.findById(userId);
        
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found after update' });
        }

        // Return the updated user with effective permissions
        const userWithPermissions = {
            ...updatedUser.toJSON(),
            effectivePermissions: updatedUser.getEffectivePermissions()
        };

        res.status(200).json({ 
            message: 'User permissions updated successfully',
            userId, 
            updatedUser: userWithPermissions 
        });
    } catch(e) {
        console.error('Error updating user permissions:', e);
        
        // Handle validation errors
        if (e.name === 'ValidationError') {
            const errors = {};
            for (const field in e.errors) {
                errors[field] = e.errors[field].message;
            }
            return res.status(400).json({ 
                message: 'Validation failed',
                errors 
            });
        }
        
        res.status(500).json({ message: 'Error updating user permissions', error: e.message });
    }
});

// Delete user - Only super admins can delete users
router.delete('/users/:id', authentification, requireSuperAdmin(), async (req, res, next) => {
    const userId = req.params.id;

    // Security: Prevent super admins from deleting themselves
    if (req.user._id.toString() === userId) {
        return res.status(403).json({
            message: 'You cannot delete your own account.'
        });
    }

    try {
        const deleteInfos = await User.deleteOne({ _id: userId });
        res.status(200).send({ userId, deleteInfos });
    } catch(e) {
        console.error('Error deleting user:', e);
        res.status(500).send({ message: 'Error deleting user' });
    }
});

// Login route - No authentication required
router.post('/users/login', async (req, res) => {
    console.log(`Login attempt for email: ${req.body.email}`);
    try {
        if (!req.body.email || !req.body.password) {
            console.log('Missing email or password');
            return res.status(400).send({ message: 'Email and password are required' });
        }
        
        console.log('Finding user in database...');
        const user = await User.findUser(req.body.email, req.body.password);
        console.log(`User found: ${user._id}`);
        
        console.log('Generating auth token...');
        const authToken = await user.generateAuthTokenAndSaveUser();
        console.log('Auth token generated successfully');
        
        console.log(`Successful login for user: ${user.email} (${user._id})`);
        res.send({user, authToken});
    } catch(e) {
        console.log(`Failed login attempt for ${req.body.email}: ${e.message}`);
        res.status(400).send({ message: e.message || 'Login failed' });
    }
});

// Logout route - Requires authentication
router.post('/users/logout', authentification, async (req, res) => {
    try {
        req.user.authTokens = req.user.authTokens.filter((authToken) => {
            return authToken.authToken !== req.authToken;
        });

        await req.user.save();
        res.send({ message: 'Logged out successfully' });
    } catch(e) {
        console.error('Error during logout:', e);
        res.status(500).send({ message: 'Error during logout' });
    }
});

// Get current user profile - Requires authentication
router.get('/users/me', authentification, async (req, res, next) => {
    try {
        // Return user with effective permissions
        const userWithPermissions = {
            ...req.user.toJSON(),
            effectivePermissions: req.user.getEffectivePermissions()
        };
        res.send(userWithPermissions);
    } catch(e) {
        console.error('Error fetching user profile:', e);
        res.status(500).send({ message: 'Error fetching user profile' });
    }
});

// Get user permissions - Requires authentication
router.get('/users/me/permissions', authentification, async (req, res, next) => {
    try {
        const permissions = req.user.getEffectivePermissions();
        res.send({ permissions });
    } catch(e) {
        console.error('Error fetching user permissions:', e);
        res.status(500).send({ message: 'Error fetching user permissions' });
    }
});

module.exports = router;