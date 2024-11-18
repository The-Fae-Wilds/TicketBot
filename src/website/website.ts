import Express from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../backend/config';
import { Database } from "../libs/database";
import apiRouter from './api';
import createLogRenderRouter from './logRender';

const app = Express();
const db = Database();

app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', 'public/views');
app.use('/assets', Express.static('public/assets'));
app.use('/api', apiRouter);

const pages: string[] = [];

const pagesDir = path.join(__dirname,'..', '..', 'public');

fs.readdir(pagesDir, (err, files) => {
    if(err){
        return console.error(err);
    }
    files.forEach(file => {
        if(file.endsWith('.ejs')){
            pages.push(file.slice(0, -4));
        }
    });
});

app.use('/chatlog', createLogRenderRouter(pages));

app.get('/*', async (req, res) => {
    const uri = req.url.slice(1);
    const filePath = path.join('..','public', `${uri}.ejs`);
    if(!uri){
        return res.render('main', { page: 'home', nav: pages });
    }
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if(err){
            return res.status(404).render('main', { page: 'err/404', nav: pages });
        }
        res.render('main', { page: uri, nav: pages });
    });
});

app.listen(config.port || 3000, () => {
    console.log(`Server is running on port ${config.port || 3000}`);
});