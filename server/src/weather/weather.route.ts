import { Router } from "express";
import { WeatherService } from "./weather.service.js";

const weatherRouter = Router();
const weatherService = new WeatherService();

weatherRouter.get("/", async (_req, res, next) => {
    try {
        res.json(await weatherService.getWeather());
    } catch (error) {
        next(error);
    }
});

export default weatherRouter;