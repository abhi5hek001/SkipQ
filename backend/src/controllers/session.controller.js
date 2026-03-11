import prisma from '../config/prisma.js';

export const sessionController = {
  // Start Session (replaces login/register)
  async startSession(req, res, next) {
    try {
      const { name, role, shopName } = req.body;

      if (!name || !role) {
        return res.status(400).json({ success: false, message: 'Name and role are required' });
      }
      
      if (role !== 'user' && role !== 'vendor') {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }

      if (role === 'vendor' && !shopName) {
        return res.status(400).json({ success: false, message: 'Shop name is required for vendors' });
      }

      // Check if user already exists by name & role
      let user = await prisma.user.findFirst({
        where: { name, role }
      });

      // If not, create them
      if (!user) {
        user = await prisma.user.create({
          data: { name, role }
        });

        // Also create vendor profile if vendor
        if (role === 'vendor') {
          await prisma.vendorProfile.create({
            data: {
              userId: user.id,
              shopName: shopName
            }
          });
          // Initialize queue counter
          await prisma.vendorQueueCounter.create({
            data: { vendorId: user.id }
          });
        }
      }

      // Return unified session object
      return res.status(200).json({
        success: true,
        session: {
          id: user.id,
          name: user.name,
          role: user.role,
          shopName: role === 'vendor' ? shopName : undefined
        }
      });
    } catch (error) {
        console.error('startSession error:', error);
        res.status(500).json({ success: false, message: 'Server Error in checking session' });
    }
  }
};
