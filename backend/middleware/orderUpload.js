import multer from 'multer';

export const ORDER_DOCUMENT_MAX_BYTES = 25 * 1024 * 1024;
export const ORDER_DOCUMENT_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const storage = multer.memoryStorage();

export const orderDocumentUpload = multer({
  storage,
  limits: { fileSize: ORDER_DOCUMENT_MAX_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    const hasDocxExtension = String(file.originalname || '').toLowerCase().endsWith('.docx');
    const acceptedMime = !file.mimetype || file.mimetype === ORDER_DOCUMENT_MIME || file.mimetype === 'application/octet-stream';
    if (!hasDocxExtension || !acceptedMime) {
      return callback(new Error('Only Microsoft Word .docx files are accepted.'));
    }
    callback(null, true);
  }
});

export const handleOrderDocumentUpload = (req, res, next) => {
  orderDocumentUpload.single('file')(req, res, error => {
    if (error) return res.status(400).json({ success: false, message: error.message || 'DOCX upload failed.' });
    next();
  });
};
