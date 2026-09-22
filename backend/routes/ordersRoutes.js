import express from 'express';
import { 
  getAllOrders, 
  getOrderById, 
  createOrder, 
  updateOrder, 
  deleteOrder,
  restoreOrder,
  transitionOrderStatus,
  getOrderStatusHistory,
  uploadOrderDocument,
  getOrderDocument,
  previewOrderDocument,
  deleteOrderDocument
} from '../controllers/ordersController.js';
import { handleOrderDocumentUpload } from '../middleware/orderUpload.js';

const router = express.Router();

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.get('/:id/history', getOrderStatusHistory);
router.get('/:id/file', getOrderDocument);
router.get('/:id/preview', previewOrderDocument);
router.post('/', createOrder);
router.post('/:id/restore', restoreOrder);
router.post('/:id/status', transitionOrderStatus);
router.post('/:id/file', handleOrderDocumentUpload, uploadOrderDocument);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);
router.delete('/:id/file', deleteOrderDocument);

export default router;
