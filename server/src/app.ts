import express from "express";
import cors from "cors";
import tripsRouter from "./routes/trips.js";
import stopsRouter from "./routes/stops.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/trips", tripsRouter);
app.use("/api/stops", stopsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
