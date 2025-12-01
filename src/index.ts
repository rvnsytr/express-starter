import express from "express";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Global middleware
app.use(async (_, __, next) => {
  // ? Delay: Test Purpose Only
  // await new Promise((resolve) => setTimeout(resolve, 3 * 1000));

  return next();
});

app.get("/", (_, res) => res.json("Hello, Express Starter!"));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
