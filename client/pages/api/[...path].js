import handler from '../../api/index';

// This catch-all route will handle all API requests
export default async function catchAllHandler(req, res) {
  // Forward to our main API handler
  return handler(req, res);
}