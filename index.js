const express=require("express")
const cors=require("cors")
const jwt=require("jsonwebtoken")
const cookieParser=require("cookie-parser")
require("dotenv").config()
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port=process.env.PORT||3000
const app=express()


app.use(cors({
  origin:["http://localhost:5173"],
  credentials:true
}))
app.use(express.json())
app.use(cookieParser())


// bistro-boss-resturant
// Db8DbxnmK40zwxQ1


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USERS_DB}:${process.env.DB_PASS}@cluster0.kndeci6.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const database=client.db("bistroBossDB")
    const menuCollection=database.collection("menu")
    const reviewCollection=database.collection("review")
    const cartCollection=database.collection("carts")
    const usersCollection=database.collection("users")


    // create middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  // console.log(token);
  if (!token) {
    return res.status(401).send({ message: 'unathorized', status: 401 })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unathorized' })
    }
    req.user = decoded
    next()
  })
  
}


const verifyAdmin=async(req,res,next)=>{
  const email=req.user.email 
  const query={email:email}
  const user=await usersCollection.findOne(query)
  const isAdmin=user?.role==='admin'
  if(!isAdmin){
    return res.status(403).send({message:'forbidden access'})
  }
  next()
}


    // jwt
    app.post("/jwt",async(req,res)=>{
      const user=req.body
      // console.log(user);
      const token=jwt.sign(user,process.env.ACCESS_TOKEN,{
        expiresIn:'1h'
      })
      res
      .cookie('token',token,{
        httpOnly:true,
        secure:false
      })
      .send({success:true})
    })


    app.get("/api/v1/all-users",verifyToken,verifyAdmin,async(req,res)=>{
      const result=await usersCollection.find().toArray()
      res.send(result)
    })


    // check admin
    app.get("/api/v1/check-admin", verifyToken, async (req, res) => {
      // console.log("Request user email:", req.user.email);
    
      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: 'forbidden' });
      }
    
      let query = {};
      if (req.query.email) {
        query = { email: req.query.email };
      }
    
      const user = await usersCollection.find(query).toArray();
      // console.log("User found:", user);
    
      let admin = false;
      if (user.length > 0) {
        admin = user[0]?.role === 'admin';
      }
    
      // console.log("Is admin:", admin);
      res.send({ admin });
    });
    


// menu
    app.get('/api/v1/menu', async(req, res) =>{
        const result = await menuCollection.find().toArray();
        res.send(result);
    })

    // :: get menu data for spefific data show 
    app.get("/api/v1/:menuItemId/menu",async(req,res)=>{
      const menuItemId=req.params.menuItemId
      const query={_id:new ObjectId(menuItemId)}
      const result=await menuCollection.findOne(query)
      res.send(result)
    })

    // add menu item :: post
    app.post('/api/v1/add-menu-item',verifyToken,verifyAdmin,async(req,res)=>{
      const menuItem=req.body 
      const result=await menuCollection.insertOne(menuItem)
      res.send(result)
    })

    // update menu item :: patch
    app.patch('/api/v1/:menuItemId/update-menu',async(req,res)=>{
      const menuItem=req.body 
      const menuItemId=req.params.menuItemId
      const query={_id:new ObjectId(menuItemId)}
      const updatedMenu ={
        $set:{
          category:menuItem.category,
          price:menuItem.price,
          recipe:menuItem.recipe,
          image:menuItem.image
        }
      }
      const result=await menuCollection.updateOne(query,updatedMenu)
      res.send(result)
    
    })

    // delete menu item :: delete
    app.delete('/api/v1/:menuItemId/delete-menu-item',verifyToken,verifyAdmin,async(req,res)=>{
      const menuItemId=req.params.menuItemId 
      const query={_id:new ObjectId(menuItemId)}
      const result=await menuCollection.deleteOne(query)
      res.send(result)
    })
    
    // reviews
    app.get('/api/v1/reviews', async(req, res) =>{
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })

    // add to cart
    app.post("/api/v1/add-to-cart",async(req,res)=>{
      const cart=req.body 
      const result=await cartCollection.insertOne(cart)
      res.send(result)
    })

    // show add to cart data by user based
    app.get("/api/v1/show-cart-data",async(req,res)=>{
      let query={}

      if(req.query.email){
        query={email:req.query.email}
      }
      
      const result=await cartCollection.find(query).toArray()
      res.send(result)
    })

    // delete cart
    app.delete("/api/v1/:cartId/delete-cart",async(req,res)=>{
      const cartId=req.params.cartId 
      const query={_id:new ObjectId(cartId)}
      const result=await cartCollection.deleteOne(query)
      res.send(result)
    })


    // check duplicate user 
    // users data
    app.post("/api/v1/users",async(req,res)=>{
      const user=req.body 
      const query={email:user.email}

      const existingUser=await usersCollection.findOne(query)
      if(existingUser){
        return res.send({message:'user already exists',insertedId:null})
      }

      const result=await usersCollection.insertOne(user)
      res.send(result)
    })

   
// delete usesr
    app.delete("/api/v1/:userId/deleteUser",async(req,res)=>{
      const userId=req.params.userId
      const query={_id:new ObjectId(userId)}
      const result=await usersCollection.deleteOne(query)
      res.send(result)
    })

    // create admin
    app.patch("/api/v1/create-admin/:userId",async(req,res)=>{
      const userId=req.params.userId 
      const query={_id:new ObjectId(userId)}
      const updatedDoc={
        $set:{
          role:"admin"
        }
      }
      const result=await usersCollection.updateOne(query,updatedDoc)
      res.send(result)
    })

    // payment gateway
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    // Send a ping to confirm a successful connection
     client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get("/",(req,res)=>{
    res.send('Server is running...');
})

app.listen(port,(req,res)=>{
    console.log(`port${port}`);
})