import Express from "express";
import {config} from "../backend/config";
import { Database } from "../libs/database";


const db = Database();

const router = Express.Router();

router.get("/", (req, res) => {
  res.status(404).send("Not found");
});

router.get("/logs", async (req, res) => {
    try {
        const logs = await db.selectAll(config.table || "chatlogs");
        console.log(logs);
        return res.json(logs);
    } catch (error) {
        console.error(error);
        return res.status(500).send("Internal server error");
    }
});

router.post('/addchatlog', (req, res) => {
    if(config.dev){
        const data = req.body;

        db.insert(config.table || "chatlogs", data.instigator, data.members, data.log, data.timestampOpen, data.timestampClose);
        return res.status(200).send("Chat log added");
    }
    return res.status(403).send("Not in dev mode");
});

export default router;