/**
 * Permission Middleware
 * 
 * This middleware provides functions to check user permissions and filter data
 * based on user access rights for different modules and actions.
 */

const User = require('../models/user');

/**
 * Middleware to check if user has permission for a specific module and action
 * @param {string} module - The module to check (e.g., 'transactions', 'clients')
 * @param {string} action - The action to check (e.g., 'view', 'create', 'edit', 'delete')
 * @returns {Function} Express middleware function
 */
const requirePermission = (module, action) => {
    return async (req, res, next) => {
        try {
            // Get user from authentication middleware
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ 
                    message: 'Authentication required' 
                });
            }

            // Check if user has the required permission
            if (!user.hasPermission(module, action)) {
                return res.status(403).json({ 
                    message: `Access denied. You don't have permission to ${action} ${module}.`,
                    requiredPermission: `${module}:${action}`,
                    userRole: user.role
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({ 
                message: 'Internal server error during permission check' 
            });
        }
    };
};

/**
 * Middleware to check if user can access a specific center
 * @param {string} centerIdParam - The parameter name containing the center ID
 * @returns {Function} Express middleware function
 */
const requireCenterAccess = (centerIdParam = 'centerId') => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ 
                    message: 'Authentication required' 
                });
            }

            const centerId = req.params[centerIdParam] || req.body[centerIdParam] || req.query[centerIdParam];
            
            if (!centerId) {
                return res.status(400).json({ 
                    message: 'Center ID is required' 
                });
            }

            // Check if user can access this center
            if (!user.canAccessCenter(centerId)) {
                return res.status(403).json({ 
                    message: 'Access denied. You don\'t have permission to access this center.',
                    centerId: centerId,
                    userRole: user.role
                });
            }

            next();
        } catch (error) {
            console.error('Center access check error:', error);
            res.status(500).json({ 
                message: 'Internal server error during center access check' 
            });
        }
    };
};

/**
 * Middleware to check if user can access a specific service
 * @param {string} serviceIdParam - The parameter name containing the service ID
 * @returns {Function} Express middleware function
 */
const requireServiceAccess = (serviceIdParam = 'serviceId') => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ 
                    message: 'Authentication required' 
                });
            }

            const serviceId = req.params[serviceIdParam] || req.body[serviceIdParam] || req.query[serviceIdParam];
            
            if (!serviceId) {
                return res.status(400).json({ 
                    message: 'Service ID is required' 
                });
            }

            // Check if user can access this service
            if (!user.canAccessService(serviceId)) {
                return res.status(403).json({ 
                    message: 'Access denied. You don\'t have permission to access this service.',
                    serviceId: serviceId,
                    userRole: user.role
                });
            }
        } catch (error) {
            console.error('Service access check error:', error);
            res.status(500).json({ 
                message: 'Internal server error during service access check' 
            });
        }
    };
};

/**
 * Middleware to filter data based on user's assigned centers and services
 * This middleware adds filtered data to req.filteredData
 * @param {string} dataType - The type of data to filter ('transactions', 'clients', 'centers', 'services')
 * @returns {Function} Express middleware function
 */
const filterDataByUserAccess = (dataType) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ 
                    message: 'Authentication required' 
                });
            }

            console.log(`[PERMISSIONS] Filtering ${dataType} for user: ${user.email}, role: ${user.role}`);
            console.log(`[PERMISSIONS] Original data keys:`, Object.keys(req.originalData || {}));
            console.log(`[PERMISSIONS] User assigned centers:`, user.assignedCenters);
            console.log(`[PERMISSIONS] User assigned services:`, user.assignedServices);

            // Super admins can see all data
            if (user.role === 'super_admin') {
                console.log(`[PERMISSIONS] Super admin detected - showing all data`);
                req.filteredData = req.originalData || {};
                return next();
            }

            // Filter data based on user's assigned centers and services
            let filteredData = {};
            
            switch (dataType) {
                case 'transactions':
                    if (req.originalData && req.originalData.transactions) {
                        filteredData.transactions = req.originalData.transactions.filter(transaction => {
                            // Check center access - use centerName field
                            if (transaction.centerName && !user.canAccessCenter(transaction.centerName)) {
                                return false;
                            }
                            // Check service access - use serviceName field
                            if (transaction.serviceName && !user.canAccessService(transaction.serviceName)) {
                                return false;
                            }
                            return true;
                        });
                    }
                    break;
                    
                case 'clients':
                    if (req.originalData && req.originalData.clients) {
                        // Clients are not directly tied to centers/services, so show all
                        // unless there's a specific business rule
                        filteredData.clients = req.originalData.clients;
                    }
                    break;
                    
                case 'centers':
                    if (req.originalData && req.originalData.centers) {
                        filteredData.centers = req.originalData.centers.filter(center => 
                            user.canAccessCenter(center.name)
                        );
                    }
                    break;
                    
                case 'services':
                    if (req.originalData && req.originalData.services) {
                        filteredData.services = req.originalData.services.filter(service => 
                            user.canAccessService(service.name)
                        );
                    }
                    break;
                    
                case 'users':
                    if (req.originalData && req.originalData.users) {
                        // Only show users if the current user has permission to view users
                        if (user.hasPermission('users', 'view')) {
                            filteredData.users = req.originalData.users;
                        } else {
                            filteredData.users = [];
                        }
                    }
                    break;
                    
                default:
                    // For other data types, pass through as-is
                    filteredData = req.originalData || {};
            }

            req.filteredData = filteredData;
            next();
            
        } catch (error) {
            console.error('Data filtering error:', error);
            res.status(500).json({ 
                message: 'Internal server error during data filtering' 
            });
        }
    };
};

/**
 * Middleware to check if user has admin role or higher
 * @returns {Function} Express middleware function
 */
const requireAdmin = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ 
                    message: 'Authentication required' 
                });
            }

            // Check if user has admin role or higher
            if (!['super_admin', 'admin'].includes(user.role)) {
                return res.status(403).json({ 
                    message: 'Access denied. Admin role required.',
                    userRole: user.role,
                    requiredRoles: ['super_admin', 'admin']
                });
            }

            next();
        } catch (error) {
            console.error('Admin check error:', error);
            res.status(500).json({ 
                message: 'Internal server error during admin check' 
            });
        }
    };
};

/**
 * Middleware to check if user has super admin role
 * @returns {Function} Express middleware function
 */
const requireSuperAdmin = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({ 
                    message: 'Authentication required' 
                });
            }

            // Check if user has super admin role
            if (user.role !== 'super_admin') {
                return res.status(403).json({ 
                    message: 'Access denied. Super admin role required.',
                    userRole: user.role,
                    requiredRole: 'super_admin'
                });
            }

            next();
        } catch (error) {
            console.error('Super admin check error:', error);
            res.status(500).json({ 
                message: 'Internal server error during super admin check' 
            });
        }
    };
};

module.exports = {
    requirePermission,
    requireCenterAccess,
    requireServiceAccess,
    filterDataByUserAccess,
    requireAdmin,
    requireSuperAdmin
}; 