import connectDB from "./db/index.js";

import app from "./app.js";
import { ApiResponse } from "./utils/ApiResponse.js";
import { ApiError } from "./utils/ApiError.js";



connectDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`server running on port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Error:", error);
  });
