import { getDlosAccess } from '../store/dlosRepository.js';

export const requireDlosAccess = async (req, res, next) => {
  try {
    const role = await getDlosAccess(req.user?.id);
    if (!role) return res.status(403).json({ success: false, message: 'Special DLOS account access is required.' });
    req.dlosRole = role;
    return next();
  } catch (error) {
    return res.status(error.statusCode || 503).json({ success: false, message: error.message });
  }
};

export const requireDlosRole = (...roles) => (req, res, next) => roles.includes(req.dlosRole)
  ? next()
  : res.status(403).json({ success: false, message: 'This DLOS action requires a different account capability.' });
