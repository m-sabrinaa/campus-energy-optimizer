import express from "express";
import dotenv from "dotenv";
dotenv.config();
import workflow from "./controller.js";
import validateRequest from "./validaterequest.middleware.js";

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

app.get('/health',(req, res) => {
    res.send({"status": "ok"});
})

app.post('/optimize-energy', validateRequest, workflow);


app.listen(port, () => {
    console.log(`Energy Optimization Server is running on port ${port}`);
})