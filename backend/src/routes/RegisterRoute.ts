
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs'
import User from '../models/User';
import { UserInterface } from '../interfaces/UserInterface';

class RegisterRoute {

    private router: Router = Router();

    constructor() {    
        this.router.get('/register', this.handleGetReq);
        this.router.post('/register', this.handlePostReq);
    }

    private async handleGetReq(req: Request, res: Response, next: NextFunction)
    {
        res.send("registerPage")
    }
    private async handlePostReq(req: Request, res: Response, next: NextFunction)
    {

        const { username, password } = req.body;

        if(req.body == undefined || !username || !password || typeof username !== "string" || typeof password !== "string")
        {
            res.send("values are improper")
            return;
        }

        User.findOne({username}, async(err: Error, doc: UserInterface) => {
            if(err) throw err
            if(doc) res.send("user already exists")
            const hashedPassword = await bcrypt.hash(req.body.password, 10);

            const newUser = new User({
                username: req.body.username,
                password: hashedPassword
            })

            await newUser.save();
            res.send("registerSuccess");
            
        })

        
    }

    public getRouter() : Router {
        return this.router;
    }
}

export default new RegisterRoute().getRouter();