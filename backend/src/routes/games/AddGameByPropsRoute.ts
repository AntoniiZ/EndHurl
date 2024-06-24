
import { Router, Request, Response, NextFunction } from 'express';
import Game from '../../models/Game';
import Map from '../../models/Map';
import User from '../../models/User';
import { v4 as uuidv4 } from 'uuid';

class AddGameByPropsRoute {

    private router: Router = Router();

    constructor() 
    {    
        this.router.post('/addGameByProps', this.handlePostReq);
    }

    private async handlePostReq(req: any, res: Response, next: NextFunction) {
        if (!req.isAuthenticated()) {
            return res.status(401).send({ message: "You are not logged in" });
        }

        const { name, maxPlayersCount, mapName, creatorName } = req.body;

        try {
            if (!name) {
                res.status(404).send({ message: 'Name of game not provided' });
                return;
            }
            if (!maxPlayersCount) {
                res.status(404).send({ message: 'Max players count of game not set' });
                return;
            }
            if(!mapName) {
                res.status(404).send({ message: 'Map name is not set' });
                return;
            }
            const map = await Map.findOne({ mapName }).lean();
            const creator = await User.findOne({ creatorName }).lean();

            if (!creator) {
                res.status(404).send({ message: 'User doesnt exist' });
                return;
            }
            if(req.user.username != creator.username)
            {
                res.status(403).send({ message: 'Error with game creation (Forbidden)' });
                return;
            }
            if (!map) {
                res.status(404).send({ message: 'Map doesnt exist' });
                return;
            }

            const randomLink = uuidv4()

            await new Game({
                name, link: randomLink, maxPlayersCount, map, creator
            }).save()

            return res.send({ link: randomLink });
            
        } catch (err) {
            console.error(`Error in game by props post route: ${err}`);
            return res.status(500).send({ message: "Internal server error" });
        }
    }

    public getRouter() : Router {
        return this.router;
    }
}

export default new AddGameByPropsRoute().getRouter();