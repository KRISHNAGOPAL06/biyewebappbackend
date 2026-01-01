import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// admin.auth.controller.ts

// Prisma singleton available from '../../config/db.js' if needed

export class AdminAuthController {
    // Admin Login
    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Email and password are required'
                    }
                });
            }

            // For now, hardcoded admin credentials
            // TODO: Move to database after initial setup
            const ADMIN_EMAIL = 'admin@email.com';
            const ADMIN_PASSWORD_HASH = await bcrypt.hash('admin', 10);

            // Check credentials
            if (email !== ADMIN_EMAIL) {
                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'Invalid credentials'
                    }
                });
            }

            const isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    error: {
                        message: 'Invalid credentials'
                    }
                });
            }

            // Generate JWT token
            const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
            const token = jwt.sign(
                {
                    id: 'admin-001',
                    email: ADMIN_EMAIL,
                    role: 'ADMIN'
                },
                jwtSecret,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                data: {
                    token,
                    admin: {
                        id: 'admin-001',
                        email: ADMIN_EMAIL,
                        role: 'ADMIN'
                    }
                },
                message: 'Login successful'
            });
        } catch (error: any) {
            console.error('Admin login error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Login failed',
                    details: error.message
                }
            });
        }
    }

    // Get current admin
    async getMe(req: any, res: Response) {
        try {
            const admin = req.admin; // Set by middleware

            res.json({
                success: true,
                data: {
                    admin
                }
            });
        } catch (error: any) {
            console.error('Get admin error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to get admin details',
                    details: error.message
                }
            });
        }
    }
}
