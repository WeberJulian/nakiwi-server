var express = require('express');
var mongodb = require('mongodb');
var bcrypt = require('bcryptjs');
var bodyParser = require("body-parser");
var mongoSanitize = require('express-mongo-sanitize');
var url = require('url');
var cors = require('cors');
var app = express();
app.use(cors());

var dbserver = require('./dbserver.js');

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(mongoSanitize({replaceWith: '_'}))

const Logger = require("./logger.js")("./logs.txt");


// Welcome

app.get("/",  (req, res) => {
  res.send("Welcome on the Nakiwi API ! Ummm what are you here for ?");
});

app.get("/wakeup",  (req, res) => {
  res.send({status: "ok"}); // Add uri: ... to migrate
});

app.get("/stripePK",  (req, res) => {
  res.send({status: "ok", pk: process.env.STRIPE_PK});
});


// Authentification

app.post("/register",  async (req, res) => {
  var status = await dbserver.register(req.body)
  res.send({status: status})
});

app.post("/validateAccount", async (req, res) => {
  var status = await dbserver.validateAccount(req.body)
  res.send({status: status})
})

app.post("/auth", async (req, res) => {
  var status = await dbserver.auth(req.body)
  res.send({status: status})
});

app.post("/login", async (req, res) => {
  var status = await dbserver.login(req.body)
  status = JSON.stringify(status)  
  res.send(status)
});

// Payment 

app.post("/pay", async (req, res) => {
  var result = await dbserver.pay(req.body)
  console.log(result.status)
  res.send(result)
})

app.post("/addCard", async (req, res) => {
  var status = await dbserver.addCard(req.body)
  status = JSON.stringify(status)
  res.send(status)
})


app.post("/getCards", async (req, res) => {
  var result = await dbserver.getCards(req.body)
  res.send(result)
})



// Lists

app.get("/getProductList", async (req, res) => {
  console.log("get products2")
  var result = await dbserver.getProductListLegacy(req.body)
  res.send(result)
})

app.post("/getProductList", async (req, res) => {
  console.log("get products")
  var status = await dbserver.getProductList(req.body.id)
  res.send(status)
})

app.get("/getDeliveries", async (req, res) => {
  var result = await dbserver.getDeliveries(req.body)
  res.send(result)
})


// Account

app.post("/getOrders", async (req, res) => {
  console.log("Get my orders : " + req.body.email)
  var result = await dbserver.getOrders(req.body)
  res.send(result)
})

// Logic


app.post("/calTotal", async (req, res) => {
  console.log(req.body.delivery)
  var result = await dbserver.calTotal(req.body)
  res.send(result)
})



// Reset Password

app.get("/sendResetToEmail", async (req, res) => {
  //var result = await dbserver.listOrdersForDelivery()
  console.log("Reset passowrd")
  res.send({status: "OK"})
})

app.get("/sendResetToEmail", async (req, res) => {
  //var result = await dbserver.listOrdersForDelivery()
  console.log("Reset passowrd")
  res.send({status: "OK"})
})



// Listener 

var listener = app.listen("3000", function () {
  console.log('Your app is listening on port ' + listener.address().port);
});





// For us

app.get("/listOrdersForDelivery", async (req, res) => {
  var url_parts = url.parse(req.url, true);
  let result
  if(url_parts.query.date){
    result = await dbserver.listOrdersForDelivery(url_parts.query.date)
  }
  else{
    result = await dbserver.listOrdersForDelivery()
  }
  res.send(result)
})

app.get("/listProductsWeHaveToOrder", async (req, res) => {
  var url_parts = url.parse(req.url, true);
  let result
  if(url_parts.query.date){
    result = await dbserver.listProductsWeHaveToOrder(url_parts.query.date)
  }
  else{
    result = await dbserver.listProductsWeHaveToOrder()
  }
  res.send(result)
})

app.get("/order", async (req, res) => {
  var url_parts = url.parse(req.url, true);
  console.log("Order confirmed : " + url_parts.query.id)
  var result = await dbserver.getOrder(url_parts.query.id)
  res.send(result)
})

// app.post("/updateProductMax", async (req, res) => {
//   console.log(JSON.stringify(req.body))
//   var result = await dbserver.updateProductMax({listInfo: req.body.listInfo._id, basket: req.body.basket})
//   res.send(result)
// })

// var err, db = await mongodb.MongoClient.connect(uri);
//       if(err) throw err;
//       var users =  await db.collection('users');
//       var monReq = {email: body.email.toLowerCase()}
//       var dbUser = await users.findOne(monReq);
//       var result = await module.exports.calTotal({basket: body.basket, listInfo: body.listInfo._id, payment: true, code: body.code, email: body.email.toLowerCase(), delivery: body.delivery})
      
//       const amount = result.total
//       console.log("ammount " + amount)
//       const customer = dbUser.cus
//       const card = body.card.id
//       try{
//         var charge = await stripe.charges.create({
//           amount: Math.ceil(amount * 100),
//           currency: "gbp",
//           card: card,
//           customer: customer,
//           description: "Charge for " + body.email
//         })
//         module.exports.updateProductMax({basket: body.basket, listInfo: body.listInfo.id})
//       }