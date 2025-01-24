const express=require('express')
const app=express()
const {open}=require('sqlite')
const sqlite3 =require('sqlite3')
const path=require('path')
const exp = require('constants')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
var validator = require("email-validator");
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

const checkUserRole= async(req,res,next)=>{
    const { email } = req;

    try {
        const userQuery = `SELECT * FROM users WHERE email = ?;`;
        const user = await db.get(userQuery, [email]);

        if (!user) {
            res.status(404).send({ error: "User not found" });
            return;
        }

        const userRole = user.role;
        req.userRole=userRole
        req.userId=user.id
        next();
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
    
}

//User whose role is admin can access all users data if role is user only get their own details
app.get('/users',authenticationToken,checkUserRole,async(req,res)=>{
    const { userRole,userId } = req;
    try {
        if (userRole==="admin"){
            const q=`select * from users;`
            const ans= await db.all(q)
            res.send(ans)
        }
        else{
            const q=`select * from users where id=${userId};`
            const ans= await db.get(q)
            res.send(ans)
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }

})

// User can get the details of customers who assigned to them
// if user role is admin they can access all customer details
app.get('/customers',authenticationToken,checkUserRole, async(req,res)=>{
    const {userRole,userId} = req;
    
    try {
        if (userRole==="admin"){
            const {name='',company='',offset = 0,
                limit = 20,
                order = 'DESC',
                order_by = 'id',}=req.query
            const query=`select * from customer where name like '%${name}%' order by ${order_by} limit ${limit} offset ${offset};`
            const execute= await db.all(query);
            res.send(execute)
        }
        else{
            const {name='',company='',offset = 0,
                limit = 20,
                order = 'DESC',
                order_by = 'id',}=req.query
            const query=`select * from customer where name like '%${name}%' and user_id=${userId} order by ${order_by} limit ${limit} offset ${offset};`
            const execute= await db.all(query);
            res.send(execute)
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
    
});

//Only the user can get access the customer who are assigned to them details
app.get('/customer/:id',authenticationToken,checkUserRole,async(req,res)=>{
    const {userRole,userId} = req;
    const {id}=req.params
    try{
        const query=`select * from customer where id=${id};`
        const execute=await db.get(query);
        if (userId===execute.user_id || userRole==="admin"){
            res.send(execute)
        }
        else{
            res.send("You don't have access to get details")
        }
    }
    catch(e){
        console.error(error);
        res.status(500).send({ error: error.message });
    }
    
});

app.use(express.json())


//Register a User
app.post('/register', async (request, response) => {
    const {name, email,password,role}=request.body
    const date = new Date()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const created_at = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const updated_at = created_at
    const emailValid=validator.validate(email);
    if (!emailValid){
        response.send("Invalid Email Id")
        return;
    }
    const q = `SELECT * FROM users WHERE name LIKE ?`;
    const ans = await db.get(q, [`%${name}%`]);
    const hashedpassword=await bcrypt.hash(password,10);
    const query=`INSERT INTO users (name, email, password, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?);`
    if (ans===undefined){
        try{
            const result = await db.run(query, [name, email, hashedpassword, role, `${created_at}`, `${updated_at}`]);
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

//Login User
app.post('/login', async (request, response) => {
    const {email,password}=request.body
    const emailValid=validator.validate(email);
    if (!emailValid){
        response.send("Invalid Email Id")
        return;
    }
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

// User can See their profile details
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

// Add customer
app.post('/',authenticationToken, async (req, res) => {
    const { name, email, phone, company, user_id} = req.body;
    const date = new Date()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const created_at = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    const updated_at = created_at
    const emailValid=validator.validate(email);
    if (!emailValid){
        res.send("Invalid Email Id")
        return;
    }
    const query = `
        INSERT INTO customer (name, email, phone, company,user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?);
    `;

    try {
        const result = await db.run(query, [name, email, phone, company, user_id, `${created_at}`, `${updated_at}`]);
        res.send({ message: 'Customer added successfully', result });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});


// admin only can update the any customers 
// Only user assign with customer can update customer detail
app.put('/customer/:id',authenticationToken,checkUserRole, async (req, res) => {
    const {userRole,userId}=req
    const { id } = req.params;
    const { name, email, phone, company, user_id } = req.body;
    const date=new Date()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const updated_at = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const emailValid=validator.validate(email);
    if (!emailValid){
        res.send("Invalid Email Id")
        return;
    }

    const query = `
        UPDATE customer
        SET name = ?, email = ?, phone = ?, company = ?, user_id = ?, created_at = ?, updated_at = ?
        WHERE id = ?;
    `;

    try {
        const customerQuery=`select * from customer where id=?;`
        const customer=await db.get(customerQuery,[id]);

        if (!customer) {
            res.status(404).send({ error: "Customer not found" });
            return;
        }
        const customerUserId=customer.user_id
        const customerCreated_date=customer.created_at
        if (customerUserId===userId || userRole==="admin"){
            const result = await db.run(query, [name, email, phone, company, user_id, customerCreated_date, `${updated_at}`, id]);
            if (result.changes > 0) {
                res.send({ message: 'Customer updated successfully', result });
            } else {
                res.status(404).send({ error: 'Customer not found' });
            }
        }
        else{
            res.send("You don't have access to Update")
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

// User delete only customers who assigned to them 
// Admin has access to delete any customer
app.delete('/customer/:id',authenticationToken,checkUserRole, async (req,res)=>{
    const { userRole,userId } = req;
    const {id}=req.params
    try {
        const q=`SELECT * FROM customer where id=?;`;
        const customer=await db.get(q,[id])

        if (!customer) {
            res.status(404).send({ error: "Customer not found" });
            return;
        }

        const customerId=customer.user_id

        if (userRole==="admin" || customerId===userId){
            const q=`delete from customer where id=${id};`
            const ans=await db.run(q);
            res.send("Customer Deleted successfuly")
        }
        else{
            res.send("You don't have access to delete the customer data")
        }
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

// Admin only can delete users
// And Deleted user customers will automatically assign to other users
app.delete('/user/:id',authenticationToken,checkUserRole, async (req,res)=>{
    const { userRole,userId } = req;
    const {id}=req.params
    try {
        if (userId!=id){
            if (userRole==="admin"){
                const customerQuery=`select * from customer where user_id=?;`
                const customers=await db.all(customerQuery,[userId]);
                console.log(customers)
                if (customers.length===0) {
                    const userQ=`select * from users where id=${id};`
                    const userFound=await db.get(userQ)
                    if (userFound===undefined){
                        res.send("User Not Found")
                    }
                    else{
                        const q=`delete from users where id=${id};`
                        const ans= await db.run(q)
                        res.send(`User Deleted successfuly`)
                    }
                }
                else{
                    const usersQuery=`select id from users;`
                    const users=await db.all(usersQuery);
                    const queryToChangeUserId=`update customer set user_id=?;`
                    let listUsers=users.filter(each=>{
                        if (each.id!=userId){
                            return each.id
                        }
                    })
                    console.log(listUsers)
                    const randomChoice=Math.floor(Math.random() * listUsers.length)
                    const changeUser=listUsers[randomChoice].id
                    listUsers.map(async(each)=> await db.run(queryToChangeUserId,[changeUser]))
                    const q=`delete from users where id=${id};`
                    const ans= await db.run(q)
                    res.send(`User Deleted successfuly`)
                }
            }
            else{
                res.send("Only Admin can delete the users");
            }
        }
        else{
            res.send("User himself not able to delete their details")
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});
