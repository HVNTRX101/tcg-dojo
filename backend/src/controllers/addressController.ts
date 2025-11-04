import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * Address Controller
 * Handles user shipping/billing address management
 */

/**
 * Get all addresses for the current user
 * GET /api/addresses
 */
export const getAddresses = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' }, // Default address first
        { createdAt: 'desc' },
      ],
    });

    return res.json({ data: addresses });
  } catch (error) {
    console.error('Error getting addresses:', error);
    return res.status(500).json({ error: 'Failed to get addresses' });
  }
};

/**
 * Get a single address by ID
 * GET /api/addresses/:addressId
 */
export const getAddressById = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { addressId } = req.params;

    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    return res.json({ data: address });
  } catch (error) {
    console.error('Error getting address:', error);
    return res.status(500).json({ error: 'Failed to get address' });
  }
};

/**
 * Create a new address
 * POST /api/addresses
 */
export const createAddress = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const {
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault,
    } = req.body;

    // Validation
    if (!fullName || !addressLine1 || !city || !state || !postalCode || !country) {
      return res.status(400).json({
        error: 'fullName, addressLine1, city, state, postalCode, and country are required',
      });
    }

    // If setting as default, unset other default addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create address
    const address = await prisma.address.create({
      data: {
        userId,
        fullName,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        phone,
        isDefault: isDefault || false,
      },
    });

    return res.status(201).json({
      message: 'Address created successfully',
      data: address,
    });
  } catch (error) {
    console.error('Error creating address:', error);
    return res.status(500).json({ error: 'Failed to create address' });
  }
};

/**
 * Update an address
 * PUT /api/addresses/:addressId
 */
export const updateAddress = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { addressId } = req.params;
    const {
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault,
    } = req.body;

    // Check if address exists and belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!existingAddress) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If setting as default, unset other default addresses
    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Build update data
    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (addressLine1 !== undefined) updateData.addressLine1 = addressLine1;
    if (addressLine2 !== undefined) updateData.addressLine2 = addressLine2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (country !== undefined) updateData.country = country;
    if (phone !== undefined) updateData.phone = phone;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    // Update address
    const address = await prisma.address.update({
      where: { id: addressId },
      data: updateData,
    });

    return res.json({
      message: 'Address updated successfully',
      data: address,
    });
  } catch (error) {
    console.error('Error updating address:', error);
    return res.status(500).json({ error: 'Failed to update address' });
  }
};

/**
 * Delete an address
 * DELETE /api/addresses/:addressId
 */
export const deleteAddress = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { addressId } = req.params;

    // Check if address exists and belongs to user
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Delete address
    await prisma.address.delete({
      where: { id: addressId },
    });

    // If this was the default address, set another as default
    if (address.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    return res.status(500).json({ error: 'Failed to delete address' });
  }
};

/**
 * Set an address as default
 * PUT /api/addresses/:addressId/set-default
 */
export const setDefaultAddress = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;
    const { addressId } = req.params;

    // Check if address exists and belongs to user
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // Unset other default addresses
    await prisma.address.updateMany({
      where: {
        userId,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });

    // Set this address as default
    const updatedAddress = await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return res.json({
      message: 'Default address set successfully',
      data: updatedAddress,
    });
  } catch (error) {
    console.error('Error setting default address:', error);
    return res.status(500).json({ error: 'Failed to set default address' });
  }
};

/**
 * Get default address
 * GET /api/addresses/default
 */
export const getDefaultAddress = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user!.userId;

    const address = await prisma.address.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    if (!address) {
      return res.status(404).json({ error: 'No default address found' });
    }

    return res.json({ data: address });
  } catch (error) {
    console.error('Error getting default address:', error);
    return res.status(500).json({ error: 'Failed to get default address' });
  }
};
