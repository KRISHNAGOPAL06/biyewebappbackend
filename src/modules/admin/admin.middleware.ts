import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    admin?: {
        id: string;
        email: string;
        role: string;
    };
}

export const adminAuthMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: {
                    message: 'No authentication token provided'
                }
            });
        }

        const token = authHeader.substring(7);
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

        const decoded = jwt.verify(token, jwtSecret) as any;

        // Check if user is admin
        if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                success: false,
                error: {
                    message: 'Access denied. Admin privileges required.'
                }
            });
        }

        req.admin = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        return res.status(401).json({
            success: false,
            error: {
                message: 'Invalid or expired token'
            }
        });
    }
};

export const superAdminOnly = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (req.admin?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
            success: false,
            error: {
                message: 'Super admin privileges required'
            }
        });
    }
    next();
};
