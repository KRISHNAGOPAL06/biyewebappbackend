// src/services/currency.service.ts
import { logger } from '../../utils/logger.js';
import axios from 'axios';

import { prisma } from '../../prisma.js';

export interface CountryDetectionResult {
    countryCode: string;
    currency: string;
    source: 'ip' | 'phone' | 'registration' | 'payment_gateway' | 'default';
    confidence: 'high' | 'medium' | 'low';
    allSourcesMatch: boolean;
}

export class CurrencyService {
    private ipApiKey: string;

    constructor() {
        this.ipApiKey = process.env.IP_GEOLOCATION_API_KEY || '';
    }


    async detectCurrency(profileId: string, requestIp?: string): Promise<CountryDetectionResult> {
        console.log(this.ipApiKey)
        console.log(profileId)
        console.log(requestIp)


        try {
            const detectionSources = await this.getAllDetectionSources(profileId, requestIp);
            console.log(detectionSources)
            const finalResult = this.resolveCurrency(detectionSources);

            logger.info('Currency detection completed', {
                profileId,
                result: finalResult,
                sources: detectionSources,
            });

            return finalResult;
        } catch (error) {
            logger.error('Currency detection failed', { error, profileId });
            return {
                countryCode: 'US',
                currency: 'USD',
                source: 'default',
                confidence: 'low',
                allSourcesMatch: true,
            };
        }
    }

    private async getAllDetectionSources(
        profileId: string,
        requestIp?: string
    ): Promise<Array<{ countryCode: string; currency: string; source: string }>> {
        const sources = [];

        // Source 1: IP Geolocation
        if (requestIp && !this.isLocalIp(requestIp)) {
            const ipResult = await this.detectFromIp(requestIp);
            if (ipResult) {
                sources.push({ ...ipResult, source: 'ip' });
            }
        }

        // Source 2: Profile data (registration country)
        const profileResult = await this.detectFromProfile(profileId);
        if (profileResult) {
            sources.push({ ...profileResult, source: 'registration' });
        }

        // Source 3: Phone number analysis
        const phoneResult = await this.detectFromPhone(profileId);
        if (phoneResult) {
            sources.push({ ...phoneResult, source: 'phone' });
        }

        return sources;
    }

    private async detectFromIp(ip: string): Promise<{ countryCode: string; currency: string } | null> {
        try {
            // Using ipapi.co (free tier available)
            const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
                timeout: 3000,
            });

            if (response.data?.country_code && response.data?.currency) {
                return {
                    countryCode: response.data.country_code,
                    currency: response.data.currency,
                };
            }
        } catch (error) {
            logger.warn('IP geolocation failed', { ip, error: error });
        }

        // Fallback to ip-api.com (no key required)
        try {
            const response = await axios.get(`http://ip-api.com/json/${ip}`, {
                timeout: 3000,
            });

            if (response.data?.countryCode && response.data?.currency) {
                return {
                    countryCode: response.data.countryCode,
                    currency: response.data.currency,
                };
            }
        } catch (error) {
            logger.warn('Fallback IP geolocation failed', { ip, error: error });
        }

        return null;
    }

    private async detectFromProfile(profileId: string) {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            include: {
                user: {
                    select: {
                        country: true,
                    },
                },
            },
        });

        if (profile?.user?.country) {
            const currency = this.mapCountryToCurrency(profile.user.country);
            if (currency) {
                return {
                    countryCode: profile.user.country,
                    currency,
                };
            }
        }

        return null;
    }

    private async detectFromPhone(profileId: string) {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            include: {
                user: {
                    select: {
                        phoneNumber: true,
                    },
                },
            },
        });

        if (profile?.user?.phoneNumber) {
            const phone = profile.user.phoneNumber;

            // Bangladesh detection
            if (phone.startsWith('+880') || phone.startsWith('880') || phone.match(/^01[3-9]\d{8}$/)) {
                return {
                    countryCode: 'BD',
                    currency: 'BDT',
                };
            }

            // India detection
            if (phone.startsWith('+91') || phone.startsWith('91')) {
                return {
                    countryCode: 'IN',
                    currency: 'INR',
                };
            }

            // US/Canada detection
            if (phone.startsWith('+1')) {
                return {
                    countryCode: 'US',
                    currency: 'USD',
                };
            }
        }

        return null;
    }

    private resolveCurrency(sources: Array<{ countryCode: string; currency: string; source: string }>): CountryDetectionResult {
        if (sources.length === 0) {
            return {
                countryCode: 'US',
                currency: 'USD',
                source: 'default',
                confidence: 'low',
                allSourcesMatch: true,
            };
        }

        // Group by currency
        const currencyCounts: Record<string, number> = {};
        const countryCounts: Record<string, number> = {};

        sources.forEach(source => {
            currencyCounts[source.currency] = (currencyCounts[source.currency] || 0) + 1;
            countryCounts[source.countryCode] = (countryCounts[source.countryCode] || 0) + 1;
        });

        // Find most common currency
        const mostCommonCurrency = Object.keys(currencyCounts).reduce((a, b) =>
            currencyCounts[a] > currencyCounts[b] ? a : b
        );

        const mostCommonCountry = Object.keys(countryCounts).reduce((a, b) =>
            countryCounts[a] > countryCounts[b] ? a : b
        );

        // Determine confidence
        const uniqueCurrencies = Object.keys(currencyCounts).length;
        const uniqueCountries = Object.keys(countryCounts).length;

        let confidence: 'high' | 'medium' | 'low' = 'low';
        if (uniqueCurrencies === 1 && sources.length >= 2) {
            confidence = 'high';
        } else if (uniqueCurrencies === 1 || sources.length === 1) {
            confidence = 'medium';
        }

        // Check if user might be cheating (different countries detected)
        const allSourcesMatch = uniqueCountries === 1;

        if (!allSourcesMatch) {
            logger.warn('Potential currency mismatch detected', {
                currencies: Object.keys(currencyCounts),
                countries: Object.keys(countryCounts),
                sourcesCount: sources.length,
            });
        }

        // Determine source for logging
        const sourceMap: Record<string, string> = {};
        sources.forEach(s => {
            if (!sourceMap[s.currency]) sourceMap[s.currency] = s.source;
        });

        return {
            countryCode: mostCommonCountry,
            currency: mostCommonCurrency,
            source: sourceMap[mostCommonCurrency] as any,
            confidence,
            allSourcesMatch,
        };
    }

    private mapCountryToCurrency(countryCode: string): string | null {
        const countryCurrencyMap: Record<string, string> = {
            BD: 'BDT',
            IN: 'INR',
            US: 'USD',
            GB: 'GBP',
            CA: 'CAD',
            AU: 'AUD',
            EU: 'EUR',
            // Add more mappings as needed
        };

        return countryCurrencyMap[countryCode.toUpperCase()] || null;
    }

    private isLocalIp(ip: string): boolean {
        return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
    }

    // async updateCurrencyFromPayment(
    //     profileId: string,
    //     paymentCurrency: string,
    //     gatewayCountry?: string
    // ): Promise<void> {
    //     try {
    //         await prisma.profile.update({
    //             where: { id: profileId },
    //             data: {
    //                 preferredCurrency: paymentCurrency,
    //                 lastDetectedCountry: gatewayCountry,
    //             },
    //         });

    //         logger.info('Updated currency from payment', {
    //             profileId,
    //             paymentCurrency,
    //             gatewayCountry,
    //         });
    //     } catch (error) {
    //         logger.error('Failed to update currency from payment', {
    //             error,
    //             profileId,
    //         });
    //     }
    // }
}

export const currencyService = new CurrencyService();