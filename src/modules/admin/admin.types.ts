// Admin module types and interfaces

export interface AdminUser {
    id: string;
    email: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
    createdAt: Date;
}

export interface DashboardStats {
    totalUsers: number;
    totalVendors: number;
    totalBookings: number;
    totalRevenue: number;
    trends?: {
        users: string;
        vendors: string;
        bookings: string;
        revenue: string;
    };
}

export interface UserListItem {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    role: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
}

export interface VendorListItem {
    id: string;
    businessName: string;
    email: string;
    category?: string;
    onboardingStatus: string;
    createdAt: Date;
}

export interface BookingListItem {
    id: string;
    customerName: string;
    vendorName: string;
    serviceName: string;
    bookingDate: Date;
    status: string;
    amount: number;
}

export interface ActivityLogItem {
    id: string;
    userId: string;
    userName: string;
    action: string;
    type: 'USER' | 'VENDOR' | 'BOOKING';
    timestamp: Date;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
