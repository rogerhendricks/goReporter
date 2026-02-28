import api from '@/utils/axios';

export interface BillingCode {
    ID: number;
    category: string;
    code: string;
}

export const billingService = {
    getBillingCodes: async (): Promise<BillingCode[]> => {
        const response = await api.get('/billing-codes');
        return response.data;
    },

    updateBillingCode: async (category: string, code: string): Promise<BillingCode> => {
        // URL encode the category because it contains spaces (e.g., 'in clinic pacemaker')
        const encodedCategory = encodeURIComponent(category);
        const response = await api.put(`/billing-codes/${encodedCategory}`, { code });
        return response.data;
    },

    exportCSV: (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        // We do window.location or temporary fetch for download
        const url = `/api/billing-codes/export?${params.toString()}`;

        // In many React apps with auth interceptors, exporting a file directly via window.open 
        // might fail if the token is passed via header. If it's cookie-based, it works nicely.
        // Assuming cookie-based auth in goReporter given CSRF tokens typically implies cookies:
        window.location.href = url;
    }
};
