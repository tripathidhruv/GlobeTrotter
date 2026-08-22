import express from "express";
import cors from "cors";
import tripsRouter from "./routes/trips.js";
import stopsRouter from "./routes/stops.js";
import citiesRouter from "./routes/cities.js";
import activitiesRouter from "./routes/activities.js";
import budgetRouter from "./routes/budget.js";
import stopActivitiesRouter from "./routes/stopActivities.js";
import aiRouter from "./routes/ai.js";
import usersRouter from "./routes/users.js";
import collaboratorsRouter from "./routes/collaborators.js";
import adminRouter from "./routes/admin.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/trips", tripsRouter);
app.use("/api/stops", stopsRouter);
app.use("/api/cities", citiesRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/trips", budgetRouter);
app.use("/api", stopActivitiesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/users", usersRouter);
app.use("/api/trips", collaboratorsRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
