export const notFound = (req, res, next) => {
  res.status(404);
  res.json({ message: "Not Found" });
};

export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);
  const status = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
};
