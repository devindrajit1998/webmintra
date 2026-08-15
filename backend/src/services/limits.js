import { StorageItem } from "../models/StorageItem.js";

/**
 * Checks if a new file upload exceeds the tenant's storage limit.
 * 
 * @param {string|ObjectId} tenantId - The ID of the tenant.
 * @param {number} newFileSizeInBytes - The size of the incoming file in bytes.
 * @param {object} limits - The tenant's plan limits object.
 * @returns {Promise<boolean>} True if the upload is allowed, false if it exceeds the limit.
 */
export async function checkStorageLimit(tenantId, newFileSizeInBytes, limits) {
    // If storageMb is 0, it means unlimited storage
    if (limits?.storageMb === 0) {
        return true;
    }

    // Default limit if not specified (e.g. 500MB)
    const limitMb = limits?.storageMb || 500;
    const limitBytes = limitMb * 1024 * 1024;

    try {
        // Aggregate the total size of all existing StorageItems for this tenant
        const result = await StorageItem.aggregate([
            { $match: { tenant: tenantId } },
            { $group: { _id: null, totalSize: { $sum: "$size" } } }
        ]);

        const currentSize = result.length > 0 ? result[0].totalSize : 0;
        
        if ((currentSize + newFileSizeInBytes) > limitBytes) {
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error checking storage limit:", error);
        // Fail closed for safety or open for UX? Let's fail open if DB aggregate fails, 
        // to not completely break the app on a transient error, but log it.
        return true; 
    }
}
