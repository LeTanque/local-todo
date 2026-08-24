import "dotenv/config";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 4311);
const app = createApp();

app.listen(port, () => {
  console.log(`API listening at http://localhost:${port}`);
});
