import multer from 'multer';

export const DLOS_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const DLOS_FILE_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

const makeUpload = count => multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DLOS_MAX_FILE_BYTES, files: count },
  fileFilter: (_req, file, callback) => {
    const extension = String(file.originalname || '').toLowerCase().match(/\.([a-z]+)$/)?.[1];
    const matching = {
      'application/pdf': ['pdf'], 'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'], 'image/webp': ['webp']
    };
    if (!matching[file.mimetype]?.includes(extension) || file.originalname.length > 180) {
      return callback(new Error('Upload a PDF, JPEG, PNG, or WEBP file.'));
    }
    callback(null, true);
  }
});
const upload = makeUpload(1);
const workflowUpload = makeUpload(2);

export const handleDlosUpload = (req, res, next) => upload.single('file')(req, res, error => {
  if (error) return res.status(400).json({ success: false, message: error.message || 'File upload failed.' });
  next();
});

export const handleDlosWorkflowUpload = (req, res, next) => workflowUpload.any()(req, res, error => {
  if (error) return res.status(400).json({ success: false, message: error.message || 'File upload failed.' });
  next();
});

export const validDlosFile = file => {
  const buffer = file?.buffer;
  if (!buffer || !buffer.length || buffer.length > DLOS_MAX_FILE_BYTES) return false;
  if (file.mimetype === 'application/pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (file.mimetype === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (file.mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return file.mimetype === 'image/webp' && buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
};
