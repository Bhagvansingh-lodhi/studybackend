// ================= NOT FOUND =================
export const notFound = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
};

// ================= ERROR HANDLER =================
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200
    ? res.statusCode
    : 500;

  // 🔥 Log only in development (IMPORTANT)
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ Error:", err.message);
  }

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    
    // 🚀 Hide stack in production
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
};