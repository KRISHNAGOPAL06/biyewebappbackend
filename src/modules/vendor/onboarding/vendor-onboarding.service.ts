
import { prisma } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';
import { VendorProfileUpdateDTO } from '../vendor.dto.js';

export class VendorOnboardingService {

    /**
     * Get vendor onboarding status
     */
    async getOnboardingStatus(vendorId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
            include: {
                profile: true,
                plan: true
            }
        }) as any;

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        return {
            status: vendor.onboardingStatus,
            businessName: vendor.businessName,
            plan: vendor.plan,
            profile: vendor.profile,
            isProfileComplete: this.checkProfileCompleteness(vendor.profile),
            missingFields: this.getMissingFields(vendor.profile)
        };
    }

    /**
     * Update profile details step
     */
    async updateProfileStep(vendorId: string, data: VendorProfileUpdateDTO) {
        // Ensure profile exists
        let profile = await prisma.vendorProfile.findUnique({ where: { vendorId } });

        if (!profile) {
            profile = await prisma.vendorProfile.create({
                data: { vendorId }
            });
        }

        // Update profile
        const updatedProfile = await prisma.vendorProfile.update({
            where: { vendorId },
            data: {
                ...data,
                // Handle complex objects if needed, but Prisma supports Json directly
            }
        });

        // Check if now complete, update status if still in PROFILE_COMPLETED or PLAN_SELECTED
        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (vendor?.onboardingStatus === 'PLAN_SELECTED' || vendor?.onboardingStatus === 'REGISTERED') {
            // We verify completeness before auto-advancing
            // Actually, we might want to keep it as PROFILE_COMPLETED only when user explicitly finishes?
            // Or auto-advance if all required fields are there?
            // Let's keep it manual or auto only if complete.
            if (this.checkProfileCompleteness(updatedProfile)) {
                await prisma.vendor.update({
                    where: { id: vendorId },
                    data: { onboardingStatus: 'PROFILE_COMPLETED' }
                });
            }
        }

        return updatedProfile;
    }

    /**
     * Submit for review
     */
    async submitForReview(vendorId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { profile: true }
        });

        if (!vendor) throw new AppError('Vendor not found', 404);

        if (vendor.onboardingStatus === 'PENDING_APPROVAL') {
            throw new AppError('Already submitted for review', 400);
        }

        if (vendor.onboardingStatus === 'APPROVED') {
            throw new AppError('Already approved', 400);
        }

        // Validate completeness
        const missing = this.getMissingFields(vendor.profile);
        if (missing.length > 0) {
            throw new AppError(`Profile incomplete. Missing: ${missing.join(', ')}`, 400, 'INCOMPLETE_PROFILE');
        }

        // Update status
        return await prisma.vendor.update({
            where: { id: vendorId },
            data: { onboardingStatus: 'PENDING_APPROVAL' }
        });
    }

    private checkProfileCompleteness(profile: any): boolean {
        return this.getMissingFields(profile).length === 0;
    }

    private getMissingFields(profile: any): string[] {
        if (!profile) return ['profile'];

        const required = [
            'description',
            'city',
            'state',
            'yearsInBusiness',
            'teamSize',
            'logo',
            'coverImage'
        ];

        // Add logic for checking emptiness
        return required.filter(field => !profile[field]);
    }

    // ==================== STEP-LEVEL TRACKING ====================

    /**
     * Get current onboarding progress
     * Returns current step number and saved form data
     */
    async getProgress(vendorId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { profile: true }
        }) as any;

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        return {
            currentStep: vendor.onboardingStep || 0,
            savedData: vendor.onboardingData || {},
            onboardingStatus: vendor.onboardingStatus,
            vendorInfo: {
                email: vendor.email,
                phoneNumber: vendor.phoneNumber,
                businessName: vendor.businessName,
                ownerName: vendor.ownerName,
            },
            profile: vendor.profile,
        };
    }

    /**
     * Save a completed step
     * Validates step number is sequential (no skipping)
     * Merges new data with existing saved data
     */
    async saveStep(vendorId: string, stepNumber: number, stepData: Record<string, any>) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId }
        }) as any;

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        const currentStep = vendor.onboardingStep || 0;

        // Validate sequential step progression (no skipping)
        if (stepNumber !== currentStep + 1) {
            throw new AppError(
                `Invalid step. Expected step ${currentStep + 1}, got ${stepNumber}`,
                400,
                'INVALID_STEP'
            );
        }

        // Validate step data is not empty for required steps
        if (!stepData || Object.keys(stepData).length === 0) {
            throw new AppError('Step data is required', 400, 'EMPTY_STEP_DATA');
        }

        // Merge new data with existing saved data
        const existingData = vendor.onboardingData || {};
        const mergedData = { ...existingData, ...stepData };

        // Update vendor with new step and merged data
        const updatedVendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                onboardingStep: stepNumber,
                onboardingData: mergedData,
            } as any
        }) as any;

        return {
            currentStep: updatedVendor.onboardingStep,
            savedData: updatedVendor.onboardingData,
        };
    }

    /**
     * Complete the onboarding process
     * Validates all required steps are done
     * Updates onboardingStatus to PENDING_APPROVAL
     */
    async completeOnboarding(vendorId: string) {
        const TOTAL_STEPS = 20; // Total steps in the conversational flow

        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId }
        }) as any;

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        const currentStep = vendor.onboardingStep || 0;

        // Validate all steps completed
        if (currentStep < TOTAL_STEPS) {
            throw new AppError(
                `Onboarding incomplete. Completed ${currentStep}/${TOTAL_STEPS} steps`,
                400,
                'ONBOARDING_INCOMPLETE'
            );
        }

        // Already completed check
        if (vendor.onboardingStatus === 'PENDING_APPROVAL' || vendor.onboardingStatus === 'APPROVED') {
            throw new AppError('Onboarding already completed', 400, 'ALREADY_COMPLETED');
        }

        // Update status
        const updatedVendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: { onboardingStatus: 'PENDING_APPROVAL' }
        });

        return {
            onboardingStatus: updatedVendor.onboardingStatus,
            message: 'Onboarding completed successfully. Your profile is pending approval.',
        };
    }
}
