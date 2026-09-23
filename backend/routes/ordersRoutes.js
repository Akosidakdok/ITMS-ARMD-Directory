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
  deleteOrderDocument,
  regenerateOrderDocument,
  getGeneratedOrderDocument,
  previewGeneratedOrderDocument,
  uploadSignedOrderDocument,
  getSignedOrderDocument,
  deleteSignedOrderDocument
} from '../controllers/ordersController.js';
import { handleOrderDocumentUpload, handleSignedOrderImageUpload } from '../middleware/orderUpload.js';

const router = express.Router();

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.get('/:id/history', getOrderStatusHistory);
router.get('/:id/file', getOrderDocument);
router.get('/:id/preview', previewOrderDocument);
router.get('/:id/generated-document', getGeneratedOrderDocument);
router.get('/:id/generated-document/preview', previewGeneratedOrderDocument);
router.get('/:id/signed-file', getSignedOrderDocument);
router.post('/', createOrder);
router.post('/:id/restore', restoreOrder);
router.post('/:id/status', transitionOrderStatus);
router.post('/:id/file', handleOrderDocumentUpload, uploadOrderDocument);
router.post('/:id/generated-document/regenerate', regenerateOrderDocument);
router.post('/:id/signed-file', handleSignedOrderImageUpload, uploadSignedOrderDocument);
router.put('/:id', updateOrder);
router.delete('/:id', deleteOrder);
router.delete('/:id/file', deleteOrderDocument);
router.delete('/:id/signed-file', deleteSignedOrderDocument);

export default router;
