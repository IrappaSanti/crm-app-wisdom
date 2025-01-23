const express=require('express')
const app=express()
const {open}=require('sqlite')
const sqlite3 =require('sqlite3')
const path=require('path')
const exp = require('constants')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const { error } = require('console')

const dbPath=path.join(__dirname,"goodsread.db")

let db=null;

const initializeServerWithDatabase = async () => {
    try{
        db=await open({
            filename:dbPath,
            driver:sqlite3.Database
        });
        app.listen(3000,()=>{
            console.log('Server get started at http://localhost:3000');
        })
    }catch(e){
        console.log(`DB server Error: ${e.message}`)
        process.exit(1)
    }
};

initializeServerWithDatabase();

const authenticationToken=(req,res,next)=>{
    const token=req.headers['authorization']
    let jwtToken;
    if (token!==undefined){
        jwtToken=token.split(" ")[1]
        jwt.verify(jwtToken,"MY_SECRETE_KEY", async(error,payload)=>{
            if(error){
                res.status(400)
                res.send("Inavalid JWT Token")
            }
            else{
                req.email=payload.email
                next();
            }
            
        })
    }
    else{
        res.status(400)
        res.send("Inavalid JWT Token")
    }
}

app.get('/users',authenticationToken,async(req,res)=>{
    const { email } = req;

    try {
        const userQuery = `SELECT id FROM users WHERE email = ?;`;
        const user = await db.get(userQuery, [email]);

        if (!user) {
            res.status(404).send({ error: "User not found" });
            return;
        }

        const userIRole = user.role;
        const userId=user.id
        if (userIRole==="admin"){
            const q=`select * from users;`
            const ans= await db.all(q)
            res.send(ans)
        }
        else{
            const q=`select * from users where id=${userId};`
            const ans= await db.all(q)
            res.send(ans)
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
    
})

app.get('/customers',authenticationToken, async(req,res)=>{
    const {email}=req
    const {name='',company='',offset = 0,
        limit = 20,
        order = 'DESC',
        order_by = 'id',}=req.query
    const query=`select * from customer where name like '%${name}%' order by ${order_by} limit ${limit} offset ${offset};`
    const execute= await db.all(query);
    res.send(execute)
});

app.get('/customer/:id',authenticationToken,async(req,res)=>{
    const {id}=req.params
    const query=`select * from customer where id=${id};`
    const execute=await db.get(query);
    res.send(execute)
});

app.use(express.json())

app.post('/register', async (request, response) => {
    const {id, name, email,password,role, created_at, updated_at}=request.body
    const q = `SELECT * FROM users WHERE name LIKE ?`;
    const ans = await db.get(q, [`%${name}%`]);
    const hashedpassword=await bcrypt.hash(password,10);
    const query=`INSERT INTO users (id, name, email, password, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);`
    if (ans===undefined){
        try{
            const result = await db.run(query, [id, name, email, hashedpassword, role, created_at, updated_at]);
            response.send({ message: 'User Registered successfully', result });
        }catch(e){
            response.status(400)
            response.send(`DB Error: ${e.message}`)
        }
    }
    else{
        response.status(400);
        response.send("User already Exist")
    }
});

app.post('/login', async (request, response) => {
    const {email,password}=request.body
    const q = `SELECT * FROM users WHERE email LIKE ?`;
    const ans = await db.get(q, [`%${email}%`]);
    if (ans===undefined){
        response.status(400)
        response.send("Invalid email Id")
    }
    else{
        const comparepassword=await bcrypt.compare(password,ans.password);
        if (comparepassword===true){
            const payload={email:email}
            const jwt_token=jwt.sign(payload,'MY_SECRETE_KEY');
            response.send({jwt_token})
        }
        else{
            response.status(400)
            response.send("Invalid Password")
        }
    }
});

app.get('/profile',authenticationToken,async(req,res)=>{
    const {email}=req
    const q = `SELECT * FROM users WHERE email LIKE ?`;
    const ans = await db.get(q, [`%${email}%`]);
    
    if (ans===undefined){
        response.status(400)
        response.send("Invalid email Id")
    }
    else{
        res.send(ans)
    }
})

app.post('/',authenticationToken, async (req, res) => {
    const { name, email, phone, company, user_id, created_at, updated_at } = req.body;

    const query = `
        INSERT INTO customer (name, email, phone, company,user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    try {
        const result = await db.run(query, [name, email, phone, company, user_id, created_at, updated_at]);
        res.send({ message: 'Customer added successfully', result });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});


app.put('/customer/:id',authenticationToken, async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, company, user_id, created_at, updated_at } = req.body;

    const query = `
        UPDATE customer
        SET name = ?, email = ?, phone = ?, company = ?, user_id = ?, created_at = ?, updated_at = ?
        WHERE id = ?;
    `;

    try {
        const result = await db.run(query, [name, email, phone, company, user_id, created_at, updated_at, id]);
        if (result.changes > 0) {
            res.send({ message: 'Customer updated successfully', result });
        } else {
            res.status(404).send({ error: 'Customer not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});


app.delete('/customer/:id',authenticationToken, async (req,res)=>{
    const {id}=req.params
    const q=`delete from customer where id=${id};`
    const ans=await db.run(q);
    res.send("Customer Deleted successfuly")
});

app.delete('/user/:id',authenticationToken, async (req,res)=>{
    const { email } = req;

    try {
        const userQuery = `SELECT * FROM users WHERE email = ?;`;
        const user = await db.get(userQuery, [email]);

        if (!user) {
            res.status(404).send({ error: "User not found" });
            return;
        }

        const userIRole = user.role;
        const userId=user.id
        if (userIRole==="admin"){
            const q=`delete from users where id=${userId};`
            const ans= await db.run(q)
            res.send(`User Deleted successfuly ${email}`)
        }
        else{
            res.send("Only Admin can delete the users");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});
